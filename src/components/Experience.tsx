import { Suspense, useMemo, useEffect, memo, useRef } from 'react'
import type { RefObject } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Environment, ContactShadows, Grid } from '@react-three/drei'
import * as THREE from 'three'
import { DynamicCharacter } from './DynamicCharacter'
import { GaussianSplats } from './GaussianSplats'
import { RemoteAvatars } from './RemoteAvatars'
import { CAMERA } from '../lib/constraints'
import { useSceneStore } from '../store/sceneStore'
import { useSoulStore } from '../store/soulStore'
import type { PhysicsEvent, SessionUser } from '../types/multiplayer'

/**
 * Arrays estáticos para evitar recreación de memoria en cada render (Performance R3F)
 */
const GRID_POSITION: [number, number, number] = [0, -1.01, 0]
const GRID_ARGS: [number, number] = [20, 20]
const BG_ARGS: [string] = ['#0C0912']
const CONTACT_SHADOWS_POS: [number, number, number] = [0, -1, 0]
const BOX_ARGS: [number, number, number] = [1, 1, 1]

interface ExperienceProps {
    remoteUsers?: SessionUser[]
    emitMultiplayerEvent?: (event: PhysicsEvent) => void
    localUserId?: string | null
}

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
    const lowPerformanceMode = useSoulStore(s => s.lowPerformanceMode)

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
                            castShadow={!lowPerformanceMode}
                            receiveShadow={!lowPerformanceMode}
                        >
                            <boxGeometry args={BOX_ARGS} />
                            <meshStandardMaterial 
                                color={(obj.metadata?.color as string) || '#A78BFA'} 
                                metalness={0.9}
                                roughness={0.05}
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
        cellColor: '#2A2440',
        sectionSize: 2,
        sectionThickness: 1,
        sectionColor: '#A78BFA',
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

const LocalAvatarTransformBroadcaster = ({
    playerRef,
    localUserId,
    emitMultiplayerEvent,
}: {
    playerRef: RefObject<THREE.Object3D | null>
    localUserId?: string | null
    emitMultiplayerEvent?: (event: PhysicsEvent) => void
}) => {
    const positionRef = useRef(new THREE.Vector3())
    const lastPositionRef = useRef(new THREE.Vector3())
    const lastRotationYRef = useRef(0)

    useFrame(() => {
        if (!playerRef.current || !localUserId || !emitMultiplayerEvent) return

        playerRef.current.getWorldPosition(positionRef.current)
        const rotY = playerRef.current.rotation.y

        // Calcular distancia y diferencia de rotación Y
        const dist = positionRef.current.distanceTo(lastPositionRef.current)
        const rotDiff = Math.abs(rotY - lastRotationYRef.current)

        // Umbral espacial de 0.005 para omitir transmisiones si no hay movimiento real
        if (dist < 0.005 && rotDiff < 0.005) return

        emitMultiplayerEvent({
            type: 'avatar_move',
            userId: localUserId,
            position: [
                positionRef.current.x,
                positionRef.current.y,
                positionRef.current.z,
            ],
            rotation: [
                playerRef.current.rotation.x,
                rotY,
                playerRef.current.rotation.z,
            ],
        })

        // Guardar valores transmitidos para el siguiente frame
        lastPositionRef.current.copy(positionRef.current)
        lastRotationYRef.current = rotY
    })

    return null
}

export const Experience = ({
    remoteUsers = [],
    emitMultiplayerEvent,
    localUserId,
}: ExperienceProps) => {
    const playerRef = useRef<THREE.Group>(null)
    const lowPerformanceMode = useSoulStore((s) => s.lowPerformanceMode)

    return (
        <Canvas 
            camera={{ fov: CAMERA.FOV }}
            dpr={lowPerformanceMode ? 1 : [1, 2]}
            shadows={!lowPerformanceMode}
        >
            <color attach="background" args={BG_ARGS} />
            <CameraController />

            {/* Iluminación sofisticada adaptativa según el modo de rendimiento */}
            <ambientLight intensity={lowPerformanceMode ? 0.6 : 0.4} />
            
            {!lowPerformanceMode ? (
                <>
                    {/* Luz clave principal (Key Light) que proyecta hermosas sombras */}
                    <directionalLight
                        position={[6, 10, 6]}
                        intensity={1.2}
                        castShadow
                        shadow-mapSize={[1024, 1024]}
                        shadow-bias={-0.0001}
                        shadow-camera-far={25}
                        shadow-camera-left={-5}
                        shadow-camera-right={5}
                        shadow-camera-top={5}
                        shadow-camera-bottom={-5}
                    />
                    {/* Luz de relleno suave y fría (Fill Light) para dar volumen */}
                    <directionalLight
                        position={[-6, 5, -6]}
                        intensity={0.4}
                        color="#C4B5FD"
                    />
                    {/* Luz de rebote sutil desde abajo */}
                    <pointLight
                        position={[0, -2, 2]}
                        intensity={0.15}
                        color="#ffccaa"
                    />
                </>
            ) : (
                <>
                    {/* Luces simplificadas sin sombras en modo optimizado */}
                    <directionalLight position={[6, 10, 6]} intensity={1.2} />
                    <directionalLight position={[-6, 5, -6]} intensity={0.3} color="#C4B5FD" />
                </>
            )}

            <Suspense fallback={null}>
                <group 
                    ref={playerRef}
                    castShadow={!lowPerformanceMode}
                    receiveShadow={!lowPerformanceMode}
                >
                    <DynamicCharacter />
                </group>
                <LocalAvatarTransformBroadcaster
                    playerRef={playerRef}
                    localUserId={localUserId}
                    emitMultiplayerEvent={emitMultiplayerEvent}
                />
                <RemoteAvatars remoteUsers={remoteUsers} />
                <SceneObjects />
                <GaussianSplats />
            </Suspense>

            <FloorGrid />

            {/* Conservar ContactShadows de apoyo para el suelo */}
            <ContactShadows
                position={CONTACT_SHADOWS_POS}
                resolution={512} // Reducida a 512 para excelente rendimiento en ambos modos
                scale={10}
                blur={2.5}
                opacity={0.4}
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
