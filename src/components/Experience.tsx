import { Suspense, useMemo, useEffect, memo } from 'react'
import { Canvas, useThree } from '@react-three/fiber'
import { OrbitControls, Environment, ContactShadows, Grid } from '@react-three/drei'
import { DynamicCharacter } from './DynamicCharacter'
import { CAMERA } from '../lib/constraints'
import { useSceneStore } from '../store/sceneStore'

/**
 * Arrays estáticos para evitar recreación de memoria en cada render (Performance R3F)
 */
const GRID_POSITION: [number, number, number] = [0, -1.01, 0]
const GRID_ARGS: [number, number] = [20, 20]
const BG_ARGS: [string] = ['#0a0e14']
const LIGHT_POS: [number, number, number] = [10, 10, 10]
const CONTACT_SHADOWS_POS: [number, number, number] = [0, -1, 0]
const BOX_ARGS: [number, number, number] = [1, 1, 1]

/**
 * CameraController — Maneja la posición inicial de la cámara solo una vez.
 * Esto evita que la cámara "salte" o se resetee al moverla.
 */
const CameraController = () => {
    const currentScene = useSceneStore(s => s.currentScene)
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
    const sceneObjects = useSceneStore(s => s.sceneObjects)

    // Helper para normalizar posición/rotación/escala (acepta array o objeto {x,y,z})
    const toVec = (data: any): [number, number, number] => {
        if (!data) return [0, 0, 0]
        if (Array.isArray(data)) return [data[0] ?? 0, data[1] ?? 0, data[2] ?? 0]
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
                            <boxGeometry args={BOX_ARGS} />
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
            position={GRID_POSITION}
            args={GRID_ARGS}
            {...gridConfig}
        />
    )
}

export const Experience = () => {
    return (
        <Canvas camera={{ fov: CAMERA.FOV }}>
            <color attach="background" args={BG_ARGS} />
            <CameraController />

            <ambientLight intensity={0.5} />
            <pointLight position={LIGHT_POS} intensity={1} />

            <Suspense fallback={null}>
                <DynamicCharacter />
                <SceneObjects />
            </Suspense>

            <FloorGrid />

            <ContactShadows
                position={CONTACT_SHADOWS_POS}
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
