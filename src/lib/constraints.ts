import { z } from 'zod'

// ─── Mood ────────────────────────────────────────────────────────────────────

export const VALID_MOODS = ['calm', 'excited', 'thinking', 'listening'] as const
export type Mood = typeof VALID_MOODS[number]

// ─── Intensity ───────────────────────────────────────────────────────────────
// Visual range: 0.0 – 2.0 (shader adds up to 1.3 on top for thinking/excited)
// Max uIntensity reaching shader = 3.3

export const INTENSITY_MIN = 0.0
export const INTENSITY_MAX = 2.0
export type Intensity = number & { readonly __brand: 'Intensity' }

export function toIntensity(v: number): Intensity {
    const clamped = Math.round(Math.min(Math.max(v, INTENSITY_MIN), INTENSITY_MAX) * 10) / 10
    return clamped as Intensity
}

// ─── CharacterId ─────────────────────────────────────────────────────────────
// Either a registered static ID or a validated S3 HTTPS URL pointing to a .glb

const S3_GLB_URL = /^https:\/\/.+\.s3(?:\.[a-z0-9-]+)?\.amazonaws\.com\/.+\.glb$/i
const CHAR_ID_MAX_LEN = 64

export type CharacterId = string & { readonly __brand: 'CharacterId' }

export function toCharacterId(v: string, registeredIds: readonly string[]): CharacterId | null {
    if (v.length === 0 || v.length > CHAR_ID_MAX_LEN) return null
    if (registeredIds.includes(v)) return v as CharacterId
    if (S3_GLB_URL.test(v)) return v as CharacterId
    return null
}

// ─── Camera bounds ───────────────────────────────────────────────────────────
// Prevent the user from orbiting under the floor or too far above

export const CAMERA = {
    FOV: 45,
    POLAR_MIN: Math.PI * 0.1,   // ~18° — can't look straight down
    POLAR_MAX: Math.PI * 0.75,  // ~135° — floor stays hidden
    ZOOM_MIN: 2,
    ZOOM_MAX: 10,
} as const

// ─── Model upload ────────────────────────────────────────────────────────────

export const MODEL_UPLOAD = {
    ACCEPTED_TYPES: ['.glb'] as const,
    MAX_BYTES: 50 * 1024 * 1024, // 50 MB
    RIG_TYPES: ['mixamo', 'rpm', 'vrm', 'standard'] as const,
    SIGNED_URL_SECONDS: 60 * 60,
} as const

export type RigType = typeof MODEL_UPLOAD.RIG_TYPES[number]

// ─── Zod schema: external ControlCommand JSON ────────────────────────────────
// Validates the JSON payload from /openclaw-control.json before applying it.

export const ControlCommandSchema = z.discriminatedUnion('command', [
    z.object({
        command: z.literal('setMood'),
        value: z.enum(VALID_MOODS),
        id: z.string().optional(),
    }),
    z.object({
        command: z.literal('setIsThinking'),
        value: z.boolean(),
        id: z.string().optional(),
    }),
    z.object({
        command: z.literal('setIntensity'),
        value: z.number().min(INTENSITY_MIN).max(INTENSITY_MAX),
        id: z.string().optional(),
    }),
    z.object({
        command: z.literal('setLastMessage'),
        value: z.string().max(500),
        id: z.string().optional(),
    }),
    z.object({
        command: z.literal('setActiveCharacterId'),
        value: z.string().min(1).max(CHAR_ID_MAX_LEN),
        id: z.string().optional(),
    }),
])

export type ControlCommand = z.infer<typeof ControlCommandSchema>
