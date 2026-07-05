import { useRef, useState, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Sphere, OrbitControls } from '@react-three/drei'
import * as THREE from 'three'
import '../shaders/DemoShader'

// ── Mood catalogue ────────────────────────────────────────────────────────────

const MOODS = [
    { name: 'calm',      color: '#00ffff', intensity: 0.4 },
    { name: 'thinking',  color: '#aa44ff', intensity: 0.8 },
    { name: 'excited',   color: '#ffcc00', intensity: 1.5 },
    { name: 'happy',     color: '#44ff88', intensity: 0.9 },
    { name: 'curious',   color: '#ff8844', intensity: 0.7 },
    { name: 'love',      color: '#ff66cc', intensity: 0.8 },
    { name: 'surprised', color: '#ff44aa', intensity: 1.0 },
    { name: 'angry',     color: '#ff4444', intensity: 1.2 },
    { name: 'sad',       color: '#4466aa', intensity: 0.3 },
] as const

const CYCLE_MS = 3000

// ── 3-D scene ─────────────────────────────────────────────────────────────────

interface DemoSphereProps { moodIndex: number }

function DemoSphere({ moodIndex }: DemoSphereProps) {
    const mainRef  = useRef<any>(null)
    const haloRef  = useRef<any>(null)
    const tColor     = useRef(new THREE.Color(MOODS[0].color))
    const tIntensity = useRef<number>(MOODS[0].intensity)

    useEffect(() => {
        const m = MOODS[moodIndex]
        tColor.current.set(m.color)
        tIntensity.current = m.intensity
    }, [moodIndex])

    useFrame((_, dt) => {
        const speed = dt * 2.0
        if (mainRef.current) {
            mainRef.current.uTime      += dt
            mainRef.current.uIntensity  = THREE.MathUtils.lerp(mainRef.current.uIntensity, tIntensity.current, speed)
            mainRef.current.uColor.lerp(tColor.current, speed)
        }
        if (haloRef.current) {
            haloRef.current.uTime      += dt * 0.6
            haloRef.current.uIntensity  = THREE.MathUtils.lerp(haloRef.current.uIntensity, tIntensity.current * 0.45, dt * 1.5)
            haloRef.current.uColor.lerp(tColor.current, dt * 1.5)
        }
    })

    const initColor = new THREE.Color(MOODS[0].color)

    return (
        <group>
            {/* Outer halo — back-face so it glows around the main sphere */}
            <Sphere args={[1.6, 64, 64]}>
                <demoShaderMaterial
                    ref={haloRef}
                    attach="material"
                    transparent
                    depthWrite={false}
                    side={THREE.BackSide}
                    uColor={initColor.clone()}
                    uIntensity={0.2}
                    uTime={0}
                />
            </Sphere>

            {/* Main energy sphere */}
            <Sphere args={[1, 128, 128]}>
                <demoShaderMaterial
                    ref={mainRef}
                    attach="material"
                    transparent
                    uColor={initColor.clone()}
                    uIntensity={0.4}
                    uTime={0}
                />
            </Sphere>
        </group>
    )
}

// ── UI overlay ────────────────────────────────────────────────────────────────

interface OverlayProps {
    moodIndex: number
    onSelect: (i: number) => void
}

