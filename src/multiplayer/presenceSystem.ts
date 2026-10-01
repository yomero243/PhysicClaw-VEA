// src/multiplayer/presenceSystem.ts
// Tracks which users are present in a scene using Supabase Realtime Presence.
// IMPORTANT: always call leave() on cleanup to unsubscribe the channel.

import { supabase } from '../lib/supabase'
import { sanitizeVec3 } from './validation'
import type { SessionUser } from '../types/multiplayer'

// Shape of the payload stored in Presence state per user.
interface PresencePayload {
    userId: string
    avatarId: string | null
    position: [number, number, number]
    rotation: [number, number, number]
    joinedAt: string
    lastSeenAt: string
}

// Supabase Presence state is a map of presenceKey → array of payload objects.
type PresenceState = Record<string, PresencePayload[]>

export class PresenceSystem {
    private channel: ReturnType<typeof supabase.channel> | null = null
    private currentUserId: string | null = null
    private currentSceneId: string | null = null
    private currentPayload: PresencePayload | null = null
    private presenceChangeCallback: ((users: SessionUser[]) => void) | null = null

    /**
     * Join the presence channel for a scene.
     * Safe to call multiple times — leaves the previous channel first.
     */
    join(sceneId: string, userId: string, avatarId: string): void {
        // Leave any previous channel before joining a new one.
        this.leave()

        this.currentUserId = userId
        this.currentSceneId = sceneId

        const initialPayload: PresencePayload = {
            userId,
            avatarId,
            position: [0, 0, 0],
            rotation: [0, 0, 1],
            joinedAt: new Date().toISOString(),
            lastSeenAt: new Date().toISOString(),
        }
        this.currentPayload = initialPayload

        this.channel = supabase.channel(`presence:scene:${sceneId}`, {
            config: { presence: { key: userId } },
        })

        this.channel
            .on('presence', { event: 'sync' }, () => {
                this._notifyChange()
            })
            .on('presence', { event: 'join' }, () => {
                this._notifyChange()
            })
            .on('presence', { event: 'leave' }, () => {
                this._notifyChange()
            })
            .subscribe(async (status) => {
                if (status === 'SUBSCRIBED') {
                    await this.channel!.track(this.currentPayload!)
                }
            })
    }

    /**
     * Leave the presence channel and clean up.
     * Must be called on component unmount / navigation away.
     */
    leave(): void {
        if (this.channel) {
            const channel = this.channel
            channel.untrack().finally(() => {
                supabase.removeChannel(channel)
            })
            this.channel = null
        }
        this.currentUserId = null
        this.currentSceneId = null
        this.currentPayload = null
    }

    /**
     * Register a callback that fires whenever the presence list changes.
     * Only one callback is supported at a time; calling again replaces the previous one.
     */
    onPresenceChange(callback: (users: SessionUser[]) => void): void {
        this.presenceChangeCallback = callback
    }

    /**
     * Broadcast an updated position for the current user.
     * No-op if not joined.
     */
    updateTransform(
        position: [number, number, number],
        rotation?: [number, number, number]
    ): void {
        if (!this.channel || !this.currentUserId || !this.currentPayload) return

        this.currentPayload = {
            ...this.currentPayload,
            position,
            rotation: rotation ?? this.currentPayload.rotation,
            lastSeenAt: new Date().toISOString(),
        }
        this.channel.track(this.currentPayload)
    }

    /**
     * Update the visible avatar identity without rejoining the channel.
     */
    updateAvatar(avatarId: string): void {
        if (!this.channel || !this.currentPayload) return

        this.currentPayload = {
            ...this.currentPayload,
            avatarId,
            lastSeenAt: new Date().toISOString(),
        }
        this.channel.track(this.currentPayload)
    }

    // ── Private helpers ────────────────────────────────────────────────────

    private _notifyChange(): void {
        if (!this.channel || !this.presenceChangeCallback) return

        const state = this.channel.presenceState() as PresenceState
        const users = this._presenceStateToSessionUsers(state)
        this.presenceChangeCallback(users)
    }

    private _presenceStateToSessionUsers(state: PresenceState): SessionUser[] {
        const users: SessionUser[] = []

        for (const [presenceKey, payloads] of Object.entries(state)) {
            // Presence may track multiple metas per key; take the latest.
            const payload = payloads[payloads.length - 1] as PresencePayload | undefined
            if (!payload) continue

            users.push({
                // Presence key is the userId we supplied to supabase.channel config.
                id: presenceKey,
                session_id: this.currentSceneId ?? '',
                // Remote payloads come from other clients — validate every field.
                user_id: typeof payload.userId === 'string' ? payload.userId : presenceKey,
                avatar_id: typeof payload.avatarId === 'string' ? payload.avatarId : null,
                position: sanitizeVec3(payload.position, [0, 0, 0]),
                rotation: sanitizeVec3(payload.rotation, [0, 0, 1]),
                last_seen_at:
                    typeof payload.lastSeenAt === 'string'
                        ? payload.lastSeenAt
                        : new Date().toISOString(),
                joined_at:
                    typeof payload.joinedAt === 'string'
                        ? payload.joinedAt
                        : new Date().toISOString(),
            })
        }

        return users
    }
}
