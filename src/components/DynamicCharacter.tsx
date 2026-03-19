import React, { useRef, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useFBX, useAnimations, Sphere } from '@react-three/drei'
import * as THREE from 'three'
import { useSoulStore } from '../store/soulStore'
import { CHARACTERS, type CharacterConfig } from '../constants/characters'
import { EnergyShaderMaterial } from '../shaders/EnergyShader'
import '../shaders/EnergyShader'


// ── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Returns the effective THREE.Color for a character:
 * uses the per-character shader override if set, otherwise cyan default.
 */
function useShaderColor(characterId: string): THREE.Color {
    const overrides = useSoulStore((s) => s.characterOverrides[characterId])
    return useMemo(
        () => new THREE.Color(overrides?.shaderColor ?? '#00ffff'),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [overrides?.shaderColor],
    )
}

// ── FBX Model ─────────────────────────────────────────────────────────────────

const FBXModel = ({ url, config }: { url: string; config: any }) => {
    const fbx = useFBX(url)
    const group = useRef<THREE.Group>(null)
    const { actions } = useAnimations(fbx.animations, group)
    const { mood } = useSoulStore()

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

    // Apply per-character override for scale / position
    const { characterOverrides } = useSoulStore.getState()
    const overrides = characterOverrides[config.id] || {}
    const effectiveScale = overrides.scale ?? config.scale
    const effectivePositionY = overrides.positionY ?? config.position[1]

    return (
        <primitive
            object={fbx}
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
    const { mood, intensity, isThinking, characterOverrides } = useSoulStore()
    const overrides = characterOverrides[config.id] || {}

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

    const shaderColor = useShaderColor(config.id)
    // Reconstruct material when shader color changes
    const material = useMemo(() => {
        const mat = new EnergyShaderMaterial()
        mat.uniforms.uColor.value = shaderColor
        return mat
    }, [shaderColor])


    useFrame((_, delta) => {
        if (material) {
            material.uTime += delta

            let target = (overrides.intensity ?? intensity) as number
            if (isThinking) target += 0.8
            if (mood === 'excited') target += 0.5
            material.uIntensity = THREE.MathUtils.lerp(material.uIntensity, target, 0.1)

        }
    })

    useEffect(() => {
        // Only apply EnergyShader when explicitly opted in (default: keep original materials)
        if (!overrides.useEnergyShader) return
        scene.traverse((child: any) => {
            if (child.isMesh) child.material = material
        })
    }, [scene, material, overrides.useEnergyShader])

    const effectiveScale = overrides.scale ?? config.scale
    const effectivePositionY = overrides.positionY ?? config.position[1]

    return (
        <primitive
            object={scene}
            ref={group}
            scale={effectiveScale}
            position={[config.position[0], effectivePositionY, config.position[2]]}
        />
    )
}

// ── Base Entity (no model URL) ─────────────────────────────────────────────────

const BaseEntity = ({ characterId }: { characterId: string }) => {

    const materialRef = useRef<any>(null)
    const { intensity, isThinking, mood, characterOverrides } = useSoulStore()
    const overrides = characterOverrides[characterId] || {}
    const shaderColor = useShaderColor(characterId)

    useFrame((_, delta) => {
        if (materialRef.current) {
            materialRef.current.uTime += delta

            let target = (overrides.intensity ?? intensity) as number
            if (isThinking) target += 0.8
            if (mood === 'excited') target += 0.5
            materialRef.current.uIntensity = THREE.MathUtils.lerp(
                materialRef.current.uIntensity,
                target,
                0.1,
            )
            // Live-update color when override changes
            materialRef.current.uColor = shaderColor

        }
    })

    const scale = overrides.scale ?? 1

    return (
        <Sphere args={[1, 64, 64]} scale={scale}>
            {/* @ts-ignore */}
            <energyShaderMaterial
                ref={materialRef}
                attach="material"
                transparent
                args={[{ uColor: shaderColor, uIntensity: 0.5, uTime: 0 }]}
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
    const { customCharacters, visibleObjects } = useSoulStore()
    const allChars = [...CHARACTERS, ...customCharacters]

    const visibleChars = allChars.filter((c) => visibleObjects[c.id])

    return (
        <>
            {visibleChars.map((config) => (
                <CharacterRenderer key={config.id} config={config} />
            ))}
        </>
    )
}

useFBX.preload('/HappyIdle.fbx')
useGLTF.preload('/HappyIdle.glb') // Para cuando conviertas el archivo