function Overlay({ moodIndex, onSelect }: OverlayProps) {
    const mood = MOODS[moodIndex]

    return (
        <div style={{
            position: 'absolute', inset: 0,
            pointerEvents: 'none',
            display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'space-between',
            padding: '40px 24px',
            fontFamily: '"JetBrains Mono", "Courier New", monospace',
        }}>
            {/* ── Top: branding ── */}
            <div style={{ textAlign: 'center' }}>
                <div style={{ color: '#A78BFA', fontSize: 11, letterSpacing: 6, textTransform: 'uppercase', opacity: 0.5 }}>
                    PhysicClaw
                </div>
                <div style={{ color: '#ffffff', fontSize: 32, letterSpacing: 4, fontWeight: 'bold', marginTop: 6 }}>
                    VEA
                </div>
                <div style={{ color: '#7B7398', fontSize: 10, letterSpacing: 3, marginTop: 4, textTransform: 'uppercase' }}>
                    Virtual Entity Augmented
                </div>
            </div>

            {/* ── Bottom: mood + CTA ── */}
            <div style={{ textAlign: 'center', pointerEvents: 'auto' }}>

                {/* mood label */}
                <div style={{ marginBottom: 28 }}>
                    <div style={{ color: '#7B7398', fontSize: 10, letterSpacing: 4, textTransform: 'uppercase', marginBottom: 8 }}>
                        current mood
                    </div>
                    <div style={{
                        color: mood.color,
                        fontSize: 30,
                        letterSpacing: 8,
                        textTransform: 'uppercase',
                        transition: 'color 0.6s ease',
                        textShadow: `0 0 24px ${mood.color}88`,
                    }}>
                        {mood.name}
                    </div>
                </div>

                {/* mood dots */}
                <div style={{ display: 'flex', gap: 10, justifyContent: 'center', marginBottom: 40 }}>
                    {MOODS.map((m, i) => (
                        <div
                            key={m.name}
                            onClick={() => onSelect(i)}
                            title={m.name}
                            style={{
                                width: 8, height: 8, borderRadius: '50%',
                                background: i === moodIndex ? m.color : 'rgba(255,255,255,0.12)',
                                cursor: 'pointer',
                                transition: 'all 0.35s ease',
                                boxShadow: i === moodIndex ? `0 0 10px ${m.color}` : 'none',
                            }}
                        />
                    ))}
                </div>

                {/* CTA */}
                <a
                    href="/"
                    style={{
                        display: 'inline-block',
                        fontFamily: '"JetBrains Mono", "Courier New", monospace',
                        color: '#0A0614',
                        background: mood.color,
                        padding: '12px 36px',
                        fontSize: 11,
                        letterSpacing: 5,
                        textTransform: 'uppercase',
                        textDecoration: 'none',
                        transition: 'background 0.6s ease, box-shadow 0.6s ease',
                        boxShadow: `0 0 28px ${mood.color}88`,
                    }}
                >
                    Talk to it
                </a>

                <div style={{ color: '#7B7398', fontSize: 10, letterSpacing: 2, marginTop: 16, opacity: 0.5 }}>
                    Each response changes what you see
                </div>
            </div>
        </div>
    )
}

// ── Page root ─────────────────────────────────────────────────────────────────

export function MoodDemo() {
    const [moodIndex, setMoodIndex] = useState(0)

    // Auto-cycle
    useEffect(() => {
        const id = setInterval(() => {
            setMoodIndex(i => (i + 1) % MOODS.length)
        }, CYCLE_MS)
        return () => clearInterval(id)
    }, [])

    // Keyboard navigation
    useEffect(() => {
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight') setMoodIndex(i => (i + 1) % MOODS.length)
            if (e.key === 'ArrowLeft')  setMoodIndex(i => (i - 1 + MOODS.length) % MOODS.length)
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [])

    return (
        <div style={{ width: '100vw', height: '100vh', background: '#0A0614', position: 'relative', overflow: 'hidden' }}>
            <Canvas camera={{ position: [0, 0, 4], fov: 45 }}>
                <color attach="background" args={['#0A0614']} />
                <ambientLight intensity={0.1} />
                <pointLight position={[4, 4, 4]} intensity={0.4} />
                <DemoSphere moodIndex={moodIndex} />
                <OrbitControls
                    enableZoom={false}
                    autoRotate
                    autoRotateSpeed={0.4}
                    minPolarAngle={Math.PI * 0.3}
                    maxPolarAngle={Math.PI * 0.7}
                />
            </Canvas>

            <Overlay moodIndex={moodIndex} onSelect={setMoodIndex} />

            {/* Credit */}
            <div style={{
                position: 'absolute', bottom: 16, right: 20,
                fontFamily: '"JetBrains Mono", "Courier New", monospace',
                color: 'rgba(255,255,255,0.12)',
                fontSize: 10, letterSpacing: 2,
            }}>
                built with Three.js
            </div>
        </div>
    )
}
