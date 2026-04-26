import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS_HEADERS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(
  body: Record<string, unknown>,
  status = 200,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, "Content-Type": "application/json" },
  });
}

interface ChatRequestBody {
  model?: string;
  messages?: Array<{ role: string; content: string }>;
  stream?: boolean;
}

Deno.serve(async (req: Request) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  // --- Authenticate the caller via Supabase JWT ---
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return jsonResponse({ error: "Missing or invalid Authorization header" }, 401);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");
  if (!supabaseUrl || !supabaseAnonKey) {
    return jsonResponse({ error: "Server misconfiguration" }, 500);
  }

  const supabase = createClient(supabaseUrl, supabaseAnonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return jsonResponse({ error: "Unauthorized" }, 401);
  }

  // --- Read LLM secrets (server-side only) ---
  const openClawToken = Deno.env.get("OPENCLAW_SECRET_TOKEN");
  if (!openClawToken) {
    console.error("OPENCLAW_SECRET_TOKEN is not set");
    return jsonResponse({ error: "Server misconfiguration" }, 500);
  }

  const openClawApiUrl = (
    Deno.env.get("OPENCLAW_API_URL") ?? "https://api.openclaw.ai"
  ).replace(/\/$/, "");

  const defaultModel = Deno.env.get("OPENCLAW_MODEL") ?? "claude-3-5-sonnet-20241022";

  // --- Parse and validate request body ---
  let body: ChatRequestBody;
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ error: "Invalid JSON body" }, 400);
  }

  const messages = body.messages;
  if (!Array.isArray(messages) || messages.length === 0) {
    return jsonResponse({ error: "messages array is required and must not be empty" }, 400);
  }

  const model = typeof body.model === "string" && body.model.length > 0
    ? body.model
    : defaultModel;

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
        messages,
        stream: false,
      }),
    });
  } catch (err) {
    console.error("Failed to reach LLM API:", err);
    return jsonResponse({ error: "Failed to reach LLM API" }, 502);
  }

  if (!llmResponse.ok) {
    const errorText = await llmResponse.text().catch(() => "unknown error");
    console.error(`LLM API returned ${llmResponse.status}: ${errorText}`);
    return jsonResponse(
      { error: `LLM API error: ${llmResponse.status}` },
      llmResponse.status >= 500 ? 502 : llmResponse.status,
    );
  }

  // --- Return LLM response as-is (OpenAI-compatible format) ---
  const llmData = await llmResponse.json();
  return jsonResponse(llmData);
});
