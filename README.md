# PhysicClaw-VEA

[![CI](https://github.com/yomero243/PhysicClaw-VEA/actions/workflows/ci.yml/badge.svg)](https://github.com/yomero243/PhysicClaw-VEA/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

A body on the web for an AI agent. Each account has one entity: a GLSL aura whose colour, intensity and motion follow the agent's mood while you chat with it.

**Live:** [physic-claw-vea.vercel.app](https://physic-claw-vea.vercel.app) · Sister app: [VEA perZona](https://github.com/yomero243/VEA-perZona) (same account)

## Run it

```bash
npm install
cp .env.example .env   # fill in the values below
npm run dev            # http://localhost:5173
```

| Variable | What it is |
|---|---|
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY` | Your Supabase project. Public by design; RLS protects the data. |
| `LLM_API_URL`, `LLM_API_KEY` | Your LLM provider (any OpenAI-compatible API). |

**Your LLM key never leaves your machine.** The page calls `/v1/chat/completions` on its own origin, and the local Vite server (`dev` or `preview`) forwards it with the key from your `.env`. The UI never asks for it and Supabase never stores it. Never prefix it with `VITE_`: anything `VITE_*` ships to the browser, and the build refuses to run if it finds a secret-looking `VITE_*` variable.

| Command | |
|---|---|
| `npm run dev` | Dev server |
| `npm run build` | Env check + typecheck + production build |
| `npm run check` | Env check, typecheck, tests, lint |

## How it fits together

- **Frontend:** React 19, Vite, React Three Fiber, Zustand. Day and night themes follow your local clock; the layout adapts to phones.
- **Supabase** (one project, shared with perZona):
  - email + password auth;
  - `entities`: one row per account with its look, idle, default mood and last place;
  - scenes, objects and chat history, all owner-only under RLS;
  - Realtime for multi-user presence.
- **Agents** drive the entity through the `control` Edge Function with a hashed, revocable agent token. The contract is in [public/SKILL.md](public/SKILL.md), also served at `/SKILL.md`.

```
src/
├── components/   Experience (3D canvas), AuraEntity, ChatInterface, panels
├── store/        soulStore (entity state), sceneStore (persistence), toastStore
├── services/     openClawService: chat through the local /v1 proxy
├── shaders/      AuraShader (core, halo, particles)
├── theme/        day / night palettes
└── lib/          Supabase client, typed table APIs, command validation
supabase/
├── functions/control/   agent entry point
└── migrations/          001–018, applied in order
```

## Deploy

Vercel builds `main` automatically. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` in the Vercel project. Apply new migrations in order before merging code that needs them.

[Security policy](SECURITY.md) · [MIT](LICENSE) © 2026 Gabriel Cerdio
