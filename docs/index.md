# PhysicClaw-VEA

**PhysicClaw-VEA** is a real-time, interactive 3D visualization environment that gives a digital "body" to an AI agent. A **Virtual Entity Augmented (VEA)** reacts dynamically to conversation — mood, intensity, and thinking states drive custom GLSL shaders and character animations — while scenes, chat history, and avatars persist to Supabase and sync across users in real time.

**Live app:** [physicclaw.vercel.app](https://physicclaw.vercel.app) ·
**Source:** [github.com/yomero243/PhysicClaw-VEA](https://github.com/yomero243/PhysicClaw-VEA)

## What can it do?

- **Reactive 3D entity** — a React Three Fiber scene where a custom `EnergyShader` visualizes the agent's `mood`, `intensity`, and `isThinking` state in real time.
- **AI chat with emotional states** — messages flow through a Supabase Edge Function to an OpenAI-compatible LLM gateway; responses carry structured mood data that animates the avatar.
- **Voice in / voice out** — Web Speech API for microphone input and spoken responses (Spanish, `es-ES`).
- **Character system** — switchable GLB/procedural characters with mood-driven animation, plus user-uploaded GLB models.
- **Gaussian splat environments** — load `.splat` environments by URL and persist them per scene.
- **Cloud persistence** — anonymous Supabase auth; scenes, 3D objects, chat sessions, and avatar configs stored in Postgres behind row-level security.
- **Multi-user presence** — realtime channels broadcast presence and scene events to other connected users.
- **External agent control** — any external agent (Claude, custom scripts, CI jobs) can drive the entity through the [Agent Control API](agent-control.md).

## Documentation map

| Section | What you'll find |
|---|---|
| [Getting Started](getting-started.md) | Install, configure, and run the app locally |
| [Configuration](configuration.md) | Every environment variable, client and server side |
| [Architecture](architecture.md) | The big picture: layers, data flow, design decisions |
| [Frontend](frontend.md) | Stores, components, characters, shaders, mood system |
| [Backend](backend.md) | Database schema, RLS model, Edge Functions |
| [Multiplayer](multiplayer.md) | Presence, realtime events, session model |
| [Agent Control API](agent-control.md) | Drive the entity from external agents (dev + production) |
| [Deployment & Operations](deployment.md) | CI/CD, Vercel, Supabase sync, releases |
| [Roadmap](roadmap.md) | Phase status: what's done, in progress, planned |
| [Troubleshooting](troubleshooting.md) | Common errors and their fixes |

## Tech stack

React 19 · TypeScript · Vite 7 · Three.js + React Three Fiber + Drei · Zustand · Supabase (Auth, Postgres + RLS, Realtime, Storage, Edge Functions) · Zod · Vitest

## License

[MIT](https://github.com/yomero243/PhysicClaw-VEA/blob/main/LICENSE) © 2026 Gabriel Cerdio
