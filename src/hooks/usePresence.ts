// src/hooks/usePresence.ts
// Lightweight hook for read-only presence (no broadcast).
// Use this when you only need to know who is in a scene, not send events.

import { useEffect, useRef, useState } from 'react'
import { PresenceSystem } from '../multiplayer/presenceSystem'
import { useSoulStore } from '../store/soulStore'
import type { SessionUser } from '../types/multiplayer'

const selectUserId = (s: ReturnType<typeof useSoulStore.getState>) => s.userId
const selectActiveCharacterId = (s: ReturnType<typeof useSoulStore.getState>) => s.activeCharacterId

export function usePresence(sceneId: string | null): {
    presentUsers: SessionUser[]
    isConnected: boolean
} {
    const userId = useSoulStore(selectUserId)
    const avatarId = useSoulStore(selectActiveCharacterId)

    const [presentUsers, setPresentUsers] = useState<SessionUser[]>([])
    const [isConnected, setIsConnected] = useState(false)

    const presenceRef = useRef<PresenceSystem | null>(null)
    if (!presenceRef.current) presenceRef.current = new PresenceSystem()


    useEffect(() => {
        if (!sceneId || !userId) return

        const presence = presenceRef.current!

        presence.onPresenceChange((users) => {
            setPresentUsers(users)
            setIsConnected(true)
        })

        presence.join(sceneId, userId, avatarId)

        return () => {
            // Cleanup: leave channel and reset state.
            presence.leave()
            setPresentUsers([])
            setIsConnected(false)
        }
        // avatarId excluded intentionally — rejoining on avatar change would
        // cause unnecessary channel churn; avatar updates go through track().
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sceneId, userId])

    return { presentUsers, isConnected }
}
