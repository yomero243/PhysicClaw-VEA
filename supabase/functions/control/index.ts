import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_CONTROL_RATE_LIMIT_PER_MINUTE = 60;

// Mirrors src/lib/constraints.ts (keep in sync).
const VALID_MOODS = ["calm", "excited", "thinking", "listening"];
const INTENSITY_MIN = 0.0;
const INTENSITY_MAX = 2.0;
const MESSAGE_MAX_LEN = 500;
const CHAR_ID_MAX_LEN = 64;

interface ControlBody {
  command?: string;
  value?: unknown;
  id?: string;
}

// Agents are typically server-side callers, but browser-based agents work
// too: every response carries CORS headers, not just the preflight.
const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-agent-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(
  body: Record<string, unknown>,
  status: number,
  extraHeaders: Record<string, string> = {},
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...CORS_HEADERS,
      "Content-Type": "application/json",
      ...extraHeaders,
    },
  });
}

function validateCommand(body: ControlBody): string | null {
  // `id` is optional; a non-string id would make the client-side Zod schema
  // reject the whole payload and the command would silently never apply.
  // The length cap is server-side hygiene only (not in constraints.ts).
  if (body.id !== undefined &&
      (typeof body.id !== "string" || body.id.length > 128)) {
    return "id must be a string of <= 128 chars when provided";
  }
  switch (body.command) {
    case "setMood":
      return typeof body.value === "string" && VALID_MOODS.includes(body.value)
        ? null
        : `setMood value must be one of: ${VALID_MOODS.join(", ")}`;
    case "setIsThinking":
      return typeof body.value === "boolean"
        ? null
        : "setIsThinking value must be boolean";
    case "setIntensity":
      return typeof body.value === "number" &&
          body.value >= INTENSITY_MIN && body.value <= INTENSITY_MAX
        ? null
        : `setIntensity value must be a number in [${INTENSITY_MIN}, ${INTENSITY_MAX}]`;
    case "setLastMessage":
      return typeof body.value === "string" &&
          body.value.length <= MESSAGE_MAX_LEN
        ? null
        : `setLastMessage value must be a string of <= ${MESSAGE_MAX_LEN} chars`;
    case "setActiveCharacterId":
      return typeof body.value === "string" &&
          body.value.length > 0 && body.value.length <= CHAR_ID_MAX_LEN
        ? null
        : `setActiveCharacterId value must be a non-empty string of <= ${CHAR_ID_MAX_LEN} chars`;
    default:
      return "Unknown command";
  }
}

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(input),
  );
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0"))
    .join("");
}

function getControlRateLimit(): number {
  // Floor to an integer: the consume_rate_limit RPC declares p_limit as
  // integer, and a fractional env value would error the RPC on every call.
  const configured = Math.floor(
    Number(Deno.env.get("CONTROL_RATE_LIMIT_PER_MINUTE")),
  );
  return Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_CONTROL_RATE_LIMIT_PER_MINUTE;
}

// In-memory fallback limiter (per isolate) — used only when the durable
// RPC fails, so a database hiccup degrades to per-isolate limiting
// instead of no limiting at all.
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function consumeRateLimitLocal(
  key: string,
): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  for (const [k, entry] of rateLimitMap.entries()) {
    if (now > entry.resetAt) rateLimitMap.delete(k);
  }

  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, retryAfter: 0 };
  }

  entry.count += 1;
  const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
  return { allowed: entry.count <= getControlRateLimit(), retryAfter };
}

// Module scope is reused within an isolate — cache the service client.
let cachedServiceClient: ReturnType<typeof createClient> | null = null;

function getServiceClient(): ReturnType<typeof createClient> | null {
  if (cachedServiceClient) return cachedServiceClient;
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) return null;
  cachedServiceClient = createClient(supabaseUrl, serviceRoleKey);
  return cachedServiceClient;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const serviceClient = getServiceClient();
  if (!supabaseUrl || !serviceRoleKey || !serviceClient) {
    return json({ error: "Server misconfiguration" }, 500);
  }

  // Full-format check (prefix + 64 hex chars, as issued by the panel) so
  // garbage never reaches hashing or the DB lookup.
  const secret = req.headers.get("x-agent-token");
  if (!secret || !/^pcvea_[0-9a-f]{64}$/.test(secret)) {
    return json({ error: "Missing or malformed X-Agent-Token header" }, 401);
  }

  const tokenHash = await sha256Hex(secret);

  const { data: tokenRow, error: tokenError } = await serviceClient
    .from("agent_tokens")
    .select("id, user_id, revoked")
    .eq("token_hash", tokenHash)
    .maybeSingle();

  if (tokenError) {
    console.error("agent_tokens lookup failed:", tokenError.message);
    return json({ error: "Server error" }, 500);
  }
  if (!tokenRow || tokenRow.revoked) {
    return json({ error: "Invalid or revoked token" }, 401);
  }

  // Rate limit per token (shares the durable limiter from migration 011).
  // Any failure — RPC error, thrown fetch, unexpected shape — falls back to
  // the in-memory limiter; the endpoint never runs unlimited (no fail-open).
  let rate: { allowed: boolean; retryAfter: number } | null = null;
  try {
    const { data: rateData, error: rateError } = await serviceClient.rpc(
      "consume_rate_limit",
      {
        p_key: `control:${tokenRow.id}`,
        p_limit: getControlRateLimit(),
        p_window_ms: RATE_LIMIT_WINDOW_MS,
      },
    );
    if (!rateError && Array.isArray(rateData) && rateData.length > 0) {
      rate = {
        // Strict boolean check: only a true boolean counts as allowed.
        allowed: rateData[0].allowed === true,
        retryAfter: Number(rateData[0].retry_after_seconds) || 0,
      };
    } else {
      console.error("consume_rate_limit RPC failed:", rateError?.message);
    }
  } catch (err) {
    console.error("consume_rate_limit RPC threw:", err);
  }
  if (!rate) {
    rate = consumeRateLimitLocal(`control:${tokenRow.id}`);
  }

  if (!rate.allowed) {
    return json({ error: "Too many requests" }, 429, {
      "Retry-After": String(rate.retryAfter || 1),
    });
  }

  let body: ControlBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const validationError = validateCommand(body);
  if (validationError) return json({ error: validationError }, 400);

  // Broadcast on the private per-user control channel via Realtime REST.
  const broadcastRes = await fetch(`${supabaseUrl}/realtime/v1/api/broadcast`, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messages: [{
        topic: `control:${tokenRow.user_id}`,
        event: "command",
        private: true,
        payload: { command: body.command, value: body.value, id: body.id },
      }],
    }),
  });

  if (!broadcastRes.ok) {
    const text = await broadcastRes.text().catch(() => "");
    console.error(`Realtime broadcast failed ${broadcastRes.status}: ${text}`);
    return json({ error: "Broadcast failed" }, 502);
  }

  // Best-effort usage stamp; do not block the response on it.
  serviceClient
    .from("agent_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", tokenRow.id)
    .then(({ error }) => {
      if (error) console.error("last_used_at update failed:", error.message);
    });

  return json({ ok: true }, 200);
});
