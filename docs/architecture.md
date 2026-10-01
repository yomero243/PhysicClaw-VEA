# Architecture

## The big picture

```
┌────────────────────────────────────────────────────────────┐
│ BROWSER — React 19 + React Three Fiber                     │
│                                                            │
│  Zustand stores          3D scene            Chat UI       │
│  soulStore (entity)  →   EnergyShader    ←   ChatInterface │
│  sceneStore (data)       DynamicCharacter    Toasts        │
│  toastStore, splatStore  RemoteAvatars                     │
└───────────────┬────────────────────────────┬───────────────┘
                │ supabase-js (anon JWT)     │ HMR / HTTP
                ▼                            ▼
┌───────────────────────────────┐  ┌────────────────────────┐
│ SUPABASE                      │  │ DEV SERVER (Vite)      │
│  Auth (anonymous sessions)    │  │  /api/control endpoint │
│  Postgres + RLS               │  │  openclaw-control.json │
│  Realtime (presence, scenes)  │  │  watcher → HMR events  │
│  Storage (GLB models)         │  └────────────────────────┘
│  Edge Functions:              │
│   • chat    → LLM gateway     │──►  OpenAI-compatible LLM
│   • control → agent commands  │     (OpenClaw gateway)
└───────────────────────────────┘
```

## Data flow: a chat message

1. The user types in **ChatInterface** and hits send.
2. The message is persisted to the `messages` table via **sceneStore** (owner-scoped RLS).
3. **openClawService** builds the request — system prompt + capped conversation history — and invokes the **`chat` Edge Function** with the user's JWT.
4. The Edge Function validates JWT, origin, model allowlist, message shape, and rate limit, then forwards to the LLM gateway using the server-side secret.
5. The reply comes back as structured JSON: `{ text, mood, intensity }`.
6. **soulStore** applies `mood` and `intensity` → the **EnergyShader** and character animation react instantly; the reply is persisted and optionally spoken aloud (SpeechSynthesis).
7. On failure, nothing fake is persisted: a **toast** shows the error, the avatar turns sad, and the input is restored for retry.

## Data flow: an external agent command

See [Agent Control API](agent-control.md) for the full contract.

- **Development:** `POST /api/control` on the Vite dev server (or write `openclaw-control.json`) → broadcast as an HMR event → `useOpenClawControl` applies it to `soulStore`.
- **Production:** `POST /functions/v1/control` with a per-user agent token → the Edge Function validates and executes → delivery to the running app via a private Realtime channel (`control:{userId}`).

## Design decisions

**Anonymous-first auth.** Every visitor gets a real `authenticated` Supabase session without signing up. This keeps onboarding at zero friction while still giving each user isolated, RLS-protected rows. Account linking (upgrading an anonymous session to a permanent account) is a planned v2.x feature.

**Secrets never reach the browser.** The LLM token lives only as an Edge Function secret. The `verify-env` build gate fails any build where a secret-like `VITE_*` variable exists. In development you *may* use a direct client token, but that path is compiled out of production builds (`import.meta.env.PROD` guard).

**The database is the boundary.** The client talks to Postgres directly through supabase-js, so **RLS is the security model**, not a trusted API layer. Every table carries an owner policy (`(SELECT auth.uid()) = user_id`); see [Backend](backend.md#row-level-security).

**Mood as a first-class protocol.** The LLM is instructed to answer in strict JSON (`text`, `mood`, `intensity`). Mood drives shader color/energy via a fixed mapping, which makes the entity's emotional state deterministic and testable rather than an LLM-side effect.

**Store separation.** `soulStore` holds *ephemeral entity state* (mood, intensity, active character — partially persisted to localStorage), while `sceneStore` holds *cloud-persistent data* (scene, objects, messages, avatar config) and owns all Supabase I/O. `toastStore` is the single channel for user-facing errors.

## Source layout

```
src/
├── components/     # UI + 3D (Experience, ChatInterface, DynamicCharacter, panels, Toasts)
├── store/          # Zustand: soulStore, sceneStore, splatStore, mineStore, toastStore
├── services/       # openClawService (LLM chat)
├── multiplayer/    # presenceSystem, sessionClient, zod validation
├── hooks/          # useMultiplayer, usePresence, useGLBUpload, useAnimationRetarget, ...
├── shaders/        # EnergyShader, DemoShader (GLSL)
├── auth/           # AuthProvider (anonymous sessions)
├── lib/            # supabase client + typed APIs, constraints (zod), bone maps
└── constants/      # CHARACTERS config

supabase/
├── functions/      # chat/ and control/ Edge Functions (Deno)
└── migrations/     # 001–012 SQL migrations

docs/               # this documentation (MkDocs, Read the Docs)
```
