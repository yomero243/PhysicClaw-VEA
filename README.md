# PhysicClaw-VEA

[![CI](https://github.com/yomero243/PhysicClaw-VEA/actions/workflows/ci.yml/badge.svg)](https://github.com/yomero243/PhysicClaw-VEA/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

**PhysicClaw-VEA** is a real-time, interactive 3D visualization environment that gives a digital "body" to an AI agent. A **Virtual Entity Augmented (VEA)** reacts dynamically to conversation — mood, intensity, and thinking states drive custom GLSL shaders and character animations — while scenes, chat history, and avatars persist to Supabase and sync across users in real time.

**Live:** [physicclaw.vercel.app](https://physicclaw.vercel.app)

## Features

- **Reactive 3D entity** — React Three Fiber scene with a custom `EnergyShader` that visualizes the agent's `mood`, `intensity`, and `isThinking` state in real time.
- **AI chat with emotional states** — messages go through a Supabase Edge Function to an OpenAI-compatible LLM gateway; responses carry structured mood data that animates the avatar.
- **Voice in / voice out** — Web Speech API for microphone input and spoken responses (`es-ES`).
- **Character system** — switchable FBX/GLB characters with mood-driven animation retargeting, plus user-uploaded GLB models stored in Supabase Storage.
- **Gaussian splat environments** — load `.splat` environments by URL and persist them per scene.
- **Cloud persistence** — email + password login (one account shared with VEA perZona); scenes, 3D objects, chat sessions and each account's entity (appearance + last place) stored in Postgres behind row-level security.
- **Multi-user presence** — realtime channels broadcast presence and scene events to other connected users (user discovery panel, remote avatars).
- **External agent control** — external agents can drive the entity state via `openclaw-control.json` (file watcher) or the dev server's authenticated `/api/control` endpoint. See [docs/agents/SKILL.md](docs/agents/SKILL.md).
- **Error surfacing** — toast notification system reports persistence/chat failures to the user instead of failing silently.

## Tech Stack

React 19 · TypeScript · Vite 7 · Three.js + React Three Fiber + Drei · Zustand · Supabase (Auth, Postgres + RLS, Realtime, Storage, Edge Functions) · Zod · Vitest

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .env.example .env    # then fill in your Supabase URL + anon key

# 3. Run
npm run dev             # http://localhost:5173
```

See [.env.example](.env.example) for every variable with descriptions. The two required ones are `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.

> **Your API key never leaves your machine.** Put `LLM_API_KEY` (and `LLM_API_URL`) in your personal `.env`. The local Vite server (`npm run dev` / `npm run preview`) adds it to the requests it forwards; the page never sees it, the UI never asks for it, and it is never stored in Supabase. Never prefix it with `VITE_` — anything `VITE_*` ships to the browser, and the build's `verify-env` gate fails if it finds a secret-like `VITE_*` variable.

### Scripts

| Command | Description |
|---|---|
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Type-check + production build (runs `verify-env` first) |
| `npm run check` | Full gate: env check, typecheck, tests, lint |
| `npm test` | Vitest run |
| `npm run lint` / `npm run format` | ESLint / Prettier |

## Project Structure

```
src/
├── components/     # UI + 3D: Experience (R3F canvas), ChatInterface, DynamicCharacter,
│                   # panels (Avatar, GLBUpload, GaussianSplat, UserDiscovery), Toasts, InterfaceChrome
├── store/          # Zustand stores: soulStore (entity state), sceneStore (persistence),
│                   # splatStore, mineStore, toastStore
├── services/       # openClawService — LLM chat via Supabase Edge Function
├── multiplayer/    # presence system, session client, zod validation
├── hooks/          # useMultiplayer, usePresence, useGLBUpload, useAnimationRetarget, ...
├── shaders/        # EnergyShader, DemoShader (GLSL)
├── auth/           # AuthProvider (email + password sessions)
├── lib/            # supabase client + typed table APIs, constraints, bone maps
└── constants/      # CHARACTERS config

supabase/
├── functions/chat/ # Edge Function: authenticated LLM proxy (JWT + CORS + rate limit)
└── migrations/     # 001–010 SQL migrations

docs/agents/        # Context files for AI coding agents (GEMINI.md, SKILL.md)
```

## Characters

Defined in [src/constants/characters.ts](src/constants/characters.ts):

| ID | Name | Type |
|----|------|------|
| `base-sphere` | Entity | Procedural aura: core, halo and GPU particles (`AuraEntity`), coloured by mood |

Switch via the character tabs in the chat UI, or externally through the control interface. Users can also upload their own GLB models.

## Backend

- **Auth:** email + password (Supabase). The same account signs in to VEA perZona: one shared project, many tenants, isolated by RLS.
- **Database:** Postgres tables (`profiles`, `scenes`, `scene_objects`, `objects_3d`, `sessions`, `messages`, `entities`) with owner-scoped RLS policies. Migration `010` consolidated all policies into single per-table owner policies using `(SELECT auth.uid())` (statement-level evaluation) scoped to `authenticated`.
- **Chat:** the page calls same-origin `/v1/chat/completions`; the local Vite server forwards it to `LLM_API_URL` with the key from your personal `.env`. The `chat` Edge Function is no longer called by the app (it used a single project-owned key).
- **CI/CD:** GitHub Actions runs typecheck, tests, lint, and build on every push/PR to `main`/`develop`. Vercel deploys from Git integration. Dependabot keeps dependencies patched.

### Known gaps (tracked)

- Repo migrations `005–009` (multiplayer tables, cross-owner RLS, private model bucket) are **not yet applied** to the production project — multiplayer persistence and the private `models` bucket are pending a migration sync.
- The `chat` Edge Function must be deployed and its secrets configured for AI replies to work in production.
- Edge Function rate limiting is in-memory (per-isolate); a durable store is planned.

## Roadmap

| Phase | Goal | Status |
|-------|------|--------|
| **v1.x** | Single-user local app: reactive VEA, AI chat, FBX/GLB support | ✅ Done |
| **v2.0** | Auth + cloud scene persistence (Supabase, RLS) | ✅ Done (email + password, shared with perZona) |
| **v2.5** | Real-time collaborative scenes (presence, realtime events) | 🟡 In progress — client ready, DB sync pending |
| **v3.0** | CI/CD, staging/production environments, monitoring | 🟡 In progress — CI + deploys live, monitoring pending |
| **v3.5** | Agent marketplace: per-user system prompts, models, avatars | ⬜ Planned |
| **v4.0** | WebGPU renderer + TSL shaders | ⬜ Planned |

## Security

See [SECURITY.md](SECURITY.md) for the security policy and how to report vulnerabilities.

## License

[MIT](LICENSE) © 2026 Gabriel Cerdio
