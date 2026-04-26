// src/multiplayer/sessionClient.ts
// Sends and receives physics events for a scene via Supabase Realtime Broadcast.
// IMPORTANT: always call disconnect() on cleanup to release the channel.

import { supabase } from '../lib/supabase'
import type { PhysicsEvent, PhysicsEventType } from '../types/multiplayer'

// Internal broadcast message shape over the wire.
interface BroadcastPayload {
    event: string
    payload: PhysicsEvent
}

type EventCallback = (event: PhysicsEvent) => void

export class SessionClient {
    private channel: ReturnType<typeof supabase.channel> | null = null
    private listeners = new Map<PhysicsEventType, EventCallback[]>()

    /**
     * Connect to the broadcast channel for a scene.
     * Safe to call multiple times — disconnects the previous channel first.
     */
    connect(sceneId: string): void {
        this.disconnect()

        this.channel = supabase.channel(`physics:scene:${sceneId}`, {
            config: { broadcast: { self: false } },
        })

        // Listen for all physics event types in one handler and fan-out to
        // registered callbacks.
        this.channel
            .on(
                'broadcast',
                { event: 'physics' },
                ({ payload }: BroadcastPayload) => {
                    const event = payload as PhysicsEvent
                    this._dispatch(event)
                }
            )
            .subscribe()
    }

    /**
     * Disconnect and clean up the channel.
     * Must be called on component unmount.
     */
    disconnect(): void {
        if (this.channel) {
            supabase.removeChannel(this.channel)
            this.channel = null
        }
        this.listeners.clear()
    }

    /**
     * Broadcast a physics event to all other connected clients.
     * No-op if not connected.
     */
    emit(event: PhysicsEvent): void {
        if (!this.channel) return

        this.channel.send({
            type: 'broadcast',
            event: 'physics',
            payload: event,
        })
    }

    /**
     * Register a listener for a specific physics event type.
     * Multiple listeners per type are supported.
     */
    on(type: PhysicsEventType, callback: EventCallback): void {
        const existing = this.listeners.get(type) ?? []
        this.listeners.set(type, [...existing, callback])
    }

    /**
     * Remove a previously registered listener for a physics event type.
     */
    off(type: PhysicsEventType, callback: EventCallback): void {
        const existing = this.listeners.get(type) ?? []
        this.listeners.set(
            type,
            existing.filter((cb) => cb !== callback)
        )
    }

    // ── Private helpers ────────────────────────────────────────────────────

    private _dispatch(event: PhysicsEvent): void {
        const callbacks = this.listeners.get(event.type)
        if (!callbacks) return
        for (const cb of callbacks) {
            cb(event)
        }
    }
}
