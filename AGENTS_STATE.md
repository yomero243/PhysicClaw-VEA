# AGENTS_STATE.md — Shared Memory for Sub-Agents
> Auto-managed by sub-agents. Update this file after EVERY task completion.

## Project: PhysicClaw-VEA
**Branch Actual:** `develop` (Revisión de Integridad 2026-04-23)

---

## 🚨 HALLAZGOS CRÍTICOS (REVISIÓN EQUIPO AGENTES)

### [2026-04-23] Desajuste de Esquema DB
- **Status:** EN RESOLUCIÓN (Ejecutando TASK-09)
- **Detalle:** El código espera tablas de la versión 2.0 (`sessions`, `avatar_configs`, `characters`). La migración 004 ha sido localizada y está lista para ser aplicada.

### [2026-04-23] Integración Exitosa de Rama Avanzada
- **Status:** ✅ HECHO
- **Detalle:** Se han fusionado más de 3,000 líneas de código de `feat/glb-upload-panel-and-scene-objects`. Se resolvieron conflictos en Chat, Servicio y DynamicCharacter.

---

## ⏳ TAREAS PRIORITARIAS (ORDEN DE EJECUCIÓN)

1. **TASK-09: Regularización de Base de Datos (Migración 004)**
   - **Status:** 🚧 IN_PROGRESS
   - **Agent:** Gemini-CLI
   - **Scope:** Aplicar `supabase/migrations/004_missing_tables.sql`. Crear tablas `sessions`, `avatar_configs` y configurar Storage para GLBs.

2. **TASK-10: Integración de ClawBotSettings**
   - **Status:** PENDING
   - **Scope:** Mover la lógica de `ClawBotSettings.tsx` (untracked) dentro de `AvatarPanel.tsx`.

---

## ✅ TAREAS COMPLETADAS

### TASK-03: Migration 003 — user_preferences & indexes
- **Status:** DONE ✅  
- **Notes:** Índices de rendimiento y tabla de preferencias de usuario creados.

### TASK-04: EnergyShader refinement
- **Status:** DONE ✅  
- **Notes:** Tipado fuerte en TypeScript para Shaders y corrección de bugs en el mapeo de intensidades.

### TASK-05: LoginPage & auth flow polish
- **Status:** DONE ✅  
- **Notes:** Estados de carga (loading) y errores visuales integrados en el login de Supabase.

### TASK-06: openClawService integration tests
- **Status:** DONE ✅  
- **Notes:** 13 pruebas unitarias pasando con Vitest (Mocking de fetch y store).

### TASK-08: Connect ChatInterface to openClawService
- **Status:** DONE ✅  
- **Notes:** Eliminados los timeouts, conexión real con el LLM vía Edge Functions.
