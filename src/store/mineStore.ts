// ============================================================
// PhysicClaw-VEA — Mine Store
// src/store/mineStore.ts
//
// Gestiona entidades "mine" en la escena 3D.
// - Estado local en Zustand (reactivo para R3F)
// - Persistencia en Supabase via scene_objects (object_type='prop', metadata.kind='mine')
// - Realtime: INSERT/UPDATE/DELETE se propagan a todos los clientes
// ============================================================

import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import type { SceneObject, SceneObjectInsert } from '../types/database'

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

export type MineStatus = 'armed' | 'triggered' | 'defused' | 'exploded'

export interface Mine {
  /** UUID — mismo que scene_objects.id cuando está persistida */
  id: string
  /** Posición en la escena 3D */
  position: [number, number, number]
  /** Radio de detección (unidades three.js) */
  radius: number
  /** Estado actual de la mina */
  status: MineStatus
  /** Usuario que colocó la mina */
  ownerId: string | null
  /** Timestamp de creación */
  createdAt: number
  /** Metadata extra (tipo visual, daño, etc.) */
  meta: Record<string, unknown>
}

export type MineInsert = Omit<Mine, 'id' | 'createdAt'>

// ----------------------------------------------------------------
// Helpers — converters between Mine <-> SceneObject
// ----------------------------------------------------------------

function sceneObjectToMine(obj: SceneObject): Mine | null {
  const meta = obj.metadata as Record<string, unknown>
  if (meta?.kind !== 'mine') return null

  return {
    id: obj.id,
    position: obj.position,
    radius: (meta.radius as number) ?? 1.5,
    status: (meta.status as MineStatus) ?? 'armed',
    ownerId: obj.user_id,
    createdAt: new Date(obj.created_at).getTime(),
    meta,
  }
}

function mineToSceneObjectInsert(
  mine: MineInsert,
  sceneId: string,
  userId: string
): SceneObjectInsert {
  return {
    scene_id: sceneId,
    user_id: userId,
    object_type: 'prop',
    character_id: null,
    label: `mine_${Date.now()}`,
    model_url: null,
    position: mine.position,
    rotation: [0, 0, 0],
    scale_v: [1, 1, 1],
    sort_order: 0,
    is_visible: true,
    metadata: {
      kind: 'mine',
      radius: mine.radius,
      status: mine.status,
      ...mine.meta,
    },
  }
}

// ----------------------------------------------------------------
// Store state + actions
// ----------------------------------------------------------------

interface MineState {
  mines: Mine[]
  selectedMineId: string | null

  // --- Acciones locales (inmediatas, optimistic) ---
  _addMine: (mine: Mine) => void
  _updateMine: (id: string, patch: Partial<Mine>) => void
  _removeMine: (id: string) => void
  setSelectedMine: (id: string | null) => void

  // --- Acciones persistidas (Supabase) ---
  placeMine: (mine: MineInsert, sceneId: string, userId: string) => Promise<Mine | null>
  triggerMine: (id: string) => Promise<void>
  defuseMine: (id: string) => Promise<void>
  explodeMine: (id: string) => Promise<void>
  removeMine: (id: string) => Promise<void>

  // --- Sync desde Supabase ---
  loadMinesFromScene: (sceneObjects: SceneObject[]) => void
  applyRealtimeEvent: (eventType: 'INSERT' | 'UPDATE' | 'DELETE', obj: SceneObject, oldId?: string) => void
}

// ----------------------------------------------------------------
// Store
// ----------------------------------------------------------------

export const useMineStore = create<MineState>()((set, get) => ({
  mines: [],
  selectedMineId: null,

  // ── Internal mutators ──────────────────────────────────────────

  _addMine: (mine) =>
    set((s) => ({
      mines: s.mines.some((m) => m.id === mine.id)
        ? s.mines
        : [...s.mines, mine],
    })),

  _updateMine: (id, patch) =>
    set((s) => ({
      mines: s.mines.map((m) => (m.id === id ? { ...m, ...patch } : m)),
    })),

  _removeMine: (id) =>
    set((s) => ({
      mines: s.mines.filter((m) => m.id !== id),
      selectedMineId: s.selectedMineId === id ? null : s.selectedMineId,
    })),

  setSelectedMine: (id) => set({ selectedMineId: id }),

  // ── Sync ──────────────────────────────────────────────────────

  loadMinesFromScene: (sceneObjects) => {
    const mines = sceneObjects
      .map(sceneObjectToMine)
      .filter((m): m is Mine => m !== null)
    set({ mines })
  },

  applyRealtimeEvent: (eventType, obj, oldId) => {
    const { _addMine, _updateMine, _removeMine } = get()
    const mine = sceneObjectToMine(obj)

    switch (eventType) {
      case 'INSERT':
        if (mine) _addMine(mine)
        break
      case 'UPDATE':
        if (mine) _updateMine(mine.id, mine)
        break
      case 'DELETE':
        if (oldId) _removeMine(oldId)
        break
    }
  },

  // ── Supabase actions ──────────────────────────────────────────

  placeMine: async (mineData, sceneId, userId) => {
    const insert = mineToSceneObjectInsert(mineData, sceneId, userId)

    const { data, error } = await supabase
      .from('scene_objects')
      .insert(insert)
      .select()
      .single()

    if (error) {
      console.error('[mineStore] placeMine error:', error)
      return null
    }

    const mine = sceneObjectToMine(data)
    if (mine) get()._addMine(mine)
    return mine
  },

  triggerMine: async (id) => {
    get()._updateMine(id, { status: 'triggered' })

    const { error } = await supabase
      .from('scene_objects')
      .update({ metadata: { ...getCurrentMeta(get, id), status: 'triggered' } })
      .eq('id', id)

    if (error) console.error('[mineStore] triggerMine error:', error)
  },

  defuseMine: async (id) => {
    get()._updateMine(id, { status: 'defused' })

    const { error } = await supabase
      .from('scene_objects')
      .update({ metadata: { ...getCurrentMeta(get, id), status: 'defused' } })
      .eq('id', id)

    if (error) console.error('[mineStore] defuseMine error:', error)
  },

  explodeMine: async (id) => {
    get()._updateMine(id, { status: 'exploded' })

    const { error } = await supabase
      .from('scene_objects')
      .update({ metadata: { ...getCurrentMeta(get, id), status: 'exploded' } })
      .eq('id', id)

    if (error) console.error('[mineStore] explodeMine error:', error)

    // Auto-remove after explosion animation completes (3 s)
    setTimeout(() => get().removeMine(id), 3000)
  },

  removeMine: async (id) => {
    get()._removeMine(id)

    const { error } = await supabase
      .from('scene_objects')
      .delete()
      .eq('id', id)

    if (error) console.error('[mineStore] removeMine error:', error)
  },
}))

// ----------------------------------------------------------------
// Helper — obtiene el metadata actual de una mina para merge en updates
// ----------------------------------------------------------------
function getCurrentMeta(
  get: () => MineState,
  id: string
): Record<string, unknown> {
  const mine = get().mines.find((m) => m.id === id)
  return mine ? { kind: 'mine', radius: mine.radius, ...mine.meta } : { kind: 'mine' }
}

// ----------------------------------------------------------------
// Selector helpers (evitan re-renders innecesarios en R3F)
// ----------------------------------------------------------------

export const selectMines = (s: MineState) => s.mines
export const selectArmedMines = (s: MineState) =>
  s.mines.filter((m) => m.status === 'armed')
export const selectSelectedMine = (s: MineState) =>
  s.mines.find((m) => m.id === s.selectedMineId) ?? null
