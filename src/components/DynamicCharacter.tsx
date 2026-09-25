import React, { useRef, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useFBX, useAnimations, Sphere } from '@react-three/drei'
import * as THREE from 'three'
import { useSoulStore } from '../store/soulStore'
import { CHARACTERS, type CharacterConfig } from '../constants/characters'
import { EnergyShaderMaterial } from '../shaders/EnergyShader'
import '../shaders/EnergyShader'
import type { CharacterOverride } from '../store/soulStore'
import { supabase } from '../lib/supabase'
import { MODEL_UPLOAD } from '../lib/constraints'

// ── Helpers ──────────────────────────────────────────────────────────────────

const EMPTY_OVERRIDE: CharacterOverride = {}

/**
 * Returns the effective THREE.Color for a character:
 * uses the per-character shader override if set, otherwise cyan default.
 */
function useShaderColor(characterId: string): THREE.Color {
    const overrides = useSoulStore((s) => s.characterOverrides[characterId])
    return useMemo(
        () => new THREE.Color(overrides?.shaderColor ?? '#00ffff'),
        [overrides?.shaderColor],
    )
}

/** Crossfades to the animation mapped to the current mood (shared by FBX/GLB models). */
function useMoodAnimation(actions: Record<string, THREE.AnimationAction | null>, config: any) {
    const mood = useSoulStore(s => s.mood)

    useEffect(() => {
        const actionNames = Object.keys(actions)
        if (actionNames.length === 0) return
        const animName =
            (config.animations && config.animations[mood]) ||
            config.defaultAnimation ||
            actionNames[0]
        const action = actions[animName] || actions[actionNames[0]]
        if (action) {
            Object.values(actions).forEach((a) => a?.fadeOut(0.5))
            action.reset().fadeIn(0.5).play()
        }
    }, [actions, mood, config])
}

/** Toggles cast/receiveShadow on every mesh according to the performance mode. */
function useShadowMode(object: THREE.Object3D) {
    const lowPerformanceMode = useSoulStore(s => s.lowPerformanceMode)

    useEffect(() => {
        object.traverse((child: any) => {
            if (child.isMesh) {
                child.castShadow = !lowPerformanceMode
                child.receiveShadow = !lowPerformanceMode
            }
        })
    }, [object, lowPerformanceMode])
}

/** Drives the energy shader uniforms (time, intensity, live color) each frame. */
function useEnergyUniforms(
    materialRef: React.MutableRefObject<any>,
    overrides: CharacterOverride,
    shaderColor: THREE.Color,
) {
    const intensity = useSoulStore(s => s.intensity)
    const isThinking = useSoulStore(s => s.isThinking)
    const mood = useSoulStore(s => s.mood)

    useFrame((_, delta) => {
        const mat = materialRef.current
        if (!mat) return
        mat.uTime += delta

        let target = (overrides.intensity ?? intensity) as number
        if (isThinking) target += 0.8
        if (mood === 'excited') target += 0.5
        mat.uIntensity = THREE.MathUtils.lerp(mat.uIntensity, target, 0.1)

        // Live-update color when override changes
        if (mat.uniforms) mat.uniforms.uColor.value = shaderColor
    })
}

// ── FBX Model ─────────────────────────────────────────────────────────────────

const FBXModel = ({ url, config }: { url: string; config: any }) => {
    const fbx = useFBX(url)
    const group = useRef<THREE.Group>(null)
    const { actions } = useAnimations(fbx.animations, group)

    // Clone the FBX model to prevent polluting the cached asset
    const clonedFbx = useMemo(() => fbx.clone(true), [fbx])

    useMoodAnimation(actions, config)
    useShadowMode(clonedFbx)

    // Apply per-character override for scale / position
    const overrides = useSoulStore(s => s.characterOverrides[config.id]) || EMPTY_OVERRIDE
    const effectiveScale = overrides.scale ?? config.scale
    const effectivePositionY = overrides.positionY ?? config.position[1]

    return (
        <primitive
            object={clonedFbx}
            ref={group}
            scale={effectiveScale}
            position={[config.position[0], effectivePositionY, config.position[2]]}
        />
    )
}

// ── GLB Model ─────────────────────────────────────────────────────────────────

