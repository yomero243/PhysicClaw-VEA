import { Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, Environment, ContactShadows, Grid } from '@react-three/drei'
import { DynamicCharacter } from './DynamicCharacter'

export const Experience = () => {
    return (
        <Canvas camera={{ position: [0, 0, 5], fov: 45 }}>
            <color attach="background" args={['#111']} />

            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1} />

            <Suspense fallback={null}>
                <DynamicCharacter />
            </Suspense>

            <ContactShadows resolution={1024} scale={10} blur={2.5} opacity={0.5} far={10} color="#000000" />
            <Environment preset="city" />

            <Grid
                infiniteGrid
                position={[0, -1, 0]}
                cellSize={1}
                cellThickness={1}
                cellColor="#666666"
                sectionSize={5}
                sectionThickness={1.5}
                sectionColor="#333333"
                fadeDistance={50}
            />

            <OrbitControls makeDefault />
        </Canvas>
    )
}

