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
    VITE_OPENCLAW_TOKEN=your_token_here
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
