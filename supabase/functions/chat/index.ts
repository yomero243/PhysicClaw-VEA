import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];
const RATE_LIMIT_WINDOW_MS = 60_000;
const DEFAULT_RATE_LIMIT_PER_MINUTE = 12;
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();

function getAllowedOrigins(): string[] {
  const configuredOrigins = Deno.env.get("CHAT_ALLOWED_ORIGINS")
    ?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return configuredOrigins?.length ? configuredOrigins : DEFAULT_ALLOWED_ORIGINS;
}

function getCorsHeaders(req: Request): Record<string, string> | null {
  const origin = req.headers.get("Origin");
  const baseHeaders = {
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };

  if (!origin) return baseHeaders;
  if (!getAllowedOrigins().includes(origin)) return null;

  return {
    ...baseHeaders,
    "Access-Control-Allow-Origin": origin,
  };
}

function getRateLimit(): number {
  const configuredLimit = Number(Deno.env.get("CHAT_RATE_LIMIT_PER_MINUTE"));
  return Number.isFinite(configuredLimit) && configuredLimit > 0
    ? configuredLimit
    : DEFAULT_RATE_LIMIT_PER_MINUTE;
}

function getClientIp(req: Request): string {
  const forwardedFor = req.headers.get("x-forwarded-for");
  if (forwardedFor) return forwardedFor.split(",")[0].trim();

  return req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-real-ip") ??
    "unknown";
}

function pruneRateLimitMap(now: number): void {
  for (const [key, entry] of rateLimitMap.entries()) {
    if (now > entry.resetAt) rateLimitMap.delete(key);
  }
}

function consumeRateLimit(key: string): { allowed: boolean; retryAfter: number } {
  const now = Date.now();
  const limit = getRateLimit();
  pruneRateLimitMap(now);

  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, retryAfter: 0 };
  }

  entry.count += 1;
  const retryAfter = Math.ceil((entry.resetAt - now) / 1000);
  return { allowed: entry.count <= limit, retryAfter };
}

function forbiddenCorsResponse(): Response {
  return new Response(JSON.stringify({ error: "Origin not allowed" }), {
    status: 403,
    headers: { "Content-Type": "application/json", "Vary": "Origin" },
  });
}

function rateLimitResponse(
  retryAfter: number,
  corsHeaders: Record<string, string>,
): Response {
  return new Response(JSON.stringify({ error: "Too many requests" }), {
    status: 429,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
      "Retry-After": String(retryAfter),
    },
  });
}

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  corsHeaders: Record<string, string>,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function okJsonResponse(
  body: Record<string, unknown>,
  corsHeaders: Record<string, string>,
): Response {
  return jsonResponse(body, 200, corsHeaders);
};

interface ChatRequestBody {
  model?: string;
  messages?: Array<{ role: string; content: string }>;
  stream?: boolean;
}

Deno.serve(async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  if (!corsHeaders) return forbiddenCorsResponse();

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405, corsHeaders);
  }

  // --- Authenticate the caller via Supabase JWT ---
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResponse({ error: "Missing or invalid Authorization header" }, 401, corsHeaders);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonResponse({ error: "Server misconfiguration" }, 500, corsHeaders);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return jsonResponse({ error: "Unauthorized" }, 401, corsHeaders);
  }

  const rateLimitKey = `${user.id}:${getClientIp(req)}`;
  const rateLimitResult = consumeRateLimit(rateLimitKey);
  if (!rateLimitResult.allowed) {
    return rateLimitResponse(rateLimitResult.retryAfter, corsHeaders);
  }

  // --- Read LLM secrets (server-side only) ---
  const openClawToken = Deno.env.get("OPENCLAW_SECRET_TOKEN");
  if (!openClawToken) {
    console.error("OPENCLAW_SECRET_TOKEN is not set");
    return jsonResponse({ error: "Server misconfiguration" }, 500, corsHeaders);
  }

  const openClawApiUrl = (
    Deno.env.get("OPENCLAW_API_URL") ?? "https://api.openclaw.ai"
  ).replace(/\/$/, "");

  const defaultModel = Deno.env.get("OPENCLAW_MODEL") ?? "claude-3-5-sonnet-20241022";

  // --- Security: Allowed models allowlist ---
  const ALLOWED_MODELS = [
    "claude-3-5-sonnet-20241022",
    "claude-3-5-sonnet-20240620",
    "claude-3-haiku-20240307",
    "claude-3-opus-20240229",
    "gpt-4o",
    "gpt-4o-mini",
    "gpt-4-turbo",
    "gpt-3.5-turbo",
    "gemini-1.5-pro",
    "gemini-1.5-flash",
    "gemini-2.0-flash",
    "google/gemini-2.5-flash",
  ];

  // --- Parse and validate request body ---
  let body: ChatRequestBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400, corsHeaders);
  }

  const messages = body.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return jsonResponse({ error: "messages array is required and must not be empty" }, 400, corsHeaders);
  }

  if (messages.length > 50) {
    return jsonResponse({ error: "messages array exceeds the limit of 50 items" }, 400, corsHeaders);
  }

  const allowedRoles = new Set(["system", "user", "assistant"]);
  const sanitizedMessages = [];
  for (const message of messages) {
    if (!message || typeof message !== "object") {
      return jsonResponse({ error: "Each message must be an object" }, 400, corsHeaders);
    }

    const role = typeof message.role === "string" ? message.role.trim() : "";
    const content = typeof message.content === "string" ? message.content.trim() : "";

    if (!allowedRoles.has(role)) {
      return jsonResponse({ error: `Invalid message role: ${role || "empty"}` }, 400, corsHeaders);
    }

    if (!content || content.length > 8000) {
      return jsonResponse({ error: "Message content is required and must be 8000 characters or fewer" }, 400, corsHeaders);
    }

    sanitizedMessages.push({ role, content });
  }

  const requestedModel =
    typeof body.model === "string" && body.model.trim().length > 0
      ? body.model.trim()
      : defaultModel;
  if (!ALLOWED_MODELS.includes(requestedModel)) {
    console.warn(`Blocked request for unallowed model: ${requestedModel} from user ${user.id}`);
    return jsonResponse({ 
      error: "Model not allowed", 
      allowed_models: ALLOWED_MODELS 
    }, 400, corsHeaders);
  }

  const model = requestedModel;

  // --- Forward to LLM API ---
  const llmUrl = `${openClawApiUrl}/v1/chat/completions`;

  let llmResponse: Response;
  try {
    llmResponse = await fetch(llmUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${openClawToken}`,
      },
      body: JSON.stringify({
        model,
        messages: sanitizedMessages,
        stream: false,
      }),
    });
  } catch (err) {
    console.error("Failed to reach LLM API:", err);
    return jsonResponse({ error: "Failed to reach LLM API" }, 502, corsHeaders);
  }

  if (!llmResponse.ok) {
    const errorText = await llmResponse.text().catch(() => "unknown error");
    console.error(`LLM API returned ${llmResponse.status}: ${errorText}`);
    return jsonResponse(
      { error: `LLM API error: ${llmResponse.status}` },
      llmResponse.status >= 500 ? 502 : llmResponse.status,
      corsHeaders,
    );
  }

  // --- Return LLM response as-is (OpenAI-compatible format) ---
  const llmData = await llmResponse.json();
  return okJsonResponse(llmData, corsHeaders);
});
