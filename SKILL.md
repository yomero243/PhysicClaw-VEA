---
name: physicclaw-vea
description: Control the PhysicClaw-VEA interactive 3D visualization application by sending commands to its Zustand store via a local control file. Use this skill to start the application and modify its internal state (mood, thinking, intensity, etc.).
---

# PhysicClaw-VEA Control Skill

This skill allows OpenClaw to interact with the running instance of the `PhysicClaw-VEA` application by writing commands to the `openclaw-control.json` file in the project root. The `PhysicClaw-VEA` application must be running (e.g., via `npm run dev`) for these commands to take effect.

## Commands

### 1. Start PhysicClaw-VEA in development mode

To start the application, navigate to the `PhysicClaw-VEA` project directory and run the development server.

```bash
cd PhysicClaw-VEA
npm run dev
```

### 2. Control the Soul Store

Use the `control_soul_store` function to send commands to the `PhysicClaw-VEA`'s Zustand store.

```python
# To set the mood:
default_api.write(
    file_path="PhysicClaw-VEA/openclaw-control.json",
    content='''{ "command": "setMood", "value": "excited", "id": "<timestamp_or_uuid>" }'''
)

# To set thinking state:
default_api.write(
    file_path="PhysicClaw-VEA/openclaw-control.json",
    content='''{ "command": "setIsThinking", "value": true, "id": "<timestamp_or_uuid>" }'''
)

# To set intensity:
default_api.write(
    file_path="PhysicClaw-VEA/openclaw-control.json",
    content='''{ "command": "setIntensity", "value": 0.8, "id": "<timestamp_or_uuid>" }'''
)

# To set the last message:
default_api.write(
    file_path="PhysicClaw-VEA/openclaw-control.json",
    content='''{ "command": "setLastMessage", "value": "Hello OpenClaw!", "id": "<timestamp_or_uuid>" }'''
)

# To set active character ID:
default_api.write(
    file_path="PhysicClaw-VEA/openclaw-control.json",
    content='''{ "command": "setActiveCharacterId", "value": "listening", "id": "<timestamp_or_uuid>" }'''
)
```

**Note:** Always include a unique `id` (e.g., a timestamp or UUID) with each command to ensure the application processes new commands and ignores stale ones.

## Example Usage

### Start application and make the entity excited

1.  Navigate to the `PhysicClaw-VEA` directory:
    ```bash
    cd PhysicClaw-VEA
    ```
2.  Start the development server (this will run in the background):
    ```bash
    npm run dev &
    ```
3.  Send a command to set the mood:
    ```python
    import time
    default_api.write(
        file_path="PhysicClaw-VEA/openclaw-control.json",
        content=f'''{{ "command": "setMood", "value": "excited", "id": "{int(time.time())}" }}'''
    )
    ```
