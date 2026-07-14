# Agent Control API

Any external agent — Claude, a Python script, a CI job — can drive the VEA's state: mood, intensity, thinking animation, active character, and even spawning persistent 3D objects.

There are three transport mechanisms; **commands and values are identical across all three**.

## Transports

### 1. Dev server HTTP endpoint (recommended locally)

The Vite dev server exposes `POST /api/control`, protected by `CONTROL_API_TOKEN` (auto-generated and logged on startup if unset):

```bash
curl -X POST http://localhost:5173/api/control \
  -H "Content-Type: application/json" \
  -d '{"command": "setMood", "value": "excited", "id": "1"}'
```

### 2. Control file (local)

Write JSON to `openclaw-control.json` in the project root; a Vite plugin watches the file and broadcasts the command over HMR:

```python
import json, time
json.dump(
    {"command": "setMood", "value": "excited", "id": str(time.time())},
    open("openclaw-control.json", "w"),
)
```

!!! note
    Always include a unique `id` (e.g. a timestamp). Consumers de-duplicate by `id` to avoid re-applying stale commands.

### 3. Production Edge Function

Works against the deployed app. Create a token in the app's **AGENT TOKENS** panel (shown once — only its SHA-256 hash is stored), then:

```bash
curl -X POST "https://<project-ref>.supabase.co/functions/v1/control" \
  -H "Content-Type: application/json" \
  -H "X-Agent-Token: pcvea_..." \
  -d '{"command": "setMood", "value": "excited", "id": "1"}'
```

Each token controls **only its owner's entity**; delivery is a private Realtime channel (`control:{userId}`). Rate limits per token: 60/min for state commands, 10/min for scene commands (configurable via `CONTROL_RATE_LIMIT_PER_MINUTE` / `CONTROL_SCENE_RATE_LIMIT_PER_MINUTE`).

## State commands

| Command | Value | Description |
|---------|-------|-------------|
| `setMood` | `"calm" \| "excited" \| "thinking" \| "listening"` | Entity mood (validated by zod; the chat system supports a wider mood set) |
| `setIsThinking` | `boolean` | Thinking animation + intensity boost |
| `setIntensity` | `number` (0–2, clamped) | Shader energy level |
| `setLastMessage` | `string` | Message shown in the chat UI |
| `setActiveCharacterId` | `string` | Switch character (`happy-idle`, `base-sphere`, …) |
| `setShaderColor` | `{ "characterId": "...", "color": "#rrggbb" }` | Per-character shader color |
| `setObjectVisibility` | `{ "id": "...", "visible": false }` | Show/hide a character or model |

## Scene commands

Scene commands create/delete rows in `scene_objects`; every connected client updates live via Realtime. In production they execute server-side, scoped to the token's user.

| Command | Value | Description |
|---------|-------|-------------|
| `spawnObject` | object (all fields optional) | Spawn a cube or a Gaussian splat. Fields: `label` (≤ 60 chars), `color` (`#rrggbb`), `position`/`rotation`/`scale` (`[x,y,z]`; position within ±50, scale 0.01–20), `model_url` (https URL ending in `.splat`) |
| `removeObject` | `string` | A `scene_objects` uuid (returned by `spawnObject`), or `"primitives"` to delete all cubes |

```bash
# Spawn a red cube and capture its id
curl -s -X POST "$CONTROL_URL" \
  -H "Content-Type: application/json" -H "X-Agent-Token: $TOKEN" \
  -d '{"command": "spawnObject", "value": {"color": "#ff4444", "position": [1, 0.5, 0]}, "id": "1"}'
# → {"ok":true,"objectId":"<uuid>"}
```

## Example workflow

```python
import requests, time

BASE = "http://localhost:5173/api/control"

def cmd(command, value):
    requests.post(BASE, json={"command": command, "value": value, "id": str(time.time())})

cmd("setIsThinking", True)
cmd("setMood", "thinking")
cmd("setIntensity", 1.5)
# ... agent does work ...
cmd("setIsThinking", False)
cmd("setMood", "excited")
cmd("setLastMessage", "¡Terminé la tarea!")
```

## Validation & internals

- Every payload is validated against `ControlCommandSchema` (zod, `src/lib/constraints.ts`) before being applied — invalid commands are rejected, never partially applied. Spawn bounds are mirrored server-side in the control function.
- Dev pipeline: Vite plugin (`vite.config.ts`) → HMR event `openclaw-command` → `useOpenClawControl` hook → `soulStore`.
- Production pipeline: `control` Edge Function → token hash lookup + durable rate limit → scene commands via service-role DB writes / state commands via private Realtime channel → the running app applies them to `soulStore`.

The agent-facing quick reference used by LLM agents lives at [`docs/agents/SKILL.md`](https://github.com/yomero243/PhysicClaw-VEA/blob/main/docs/agents/SKILL.md) (also served at `/SKILL.md` on the deployed site).
