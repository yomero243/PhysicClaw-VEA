import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_CONTROL_RATE_LIMIT_PER_MINUTE = 60;
// Scene commands mutate persistent data — stricter default limit.
const DEFAULT_SCENE_RATE_LIMIT_PER_MINUTE = 10;

// Mirrors src/lib/constraints.ts (keep in sync).
const VALID_MOODS = ["calm", "excited", "thinking", "listening"];
const INTENSITY_MIN = 0.0;
const INTENSITY_MAX = 2.0;
const MESSAGE_MAX_LEN = 500;
const CHAR_ID_MAX_LEN = 64;
const HEX_COLOR_RE = /^#[0-9a-fA-F]{6}$/;
const SPLAT_URL_RE = /^https:\/\/.+\.splat$/i;
const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const POSITION_LIMIT = 50;
const SCALE_MIN = 0.01;
const SCALE_MAX = 20;
const LABEL_MAX_LEN = 60;
const MODEL_URL_MAX_LEN = 512;

// Commands executed server-side (DB write → Realtime updates the client)
// instead of being broadcast on the control channel.
const SCENE_COMMANDS = new Set(["spawnObject", "removeObject"]);

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

function isVec3(v: unknown, min: number, max: number): boolean {
  return Array.isArray(v) && v.length === 3 &&
    v.every((n) =>
      typeof n === "number" && Number.isFinite(n) && n >= min && n <= max
    );
}

function validateSpawnObject(value: unknown): string | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return "spawnObject value must be an object";
  }
  const v = value as Record<string, unknown>;
  if (v.label !== undefined &&
      (typeof v.label !== "string" || v.label.length < 1 ||
        v.label.length > LABEL_MAX_LEN)) {
    return `spawnObject label must be a string of 1-${LABEL_MAX_LEN} chars`;
  }
  if (v.color !== undefined &&
      (typeof v.color !== "string" || !HEX_COLOR_RE.test(v.color))) {
    return "spawnObject color must be a #rrggbb hex string";
  }
  if (v.position !== undefined &&
      !isVec3(v.position, -POSITION_LIMIT, POSITION_LIMIT)) {
    return `spawnObject position must be [x,y,z] within ±${POSITION_LIMIT}`;
  }
  if (v.rotation !== undefined && !isVec3(v.rotation, -Infinity, Infinity)) {
    return "spawnObject rotation must be [x,y,z] finite numbers";
  }
  if (v.scale !== undefined && !isVec3(v.scale, SCALE_MIN, SCALE_MAX)) {
    return `spawnObject scale must be [x,y,z] within [${SCALE_MIN}, ${SCALE_MAX}]`;
  }
  if (v.model_url !== undefined &&
      (typeof v.model_url !== "string" ||
        v.model_url.length > MODEL_URL_MAX_LEN ||
        !SPLAT_URL_RE.test(v.model_url))) {
    return "spawnObject model_url must be an https URL ending in .splat";
  }
  return null;
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
    case "setShaderColor": {
      const v = body.value as Record<string, unknown> | null;
      return typeof v === "object" && v !== null &&
          typeof v.characterId === "string" &&
          v.characterId.length > 0 && v.characterId.length <= CHAR_ID_MAX_LEN &&
          typeof v.color === "string" && HEX_COLOR_RE.test(v.color)
        ? null
        : "setShaderColor value must be { characterId, color: '#rrggbb' }";
    }
    case "setObjectVisibility": {
      const v = body.value as Record<string, unknown> | null;
      return typeof v === "object" && v !== null &&
          typeof v.id === "string" &&
          v.id.length > 0 && v.id.length <= CHAR_ID_MAX_LEN &&
          typeof v.visible === "boolean"
        ? null
        : "setObjectVisibility value must be { id, visible: boolean }";
    }
    case "spawnObject":
      return validateSpawnObject(body.value);
    case "removeObject":
      return typeof body.value === "string" &&
          (body.value === "primitives" || UUID_RE.test(body.value))
        ? null
        : "removeObject value must be a scene_objects uuid or 'primitives'";
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

function getRateLimitFromEnv(envVar: string, fallback: number): number {
  // Floor to an integer: the consume_rate_limit RPC declares p_limit as
  // integer, and a fractional env value would error the RPC on every call.
  const configured = Math.floor(Number(Deno.env.get(envVar)));
  return Number.isFinite(configured) && configured > 0 ? configured : fallback;
}

function getControlRateLimit(): number {
  return getRateLimitFromEnv(
    "CONTROL_RATE_LIMIT_PER_MINUTE",
    DEFAULT_CONTROL_RATE_LIMIT_PER_MINUTE,
  );
}

