# Troubleshooting

## The header says `INITIALIZING` forever / toast "Error al iniciar sesión anónima."

Anonymous sign-ins are disabled in your Supabase project. Enable them:
**Dashboard → Authentication → Sign In / Providers → Allow anonymous sign-ins**, then reload the app.

## Chat never replies (avatar goes sad, toast "No se pudo conectar con el asistente")

The `chat` Edge Function is unreachable or misconfigured. Check in order:

1. Is the function deployed? `npx supabase functions list`
2. Are its secrets set? It returns HTTP 500 `Server misconfiguration` when `OPENCLAW_SECRET_TOKEN` is missing.
3. Is your origin allowed? A 403 means `CHAT_ALLOWED_ORIGINS` doesn't include your domain.
4. HTTP 429 means you hit the per-user rate limit (default 12/min).
5. Inspect logs: **Dashboard → Edge Functions → chat → Logs**.

## Messages don't persist (`POST /rest/v1/messages` returns 400)

The production `messages` table is missing the columns from migration `008` (`session_id`, `mood_snapshot`, …). Sync migrations: `npx supabase db push`.

## `npm run build` fails with a `verify-env` error

You have a `VITE_*` variable whose name looks like a secret (contains *token*, *key*, *secret*…). `VITE_*` values are compiled into the public bundle — move the secret to a server-side location (Edge Function secret) and remove it from `.env`.

## `/api/control` returns 401/403 in development

The dev control endpoint requires `CONTROL_API_TOKEN`. If you didn't set one in `.env`, the dev server generated a random token and printed it to stdout at startup — use that, or set your own.

## Production control API returns 401

- The `X-Agent-Token` header is missing or the token was revoked. Tokens are shown **once** at creation (AGENT TOKENS panel); create a new one if lost.
- 429 means the per-token rate limit was hit (60/min state, 10/min scene commands).

## The 3D scene is black / performance is bad

- `PERF ECO` mode kicks in automatically on mobile and narrow windows — toggle it from the header (`PERF ULTRA`).
- Some `.splat` environment URLs are large; try the sample room first (`LOAD ROOM ENV`).
- Shader warnings from `THREE.WebGLProgram` in the console (e.g. `X4122`, floating point division by zero) are known driver-level noise on some GPUs and are harmless.

## Voice input does nothing

- `SpeechRecognition` is only available in Chromium-based browsers.
- If permission was denied, a toast appears — re-enable the microphone in the browser's site settings.

## Realtime presence shows 0 users when a friend is connected

Both users must be in the **same scene**. Presence is keyed by scene id — each anonymous user gets their own default scene, so a shared-scene flow (or the same scene id) is required to see each other.
