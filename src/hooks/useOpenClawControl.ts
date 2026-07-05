import { useEffect, useRef } from 'react'
import { applyCommand, parseControlCommand } from '../lib/clawControl'

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
            const handler = (data: unknown) => {
                const cmd = parseControlCommand(data)
                if (cmd) applyCommand(cmd)
            }
            import.meta.hot.on('openclaw-command', handler)
            return () => {
                import.meta.hot?.off('openclaw-command', handler)
            }
        }

        // ── Production fallback: poll openclaw-control.json ───────────────────
        // Opt-in via VITE_CONTROL_POLL_MS: with the Realtime production
        // control channel (useProductionControl) this legacy polling is
        // redundant, so deployed builds no longer poll a (usually absent)
        // file every 2s unless explicitly configured to.
        const POLL_INTERVAL = Number(import.meta.env.VITE_CONTROL_POLL_MS)
        if (!Number.isFinite(POLL_INTERVAL) || POLL_INTERVAL <= 0) return

        const poll = async () => {
            try {
                const res = await fetch('/openclaw-control.json', { cache: 'no-store' })
                if (!res.ok) return

                const raw = await res.json()
                const cmd = parseControlCommand(raw)
                if (!cmd) return // empty, no-op, or invalid payload

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
