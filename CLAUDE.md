# CLAUDE.md — PhysicClaw-VEA

Shared project instructions for all Claude Code tasks (interactive sessions + Code Review).

---

## Project Overview

PhysicClaw-VEA is a multi-user, real-time 3D interactive application featuring a "Virtual Entity Augmented" (VEA) that reacts to AI conversation through custom shaders and animations.

**Stack:**
- Frontend: React 19, TypeScript, Vite
- 3D: Three.js, React Three Fiber (R3F), React Three Drei
- State: Zustand (`soulStore`, `mineStore`)
- Backend: Supabase (Auth, PostgreSQL, Realtime, Storage)
- AI: OpenClaw gateway → OpenAI-compatible `/v1/chat/completions`
- Shaders: custom GLSL via `EnergyShader.ts`

---

## Architecture Rules

### Supabase API layer (`src/lib/supabase.ts`)
- All DB calls go through the typed wrapper functions (`scenesApi`, `sceneObjectsApi`, `messagesApi`, etc.)
- Never call `supabase.from(...)` directly in components or hooks — always use or extend the wrappers
- Every new table needs a corresponding typed API in `supabase.ts` and a type in `types/database.ts`

### Schema contract
- **`scene_objects`** is the canonical table for all 3D objects (not `objects_3d`)
- Mine entities live as `scene_objects` rows with `object_type = 'prop'` and `metadata.kind = 'mine'`
- Types in `src/types/database.ts` MUST match the actual SQL schema in `supabase/migrations/`
- Any migration must have a corresponding TypeScript type update

### State management
- Global reactive state → Zustand stores (`soulStore`, `mineStore`)
- Supabase persistence → `useScenePersistence` hook
- Never lift Supabase calls into Zustand actions directly — stores are for client state, hooks handle async persistence
- `soulStore` `messages` array is **session-only** — never persist to `localStorage` (already excluded in `partialize`)

### R3F / Three.js
- `useFrame` callbacks must be O(1) or O(n) with small n — no nested loops over large arrays
- Geometry and materials must be disposed on unmount: `useEffect(() => () => mesh.dispose(), [])`
- Shader uniforms updated in `useFrame` must use `.value` mutation, never recreate the material
- `<Canvas>` lives only in `Experience.tsx` — do not nest a second Canvas

### Authentication
- Auth state is the single source of truth from `AuthProvider` / Supabase `onAuthStateChange`
- Never store session tokens in component state or `localStorage` outside Supabase's own storage
- `openClawService.clearHistory()` MUST be called on every sign-out path

---

## Security Rules

### LLM API token — CRITICAL
- `VITE_OPENCLAW_TOKEN` / `apiToken` from `soulStore` **must never reach the browser in production**
- The correct pattern: route all LLM calls through a Supabase Edge Function that holds the token server-side
- Any PR that sends `Authorization: Bearer <token>` directly from frontend code is a security violation

### Supabase anon key
- The `VITE_SUPABASE_ANON_KEY` is safe to expose — it is secured by RLS policies
- Never use the `service_role` key on the client side

### Row Level Security
- Every new table MUST have RLS enabled and policies before merging
- Pattern: `auth.uid() = user_id` for user-owned rows
- Never add `SECURITY DEFINER` functions without explicit justification in the PR

### Environment variables
- `VITE_*` variables are bundled into the frontend — treat them as public
- Secret tokens (`OPENCLAW_SECRET_TOKEN`, `SUPABASE_SERVICE_ROLE_KEY`) belong only in Edge Function env vars or CI secrets

---

## TypeScript Rules

- Strict mode is on — no `any` except in legacy R3F/Three.js interop with a `// eslint-disable-line` comment explaining why
- Supabase response types come from `src/types/database.ts` — never use `any` for DB row shapes
- All Zustand selectors must be extracted as named functions to prevent unnecessary re-renders:
  ```ts
  // ✅
  const mines = useMineStore(selectArmedMines)
  // ❌
  const mines = useMineStore(s => s.mines.filter(m => m.status === 'armed'))
  ```

---

## File / Folder Conventions

```
src/
  components/   React + R3F components (UI + 3D)
  store/        Zustand stores (client state only)
  hooks/        Custom hooks (async, Supabase, R3F)
  lib/          Supabase client + typed API wrappers
  services/     External service clients (openClawService)
  types/        TypeScript types mirroring the DB schema
  shaders/      GLSL shader definitions
  constants/    Static config (CHARACTERS array, etc.)
supabase/
  migrations/   Numbered SQL migrations (001_, 002_, …)
  functions/    Supabase Edge Functions (Deno)
```

- New migrations: `NNN_descriptive_name.sql`, always idempotent (`IF NOT EXISTS`, `DO $$ … $$`)
- Edge Functions: one function per file in `supabase/functions/<name>/index.ts`
- Components that are exclusively 3D (render inside `<Canvas>`) go in `components/` but are named `*3D.tsx`

---

## What NOT to change without discussion

- `src/shaders/EnergyShader.ts` — GLSL uniforms are consumed by multiple components; changes break the shader pipeline
- `supabase/migrations/001_v2_schema.sql` and `002_rls_policies.sql` — core schema; alter via new migration only
- `src/auth/AuthProvider.tsx` — auth state contract; breaking changes affect every protected route
