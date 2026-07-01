// src/multiplayer/validation.ts
// Validation for data received from remote peers over Realtime channels.
// Remote payloads are attacker-controlled: never trust their shape or ranges.

export type Vec3 = [number, number, number]

// World-space clamp for remote transforms. Anything outside this range is
// either a bug or a malicious payload trying to break the camera/physics.
const MAX_COORDINATE = 1000

export function isFiniteVec3(value: unknown): value is Vec3 {
    return (
        Array.isArray(value) &&
        value.length === 3 &&
        value.every((n) => typeof n === 'number' && Number.isFinite(n))
    )
}

/** Returns a clamped copy of `value`, or `fallback` when the shape is invalid. */
export function sanitizeVec3(value: unknown, fallback: Vec3): Vec3 {
    if (!isFiniteVec3(value)) return [...fallback]
    return value.map((n) =>
        Math.max(-MAX_COORDINATE, Math.min(MAX_COORDINATE, n))
    ) as Vec3
}

/**
 * Remote users can announce any string as their avatar model URL.
 * Only allow HTTPS URLs served from our own Supabase project (storage),
 * so a peer cannot make every client fetch an arbitrary external file.
 */
export function isTrustedModelUrl(url: string): boolean {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
    if (!supabaseUrl) return false
    try {
        const target = new URL(url)
        const trusted = new URL(supabaseUrl)
        return target.protocol === 'https:' && target.host === trusted.host
    } catch {
        return false
    }
}
