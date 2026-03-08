<div align="center">

# ⚡ PhysicClaw VEA

### Virtual Entity Augmented — An AI that you can *see* think

[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=white)](https://react.dev/)
[![Three.js](https://img.shields.io/badge/Three.js-r168-black?logo=three.js)](https://threejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

**A 3D interactive entity that reacts in real time to its own AI emotions.**
Talk to it. Watch it pulse, breathe, and glow as it thinks.

[**Live Demo**](#) · [**Report Bug**](../../issues) · [**Request Feature**](../../issues)

---

<!-- Replace this line with a demo GIF: ![Demo](demo.gif) -->
> 🎥 **Add a screen recording here — it's the #1 thing that will make people stop scrolling.**

</div>

---

## What is this?

PhysicClaw VEA is a web app where an **AI-powered 3D entity** reacts visually to its own internal emotional state:

- **Thinking** → the entity pulses faster, glows brighter
- **Excited** → energy intensity spikes, animations shift
- **Listening** → a calm breathing rhythm, waiting
- **Calm** → slow oscillation, serene glow

All of this is driven by **custom GLSL shaders** that read directly from a Zustand state store that the AI controls. The result: a living, breathing avatar that expresses its cognition through light and motion.

---

## Features

| Feature | Details |
|---|---|
| **Custom GLSL Energy Shader** | Fresnel rim lighting, noise-based pulsing, time-driven displacement — all reactive to AI state |
| **Real AI Conversations** | OpenAI-compatible API (default: `google/gemini-2.5-flash`). Full conversation history maintained |
| **Mood-Driven Animations** | FBX/GLB model animations switch and crossfade (0.5s) based on the entity's mood |
| **Voice I/O** | Web SpeechRecognition (input) + SpeechSynthesis (output), configured for `es-ES` |
| **External Control API** | POST to `/api/control` or write to `openclaw-control.json` to drive the entity from any script |
| **Pluggable Characters** | Drop in any Mixamo FBX or GLB model and it gets the shader treatment automatically |

---

## Quick Start

```bash
git clone https://github.com/yomero243/PhysicClaw-VEA.git
cd PhysicClaw-VEA
npm install
```

Create a `.env` file:

```env
VITE_OPENCLAW_API_URL=http://127.0.0.1:18789
VITE_OPENCLAW_TOKEN=your_token_here
VITE_OPENCLAW_MODEL=google/gemini-2.5-flash
```

```bash
npm run dev
```

Open `http://localhost:5173` — that's it.

> Works with **any OpenAI-compatible API** (OpenRouter, Ollama, LM Studio, etc.)

---

## Setup with Supabase

### 1. Create a Supabase project

1. Go to [https://supabase.com](https://supabase.com) and sign in (or create a free account).
2. Click **New project**, choose an organization, give the project a name, set a strong database password, and select a region close to you.
3. Wait ~2 minutes for the project to provision.

### 2. Obtain your Supabase credentials

Once the project is ready:

1. Open your project dashboard and go to **Settings → API**.
2. Copy the following values:
   - **Project URL** → this is your `VITE_SUPABASE_URL`
   - **Project API Keys → `anon` `public`** → this is your `VITE_SUPABASE_ANON_KEY`

### 3. Configure environment variables

```bash
cp .env.example .env
```

```env
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

### 4. Run database migrations

```bash
npm install -g supabase
supabase login
supabase link --project-ref <your-project-id>
supabase db push
```

---

## How the shader reacts to AI state

```
AI response → soulStore (Zustand)
                    │
          ┌─────────┴──────────┐
          │                    │
    isThinking = true     mood = "excited"
    intensity += 0.8      intensity += 0.5
          │                    │
          └─────────┬──────────┘
                    │
              EnergyShader uniforms
              uIntensity / uTime / uColor
                    │
              WebGL renders live
```

The entity's glow, pulse speed, and rim brightness are all computed in the fragment shader every frame from these values. There is no tweening library — it's raw GPU math.

---

## Project Structure

```
src/
├── components/
│   ├── Experience.tsx        # R3F Canvas: lighting, shadows, camera
│   ├── DynamicCharacter.tsx  # Loads FBX / GLB, applies EnergyShader
│   ├── ChatInterface.tsx     # UI overlay: voice + text + character selector
│   └── AugmentedEntity.tsx   # Legacy fallback entity
├── shaders/
│   └── EnergyShader.ts       # Custom GLSL — the visual heart of the project
├── store/
│   └── soulStore.ts          # Zustand: mood, intensity, isThinking
├── services/
│   └── openClawService.ts    # OpenAI-compatible API client
├── hooks/
│   └── useOpenClawControl.ts # HMR-based external command listener
└── constants/
    └── characters.ts         # Character config: id, model URL, type, scale
```

---

## Control the entity from outside the browser

You can drive the entity state from any external process (CLI scripts, AI agents, automation):

**Option A — HTTP endpoint:**
```bash
curl -X POST http://localhost:5173/api/control \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer your_token_here" \
  -d '{"command": "setMood", "value": "excited"}'
```

**Option B — JSON file watch:**
```bash
echo '{"id":"1","command":"setIntensity","value":2}' > openclaw-control.json
```

Available commands: `setMood` · `setIsThinking` · `setIntensity` · `setLastMessage` · `setActiveCharacterId`

---

## Soul Store — State Reference

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `isThinking` | `boolean` | `false` | Shows "thinking" animation; boosts intensity by 0.8 |
| `mood` | `string` | `'calm'` | `'calm'`, `'excited'`, `'thinking'`, `'listening'` |
| `intensity` | `number` | `0.5` | Shader energy intensity (0 to ~2) |
| `lastMessage` | `string` | `''` | Last user message shown in the UI |
| `activeCharacterId` | `string` | `'happy-idle'` | ID of the currently rendered character |

---

## Add your own character

1. Drop an FBX or GLB into `public/`
2. Add an entry to `src/constants/characters.ts`:

```ts
{
  id: 'my-character',
  name: 'My Character',
  modelUrl: '/my-model.fbx',
  type: 'fbx',
  scale: 0.01,
  position: [0, -1, 0],
  defaultAnimation: 'Idle',
  animations: {
    calm: 'Idle',
    excited: 'Running',
    thinking: 'Thinking',
    listening: 'Listening',
  }
}
```

3. Select it from the character buttons in the UI.

The EnergyShader is applied automatically to every mesh in your model.

---

## Tech Stack

- [React 19](https://react.dev/) — UI
- [Three.js](https://threejs.org/) + [React Three Fiber](https://docs.pmnd.rs/react-three-fiber) — 3D rendering
- [React Three Drei](https://github.com/pmndrs/drei) — R3F helpers
- [Zustand](https://zustand-demo.pmnd.rs/) — state management
- [Vite](https://vitejs.dev/) — dev server + build tool + control plugin
- Custom GLSL shaders — visual emotion system

---

## Roadmap — Future Deployment Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 00 · CLIENT / BROWSER                                    │
│  React 19 · Three.js WebGPU · Auth Session · Voice / TTS       │
└───────────────────────────────┬─────────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 01 · HOSTING & CDN                                       │
│  Vercel / Netlify · Vite bundle · Supabase Storage (GLB/FBX)    │
└───────────────────────────────┬─────────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 02 · API LAYER                                           │
│  pg_graphql · Supabase Auth · Realtime WebSocket               │
│  OpenClaw Gateway (Azure VM) · LLM Proxy · Gemini 2.5 Flash    │
└───────────────────────────────┬─────────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 03 · BACKEND SERVICES                                    │
│  Edge Functions (Deno) · DB Webhooks (pg_net) · Azure VM       │
└───────────────────────────────┬─────────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 04 · PERSISTENCE                                         │
│  PostgreSQL 15 · Supabase Storage Buckets · RLS (auth.uid())   │
└───────────────────────────────┬─────────────────────────────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│  LAYER 05 · DEVOPS · CI/CD                                      │
│  GitHub Actions · Vercel Deploy · Sentry · Supabase Monitoring  │
└─────────────────────────────────────────────────────────────────┘
```

### Phase Roadmap

| Phase | Goal | Key Technologies |
|-------|------|-----------------|
| **v1.x** *(current)* | Single-user local app with reactive VEA, AI chat and FBX/GLB support | React 19, R3F, Zustand, OpenClaw |
| **v2.0** | Multi-user authentication + cloud scene persistence | Supabase Auth (JWT), PostgreSQL, RLS |
| **v2.5** | Real-time collaborative scenes (multiple simultaneous users) | Supabase Realtime, WebSocket, Presence |
| **v3.0** | Full deployment with automated CI/CD, staging and production | GitHub Actions, Vercel, supabase db push |
| **v3.5** | Agent marketplace: per-user system prompts, models and avatars | Edge Functions, Storage buckets, pg_graphql |
| **v4.0** | WebGPU renderer + TSL shaders for advanced effects on modern hardware | Three.js WebGPU, TSL, Chrome/Edge 113+ |

---

## Contributing

PRs are welcome. For major changes, open an issue first to discuss what you'd like to change.

```bash
git checkout -b feature/your-feature
# make changes
git commit -m "feat: describe your feature"
git push origin feature/your-feature
```

---

<div align="center">

Made with ⚡ by [yomero243](https://github.com/yomero243)

If this project was useful or interesting to you, consider giving it a ⭐

</div>