function getSceneRateLimit(): number {
  return getRateLimitFromEnv(
    "CONTROL_SCENE_RATE_LIMIT_PER_MINUTE",
    DEFAULT_SCENE_RATE_LIMIT_PER_MINUTE,
  );
}

// In-memory fallback limiter (per isolate) — used only when the durable
// RPC fails, so a database hiccup degrades to per-isolate limiting
// instead of no limiting at all.
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function consumeRateLimitLocal(
  key: string,
  limit: number,
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
  return { allowed: entry.count <= limit, retryAfter };
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

/** Best-effort last_used_at stamp; never blocks the response. */
function stampTokenUsage(
  serviceClient: ReturnType<typeof createClient>,
  tokenId: string,
): void {
  serviceClient
    .from("agent_tokens")
    .update({ last_used_at: new Date().toISOString() })
    .eq("id", tokenId)
    .then(({ error }) => {
      if (error) console.error("last_used_at update failed:", error.message);
    });
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

  let body: ControlBody;
  try {
    body = await req.json();
  } catch {
    return json({ error: "Invalid JSON body" }, 400);
  }

  const validationError = validateCommand(body);
  if (validationError) return json({ error: validationError }, 400);

  // Rate limit per token (shares the durable limiter from migration 011).
  // Scene commands mutate persistent data, so they consume a separate,
  // stricter bucket. Any failure — RPC error, thrown fetch, unexpected
  // shape — falls back to the in-memory limiter; the endpoint never runs
  // unlimited (no fail-open).
  const isSceneCommand = SCENE_COMMANDS.has(body.command ?? "");
  const rateKey = isSceneCommand
    ? `control-scene:${tokenRow.id}`
    : `control:${tokenRow.id}`;
  const rateLimit = isSceneCommand ? getSceneRateLimit() : getControlRateLimit();

  let rate: { allowed: boolean; retryAfter: number } | null = null;
  try {
    const { data: rateData, error: rateError } = await serviceClient.rpc(
      "consume_rate_limit",
      {
        p_key: rateKey,
        p_limit: rateLimit,
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
    rate = consumeRateLimitLocal(rateKey, rateLimit);
  }

  if (!rate.allowed) {
    return json({ error: "Too many requests" }, 429, {
      "Retry-After": String(rate.retryAfter || 1),
    });
  }

  // Scene commands: executed here against the DB (scoped to the token's
  // user); the client scene updates live via its postgres_changes
  // subscription on scene_objects — no broadcast needed.
  if (body.command === "spawnObject") {
    const { data: sceneRow, error: sceneError } = await serviceClient
      .from("scenes")
      .select("id")
      .eq("user_id", tokenRow.user_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (sceneError) {
      console.error("scenes lookup failed:", sceneError.message);
      return json({ error: "Server error" }, 500);
    }
    if (!sceneRow) {
      return json({ error: "No scene found for this user" }, 404);
    }

    const v = body.value as Record<string, unknown>;
    const { data: created, error: insertError } = await serviceClient
      .from("scene_objects")
      .insert({
        scene_id: sceneRow.id,
        user_id: tokenRow.user_id,
        object_type: "prop",
        character_id: null,
        label: (v.label as string | undefined) ?? `AgentObject_${Date.now()}`,
        model_url: (v.model_url as string | undefined) ?? null,
        position: v.position ?? [0, 0, 0],
        rotation: v.rotation ?? [0, 0, 0],
        scale_v: v.scale ?? [1, 1, 1],
        metadata: v.model_url
          ? { kind: "gaussian_splat", format: "splat", spawned_by: "agent" }
          : {
            shape: "cube",
            is_primitive: true,
            color: (v.color as string | undefined) ?? "#8CFFB0",
            spawned_by: "agent",
          },
        sort_order: 0,
        is_visible: true,
      })
      .select("id")
      .single();
    if (insertError || !created) {
      console.error("scene_objects insert failed:", insertError?.message);
      return json({ error: "Spawn failed" }, 500);
    }

    stampTokenUsage(serviceClient, tokenRow.id as string);
    return json({ ok: true, objectId: created.id }, 200);
  }

  if (body.command === "removeObject") {
    let query = serviceClient
      .from("scene_objects")
      .delete()
      .eq("user_id", tokenRow.user_id);
    if (body.value === "primitives") {
      query = query.or(
        "metadata->>shape.eq.cube,metadata->>is_primitive.eq.true",
      );
    } else {
      query = query.eq("id", body.value as string);
    }
    const { error: deleteError } = await query;
    if (deleteError) {
      console.error("scene_objects delete failed:", deleteError.message);
      return json({ error: "Remove failed" }, 500);
    }

    stampTokenUsage(serviceClient, tokenRow.id as string);
    return json({ ok: true }, 200);
  }

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

  stampTokenUsage(serviceClient, tokenRow.id as string);
  return json({ ok: true }, 200);
});
