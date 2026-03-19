# AGENTS_STATE.md — Shared Memory for Sub-Agents
> Auto-managed by sub-agents. Update this file after EVERY task completion.

## Project: PhysicClaw-VEA
**Stack:** React + Three.js/R3F + Supabase + Zustand + OpenClaw  
**Repo:** `/home/yomero243/.openclaw/workspace/PhysicClaw-VEA`  
**Branch:** `main`

---

## ✅ COMPLETED TASKS

### [2026-03-08] Initial setup (pre-agent work)
- Auth with Supabase (`src/auth/AuthProvider.tsx`, `src/lib/supabase.ts`)
- DB schema v2 (`supabase/migrations/001_v2_schema.sql`, `002_rls_policies.sql`)
- DB types (`src/types/database.ts`)
- Supabase migrations created (001 + 002)
- soulStore with Zustand (`src/store/soulStore.ts`)
- openClawService refactored (`src/services/openClawService.ts`)
- AvatarPanel with Xbox-style UI (`src/components/AvatarPanel.tsx`)
- ChatInterface redesign (`src/components/ChatInterface.tsx`)
- DynamicCharacter updated (`src/components/DynamicCharacter.tsx`)
- Experience scene updated (`src/components/Experience.tsx`)
- useScenePersistence hook (`src/hooks/useScenePersistence.ts`)
- useOpenClawControl hook (`src/hooks/useOpenClawControl.ts`)
- OpenClawControl.tsx refactored
- vite.config.ts with proxy

---

## 🔄 PENDING TASKS (pick one, mark IN_PROGRESS, complete, mark DONE)

### TASK-01: TypeScript compilation check & fix
**Status:** ✅ DONE  
**Agent:** ts-fix-agent  
**Scope:** Run `npx tsc --noEmit` in the project, fix ALL TypeScript errors one by one. Commit result.  
**Expected output:** Zero TS errors, commit message `fix: resolve TypeScript compilation errors`  
**Notes:**
- Found 11 errors across 3 files + 1 missing module.
- `src/lib/supabase.ts`: Added full API layer exports (`auth`, `scenesApi`, `sceneObjectsApi`, `sessionsApi`, `messagesApi`, `avatarConfigsApi`, `realtimeApi`) — hook `useScenePersistence` imported these but they didn't exist.
- `src/components/AvatarPanel.tsx`: Added `[key: string]: unknown` index signature to `ShaderConfig` (required for `AvatarConfig.shader_params` compatibility). Moved `title` from inside `style={{}}` to HTML attribute on `<span>`.
- `src/components/ChatInterface.tsx`: Replaced `user` → `userName` (SoulState has no `user` field; `userName: string | null` is the correct field). Replaced `logout` → `signOut` (AuthContextType exposes `signOut`, not `logout`). Also fixed `auth.getUser()` destructuring in `useScenePersistence.ts` (wrapper returns data directly, not nested under `data:`).
- Final `npx tsc --noEmit` → exit 0, zero errors.

### TASK-02: `.env.example` + Supabase env documentation
**Status:** DONE ✅  
**Agent:** docs-agent  
**Scope:** Create `.env.example` with all required env vars. Update README with setup instructions for Supabase. Commit.  
**Expected output:** `.env.example` file, README updated, commit `docs: add env vars and Supabase setup guide`  
**Notes:**
- Created `.env.example` with all 8 vars: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_OPENCLAW_API_URL`, `VITE_OPENCLAW_TOKEN`, `VITE_OPENCLAW_MODEL`, `VITE_PORT`, `OPENCLAW_LOCAL_PORT`, `CONTROL_API_TOKEN`, `VITE_CONTROL_POLL_MS`
- Added `.env.*` exception to `.gitignore` so `.env.example` is tracked
- Added `## Setup` section to README.md with: Supabase project creation, credential retrieval, migration steps (`supabase db push`), local dev alternative, install & start instructions
- Commit: `docs: add .env.example and Supabase setup guide` (23e37e2)

### TASK-03: Migration 003 — user_preferences & indexes
**Status:** DONE ✅  
**Agent:** migration-agent  
**Completed:** 2026-03-08  
**Scope:** Create `supabase/migrations/003_user_preferences_indexes.sql` with additional indexes and user_preferences table improvements. Commit.  
**Notes:**
- Created `supabase/migrations/003_performance_indexes.sql`
- Section 1: Composite (user_id + created_at) indexes on scenes, messages, objects_3d for paginated/time-sorted queries
- Section 2: Idempotent re-declaration of base FK indexes (IF NOT EXISTS)
- Section 3: Partial index on messages WHERE role='user'
- Section 4: Composite index on objects_3d(scene_id, object_type) for type-filtered scene queries
- Section 5: CREATE TABLE IF NOT EXISTS user_preferences with ui_scale (float, DEFAULT 1.0), notifications_enabled (boolean, DEFAULT true), extra jsonb, RLS enabled + policies
- Section 6: DO $$ block to safely ALTER TABLE and add columns if table pre-existed
- Section 7: Trigger handle_new_user_preferences auto-creates a preferences row on user sign-up (idempotent via DROP TRIGGER IF EXISTS)
- All indexes use IF NOT EXISTS → fully idempotent migration
**Expected output:** `003_*.sql` file, commit `feat(db): migration 003 - performance indexes and user_preferences improvements`

