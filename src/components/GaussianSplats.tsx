import { Component, memo } from 'react'
import type { ReactNode } from 'react'
import { Splat } from '@react-three/drei'
import { useSceneStore } from '../store/sceneStore'
import { useSplatStore } from '../store/splatStore'
import { useSoulStore } from '../store/soulStore'
import type { SceneObject } from '../types/database'

function toVec(data: unknown, fallback: [number, number, number]): [number, number, number] {
    if (!data) return fallback
    if (Array.isArray(data)) {
        return [
            Number(data[0] ?? fallback[0]),
            Number(data[1] ?? fallback[1]),
            Number(data[2] ?? fallback[2]),
        ]
    }
    if (typeof data === 'object') {
        const vec = data as Partial<Record<'x' | 'y' | 'z', number>>
        return [
            Number(vec.x ?? fallback[0]),
            Number(vec.y ?? fallback[1]),
            Number(vec.z ?? fallback[2]),
        ]
    }
    return fallback
}

function isGaussianSplatObject(obj: SceneObject): boolean {
    const metadata = obj.metadata as Record<string, unknown>
    const url = obj.model_url ?? ''
    return (
        metadata?.kind === 'gaussian_splat' ||
        metadata?.assetType === 'gaussian_splat' ||
        url.toLowerCase().includes('.splat')
    )
}

class SplatErrorBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
    state = { failed: false }

    static getDerivedStateFromError() {
        return { failed: true }
    }

    render() {
        if (this.state.failed) return null
        return this.props.children
    }
}

const SceneGaussianSplats = memo(function SceneGaussianSplats() {
    const sceneObjects = useSceneStore((s) => s.sceneObjects)

    return (
        <>
            {sceneObjects.map((obj) => {
                if (!obj.model_url || obj.is_visible === false || !isGaussianSplatObject(obj)) return null

                return (
                    <SplatErrorBoundary key={obj.id}>
                        <Splat
                            src={obj.model_url}
                            position={toVec(obj.position, [0, -0.9, -1.5])}
                            rotation={toVec(obj.rotation, [0, 0, 0])}
                            scale={toVec(obj.scale_v, [1, 1, 1])}
                            alphaHash
                        />
                    </SplatErrorBoundary>
                )
            })}
        </>
    )
})

const LocalGaussianSplats = memo(function LocalGaussianSplats() {
    const localSplats = useSplatStore((s) => s.localSplats)

    return (
        <>
            {localSplats.map((splat) => (
                <SplatErrorBoundary key={splat.id}>
                    <Splat
                        src={splat.src}
                        position={splat.position}
                        rotation={splat.rotation}
                        scale={splat.scale}
                        alphaHash
                    />
                </SplatErrorBoundary>
            ))}
        </>
    )
})

export function GaussianSplats() {
    const lowPerformanceMode = useSoulStore((s) => s.lowPerformanceMode)

    if (lowPerformanceMode) return null

    return (
        <>
            <SceneGaussianSplats />
            <LocalGaussianSplats />
        </>
    )
}
