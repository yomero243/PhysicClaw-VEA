# PhysicClaw-VEA

**PhysicClaw-VEA** is an interactive 3D visualization application built with modern web technologies. It features a "Virtual Entity Augmented" (VEA) that reacts dynamically to simulated internal states (thinking, emotions) through custom shaders, animations, and real AI conversation via the OpenClaw API.

## Key Features

- **Advanced 3D Visualization**: Uses **React Three Fiber** and **Three.js** to render an immersive 3D scene with environment lighting and contact shadows.
- **Reactive Shaders**: `EnergyShader` visually modifies the entity based on `intensity`, `isThinking`, and `mood` state.
- **"Soul" System**: Global state management with **Zustand** to simulate entity behaviors (`isThinking`, `mood`, `intensity`, `lastMessage`, `activeCharacterId`).
- **AI Chat Interface**: Overlay UI to send text messages to the OpenClaw API (default model: `google/gemini-2.5-flash`) and receive AI responses.
- **Voice Input / Text-to-Speech**: Microphone support via the Web SpeechRecognition API and spoken responses via SpeechSynthesis, both configured for `es-ES`.
- **Dynamic Character System**: `DynamicCharacter` component loads FBX or GLB models defined in `CHARACTERS` config and switches animations based on the active mood.
- **GLB Model Support**: Loads external GLB models with animations and applies the `EnergyShader` to all meshes.
- **FBX Character Loader**: Loads animated FBX characters (e.g., Mixamo rigs) with mood-driven animation switching.
- **OpenClaw External Control**: Two mechanisms let external agents control the entity state at runtime:
  - Write a JSON command to `openclaw-control.json` (watched by the Vite plugin).
  - POST a JSON command to the `/api/control` HTTP endpoint exposed by the Vite dev server.

## Setup

Follow these steps to get PhysicClaw-VEA running locally from scratch.

### 1. Configure environment variables

```bash
# From the project root
cp .env.example .env
```

Adjust the variables as needed (see `.env.example` for the full list with descriptions).

### 2. Install dependencies and start the project

```bash
# Install Node dependencies
npm install

# Start the Vite dev server
npm run dev
```

The app will be available at `http://localhost:5173` (or the port set in `VITE_PORT`).

To build for production:

```bash
npm run build
npm run preview   # serves the build locally to verify
```

---

## Technologies Used

