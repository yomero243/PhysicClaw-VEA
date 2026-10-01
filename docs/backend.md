# Backend (Supabase)

The app has no custom server: the browser talks to Supabase directly (Postgres via supabase-js, Realtime channels, Storage) and to two Deno **Edge Functions** for the operations that need server-side secrets or validation.

## Authentication

Anonymous sign-in (`signInAnonymously`) bootstraps every visitor into a real `authenticated` session — no registration. This must be enabled in the project (**Authentication → Sign In / Providers → Allow anonymous sign-ins**).

## Database schema

Migrations live in `supabase/migrations/` and are numbered `001`–`012`.

| Table | Purpose | Migration |
|---|---|---|
| `profiles` | One row per auth user (auto-created by trigger) | 001 |
| `scenes` | Scene settings: environment, camera, lighting | 001 |
| `objects_3d` | Legacy 3D object table | 001 |
| `messages` | Chat history with mood/intensity snapshots | 001 + 008 |
| `scene_objects` | Persistent scene objects (cubes, splats, models) | 004 |
| `sessions` | Chat sessions | 004 |
| `avatar_configs` | Per-user avatar customization | 004 |
| `user_preferences` | Misc user preferences | 003 |
| `session_users` | Multiplayer session membership | 005 |
| `physics_events` | Multiplayer physics/scene event log | 005 |
| `rate_limits` | Durable rate limiting shared across Edge Function isolates | 011 |
| `agent_tokens` | Hashed per-user tokens for the production control API | 012 |

## Row-Level Security

RLS is the security model — there is no trusted API tier between the browser and Postgres.

- **Owner policies everywhere** (migration `010`): each table has a single permissive policy `FOR ALL TO authenticated USING ((SELECT auth.uid()) = user_id) WITH CHECK (...)`. The `(SELECT ...)` wrapper makes Postgres evaluate `auth.uid()` once per statement instead of once per row.
- **Cross-owner protections** (migration `009`): security-definer helpers (`owns_scene`, `owns_session`, `can_access_scene`, `is_session_participant`) prevent attaching your rows to another user's scene/session, while letting legitimate scene participants read shared data.
- **Service-role-only tables**: `rate_limits` has RLS enabled with *no* policies — only the Edge Functions (service role) touch it.
- **Agent tokens** store only a SHA-256 hash; the plaintext is shown once at creation.

!!! tip "Check your RLS health"
    Supabase's advisors (Dashboard → Advisors, or the `get_advisors` MCP tool) lint for duplicate permissive policies, per-row `auth.uid()` evaluation, and missing FK indexes. Migration `010` was written to clear all of them — re-run the advisors after any policy change.

## `chat` Edge Function

`supabase/functions/chat` — authenticated proxy to an OpenAI-compatible LLM gateway.

**Request:** `POST /functions/v1/chat` with the user's Supabase JWT and body:

```json
{
  "model": "google/gemini-2.5-flash",
  "messages": [{ "role": "user", "content": "hola" }],
  "stream": false
}
```

**Validation pipeline:**

1. CORS origin allowlist (`CHAT_ALLOWED_ORIGINS`)
2. Supabase JWT → resolves the calling user
3. Rate limit per `user:ip` (`CHAT_RATE_LIMIT_PER_MINUTE`, default 12/min)
4. Message shape: ≤ 50 messages, each role ∈ {system, user, assistant}, content ≤ 8000 chars
5. Model allowlist
6. Forward to `OPENCLAW_API_URL` with the server-side `OPENCLAW_SECRET_TOKEN`

The response is returned in OpenAI `chat/completions` format unchanged.

**Deploy:**

```bash
npx supabase functions deploy chat
npx supabase secrets set OPENCLAW_SECRET_TOKEN=... OPENCLAW_API_URL=... CHAT_ALLOWED_ORIGINS=https://physicclaw.vercel.app
```

## `control` Edge Function

`supabase/functions/control` — production entry point for external agents. Validates an `X-Agent-Token` header against the hashed `agent_tokens` table, rate-limits per token (durable `rate_limits` table), executes scene commands server-side, and relays state commands to the owner's running app over a private Realtime channel (`control:{userId}`). Full contract in [Agent Control API](agent-control.md).

## Storage

The `models` bucket holds user-uploaded GLB files. Migration `007` makes it private with per-user path policies; the client renders models through short-lived signed URLs (1 h).

## Production sync status

!!! warning "Migration drift"
    The repo's migrations describe the target state, but as of the last audit the **production project only has `001`–`004`-equivalent schema plus `010` applied**. Migrations `005`–`009`, `011`, and `012` are pending a sync (`npx supabase db push`), which means in production: multiplayer tables don't exist yet, the `models` bucket is still public, message inserts with session columns fail, and the `control` function's tables are missing. The [Deployment](deployment.md) page tracks the exact sync steps.
