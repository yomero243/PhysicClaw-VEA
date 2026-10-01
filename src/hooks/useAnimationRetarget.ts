// ============================================================
// PhysicClaw-VEA — useAnimationRetarget
// Loads a user-uploaded GLB model and retargets CC0 animation
// clips to the model's skeleton using THREE.SkeletonUtils.
//
// NOTE: This hook must be used inside a React Three Fiber <Canvas>
// tree because useGLTF depends on R3F's context.
// ============================================================
import { useState, useMemo } from 'react'
import { useGLTF } from '@react-three/drei'
import { retargetClip } from 'three/examples/jsm/utils/SkeletonUtils.js'
import * as THREE from 'three'
import { BONE_MAPS, type RigType } from '../lib/boneMaps'

// ─── CC0 animation clip URLs ─────────────────────────────────────────────────
// Place CC0-licensed .glb animation files in /public/cc0/.
// Each entry is a root-relative path served by Vite.
const CC0_CLIP_URLS: string[] = [
    '/cc0/idle.glb',
    '/cc0/walk.glb',
    '/cc0/run.glb',
]

// ─── Types ───────────────────────────────────────────────────────────────────

export interface UseAnimationRetargetReturn {
    clips: THREE.AnimationClip[]
    error: string | null
}

// ─── Internal helper ─────────────────────────────────────────────────────────

/**
 * Finds the first SkinnedMesh in an Object3D hierarchy.
 * Returns null when none is found.
 */
function findFirstSkinnedMesh(root: THREE.Object3D): THREE.SkinnedMesh | null {
    let found: THREE.SkinnedMesh | null = null
    root.traverse((obj) => {
        if (found) return
        if ((obj as THREE.SkinnedMesh).isSkinnedMesh) {
            found = obj as THREE.SkinnedMesh
        }
    })
    return found
}

// ─── Hook ────────────────────────────────────────────────────────────────────

/**
 * Loads `modelUrl` via useGLTF and retargets all CC0 animation clips
 * from `/public/cc0/` to the model's skeleton using the bone map for `rigType`.
 *
 * @param modelUrl  Public URL (or blob URL) of the user's GLB model.
 * @param rigType   Rig convention used by the model.
 * @returns `{ clips, error }` — clips is the list of retargeted AnimationClips.
 */
export function useAnimationRetarget(
    modelUrl: string,
    rigType: RigType,
): UseAnimationRetargetReturn {
    const [error, setError] = useState<string | null>(null)

    // Load the target model (user's GLB)
    // useGLTF suspends until loaded, so wrap the consuming component in <Suspense>.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- useGLTF returns a loosely-typed GLTF object
    const targetGltf = useGLTF(modelUrl) as any

    // Load all CC0 source clips
    // useGLTF accepts an array and returns an array in the same order.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any -- useGLTF array overload returns loosely-typed items
    const sourceGltfs = useGLTF(CC0_CLIP_URLS) as any[]

    const clips = useMemo<THREE.AnimationClip[]>(() => {
        try {
            const targetRoot: THREE.Object3D = targetGltf.scene
            const targetMesh = findFirstSkinnedMesh(targetRoot)

            if (!targetMesh) {
                setError('No SkinnedMesh found in uploaded model')
                return []
            }

            const boneMap = BONE_MAPS[rigType]
            const retargeted: THREE.AnimationClip[] = []

            for (const sourceGltf of sourceGltfs) {
                const sourceRoot: THREE.Object3D = sourceGltf.scene
                const sourceClips: THREE.AnimationClip[] = sourceGltf.animations ?? []

                if (sourceClips.length === 0) continue

                for (const clip of sourceClips) {
                    const retargetedClip = retargetClip(targetMesh, sourceRoot, clip, {
                        // `names` maps target bone names → source bone names (inverse of boneMap)
                        // boneMap goes source → target, so we invert it here.
                        names: invertMap(boneMap),
                    })
                    retargeted.push(retargetedClip)
                }
            }

            setError(null)
            return retargeted
        } catch (err) {
            const msg = err instanceof Error ? err.message : 'Retargeting failed'
            setError(msg)
            return []
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps -- sourceGltfs is an array; identity is stable when CC0_CLIP_URLS is constant
    }, [targetGltf, sourceGltfs, rigType])

    return { clips, error }
}

// ─── Utility ─────────────────────────────────────────────────────────────────

/** Inverts a { sourceKey: targetValue } map to { targetValue: sourceKey }. */
function invertMap(map: Record<string, string>): Record<string, string> {
    const inv: Record<string, string> = {}
    for (const [src, tgt] of Object.entries(map)) {
        inv[tgt] = src
    }
    return inv
}
