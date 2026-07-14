# Frontend

## Stores (Zustand)

### `soulStore` — the entity's "soul"

Ephemeral entity state plus user customizations. Persisted selectively to localStorage (`physicclaw-storage`): API config, custom characters, per-character overrides, visibility, performance mode.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `isThinking` | `boolean` | `false` | Thinking animation; boosts shader intensity |
| `mood` | `string` | `'calm'` | Current mood (see mood table below) |
| `intensity` | `number` | `0.5` | Shader energy, clamped 0.0–2.0 |
| `lastMessage` | `string` | `''` | Last user message shown in the UI |
| `activeCharacterId` | `string` | `'happy-idle'` | Active 3D character |
| `customCharacters` | `CharacterConfig[]` | `[]` | User-uploaded GLB models |
| `characterOverrides` | `Record<id, override>` | presets | Per-character scale/color/intensity overrides |
| `visibleObjects` | `Record<id, boolean>` | built-ins | Which characters/models render in the scene |
| `lowPerformanceMode` | `boolean` | auto | Auto-enabled on mobile / narrow viewports |

### `sceneStore` — cloud persistence

Owns all Supabase I/O: anonymous auth bootstrap, the active scene, scene objects, chat sessions/messages, avatar config, and the realtime subscription for scene changes. Errors land in `sceneStore.error`, which the toast system watches.

### `toastStore` — user-facing notifications

Transient toasts (`error` / `success` / `info`), auto-dismiss after 6 s, max 4 visible. Any module can push one:

```ts
import { toast } from '../store/toastStore'
toast('Algo falló', 'error')
```

The `<Toasts />` component (mounted in `App.tsx`) renders them and also surfaces every `sceneStore.error` automatically.

## The mood system

Chat responses carry a mood that maps to a shader color (`MOOD_COLORS` in `soulStore`):

| Mood | Color | Typical intensity |
|------|-------|-------------------|
| `calm` | cyan `#00ffff` | 0.3–0.5 |
| `happy` | green `#44ff88` | 0.5–0.8 |
| `excited` | yellow `#ffcc00` | 0.8–1.5 |
| `thinking` | purple `#aa44ff` | 0.4–0.7 |
| `listening` | blue `#4488ff` | 0.5–0.8 |
| `sad` | steel blue `#4466aa` | 0.2–0.4 |
| `angry` | red `#ff4444` | 0.8–1.2 |
| `surprised` | pink `#ff44aa` | 0.7–1.0 |
| `curious` | orange `#ff8844` | 0.5–0.8 |
| `love` | rose `#ff66cc` | 0.6–0.9 |

The LLM is instructed (system prompt in `openClawService.ts`) to reply in strict JSON with `text`, `mood`, and `intensity`; the parser falls back to `calm`/`0.5` when the reply isn't valid JSON.

!!! note
    The external [Agent Control API](agent-control.md) validates `setMood` against a narrower set (`calm`, `excited`, `thinking`, `listening`) defined in `src/lib/constraints.ts`.

## Characters

Defined in `src/constants/characters.ts`:

| ID | Name | Type |
|----|------|------|
| `happy-idle` | Happy Bot | GLB (`/Avata1.glb`) |
| `base-sphere` | Energy Core | Procedural sphere + EnergyShader |
| `cyber-sentinel` | Cyber Sentinel | Procedural (red shader preset) |
| `logic-guardian` | Logic Guardian | Procedural (gold preset) |

Users can upload their own `.glb` models (max 50 MB) through the GLB Upload panel; rigged models support animation retargeting (`mixamo`, `rpm`, `vrm`, `standard` rig types via `useAnimationRetarget`).

## Shaders

`EnergyShader` (GLSL) is the entity's visual language. Key uniforms:

- `uTime` — animation clock
- `uIntensity` — energy level; the effective value is the store intensity (0–2) plus boosts for `isThinking`/`excited` states (up to ~3.3 total)
- `uColor` — the current mood color

`DemoShader` is a simplified variant used by the `?demo` mode.

## Key components

| Component | Role |
|---|---|
| `Experience` | The R3F `<Canvas>`: lighting, shadows, environment, camera bounds |
| `DynamicCharacter` | Renders the active character (GLB / procedural) with mood-driven animation |
| `ChatInterface` | Chat overlay: messages, character tabs, voice input, send flow |
| `InterfaceChrome` | HUD: scene name, online count, performance toggle |
| `Toasts` | Error/info notifications (top-right) |
| `AvatarPanel` / `GLBUploadPanel` | Character management and model upload |
| `GaussianSplatPanel` / `GaussianSplats` | `.splat` environment loading with error boundary |
| `UserDiscoveryPanel` / `RemoteAvatars` | Multiplayer presence UI |
| `MoodDemo` | Standalone shader/mood playground (`?demo`) |

## Voice

- **Input:** Web Speech API (`SpeechRecognition`, `es-ES`) via the mic button; results are sent as chat messages. Permission failures surface a toast.
- **Output:** replies are spoken with `SpeechSynthesis` (`es-ES`, pitch 1.1).
