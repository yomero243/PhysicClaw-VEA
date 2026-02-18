import React, { useRef, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useFBX, useAnimations, Sphere } from '@react-three/drei'
import * as THREE from 'three'
import { useSoulStore } from '../store/soulStore'
import { CHARACTERS } from '../constants/characters'
import { EnergyShaderMaterial } from '../shaders/EnergyShader'
import '../shaders/EnergyShader'

const FBXModel = ({ url, config }: { url: string; config: any }) => {
    const fbx = useFBX(url)
    const group = useRef<THREE.Group>(null)
    const { actions } = useAnimations(fbx.animations, group)
    const { mood } = useSoulStore()

    useEffect(() => {
        const actionNames = Object.keys(actions)
        if (actionNames.length > 0) {
            // Priority: config.animations[mood] -> config.defaultAnimation -> first available
            const animName = (config.animations && config.animations[mood]) || config.defaultAnimation || actionNames[0]
            const action = actions[animName] || actions[actionNames[0]]
            
            if (action) {
                // Stop all other actions
                Object.values(actions).forEach(a => a?.fadeOut(0.5))
                action.reset().fadeIn(0.5).play()
            }
        }
    }, [actions, mood, config])

    return <primitive object={fbx} ref={group} scale={config.scale} position={config.position} />
}

const GLBModel = ({ url, config }: { url: string; config: any }) => {
    const { scene, animations } = useGLTF(url)
    const group = useRef<THREE.Group>(null)
    const { actions } = useAnimations(animations, group)
    const { mood } = useSoulStore()

    useEffect(() => {
        const actionNames = Object.keys(actions)
        if (actionNames.length > 0) {
            const animName = (config.animations && config.animations[mood]) || config.defaultAnimation || actionNames[0]
            const action = actions[animName] || actions[actionNames[0]]
            
            if (action) {
                Object.values(actions).forEach(a => a?.fadeOut(0.5))
                action.reset().fadeIn(0.5).play()
            }
        }
    }, [actions, mood, config])

    // Apply shader to all meshes in the model
    const material = useMemo(() => new EnergyShaderMaterial(), [])
    const { intensity, isThinking } = useSoulStore()

    useFrame((_, delta) => {
        if (material) {
            material.uTime += delta
            let targetIntensity = intensity
            if (isThinking) targetIntensity += 0.8
            if (mood === 'excited') targetIntensity += 0.5
            material.uIntensity = THREE.MathUtils.lerp(material.uIntensity, targetIntensity, 0.1)
        }
    })

    useEffect(() => {
        scene.traverse((child: any) => {
            if (child.isMesh) {
                child.material = material
            }
        })
    }, [scene, material])

    return <primitive object={scene} ref={group} scale={config.scale} position={config.position} />
}

const BaseEntity = () => {
    const materialRef = useRef<any>(null)
    const { intensity, isThinking, mood } = useSoulStore()

    useFrame((_, delta) => {
        if (materialRef.current) {
            materialRef.current.uTime += delta
            let targetIntensity = intensity
            if (isThinking) targetIntensity += 0.8
            if (mood === 'excited') targetIntensity += 0.5
            materialRef.current.uIntensity = THREE.MathUtils.lerp(materialRef.current.uIntensity, targetIntensity, 0.1)
        }
    })

    return (
        <Sphere args={[1, 64, 64]}>
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

export const DynamicCharacter = () => {
    const { activeCharacterId } = useSoulStore()
    const config = CHARACTERS.find(c => c.id === activeCharacterId) || CHARACTERS[0]

    if (!config.modelUrl) {
        return <BaseEntity />
    }

    if (config.type === 'fbx') {
        return <FBXModel url={config.modelUrl} config={config} />
    }

    return <GLBModel url={config.modelUrl} config={config} />
}
