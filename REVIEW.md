# REVIEW.md — PhysicClaw-VEA Code Review Guidelines

Review-specific rules. These add to the defaults in `CLAUDE.md` and apply only during automated PR analysis.

---

## 🔴 Always flag as blocking

### Security
- Any component or service that sends an LLM API token (`apiToken`, `VITE_OPENCLAW_TOKEN`, `Authorization: Bearer`) directly from the browser in a non-dev context
- A new Supabase table without `ALTER TABLE … ENABLE ROW LEVEL SECURITY` and at least one policy in the same PR
- A `SECURITY DEFINER` function added without an explicit comment justifying the elevated privilege
- `supabase.auth.admin.*` called from frontend code (requires service role key)
- Secrets or tokens hardcoded in source files (not `.env`)

### Schema integrity
- TypeScript types in `src/types/database.ts` that reference a table or column that does not exist in `supabase/migrations/`
- Supabase queries calling `supabase.from('table_name')` where `table_name` is not defined in any migration file
- A new migration that drops or renames a column without a corresponding type update in `database.ts`
- Missing `ON CONFLICT` clause in upsert operations on tables with unique constraints

### State / data flow
- `soulStore` `messages` added to the `partialize` persist list (messages are session-only by design)
- `openClawService.clearHistory()` not called on a sign-out code path
- Zustand store actions that call `supabase.*` directly (stores must stay sync; async belongs in hooks)

### R3F performance
- `new THREE.*` object construction inside a `useFrame` callback (allocates every frame → GC pressure)
- A `<Canvas>` component rendered inside another `<Canvas>`
- `useEffect` that creates geometry/materials without a cleanup that calls `.dispose()`

---

## 🟡 Flag as nit

### TypeScript quality
- Inline anonymous Zustand selector (lambda inside `useStore(s => …)`) — prefer named selector functions
- Use of `as any` without a comment explaining why strict typing is not possible
- Missing return-type annotation on exported functions

### Supabase patterns
- `supabase.from(…)` called directly in a component instead of going through the typed wrappers in `src/lib/supabase.ts`
- Error from Supabase swallowed silently (caught but not logged or surfaced to the UI)
- Realtime channel not unsubscribed in the `useEffect` cleanup

### React / R3F patterns
- State updates inside `useFrame` that cause a React re-render (use ref mutation instead)
- A component importing from another component's file (cross-component internal imports)
- Missing `key` prop on list-rendered 3D objects

### Migrations
- A migration file that is not idempotent (missing `IF NOT EXISTS`, no `DO $$ … $$` guards)
- Index added without a comment explaining the query pattern it optimises

---

## 🟣 Flag as pre-existing (do not block, just note)

- Direct `supabase.from('objects_3d')` calls — legacy table name, canonical name is `scene_objects`
- `openClawService.ts` sending the LLM token from the browser — tracked, will be fixed with the Edge Function migration
- `useScenePersistence` calling APIs that reference tables not yet created in migrations — schema reconciliation is in progress

---

## Skip entirely

- `src/shaders/EnergyShader.ts` — GLSL string content, formatting, naming conventions inside shader code
- `public/*.glb` and `public/*.fbx` — binary assets
- `package-lock.json` — generated lockfile
- `*.css` files — styling is intentionally minimal and inline
- Comments written in Spanish — this is the team's primary language
- `node_modules/` — never review

---

## Context for reviewers

**Known active work items (not bugs introduced by a PR):**
1. Schema reconciliation: `database.ts` and `supabase.ts` use `scene_objects` / `sessions` / `avatar_configs`; SQL migrations currently have `objects_3d`. Migration `004` will fix this.
2. LLM proxy: `openClawService.ts` sends the token from the browser in dev. A Supabase Edge Function proxy is planned.
3. `supabase/config.toml` does not exist yet — local `supabase start` is not configured.

**Realtime pattern:**
Mines use a dedicated channel `mines:scene:<id>` filtered by `metadata->>'kind' = 'mine'`. If you see a duplicate subscription to `scene_objects` without this filter, it is a bug.

**Shader uniform contract:**
`EnergyShader` expects `uTime` (float), `uIntensity` (float, 0–2), `uColor` (vec3). Any component passing these uniforms must match this signature exactly.
