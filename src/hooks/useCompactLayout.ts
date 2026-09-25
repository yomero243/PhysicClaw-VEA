// ============================================================
// PhysicClaw-VEA — useCompactLayout
// True on phone-width viewports. The panels style themselves inline, so a
// CSS media query cannot reach them; they branch on this instead.
// ============================================================
import { useSyncExternalStore } from 'react'

export const COMPACT_QUERY = '(max-width: 640px)'

function subscribe(onChange: () => void) {
    const mq = window.matchMedia(COMPACT_QUERY)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
}

export function isCompactViewport(): boolean {
    return typeof window !== 'undefined' && window.matchMedia(COMPACT_QUERY).matches
}

export function useCompactLayout(): boolean {
    return useSyncExternalStore(subscribe, isCompactViewport, () => false)
}

/** Edge inset on compact screens, and the height of the top control row. */
export const COMPACT = {
    EDGE: 12,
    BUTTON: 40,
    /** Where content below the top row may start. */
    BELOW_TOP_ROW: 12 + 40 + 8,
} as const
