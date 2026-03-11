import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, ContactShadows, Grid } from '@react-three/drei'
import { DynamicCharacter } from './DynamicCharacter'
import { CAMERA } from '../lib/constraints'


/**
 * Experience — R3F Canvas wrapper.
 * Note: modelUrl prop removed (was declared but never used).
 * Character selection is driven by soulStore.activeCharacterId.
 */

export const Experience = () => {
    return (
        <Canvas camera={{ position: [0, 0, 5], fov: CAMERA.FOV }}>
            <color attach="background" args={['#111']} />

            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1} />

            <Suspense fallback={null}>
                <DynamicCharacter />
            </Suspense>

            <ContactShadows
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
