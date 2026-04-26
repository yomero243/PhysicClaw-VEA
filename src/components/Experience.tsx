import { Suspense, useMemo } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, ContactShadows, Grid } from '@react-three/drei'
import { DynamicCharacter } from './DynamicCharacter'
import { RemoteAvatars } from './RemoteAvatars'
import { useMultiplayer } from '../hooks/useMultiplayer'
import { useSoulStore } from '../store/soulStore'
import { CAMERA } from '../lib/constraints'

/**
 * Experience — R3F Canvas wrapper.
 * Character selection is driven by soulStore.activeCharacterId.
 *
 * useMultiplayer is called here (outside Canvas) so React hooks work normally.
 * remoteUsers is passed into the Canvas via RemoteAvatars.
 */

const selectUserId = (s: SoulState) => s.userId

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

// Typing for selector
interface SoulState {
    userId: string | null
}

export const Experience = () => {
    // userId is used as the scene identifier when available.
    const userId = useSoulStore(selectUserId as any)

    // useMultiplayer must be called outside <Canvas>
    const { remoteUsers } = useMultiplayer(userId ?? null)

    return (
        <Canvas camera={{ position: [0, 0, 5], fov: CAMERA.FOV }}>
            <color attach="background" args={['#0a0e14']} />

            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1} />

            <Suspense fallback={null}>
                <DynamicCharacter />
            </Suspense>

            {/* Remote multiplayer avatars */}
            <Suspense fallback={null}>
                <RemoteAvatars remoteUsers={remoteUsers} />
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
