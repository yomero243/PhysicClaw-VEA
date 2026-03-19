import { useEffect, useRef } from 'react'
import { useSoulStore } from '../store/soulStore'
import type { Mood } from '../lib/constraints'

const VALID_MOODS = ['calm', 'excited', 'thinking', 'listening'] as const

interface ControlCommand {
    command: string
    value: unknown
    id?: string
}

function applyCommand(cmd: ControlCommand) {
    const store = useSoulStore.getState()
    switch (cmd.command) {
        case 'setMood':
            if (typeof cmd.value === 'string' && (VALID_MOODS as readonly string[]).includes(cmd.value))
                store.setMood(cmd.value as Mood)
            break
        case 'setIsThinking':
            if (typeof cmd.value === 'boolean')
                store.setIsThinking(cmd.value)
            break
        case 'setIntensity':
            if (typeof cmd.value === 'number' && cmd.value >= 0 && cmd.value <= 2)
                store.setIntensity(cmd.value)
            break
        case 'setLastMessage':
            if (typeof cmd.value === 'string' && cmd.value.length <= 500)
                store.setLastMessage(cmd.value)
            break
        case 'setActiveCharacterId':
            if (typeof cmd.value === 'string' && cmd.value.length > 0 && cmd.value.length <= 64)
                store.setActiveCharacterId(cmd.value)
            break
        default:
            console.warn('[OpenClawControl] Unknown command:', cmd.command)
    }
}

/**
 * useOpenClawControl
 *
 * Bridges OpenClaw agent commands → soulStore → shaders/animations.
 *
 * Strategy:
 *  - Dev  (Vite HMR available): listen on the `openclaw-command` HMR custom
 *    event pushed by the vite plugin whenever openclaw-control.json changes.
 *    Zero latency, no polling overhead.
 *  - Prod (static serve / no HMR): fall back to polling openclaw-control.json
 *    at VITE_CONTROL_POLL_MS intervals (default 2000 ms).
 *
 * The /api/control HTTP endpoint (vite plugin) can also be used by OpenClaw to
 * POST commands directly in dev mode, bypassing the JSON file entirely.
 */
export function useOpenClawControl() {
    const lastProcessedId = useRef<string | undefined>(undefined)

    useEffect(() => {
        // ── Dev mode: Vite HMR custom events ──────────────────────────────────
        if (import.meta.hot) {
            const handler = (data: ControlCommand) => applyCommand(data)
            import.meta.hot.on('openclaw-command', handler)
            return () => {
                import.meta.hot?.off('openclaw-command', handler)
            }
        }

        // ── Production fallback: poll openclaw-control.json ───────────────────
        const POLL_INTERVAL = Number(import.meta.env.VITE_CONTROL_POLL_MS) || 2000

        const poll = async () => {
            try {
                const res = await fetch('/openclaw-control.json', { cache: 'no-store' })
                if (!res.ok) return

                const cmd = await res.json() as ControlCommand
                if (!cmd.command) return // empty / no-op payload

                // Dedup: skip if already processed
                const cmdId = cmd.id ?? JSON.stringify(cmd)
                if (cmdId === lastProcessedId.current) return

                applyCommand(cmd)
                lastProcessedId.current = cmdId
            } catch {
                // File not found or invalid JSON – silently ignore
            }
        }

        const interval = setInterval(poll, POLL_INTERVAL)
        poll() // immediate check on mount

        return () => clearInterval(interval)
    }, [])
}
