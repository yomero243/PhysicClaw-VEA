---
name: physicclaw-vea
description: Control the PhysicClaw-VEA interactive 3D visualization application by sending commands to its Zustand store. Supports two control mechanisms: writing to the openclaw-control.json file, or sending HTTP POST requests to the /api/control endpoint. Use this skill to start the application and modify its internal state (mood, thinking, intensity, character, etc.).
---

# PhysicClaw-VEA Control Skill

This skill allows Claude (or any external agent) to interact with a running instance of the `PhysicClaw-VEA` application.

The application must be running (`npm run dev`) for commands to take effect.

---

## Starting the Application

```bash
cd PhysicClaw-VEA
npm run dev
```

The dev server listens on `http://localhost:5173` by default.

---

## Control Mechanisms

There are two ways to send commands. Both are equivalent.

### Method 1 — HTTP POST to `/api/control` (recommended)

The Vite dev server exposes a `POST /api/control` endpoint. Send a JSON body with `command`, `value`, and a unique `id`.

```bash
curl -X POST http://localhost:5173/api/control \
  -H "Content-Type: application/json" \
  -d '{"command": "setMood", "value": "excited", "id": "1"}'
```

```python
import requests, time

def send_command(command: str, value):
    requests.post(
        "http://localhost:5173/api/control",
        json={"command": command, "value": value, "id": str(int(time.time()))},
    )

send_command("setMood", "excited")
send_command("setIsThinking", True)
send_command("setIntensity", 0.8)
send_command("setLastMessage", "Hello from Claude!")
send_command("setActiveCharacterId", "base-sphere")
```

### Method 2 — Write to `openclaw-control.json`

Write a JSON object to the `openclaw-control.json` file in the project root. The Vite plugin watches for changes and broadcasts the command via HMR.

```python
import json, time

def send_command(command: str, value):
    with open("PhysicClaw-VEA/openclaw-control.json", "w") as f:
        json.dump({"command": command, "value": value, "id": str(int(time.time()))}, f)

send_command("setMood", "excited")
```

> **Important:** Always include a unique `id` (e.g., a Unix timestamp) with each command. The plugin and the `OpenClawControl` component both use this `id` to avoid re-processing stale commands.

---

## Available Commands

| Command | Value type | Description |
|---------|-----------|-------------|
| `setMood` | `string` | Set the entity mood. Values: `'calm'`, `'excited'`, `'thinking'`, `'listening'` |
| `setIsThinking` | `boolean` | Toggle thinking animation and intensity boost (+0.8) |
| `setIntensity` | `number` | Set shader energy intensity (range: 0 to ~2, default: 0.5) |
| `setLastMessage` | `string` | Set the last message displayed in the chat UI |
| `setActiveCharacterId` | `string` | Switch the active 3D character. Values: `'happy-idle'`, `'base-sphere'` |

---

## Available Characters

| ID | Name | Description |
|----|------|-------------|
| `happy-idle` | Happy Bot | Animated FBX character (`/HappyIdle.fbx`), Mixamo rig |
| `base-sphere` | Energy Core | Procedural sphere with `EnergyShader` (no external model needed) |

---

## Example Workflows

### Make the entity excited while "thinking"

```python
import requests, time

BASE = "http://localhost:5173/api/control"

def cmd(command, value):
    requests.post(BASE, json={"command": command, "value": value, "id": str(time.time())})

cmd("setIsThinking", True)
cmd("setMood", "excited")
cmd("setIntensity", 1.5)
# ... do work ...
cmd("setIsThinking", False)
cmd("setMood", "calm")
cmd("setIntensity", 0.5)
```

### Switch to Energy Core and send a message

```python
cmd("setActiveCharacterId", "base-sphere")
cmd("setLastMessage", "Switching to Energy Core mode")
cmd("setMood", "listening")
```

---

## How It Works Internally

1. **Vite Plugin** (`vite.config.ts` — `openClawControlPlugin`):
   - Watches `openclaw-control.json` for file changes.
   - Exposes `POST /api/control` on the dev server.
   - Broadcasts valid commands as a custom HMR event `openclaw-command` via the Vite WebSocket.

2. **`useOpenClawControl` hook** (`src/hooks/useOpenClawControl.ts`):
   - Subscribes to the `openclaw-command` HMR event via `import.meta.hot`.
   - Applies received commands directly to the Zustand `soulStore`.

3. **`OpenClawControl` component** (`src/OpenClawControl.tsx`):
   - Alternative polling mechanism: fetches `/openclaw-control.json` every second and applies any new command (identified by `id`).