### TASK-08: Connect ChatInterface to openClawService
**Status:** ✅ DONE
**Agent:** fix-agent
**Completed:** 2026-03-08
**Scope:** Replace hardcoded `setTimeout` in `handleSendMessage` with async call to `openClawService.sendMessage`. Add `clearHistory()` on sign-out.
**Notes:**
- Imported `openClawService` in `ChatInterface.tsx`
- `handleSendMessage` converted to `async`, removed `setTimeout` block
- Result fields mapped: `addMessage`, `setMood`, `setIntensity`, `speakResponse`
- `openClawService.clearHistory()` added to sign-out button onClick
- Removed unused `setIsThinking` destructure (service handles it internally)
- `npx tsc --noEmit` → exit 0
- Commit: `fix(chat): connect ChatInterface to openClawService — closes #8`

### TASK-04: EnergyShader refinement
**Status:** PENDING  
**Agent:** —  
**Scope:** Review `src/shaders/EnergyShader.ts`, add proper TypeScript types, ensure it integrates cleanly with AugmentedEntity. Commit.  
**Expected output:** Improved shader file, commit `feat(3d): refine EnergyShader types and integration`

### TASK-05: LoginPage & auth flow polish
**Status:** PENDING  
**Agent:** —  
**Scope:** Review `src/components/LoginPage.tsx` and `src/auth/AuthProvider.tsx`. Ensure error states, loading states, and redirect flows are correct. Commit.  
**Expected output:** Polished login flow, commit `feat(auth): polish login page and auth flow`

### TASK-06: openClawService integration test stubs
**Status:** ✅ DONE
**Agent:** claude-main
**Completed:** 2026-03-18
**Scope:** Create `src/services/__tests__/openClawService.test.ts` with basic unit test stubs for the service. Commit.
**Expected output:** Test file, commit `test: add openClawService unit test stubs`
**Notes:**
- Installed `vitest` + `@vitest/coverage-v8` as devDependencies
- Created `vitest.config.ts` with `environment: 'node'`
- Created `src/services/__tests__/openClawService.test.ts` — 13 tests across 3 describes: `clearHistory()`, `getHistory()`, `sendMessage()`
- `useSoulStore` mocked via `vi.mock`, `fetch` mocked per-test via `vi.stubGlobal`
- Covers: happy path, markdown JSON block parsing, invalid JSON fallback, HTTP error, network error, Authorization header presence/absence, history isolation (read-only copy)
- All 13 tests pass: `npx vitest run` → 13/13 ✓
- Added `"test"` and `"test:watch"` scripts to `package.json`

---

## 📋 HOW TO USE THIS FILE (for sub-agents)

1. **Read this file first** — know what's been done and what's pending
2. **Pick ONE PENDING task** — change its status to `IN_PROGRESS` and write your agent name
3. **Do the work** — focus ONLY on that task
4. **Update this file** — mark task DONE, add notes about what you did
5. **Commit** — always commit your changes with a descriptive message
6. **If you run out of time** — write a `PARTIAL:` note on the task with what was done

---

## 🗂️ KEY FILES MAP

| Area | Files |
|------|-------|
| Auth | `src/auth/AuthProvider.tsx`, `src/auth/index.ts`, `src/lib/supabase.ts` |
| 3D/Scene | `src/components/Experience.tsx`, `src/components/AugmentedEntity.tsx`, `src/components/DynamicCharacter.tsx` |
| UI | `src/components/AvatarPanel.tsx`, `src/components/ChatInterface.tsx`, `src/components/LoginPage.tsx` |
| State | `src/store/soulStore.ts` |
| Hooks | `src/hooks/useOpenClawControl.ts`, `src/hooks/useScenePersistence.ts` |
| Services | `src/services/openClawService.ts` |
| Shaders | `src/shaders/EnergyShader.ts` |
| DB | `supabase/migrations/` |
| Types | `src/types/database.ts` |
| OpenClaw | `src/OpenClawControl.tsx`, `openclaw-control.json` |
