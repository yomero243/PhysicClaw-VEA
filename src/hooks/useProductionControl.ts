import { useEffect, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { applyCommand, parseControlCommand } from '../lib/clawControl'
import { useSoulStore } from '../store/soulStore'

/**
 * useProductionControl
 *
 * Subscribes to the private Realtime channel `control:{userId}` where the
 * `control` Edge Function broadcasts validated agent commands, and applies
 * them to the soul store through the same path as dev-mode control.
 * Receiving is enforced server-side by the realtime.messages policy from
 * migration 012 (owner-only topic).
 */
export function useProductionControl() {
    const userId = useSoulStore((s) => s.userId)
    const lastProcessedId = useRef<string | undefined>(undefined)

    useEffect(() => {
        if (!userId) return

        const channel = supabase
            .channel(`control:${userId}`, {
                config: { private: true, broadcast: { self: false } },
            })
            .on('broadcast', { event: 'command' }, ({ payload }) => {
                const cmd = parseControlCommand(payload)
                if (!cmd) return
                const cmdId = cmd.id ?? JSON.stringify(cmd)
                if (cmdId === lastProcessedId.current) return
                applyCommand(cmd)
                lastProcessedId.current = cmdId
            })
            .subscribe()

        return () => {
            supabase.removeChannel(channel)
        }
    }, [userId])
}
