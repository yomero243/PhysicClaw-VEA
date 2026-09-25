// ============================================================
// PhysicClaw-VEA — Day / night theme
// Two palettes, one source of truth. The UI reads them as CSS custom
// properties (`var(--accent)`, `rgba(var(--accent-rgb), 0.4)`); the 3D
// scene and <canvas> drawing cannot resolve `var()`, so they read the
// palette object directly through useThemeStore / getPalette().
//
// The mode follows the viewer's LOCAL clock, which the browser already
// knows — no IP geolocation, no network request, correct under VPNs.
// `?theme=day|night` in the URL pins a mode (demos, screenshots).
// ============================================================
import { create } from 'zustand'

export type ThemeMode = 'day' | 'night'

/** Local hours [start, end) that count as day. */
export const DAY_HOURS = { start: 7, end: 19 } as const

interface Palette {
    // UI tokens, emitted as --kebab-case custom properties.
    accent: string
    accent2: string
    accentDeep: string
    text: string
    textSoft: string
    dim: string
    muted: string
    slate: string
    bg: string
    bgDeep: string
    void: string
    danger: string
    line: string
    steel: string
    teal: string
    border: string
    // Channel triplets for translucent fills: rgba(var(--accent-rgb), a).
    accentRgb: string
    accent2Rgb: string
    dimRgb: string
    dangerRgb: string
    panelRgb: string
    panelDeepRgb: string
    oliveRgb: string
    iceRgb: string
    // Scene-only (three.js), not emitted as CSS.
    scene: {
        background: string
        gridCell: string
        gridSection: string
        fillLight: string
    }
}

// Night is the violet "aurora" rebrand (branch claude/update-documentation-VVphQ);
// day is the original terminal green. Token-for-token equivalents.
export const PALETTES: Record<ThemeMode, Palette> = {
    day: {
        accent: '#8CFFB0',
        accent2: '#C9F36A',
        accentDeep: '#2A7A5A',
        text: '#EAF3DF',
        textSoft: '#C8E8D0',
        dim: '#A9B89A',
        muted: '#5B644D',
        slate: '#6B7A90',
        bg: '#0A0B0A',
        bgDeep: '#030810',
        void: '#020609',
        danger: '#FF7A5C',
        line: '#1A4A6A',
        steel: '#2A5A7A',
        teal: '#2A7A9A',
        border: '#3A4A3A',
        accentRgb: '140, 255, 176',
        accent2Rgb: '201, 243, 106',
        dimRgb: '169, 184, 154',
        dangerRgb: '255, 122, 92',
        panelRgb: '18, 21, 15',
        panelDeepRgb: '10, 11, 10',
        oliveRgb: '93, 122, 65',
        iceRgb: '199, 239, 255',
        scene: { background: '#0A0B0A', gridCell: '#1A3A4A', gridSection: '#8CFFB0', fillLight: '#AACCFF' },
    },
    night: {
        accent: '#A78BFA',
        accent2: '#F0ABFC',
        accentDeep: '#7A5FD0',
        text: '#F4F1FF',
        textSoft: '#D6CFF2',
        dim: '#A6A0C3',
        muted: '#4E4766',
        slate: '#7B7398',
        bg: '#0C0912',
        bgDeep: '#0A0614',
        void: '#070312',
        danger: '#FB7185',
        line: '#4A4074',
        steel: '#6656A5',
        teal: '#7C6BC4',
        border: '#3A3352',
        accentRgb: '167, 139, 250',
        accent2Rgb: '240, 171, 252',
        dimRgb: '166, 160, 195',
        dangerRgb: '251, 113, 133',
        panelRgb: '19, 15, 28',
        panelDeepRgb: '12, 9, 18',
        oliveRgb: '91, 70, 140',
        iceRgb: '226, 217, 255',
        scene: { background: '#0C0912', gridCell: '#2A2440', gridSection: '#A78BFA', fillLight: '#C4B5FD' },
    },
}

export function modeForHour(hour: number): ThemeMode {
    return hour >= DAY_HOURS.start && hour < DAY_HOURS.end ? 'day' : 'night'
}

function pinnedMode(): ThemeMode | null {
    try {
        const p = new URLSearchParams(window.location.search).get('theme')
        return p === 'day' || p === 'night' ? p : null
    } catch {
        return null
    }
}

function currentMode(): ThemeMode {
    return pinnedMode() ?? modeForHour(new Date().getHours())
}

const kebab = (key: string) => key.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`)

function applyToDocument(mode: ThemeMode) {
    const root = document.documentElement
    const palette = PALETTES[mode]
    root.dataset.theme = mode
    for (const [key, value] of Object.entries(palette)) {
        if (typeof value === 'string') root.style.setProperty(`--${kebab(key)}`, value)
    }
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', palette.accent)
}

interface ThemeState {
    mode: ThemeMode
    palette: Palette
}

export const useThemeStore = create<ThemeState>()(() => {
    const mode = typeof window === 'undefined' ? 'night' : currentMode()
    return { mode, palette: PALETTES[mode] }
})

/** For non-React consumers such as a canvas draw loop. */
export const getPalette = () => useThemeStore.getState().palette

/**
 * Applies the theme now and re-checks once a minute, so the switch at
 * dawn and dusk happens without a reload. Returns a stop function.
 */
export function startThemeClock(): () => void {
    const tick = () => {
        const mode = currentMode()
        if (mode !== useThemeStore.getState().mode || !document.documentElement.dataset.theme) {
            applyToDocument(mode)
            useThemeStore.setState({ mode, palette: PALETTES[mode] })
        }
    }
    applyToDocument(useThemeStore.getState().mode)
    tick()
    const id = window.setInterval(tick, 60_000)
    return () => window.clearInterval(id)
}
