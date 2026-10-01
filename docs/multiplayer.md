# Multiplayer

PhysicClaw-VEA scenes are multi-user: connected users see each other's presence and avatars in real time.

## How it works

- **Presence** — `usePresence` / `presenceSystem` join a Supabase Realtime presence channel keyed by scene. Each client broadcasts its user id, name, and avatar state; everyone receives join/leave events.
- **Scene events** — `useMultiplayer(sceneId)` exposes the list of `remoteUsers` and an `emit` function for broadcasting events (movement, interactions) to the other participants.
- **Scene object sync** — `sceneStore` subscribes to Postgres changes on `scene_objects` for the active scene; inserts/updates/deletes made by any participant (or by an external agent through the [control API](agent-control.md)) appear live for everyone.
- **Validation** — all inbound multiplayer payloads are parsed with zod schemas in `src/multiplayer/validation.ts` before being applied.

## UI

- **UserDiscoveryPanel** — lists remote users detected in the current scene (`N USERS`, `AUTO SCAN`).
- **RemoteAvatars** — renders a representation of each remote user inside the 3D scene.
- **InterfaceChrome** — the header shows the live online count.

## Persistence model

| Table | Role |
|---|---|
| `sessions` | A chat/scene session per user |
| `session_users` | Which users participate in which session |
| `physics_events` | Ordered event log for scene physics/interactions |

Access rules (migrations `005`/`006`/`009`): users may only create presence rows for sessions they own, and may only read scenes/objects for scenes they own **or legitimately joined through a session**. Writes are always owner-bound — you can never modify another user's rows.

!!! warning
    The multiplayer *tables* (`session_users`, `physics_events`) are part of migrations `005`+ which are **not yet applied to the production project** — presence works (it's channel-based, no DB), but event persistence is pending the migration sync described in [Deployment](deployment.md).
