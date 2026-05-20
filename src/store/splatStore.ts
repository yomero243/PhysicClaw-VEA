import { create } from 'zustand'

export interface LocalGaussianSplat {
    id: string
    src: string
    label: string
    kind: 'environment' | 'object'
    position: [number, number, number]
    rotation: [number, number, number]
    scale: [number, number, number]
}

type SplatPlacement = Partial<Pick<LocalGaussianSplat, 'kind' | 'label' | 'position' | 'rotation' | 'scale'>>

interface SplatState {
    localSplats: LocalGaussianSplat[]
    addLocalSplat: (src: string, placement?: SplatPlacement) => void
    setLocalEnvironment: (src: string, placement?: SplatPlacement) => void
    nudgeLocalEnvironmentY: (delta: number) => void
    removeLocalSplat: (id: string) => void
    clearLocalSplats: () => void
}

const DEFAULT_POSITION: [number, number, number] = [0, -0.9, -1.5]
const GRID_FLOOR_Y = -1.01
const DEFAULT_ROTATION: [number, number, number] = [0, 0, 0]
const DEFAULT_SCALE: [number, number, number] = [1, 1, 1]

function makeLocalSplat(
    src: string,
    index: number,
    placement: SplatPlacement = {},
): LocalGaussianSplat {
    const kind = placement.kind ?? 'object'
    return {
        id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        src,
        label: placement.label ?? `${kind === 'environment' ? 'Environment' : 'Splat'}_${index + 1}`,
        kind,
        position: placement.position ?? DEFAULT_POSITION,
        rotation: placement.rotation ?? DEFAULT_ROTATION,
        scale: placement.scale ?? DEFAULT_SCALE,
    }
}

export const useSplatStore = create<SplatState>()(
    (set) => ({
        localSplats: [],
        addLocalSplat: (src, placement) =>
            set((state) => ({
                localSplats: [
                    ...state.localSplats,
                    makeLocalSplat(src, state.localSplats.length, placement),
                ],
            })),
        setLocalEnvironment: (src, placement) =>
            set((state) => ({
                localSplats: [
                    ...state.localSplats.filter((splat) => splat.kind !== 'environment'),
                    makeLocalSplat(src, state.localSplats.length, {
                        kind: 'environment',
                        label: 'Environment',
                        position: [0, GRID_FLOOR_Y, 0],
                        rotation: [0, 0, 0],
                        scale: [1.8, 1.8, 1.8],
                        ...placement,
                    }),
                ],
            })),
        nudgeLocalEnvironmentY: (delta) =>
            set((state) => ({
                localSplats: state.localSplats.map((splat) => (
                    splat.kind === 'environment'
                        ? {
                            ...splat,
                            position: [
                                splat.position[0],
                                Math.round((splat.position[1] + delta) * 100) / 100,
                                splat.position[2],
                            ],
                        }
                        : splat
                )),
            })),
        removeLocalSplat: (id) =>
            set((state) => ({
                localSplats: state.localSplats.filter((splat) => splat.id !== id),
            })),
        clearLocalSplats: () => set({ localSplats: [] }),
    }),
)