const GLBModel = ({ url, config }: { url: string; config: any }) => {
    const { scene, animations } = useGLTF(url)
    const group = useRef<THREE.Group>(null)
    const { actions } = useAnimations(animations, group)
    const overrides = useSoulStore(s => s.characterOverrides[config.id]) || EMPTY_OVERRIDE

    // Clone the scene to avoid modifying the cached shared gltf scene
    const clonedScene = useMemo(() => scene.clone(true), [scene])

    useMoodAnimation(actions, config)
    useShadowMode(clonedScene)

    const shaderColor = useShaderColor(config.id)

    // Reconstruct material when shader color changes
    const material = useMemo(() => {
        const mat = new EnergyShaderMaterial()
        mat.uniforms.uColor.value = shaderColor
        return mat
    }, [shaderColor])

    // Dispose each replaced material (and the last one on unmount)
    useEffect(() => {
        return () => material.dispose()
    }, [material])

    const materialRef = useRef(material)
    materialRef.current = material
    useEnergyUniforms(materialRef, overrides, shaderColor)

    // Apply material shader to the cloned scene (or restore originals)
    useEffect(() => {
        if (!overrides.useEnergyShader) return

        const originalMaterials = new Map<THREE.Mesh, THREE.Material | THREE.Material[]>()
        clonedScene.traverse((child: any) => {
            if (child.isMesh) {
                originalMaterials.set(child, child.material)
                child.material = material
            }
        })

        return () => {
            originalMaterials.forEach((origMat, mesh) => {
                mesh.material = origMat
            })
        }
    }, [clonedScene, material, overrides.useEnergyShader])

    const effectiveScale = overrides.scale ?? config.scale
    const effectivePositionY = overrides.positionY ?? config.position[1]

    return (
        <primitive
            object={clonedScene}
            ref={group}
            scale={effectiveScale}
            position={[config.position[0], effectivePositionY, config.position[2]]}
        />
    )
}

// ── Base Entity (no model URL) ─────────────────────────────────────────────────

const BaseEntity = ({ characterId }: { characterId: string }) => {
    const materialRef = useRef<any>(null)

    const lowPerformanceMode = useSoulStore((s) => s.lowPerformanceMode)
    const overrides = useSoulStore((s) => s.characterOverrides[characterId]) || EMPTY_OVERRIDE

    const shaderColor = useShaderColor(characterId)

    useEnergyUniforms(materialRef, overrides, shaderColor)

    const scale = overrides.scale ?? 1

    return (
        <Sphere 
            args={[1, 64, 64]} 
            scale={scale}
            castShadow={!lowPerformanceMode}
            receiveShadow={!lowPerformanceMode}
        >
            <energyShaderMaterial
                ref={materialRef}
                attach="material"
                transparent
                uColor={shaderColor}
                uIntensity={0.5}
                uTime={0}
            />
        </Sphere>
    )
}

// ── Single character renderer ─────────────────────────────────────────────────

const CharacterRenderer: React.FC<{ config: CharacterConfig }> = ({ config }) => {
    if (!config.modelUrl) {
        return <BaseEntity characterId={config.id} />
    }
    if (config.type === 'fbx') {
        return <FBXModel url={config.modelUrl} config={config} />
    }
    return <GLBModel url={config.modelUrl} config={config} />
}

// ── DynamicCharacter — renders all visible objects ───────────────────────────

export const DynamicCharacter: React.FC = () => {
    const customCharacters = useSoulStore(s => s.customCharacters)
    const customModelUrls = useSoulStore(s => s.customModelUrls)
    const setCustomModelUrl = useSoulStore(s => s.setCustomModelUrl)
    const visibleObjects = useSoulStore(s => s.visibleObjects)

    useEffect(function refreshSignedModelUrls() {
        let cancelled = false

        async function refresh() {
            await Promise.all(customCharacters.map(async (config) => {
                if (!config.storagePath || customModelUrls[config.id]) return

                const { data, error } = await supabase.storage
                    .from('models')
                    .createSignedUrl(config.storagePath, MODEL_UPLOAD.SIGNED_URL_SECONDS)

                if (!cancelled && !error && data?.signedUrl) {
                    setCustomModelUrl(config.id, data.signedUrl)
                }
            }))
        }

        refresh()

        return function cancelSignedUrlRefresh() {
            cancelled = true
        }
    }, [customCharacters, customModelUrls, setCustomModelUrl])

    const visibleChars = useMemo(() => {
        const customChars = customCharacters.map((config) => ({
            ...config,
            modelUrl: customModelUrls[config.id] ?? config.modelUrl,
        }))
        const allChars = [...CHARACTERS, ...customChars]
        return allChars.filter((c) => visibleObjects[c.id])
    }, [customCharacters, customModelUrls, visibleObjects])

    return (
        <>
            {visibleChars.map((config) => (
                <CharacterRenderer key={config.id} config={config} />
            ))}
        </>
    )
}
