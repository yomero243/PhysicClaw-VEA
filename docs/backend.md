# Backend (Supabase)

The app has no custom server: the browser talks to Supabase directly (Postgres via supabase-js, Realtime channels, Storage) and to two Deno **Edge Functions** for the operations that need server-side secrets or validation.

## Authentication

Email + password. The same account signs in to VEA perZona: both apps use one shared project, and every tenant's rows are isolated by RLS. The app never signs anyone in anonymously (an anonymous user is new on every sign-in, so nothing it saved survives a reload).

## Database schema

Migrations live in `supabase/migrations/` and are numbered `001`–`016`. This repository owns the whole schema of the shared project; VEA perZona's former migrations are `013`–`015`.

| Table | Purpose | Migration |
|---|---|---|
| `profiles` | One row per auth user (auto-created by trigger) | 001 |
| `scenes` | Scene settings: environment, camera, lighting | 001 |
| `objects_3d` | Legacy 3D object table | 001 |
| `messages` | Chat history with mood/intensity snapshots | 001 + 008 |
| `scene_objects` | Persistent scene objects (cubes, splats, models) | 004 |
| `sessions` | Chat sessions | 004 |
| `entities` | One row per account, all tenants in one table: appearance (`form` from perZona, `look` from the panel), idle clip, default mood, and last place (`last_scene_id`, `last_position`, `last_rotation`). Owner-only RLS; other tenants see appearance only, through the `entity_appearances` view. No files, no secrets | 016 |
| `costumes`, `rigs`, `animation_clips` | perZona wardrobe and animation library | 013–015 |
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

## No LLM function

There is no chat Edge Function. The app sends chat to `/v1/chat/completions` on its own origin; the local Vite proxy forwards it with the key from that user's personal `.env`. Supabase never sees or stores an LLM key.

## `control` Edge Function

`supabase/functions/control` — production entry point for external agents. Validates an `X-Agent-Token` header against the hashed `agent_tokens` table, rate-limits per token (durable `rate_limits` table), executes scene commands server-side, and relays state commands to the owner's running app over a private Realtime channel (`control:{userId}`). Full contract in [Agent Control API](agent-control.md).

## Storage

The `models` bucket holds user-uploaded GLB files. Migration `007` makes it private with per-user path policies; the client renders models through short-lived signed URLs (1 h).

## Production sync status

!!! warning "Migration drift"
    The repo's migrations describe the target state, but as of the last audit the **production project only has `001`–`004`-equivalent schema plus `010` applied**. Migrations `005`–`009`, `011`, and `012` are pending a sync (`npx supabase db push`), which means in production: multiplayer tables don't exist yet, the `models` bucket is still public, message inserts with session columns fail, and the `control` function's tables are missing. The [Deployment](deployment.md) page tracks the exact sync steps.
