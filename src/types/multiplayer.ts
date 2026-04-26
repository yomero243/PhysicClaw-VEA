// src/types/multiplayer.ts
// Types for the multiplayer / realtime physics system.

export type PhysicsEventType =
    | 'object_spawn'
    | 'object_move'
    | 'object_delete'
    | 'avatar_join'
    | 'avatar_move'
    | 'avatar_emote'

export interface PhysicsEvent {
    type: PhysicsEventType
    objectId?: string
    userId?: string
    position?: [number, number, number]
    rotation?: [number, number, number]
    payload?: Record<string, unknown>
}

export interface SessionUser {
    id: string
    session_id: string
    user_id: string
    avatar_id: string | null
    position: [number, number, number]
    rotation: [number, number, number]
    last_seen_at: string
    joined_at: string
}
