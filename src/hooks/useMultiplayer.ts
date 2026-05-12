// src/hooks/useMultiplayer.ts
// Orchestrates PresenceSystem + SessionClient for a scene.
// Exposes remoteUsers (other participants) and an emit function for physics events.

import { useEffect, useRef, useState, useCallback } from 'react'
import { PresenceSystem } from '../multiplayer/presenceSystem'
import { SessionClient } from '../multiplayer/sessionClient'
import { useSoulStore } from '../store/soulStore'
import type { SessionUser, PhysicsEvent } from '../types/multiplayer'

// Throttle avatar_move broadcasts to ~10fps (100ms minimum gap).
const AVATAR_MOVE_THROTTLE_MS = 100

const selectUserId = (s: ReturnType<typeof useSoulStore.getState>) => s.userId
const selectActiveCharacterId = (s: ReturnType<typeof useSoulStore.getState>) => s.activeCharacterId

export function useMultiplayer(sceneId: string | null): {
    remoteUsers: SessionUser[]
    emit: (event: PhysicsEvent) => void
} {
    const userId = useSoulStore(selectUserId)
    const avatarId = useSoulStore(selectActiveCharacterId)

    const [remoteUsers, setRemoteUsers] = useState<SessionUser[]>([])

    // Stable refs — never recreate instances across renders.
    const presenceRef = useRef<PresenceSystem | null>(null)
    const clientRef = useRef<SessionClient | null>(null)
    const lastAvatarMoveTsRef = useRef<number>(0)

    // Lazily create singletons.
    if (!presenceRef.current) presenceRef.current = new PresenceSystem()
    if (!clientRef.current) clientRef.current = new SessionClient()


    useEffect(() => {
        if (!sceneId || !userId) return

        const presence = presenceRef.current!
        const client = clientRef.current!

        // Register presence callback.
        presence.onPresenceChange((users) => {
            // Exclude the local user from the remote list.
            const remote = users.filter((u) => u.user_id !== userId)
            setRemoteUsers(remote)
        })

        // Join presence channel and connect broadcast channel.
        presence.join(sceneId, userId, avatarId)
        client.connect(sceneId)

        // Listen for avatar_move events from remote users and update their
        // positions in our local state.
        const handleAvatarMove = (event: PhysicsEvent) => {
            if (!event.userId || !event.position) return
            setRemoteUsers((prev) =>
                prev.map((u) =>
                    u.user_id === event.userId
                        ? {
                              ...u,
                              position: event.position!,
                              rotation: event.rotation ?? u.rotation,
                          }
                        : u
                )
            )
        }

        client.on('avatar_move', handleAvatarMove)

        return () => {
            // Cleanup: unsubscribe channels and clear listeners.
            client.off('avatar_move', handleAvatarMove)
            presence.leave()
            client.disconnect()
            setRemoteUsers([])
        }
        // avatarId intentionally excluded — presence.join re-tracks position,
        // not avatar identity. A separate effect can call track() if needed.
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sceneId, userId])

    // Stable emit function — throttles avatar_move to 10fps.
    const emit = useCallback((event: PhysicsEvent) => {
        const client = clientRef.current
        if (!client) return

        if (event.type === 'avatar_move') {
            const now = performance.now()
            if (now - lastAvatarMoveTsRef.current < AVATAR_MOVE_THROTTLE_MS) return
            lastAvatarMoveTsRef.current = now
        }

        client.emit(event)
    }, [])

    return { remoteUsers, emit }
}
