// ============================================================
// PhysicClaw-VEA — useMines Hook
// src/hooks/useMines.ts
//
// Conecta mineStore con:
//   1. useSceneStore        → carga inicial de sceneObjects
//   2. Supabase realtime    → suscripción live a cambios de minas
//   3. Detección de proximidad → triggerea minas cercanas al jugador
// ============================================================

import { useEffect, useRef, useCallback } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { supabase } from '../lib/supabase'
import { useMineStore, selectArmedMines } from '../store/mineStore'
import type { SceneObject } from '../types/database'

interface UseMinesOptions {
  sceneId: string | null
  sceneObjects: SceneObject[]
  /** Ref al objeto 3D del jugador para detección de proximidad */
  playerRef?: React.RefObject<THREE.Object3D>
  /** Callback al explotar una mina */
  onExplode?: (mineId: string, position: [number, number, number]) => void
}

export function useMines({
  sceneId,
  sceneObjects,
  playerRef,
  onExplode,
}: UseMinesOptions) {
  const { loadMinesFromScene, applyRealtimeEvent, placeMine, triggerMine, defuseMine, explodeMine, removeMine } =
    useMineStore()
  const armedMines = useMineStore(selectArmedMines)
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
  const triggeringIdsRef = useRef<Set<string>>(new Set())

  // ── 1. Carga inicial desde sceneObjects ───────────────────────
  useEffect(() => {
    loadMinesFromScene(sceneObjects)
  }, [sceneObjects, loadMinesFromScene])

  // ── 2. Realtime subscription (solo mine props) ─────────────────
  useEffect(() => {
    if (!sceneId) return

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
    }

    channelRef.current = supabase
      .channel(`mines:scene:${sceneId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'scene_objects',
          filter: `scene_id=eq.${sceneId}`,
        },
        (payload) => {
          const newObj = payload.new as SceneObject | undefined
          const oldObj = payload.old as { id: string } | undefined

          // Filtrar solo 'prop' con kind='mine'
          const isMine = (obj?: Partial<SceneObject>) =>
            obj?.object_type === 'prop' &&
            (obj?.metadata as Record<string, unknown>)?.kind === 'mine'

          if (!isMine(newObj) && !isMine(oldObj as Partial<SceneObject>)) return

          applyRealtimeEvent(
            payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            newObj as SceneObject,
            oldObj?.id
          )
        }
      )
      .subscribe()

    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current)
        channelRef.current = null
      }
    }
  }, [sceneId, applyRealtimeEvent])

  // ── 3. Detección de proximidad (R3F frame loop) ────────────────
  //    Solo activo si se pasa playerRef
  const _tmpVecPlayer = useRef(new THREE.Vector3())
  const _tmpVecMine = useRef(new THREE.Vector3())

  useFrame(() => {
    if (!playerRef?.current || armedMines.length === 0) return

    const playerPos = _tmpVecPlayer.current
    playerRef.current.getWorldPosition(playerPos)

    const minePos = _tmpVecMine.current

    for (const mine of armedMines) {
      const [mx, my, mz] = mine.position
      minePos.set(mx, my, mz)
      const dist = playerPos.distanceTo(minePos)

      if (dist < mine.radius) {
        if (triggeringIdsRef.current.has(mine.id)) continue
        triggeringIdsRef.current.add(mine.id)

        // Optimistic trigger → explode
        triggerMine(mine.id)
          .then(() => {
            explodeMine(mine.id)
            onExplode?.(mine.id, mine.position)
          })
          .catch((err) => {
            console.error('[useMines] triggerMine error:', err)
            triggeringIdsRef.current.delete(mine.id)
          })
      }
    }
  })

  // ── Public API ─────────────────────────────────────────────────
  const place = useCallback(
    (position: [number, number, number], userId: string, radius = 1.5) => {
      if (!sceneId) return Promise.resolve(null)
      return placeMine({ position, radius, status: 'armed', ownerId: userId, meta: {} }, sceneId, userId)
    },
    [sceneId, placeMine]
  )

  return {
    mines: useMineStore((s) => s.mines),
    place,
    defuse: defuseMine,
    explode: explodeMine,
    remove: removeMine,
  }
}

// ─── Convenience: useMines fuera de R3F canvas ────────────────────
// (sin useFrame, sin useThree — para UI / paneles)
export function useMinesUI() {
  return {
    mines: useMineStore((s) => s.mines),
    selectedMineId: useMineStore((s) => s.selectedMineId),
    setSelectedMine: useMineStore((s) => s.setSelectedMine),
    removeMine: useMineStore((s) => s.removeMine),
    defuseMine: useMineStore((s) => s.defuseMine),
  }
}
