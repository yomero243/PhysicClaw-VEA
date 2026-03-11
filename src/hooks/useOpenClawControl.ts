import { useEffect } from 'react'
import { applyCommand, parseControlCommand } from '../lib/clawControl'

export function useOpenClawControl() {
    useEffect(() => {
        // Dev: Vite HMR channel
        if (import.meta.hot) {
            const handler = (data: unknown) => {
                const cmd = parseControlCommand(data)
                if (cmd) applyCommand(cmd)
            }
            import.meta.hot.on('openclaw-command', handler)
            return () => { import.meta.hot?.off('openclaw-command', handler) }
        }

        // Production: polling fallback
        let lastId: string | undefined
        let fetching = false
        const interval = setInterval(async () => {
            if (fetching) return
            fetching = true
            try {
                const res = await fetch('/openclaw-control.json')
                if (!res.ok) return
                const cmd = parseControlCommand(await res.json())
                if (!cmd) return
                if (cmd.id !== lastId) {
                    applyCommand(cmd)
                    lastId = cmd.id
                }
            } catch { /* silent */ } finally {
                fetching = false
            }
        }, 1000)

        return () => clearInterval(interval)
    }, [])
}
