import { useRef, useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { useGLTF, useFBX, useAnimations, Sphere } from '@react-three/drei'
import * as THREE from 'three'
import { useSoulStore } from '../store/soulStore'
import type { CharacterOverride } from '../store/soulStore'
import { CHARACTERS } from '../constants/characters'
import { EnergyShaderMaterial } from '../shaders/EnergyShader'
import '../shaders/EnergyShader'

interface ModelProps {
    url: string
    config: any
    overrides: CharacterOverride
}

const FBXModel = ({ url, config, overrides }: ModelProps) => {
    const fbx = useFBX(url)
    const group = useRef<THREE.Group>(null)
    const { actions } = useAnimations(fbx.animations, group)
    const { mood, intensity, isThinking } = useSoulStore()

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

    // Optionally apply energy shader
    const useShader = overrides.useEnergyShader ?? false
    const material = useMemo(() => useShader ? new EnergyShaderMaterial() : null, [useShader])

    useFrame((_, delta) => {
        if (material) {
            material.uTime += delta
            const shaderColor = overrides.shaderColor
            if (shaderColor) material.uColor = new THREE.Color(shaderColor)
            let targetIntensity = overrides.intensity ?? intensity
            if (isThinking) targetIntensity += 0.8
            if (mood === 'excited') targetIntensity += 0.5
            material.uIntensity = THREE.MathUtils.lerp(material.uIntensity, targetIntensity, 0.1)
        }
    })

    useEffect(() => {
        if (material) {
            fbx.traverse((child: any) => {
                if (child.isMesh) child.material = material
            })
        }
    }, [fbx, material])

    const scale = overrides.scale ?? config.scale
    const posY = overrides.positionY ?? config.position[1]

    return <primitive object={fbx} ref={group} scale={scale} position={[config.position[0], posY, config.position[2]]} />
}

const GLBModel = ({ url, config, overrides }: ModelProps) => {
    const { scene, animations } = useGLTF(url)
    const group = useRef<THREE.Group>(null)
    const { actions } = useAnimations(animations, group)
    const { mood, intensity, isThinking } = useSoulStore()

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

    const useShader = overrides.useEnergyShader ?? false
    const material = useMemo(() => useShader ? new EnergyShaderMaterial() : null, [useShader])

    useFrame((_, delta) => {
        if (material) {
            material.uTime += delta
            const shaderColor = overrides.shaderColor
            if (shaderColor) material.uColor = new THREE.Color(shaderColor)
            let targetIntensity = overrides.intensity ?? intensity
            if (isThinking) targetIntensity += 0.8
            if (mood === 'excited') targetIntensity += 0.5
            material.uIntensity = THREE.MathUtils.lerp(material.uIntensity, targetIntensity, 0.1)
        }
    })

    useEffect(() => {
        if (useShader && material) {
            scene.traverse((child: any) => {
                if (child.isMesh) child.material = material
            })
        }
    }, [scene, material, useShader])

    const scale = overrides.scale ?? config.scale
    const posY = overrides.positionY ?? config.position[1]

    return <primitive object={scene} ref={group} scale={scale} position={[config.position[0], posY, config.position[2]]} />
}

const BaseEntity = ({ overrides }: { overrides: CharacterOverride }) => {
    const materialRef = useRef<any>(null)
    const { intensity, isThinking, mood } = useSoulStore()

    useFrame((_, delta) => {
        if (materialRef.current) {
            materialRef.current.uTime += delta
            let targetIntensity = overrides.intensity ?? intensity
            if (isThinking) targetIntensity += 0.8
            if (mood === 'excited') targetIntensity += 0.5
            materialRef.current.uIntensity = THREE.MathUtils.lerp(materialRef.current.uIntensity, targetIntensity, 0.1)
        }
    })

    const shaderColor = overrides.shaderColor ?? '#00ffff'
    const scale = overrides.scale ?? 1

    return (
        <Sphere args={[1, 64, 64]} scale={scale}>
            {/* @ts-ignore */}
            <energyShaderMaterial
                ref={materialRef}
                attach="material"
                transparent
                args={[{
                    uColor: new THREE.Color(shaderColor),
                    uIntensity: 0.5,
                    uTime: 0
                }]}
            />
        </Sphere>
    )
}

export const DynamicCharacter = () => {
    const { activeCharacterId, customCharacters, characterOverrides } = useSoulStore()

    const allCharacters = [...CHARACTERS, ...customCharacters]
    const config = allCharacters.find(c => c.id === activeCharacterId) || CHARACTERS[0]
    const overrides = characterOverrides[activeCharacterId] || {}

    if (!config.modelUrl) {
        return <BaseEntity overrides={overrides} />
    }

    if (config.type === 'fbx') {
        return <FBXModel url={config.modelUrl} config={config} overrides={overrides} />
    }

    return <GLBModel url={config.modelUrl} config={config} overrides={overrides} />
}

useFBX.preload('/HappyIdle.fbx')
useGLTF.preload('/HappyIdle.glb') // Para cuando conviertas el archivo