- [Vite](https://vitejs.dev/) — build tool and dev server
- [React](https://react.dev/) (v19)
- [TypeScript](https://www.typescriptlang.org/)
- [Three.js](https://threejs.org/)
- [React Three Fiber](https://docs.pmnd.rs/react-three-fiber) — React renderer for Three.js
- [React Three Drei](https://github.com/pmndrs/drei) — helpers for R3F (`useGLTF`, `useFBX`, `ContactShadows`, `Environment`, `OrbitControls`, ...)
- [Zustand](https://zustand-demo.pmnd.rs/) — global state management

## Installation and Usage

1. **Install dependencies**:
    ```bash
    npm install
    ```

2. **Configure environment variables** (create a `.env` file in the project root):
    ```env
    VITE_OPENCLAW_API_URL=http://127.0.0.1:18789
    # Do NOT set VITE_OPENCLAW_TOKEN in production.
    VITE_OPENCLAW_MODEL=google/gemini-2.5-flash
    ```
    If `VITE_OPENCLAW_API_URL` is not set, requests go through the built-in Vite proxy (`/v1` -> `http://127.0.0.1:18789`).

3. **Start development server**:
    ```bash
    npm run dev
    ```

4. **Build for production**:
    ```bash
    npm run build
    ```

## Project Structure

```
src/
├── components/
│   ├── AugmentedEntity.tsx   — Legacy entity component (GLB + EnergyShader fallback)
│   ├── ChatInterface.tsx     — Chat overlay with voice input and character selector
│   ├── DynamicCharacter.tsx  — Active character renderer (FBX / GLB / BaseEntity)
│   ├── Experience.tsx        — R3F Canvas with lighting, shadows and environment
│   └── MyCharacter.tsx       — Standalone FBX loader (legacy, not used in main scene)
├── constants/
│   └── characters.ts         — CHARACTERS config array (id, model URL, type, scale...)
├── hooks/
│   └── useOpenClawControl.ts — Listens for Vite HMR "openclaw-command" events
├── services/
│   └── openClawService.ts    — Fetch wrapper for the OpenClaw chat completions API
├── shaders/
│   └── EnergyShader.ts       — Custom GLSL shader material (uTime, uIntensity, uColor)
├── store/
│   └── soulStore.ts          — Zustand store: isThinking, mood, intensity, lastMessage, activeCharacterId
├── App.tsx                   — Root component
└── OpenClawControl.tsx       — Polling-based control component (reads openclaw-control.json every 1 s)
```

## Available Characters

Defined in `src/constants/characters.ts`:

| ID | Name | Type | Model |
|----|------|------|-------|
| `happy-idle` | Happy Bot | FBX | `/HappyIdle.fbx` |
| `base-sphere` | Energy Core | GLB (procedural) | *(base geometry)* |

Switch the active character via the character selector buttons in the chat UI, or via the `setActiveCharacterId` command through the OpenClaw control interface.

## Soul Store — State Reference

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `isThinking` | `boolean` | `false` | Shows "thinking" animation; boosts intensity by 0.8 |
| `mood` | `string` | `'calm'` | `'calm'`, `'excited'`, `'thinking'`, `'listening'` |
| `intensity` | `number` | `0.5` | Shader energy intensity (0 to ~2) |
| `lastMessage` | `string` | `''` | Last user message shown in the UI |
| `activeCharacterId` | `string` | `'happy-idle'` | ID of the currently rendered character |

---

## Roadmap — Future Deployment Architecture

The following schema describes the planned evolution of PhysicClaw-VEA into a **multi-user**, **persistent**, and **team-deployable** platform.

### Architecture Layers

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 00 · CLIENT / BROWSER                                    │
│                                                                 │
│  ┌──────────────────┐  ┌────────────────┐  ┌────────────────┐  │
│  │  Web App (R3F)   │  │  Auth Session  │  │  Voice / TTS   │  │
│  │  React 19        │  │  JWT           │  │  Web Speech API│  │
│  │  Three.js WebGPU │  │                │  │  es-ES native  │  │
│  └──────────────────┘  └────────────────┘  └────────────────┘  │
└───────────────────────────────┬─────────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 01 · HOSTING & CDN · STATIC ASSETS                      │
│                                                                 │
│  ┌──────────────────────────┐  ┌────────────────────────────┐  │
│  │  Vercel / Netlify        │  │  Cloud Storage             │  │
│  │  Vite bundle · Edge CDN  │  │  GLB · FBX · Textures      │  │
│  │  Auto CI/CD from GitHub  │  │                            │  │
│  └──────────────────────────┘  └────────────────────────────┘  │
└───────────────────────────────┬─────────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 02 · API LAYER · GRAPHQL + REST                         │
│                                                                 │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  pg_graphql  │  │ Auth         │  │  Realtime            │  │
│  │  /graphql/v1 │  │  JWT · OAuth │  │  WebSocket · Live    │  │
│  │              │  │  Magic Link  │  │  multi-user scene    │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  OpenClaw Gateway (Azure VM)                             │   │
│  │  LLM Proxy · Gemini 2.5 Flash · POST /v1/chat            │   │
│  └──────────────────────────────────────────────────────────┘   │
└───────────────────────────────┬─────────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 03 · BACKEND SERVICES · PROCESSING                      │
│                                                                 │
│  ┌──────────────────────┐  ┌───────────────┐  ┌─────────────┐  │
│  │  Edge Functions      │  │  DB Webhooks  │  │  Azure VM   │  │
│  │  Deno · TypeScript   │  │               │  │  OpenClaw   │  │
│  │  upload-model        │  │  INSERT/UPDATE│  │  port       │  │
│  │  chat-proxy          │  │  triggers     │  │  18789      │  │
│  └──────────────────────┘  └───────────────┘  └─────────────┘  │
└───────────────────────────────┬─────────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 04 · PERSISTENCE · POSTGRESQL + STORAGE                 │
│                                                                 │
│  ┌────────────────────┐  ┌───────────────┐  ┌───────────────┐  │
│  │  PostgreSQL 15     │  │  Storage      │  │  Row Level    │  │
│  │                    │  │  Buckets      │  │  Security     │  │
│  │  scenes            │  │  models/      │  │               │  │
│  │  objects_3d        │  │  textures/    │  │  per table    │  │
│  │  agents · messages │  │  S3-compat    │  │               │  │
│  └────────────────────┘  └───────────────┘  └───────────────┘  │
└───────────────────────────────┬─────────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 05 · DEVOPS · CI/CD · MONITORING                        │
│                                                                 │
│  ┌──────────────┐  ┌─────────────────────┐  ┌──────────────┐  │
│  │  GitHub      │  │  GitHub Actions     │  │  Monitoring  │  │
│  │  main → prod │  │  lint · types       │  │  Sentry      │  │
│  │  develop→stg │  │                    │  │  Vercel Anlt │  │
│  │  feature/*   │  │  vercel deploy      │  │              │  │
│  └──────────────┘  └─────────────────────┘  └──────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

### CI/CD Pipeline

```
[Dev local]  →  [Pull Request]  →  [CI checks]  →  [Staging]
feature/*        → develop          lint · types      preview deploy
                                    build

[Staging]  →  [Code Review]  →  [DB Migration]  →  [Production]
                 → main                               vercel deploy
```

### Environments

| Environment | URL | Database | Branch |
|-------------|-----|----------|--------|
| **LOCAL** | `localhost:5173` | Local DB | `feature/*` |
| **STAGING** | `preview.vercel.app` | Staging project | `develop` |
| **PRODUCTION** | `physiclaw.app` | Prod project | `main` |

### Environment Variables per Environment

```env
# Frontend (Vite — public)
VITE_OPENCLAW_API_URL     = https://your-api-gateway.com

# Edge Functions (private — never exposed to the client)
OPENCLAW_SECRET_TOKEN     = your-secret-token

# CI/CD (GitHub Actions secrets)
VERCEL_TOKEN              = your-vercel-token
```

### Team Roles

| Role | Responsibilities |
|------|-----------------|
| **Frontend / 3D** (1–2 devs) | R3F scenes, TSL shaders, Zustand soulStore, TransformControls UX, DynamicCharacter, Chat UI / voice |
| **Backend / Data** (1 dev) | PostgreSQL schema + RLS, Edge Functions (Deno), Storage policies, GraphQL queries/mutations |
| **AI / Integration** (1 dev) | OpenClaw gateway config, per-user system prompts, conversation history, mood → shader mapping, alternative LLM models |
| **DevOps** (1 dev part-time) | GitHub Actions pipelines, Vercel/Netlify config, environment variables, monitoring & alerts, Azure VM deploy |

### Phase Roadmap

| Phase | Goal | Key Technologies |
|-------|------|-----------------|
| **v1.x** *(current)* | Single-user local app with reactive VEA, AI chat and FBX/GLB support | React 19, R3F, Zustand, OpenClaw |
| **v2.0** | Multi-user authentication + cloud scene persistence | Auth (JWT), PostgreSQL, RLS |
| **v2.5** | Real-time collaborative scenes (multiple simultaneous users) | Realtime, WebSocket, Presence |
| **v3.0** | Full deployment with automated CI/CD, staging and production | GitHub Actions, Vercel |
| **v3.5** | Agent marketplace: per-user system prompts, models and avatars | Edge Functions, Storage buckets, pg_graphql |
| **v4.0** | WebGPU renderer + TSL shaders for advanced effects on modern hardware | Three.js WebGPU, TSL, Chrome/Edge 113+ |
