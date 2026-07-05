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

function json(body: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function validateCommand(body: ControlBody): string | null {
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
        : "setActiveCharacterId value must be a non-empty string";
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
  const configured = Number(Deno.env.get("CONTROL_RATE_LIMIT_PER_MINUTE"));
  return Number.isFinite(configured) && configured > 0
    ? configured
    : DEFAULT_CONTROL_RATE_LIMIT_PER_MINUTE;
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
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "content-type, x-agent-token",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
      },
    });
  }
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const serviceClient = getServiceClient();
  if (!supabaseUrl || !serviceRoleKey || !serviceClient) {
    return json({ error: "Server misconfiguration" }, 500);
  }

  const secret = req.headers.get("x-agent-token");
  if (!secret || !secret.startsWith("pcvea_")) {
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
  const { data: rateData, error: rateError } = await serviceClient.rpc(
    "consume_rate_limit",
    {
      p_key: `control:${tokenRow.id}`,
      p_limit: getControlRateLimit(),
      p_window_ms: RATE_LIMIT_WINDOW_MS,
    },
  );
  if (!rateError && Array.isArray(rateData) && rateData.length > 0 &&
      !rateData[0].allowed) {
    return new Response(JSON.stringify({ error: "Too many requests" }), {
      status: 429,
      headers: {
        "Content-Type": "application/json",
        "Retry-After": String(rateData[0].retry_after_seconds ?? 1),
      },
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
