import { Suspense, useMemo, useEffect, memo } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Environment, ContactShadows, Grid } from '@react-three/drei'
import { DynamicCharacter } from './DynamicCharacter'
import { CAMERA } from '../lib/constraints'
import { useScenePersistence } from '../hooks/useScenePersistence'

/**
 * CameraController — Maneja la posición inicial de la cámara solo una vez.
 * Esto evita que la cámara "salte" o se resetee al moverla.
 */
const CameraController = () => {
    const { currentScene } = useScenePersistence()
    const { camera } = useThree()

    useEffect(function syncCameraPosition() {
        if (currentScene?.camera_position) {
            const pos = currentScene.camera_position
            // Solo establecemos la posición si es la primera vez o si la escena cambia radicalmente
            // Pero NO cada vez que el componente se renderiza por un mensaje o mood
            camera.position.set(pos[0], pos[1], pos[2])
            camera.lookAt(0, 0, 0)
        }
    }, [currentScene?.id, camera]) // Solo reacciona si el ID de la escena cambia

    return null
}

/**
 * Renderiza los objetos guardados en la BD que sean primitivos (como cubos).
 */
const SceneObjects = memo(function SceneObjects() {
    const { sceneObjects } = useScenePersistence()

    // Helper para normalizar posición/rotación/escala (acepta array o objeto {x,y,z})
    const toVec = (data: [number, number, number] | { x: number; y: number; z: number } | null | undefined): [number, number, number] => {
        if (!data) return [0, 0, 0]
        if (Array.isArray(data)) return data.length === 3 ? data : [0, 0, 0]
        return [data.x ?? 0, data.y ?? 0, data.z ?? 0]
    }

    useEffect(function logSceneObjects() {
        if (sceneObjects.length > 0) {
            console.log('[SceneObjects] Objetos detectados en BD:', sceneObjects)
        }
    }, [sceneObjects])

    return (
        <>
            {sceneObjects.map((obj) => {
                // Verificamos si es un cubo (metadata.shape o metadata.is_primitive)
                const isCube = obj.metadata?.shape === 'cube' || (obj.metadata as any)?.is_primitive
                
                if (isCube && obj.is_visible !== false) {
                    const pos = toVec(obj.position as any)
                    const rot = toVec(obj.rotation as any)
                    const scl = toVec((obj.scale_v || (obj as any).scale) as any)

                    return (
                        <mesh 
                            key={obj.id} 
                            position={pos} 
                            rotation={rot} 
                            scale={scl}
                        >
                            <boxGeometry args={[1, 1, 1]} />
                            <meshStandardMaterial 
                                color={(obj.metadata?.color as string) || '#00d4ff'} 
                                metalness={0.5}
                                roughness={0.2}
                            />
                        </mesh>
                    )
                }
                return null
            })}
        </>
    )
})

const FloorGrid = () => {
    const gridConfig = useMemo(() => ({
        cellSize: 0.5,
        cellThickness: 0.5,
        cellColor: '#1a3a4a',
        sectionSize: 2,
        sectionThickness: 1,
        sectionColor: '#00d4ff',
        fadeDistance: 20,
        fadeStrength: 1.5,
        infiniteGrid: true,
    }), [])

    return (
        <Grid
            position={[0, -1.01, 0]}
            args={[20, 20]}
            {...gridConfig}
        />
    )
}

export const Experience = () => {
    return (
        <Canvas camera={{ fov: CAMERA.FOV }}>
            <color attach="background" args={['#0a0e14']} />
            <CameraController />

            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1} />

            <Suspense fallback={null}>
                <DynamicCharacter />
                <SceneObjects />
            </Suspense>

            <FloorGrid />

            <ContactShadows
                position={[0, -1, 0]}
                resolution={1024}
                scale={10}
                blur={2.5}
                opacity={0.5}
                far={10}
                color="#000000"
            />
            <Environment preset="city" />

            <OrbitControls
                makeDefault
                minPolarAngle={CAMERA.POLAR_MIN}
                maxPolarAngle={CAMERA.POLAR_MAX}
                minDistance={CAMERA.ZOOM_MIN}
                maxDistance={CAMERA.ZOOM_MAX}
            />

        </Canvas>
    )
}
