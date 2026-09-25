// ============================================================
// PhysicClaw-VEA — Aura entity
// The body of a character with no model: core + halo + motes, all
// driven by the soul store (mood → colour, intensity, thinking).
// See src/shaders/AuraShader.ts for the performance budget.
// ============================================================
import { useEffect, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { MOOD_COLORS, useSoulStore } from '../store/soulStore'
import type { CharacterConfig } from '../constants/characters'
import {
    createAuraUniforms,
    createCoreMaterial,
    createHaloMaterial,
    createMotesGeometry,
    createMotesMaterial,
} from '../shaders/AuraShader'

const DEFAULT_COLOR = '#00ffff'
const MOTES = { full: 420, low: 140 } as const
/** Higher is snappier. Frame-rate independent via 1 - e^(-k·dt). */
const EASE = { color: 3, intensity: 4, thinking: 3 } as const

const CORE_RADIUS = 0.32
const HALO_SIZE = 2.6

export const AuraEntity = ({ config }: { config: CharacterConfig }) => {
    const intensity = useSoulStore((s) => s.intensity)
    const isThinking = useSoulStore((s) => s.isThinking)
    const mood = useSoulStore((s) => s.mood)
    const lowPerformanceMode = useSoulStore((s) => s.lowPerformanceMode)
    const override = useSoulStore((s) => s.characterOverrides[config.id])
    const pixelRatio = useThree((s) => s.viewport.dpr)

    // A fixed colour override wins; otherwise the aura wears the mood.
    const targetColor = useMemo(
        () => new THREE.Color(override?.shaderColor ?? MOOD_COLORS[mood] ?? DEFAULT_COLOR),
        [override?.shaderColor, mood],
    )

    const uniforms = useMemo(() => createAuraUniforms(DEFAULT_COLOR), [])
    const coreGeometry = useMemo(() => new THREE.IcosahedronGeometry(CORE_RADIUS, 3), [])
    const haloGeometry = useMemo(() => new THREE.PlaneGeometry(HALO_SIZE, HALO_SIZE), [])
    const coreMaterial = useMemo(() => createCoreMaterial(uniforms), [uniforms])
    const haloMaterial = useMemo(() => createHaloMaterial(uniforms), [uniforms])

    const moteCount = lowPerformanceMode ? MOTES.low : MOTES.full
    const motesGeometry = useMemo(() => createMotesGeometry(moteCount), [moteCount])
    const motesMaterial = useMemo(() => createMotesMaterial(uniforms, pixelRatio), [uniforms, pixelRatio])

    // Start on the right colour instead of fading in from cyan.
    useEffect(() => {
        uniforms.uColor.value.copy(targetColor)
        // eslint-disable-next-line react-hooks/exhaustive-deps -- first frame only
    }, [uniforms])

    useEffect(
        () => () => {
            coreGeometry.dispose()
            haloGeometry.dispose()
            coreMaterial.dispose()
            haloMaterial.dispose()
        },
        [coreGeometry, haloGeometry, coreMaterial, haloMaterial],
    )
    useEffect(() => () => motesGeometry.dispose(), [motesGeometry])
    useEffect(() => () => motesMaterial.dispose(), [motesMaterial])

    useFrame((_, delta) => {
        // Clamp so a backgrounded tab does not jump the animation on return.
        const dt = Math.min(delta, 0.1)
        uniforms.uTime.value += dt

        let target = override?.intensity ?? intensity
        if (isThinking) target += 0.8
        if (mood === 'excited') target += 0.5

        uniforms.uIntensity.value = THREE.MathUtils.damp(uniforms.uIntensity.value, target, EASE.intensity, dt)
        uniforms.uThinking.value = THREE.MathUtils.damp(uniforms.uThinking.value, isThinking ? 1 : 0, EASE.thinking, dt)
        uniforms.uColor.value.lerp(targetColor, 1 - Math.exp(-EASE.color * dt))
    })

    const scale = override?.scale ?? config.scale
    const [x, y, z] = config.position
    const positionY = override?.positionY ?? y

    return (
        <group position={[x, positionY, z]} scale={scale}>
            <mesh geometry={haloGeometry} material={haloMaterial} renderOrder={1} />
            <mesh geometry={coreGeometry} material={coreMaterial} renderOrder={2} />
            <points geometry={motesGeometry} material={motesMaterial} renderOrder={3} />
        </group>
    )
}
