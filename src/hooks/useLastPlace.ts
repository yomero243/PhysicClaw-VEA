// ============================================================
// PhysicClaw-VEA — useLastPlace
// Puts the entity back where its owner left it, and remembers where it is.
//
// Writes are throttled on purpose: live movement travels over Realtime
// broadcast (LocalAvatarTransformBroadcaster) and never touches Postgres.
// Only the last place is stored — at most every SAVE_EVERY_MS and only when
// it moved, plus once when the tab is hidden (closing, switching apps).
// ============================================================
import { useEffect, useRef } from 'react'
import type { RefObject } from 'react'
import type * as THREE from 'three'
import { useSceneStore } from '../store/sceneStore'
import type { EntityVec3 } from '../types/database'

export const SAVE_EVERY_MS = 10_000
/** Metres / radians below which a change is not worth a write. */
export const MIN_CHANGE = 0.01

const round = (n: number) => Math.round(n * 1000) / 1000

export function readPlace(object: THREE.Object3D): { position: EntityVec3; rotation: EntityVec3 } {
    const p = object.position
    const r = object.rotation
    return {
        position: [round(p.x), round(p.y), round(p.z)],
        rotation: [round(r.x), round(r.y), round(r.z)],
    }
}

export function placeChanged(a: EntityVec3 | null, b: EntityVec3): boolean {
    if (!a) return true
    return a.some((v, i) => Math.abs(v - b[i]) > MIN_CHANGE)
}

export function useLastPlace(objectRef: RefObject<THREE.Object3D | null>) {
    const entityId = useSceneStore((s) => s.entity?.id ?? null)
    const sceneId = useSceneStore((s) => s.currentScene?.id ?? null)
    const restoredFor = useRef<string | null>(null)

    // Restore once per entity + scene. <Canvas> mounts its children
    // asynchronously, so the object may not exist yet: retry per frame.
    useEffect(() => {
        if (!entityId || !sceneId) return
        let frame = 0
        const tryRestore = () => {
            const object = objectRef.current
            const { entity } = useSceneStore.getState()
            if (!entity) return
            if (!object) {
                frame = requestAnimationFrame(tryRestore)
                return
            }
            const key = `${entity.id}:${sceneId}`
            if (restoredFor.current === key) return
            restoredFor.current = key
            if (entity.last_scene_id === sceneId && entity.last_position) {
                object.position.fromArray(entity.last_position)
                if (entity.last_rotation) object.rotation.fromArray(entity.last_rotation)
            }
        }
        tryRestore()
        return () => cancelAnimationFrame(frame)
    }, [objectRef, entityId, sceneId])

    // Save, throttled.
    useEffect(() => {
        if (!entityId || !sceneId) return

        const save = () => {
            const object = objectRef.current
            const { entity, currentScene, saveLastPlace } = useSceneStore.getState()
            if (!object || !entity || !currentScene) return
            const { position, rotation } = readPlace(object)
            const sameScene = entity.last_scene_id === currentScene.id
            if (sameScene && !placeChanged(entity.last_position, position) && !placeChanged(entity.last_rotation, rotation)) {
                return
            }
            saveLastPlace(position, rotation).catch((err) => console.warn('[useLastPlace] save failed:', err))
        }

        const onHide = () => {
            if (document.visibilityState === 'hidden') save()
        }

        const timer = window.setInterval(save, SAVE_EVERY_MS)
        document.addEventListener('visibilitychange', onHide)
        return () => {
            window.clearInterval(timer)
            document.removeEventListener('visibilitychange', onHide)
        }
    }, [objectRef, entityId, sceneId])
}
