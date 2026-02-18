import React, { useRef, useEffect, useMemo, Suspense } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useAnimations, Sphere } from '@react-three/drei'
import * as THREE from 'three'
import { useSoulStore } from '../store/soulStore'
import { EnergyShaderMaterial } from '../shaders/EnergyShader'
import '../shaders/EnergyShader' // Ensure side effects run

// --------------------------------------------------------
// Helper to manage shader uniforms updates based on store
// --------------------------------------------------------
const useEnergyUniforms = (materialRef: React.MutableRefObject<any>) => {
    const { intensity, isThinking, mood } = useSoulStore()

    useFrame((_, delta) => {
        if (materialRef.current) {
            materialRef.current.uTime += delta

            let targetIntensity = intensity
            if (isThinking) targetIntensity += 0.8
            if (mood === 'excited') targetIntensity += 0.5

            // Smooth transition
            materialRef.current.uIntensity = THREE.MathUtils.lerp(
                materialRef.current.uIntensity,
                targetIntensity,
                0.1
            )
        }
    })
}

// --------------------------------------------------------
// Component for GLB loaded model
// --------------------------------------------------------
const ModelEntity = ({ url }: { url: string }) => {
    const group = useRef<THREE.Group>(null)
    const { scene, animations } = useGLTF(url)
    const { actions } = useAnimations(animations, group)

    // Play Idle animation
    useEffect(() => {
        if (actions) {
            const actionNames = Object.keys(actions)
            if (actionNames.length > 0) {
                // Try 'Idle' first, else first available
                const idleAnim = actions['Idle'] || actions[actionNames[0]]
                idleAnim?.reset().fadeIn(0.5).play()
            }
        }
    }, [actions])

    // Apply shader to all meshes in the model
    // Creating a dedicated material instance to control uniforms
    const material = useMemo(() => new EnergyShaderMaterial(), [])
    const materialRef = useRef(material)
    useEnergyUniforms(materialRef)

    useEffect(() => {
        scene.traverse((child: any) => {
            if (child.isMesh) {
                child.material = material
            }
        })
    }, [scene, material])

    return <primitive object={scene} ref={group} />
}

// --------------------------------------------------------
// Component for Base Geometry (Fallback)
// --------------------------------------------------------
const BaseEntity = () => {
    const mesh = useRef<THREE.Mesh>(null)
    const materialRef = useRef<any>(null)

    useEnergyUniforms(materialRef)

    return (
        <Sphere ref={mesh} args={[1, 64, 64]}>
            {/* @ts-ignore */}
            <energyShaderMaterial
                ref={materialRef}
                attach="material"
                transparent
                args={[{
                    uColor: new THREE.Color('#00ffff'),
                    uIntensity: 0.5,
                    uTime: 0
                }]}
            />
        </Sphere>
    )
}

// --------------------------------------------------------
// Main AugmentedEntity Component
// --------------------------------------------------------
export const AugmentedEntity = ({ modelUrl }: { modelUrl?: string }) => {
    return (
        <Suspense fallback={<BaseEntity />}>
            {modelUrl ? <ModelEntity url={modelUrl} /> : <BaseEntity />}
        </Suspense>
    )
}
