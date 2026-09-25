# Configuration

All configuration is driven by environment variables. Copy `.env.example` to `.env` for local development. **Anything prefixed `VITE_` is compiled into the browser bundle** — never put secrets there.

## Client variables (`VITE_*`, public)

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | ✅ | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | ✅ | Supabase anon/publishable key (safe to expose; RLS enforces access) |
| `VITE_OPENCLAW_API_URL` | — | Base URL of an OpenAI-compatible gateway for **local development only**. Empty = use the built-in Vite proxy (`/v1` → `http://127.0.0.1:18789`) |
| `VITE_OPENCLAW_MODEL` | — | Model id sent in chat requests (default `google/gemini-2.5-flash`) |
| `VITE_PORT` | — | Vite dev server port (default `5173`) |
| `VITE_CONTROL_POLL_MS` | — | Poll interval for `openclaw-control.json` (default `2000` ms) |

## Server variables (dev server / tooling)

| Variable | Description |
|---|---|
| `OPENCLAW_LOCAL_PORT` | Port of the local LLM proxy that the Vite `/v1` proxy forwards to (default `18789`) |
| `CONTROL_API_TOKEN` | Token required to `POST /api/control` on the dev server. If unset, a random token is generated and logged to stdout on startup |

## Edge Function secrets (Supabase, server-side only)

Set these in the Supabase dashboard (**Edge Functions → Secrets**) or with `npx supabase secrets set`:

| Variable | Function | Description |
|---|---|---|
| `OPENCLAW_SECRET_TOKEN` | `chat` | Bearer token for the upstream LLM gateway. **Required** for AI replies |
| `OPENCLAW_API_URL` | `chat` | Upstream gateway base URL (default `https://api.openclaw.ai`) |
| `OPENCLAW_MODEL` | `chat` | Default model when the client doesn't request one |
| `CHAT_ALLOWED_ORIGINS` | `chat` | Comma-separated CORS origin allowlist (defaults to localhost dev origins) |
| `CHAT_RATE_LIMIT_PER_MINUTE` | `chat` | Per user+IP request budget (default `12`) |
| `CONTROL_RATE_LIMIT_PER_MINUTE` | `control` | State-command budget per agent token (default `60`) |
| `CONTROL_SCENE_RATE_LIMIT_PER_MINUTE` | `control` | Scene-command budget per agent token (default `10`) |

!!! warning "The `verify-env` build gate"
    `npm run build` runs `scripts/verify-env.js` first. It **fails the build** if any `VITE_*` variable has a secret-looking name (token, key, secret…) that is not explicitly allowlisted. This prevents accidentally shipping credentials to the browser.

## Where each value lives per environment

| Environment | Where to configure |
|---|---|
| Local | `.env` file (gitignored) |
| Vercel (production) | Project → Settings → Environment Variables (`VITE_*` only) |
| Supabase Edge Functions | Dashboard → Edge Functions → Secrets (never `VITE_*`) |
| GitHub Actions | Repo → Settings → Secrets and variables → Actions |
