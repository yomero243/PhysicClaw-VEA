import { createClient } from '@supabase/supabase-js'
import type {
    Scene,
    SceneInsert,
    SceneObject,
    SceneObjectInsert,
    Session,
    SessionInsert,
    Message,
    MessageInsert,
    AvatarConfig,
    AvatarConfigInsert,
} from '../types/database'
import type { SessionUser } from '../types/multiplayer'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/**
 * Helper to assert that Supabase data is present, otherwise throws a descriptive error.
 */
function assertData<T>(data: T | null, error: any, context: string): T {
    if (error) {
        throw new Error(`[Supabase/${context}] ${error.message || JSON.stringify(error)}`)
    }
    if (!data) {
        throw new Error(`[Supabase/${context}] No data returned`)
    }
    return data
}

// Falls back to localhost so createClient does not throw on undefined – the
// Supabase SDK will return auth errors when the user tries to sign in.
export const supabase = createClient(
    supabaseUrl ?? 'http://localhost:54321',
    supabaseAnonKey ?? 'anon-key-not-configured',
)

// ============================================================
// auth — thin wrapper around supabase.auth
// ============================================================
export const auth = {
    /** Returns the currently logged-in user (null if none). */
    async getUser() {
        try {
            const { data } = await supabase.auth.getUser()
            return data
        } catch {
            return { user: { id: 'guest-user' } as any }
        }
    },

    /** Sign in anonymously (Supabase anonymous auth). */
    async signInAnon() {
        try {
            const { data } = await supabase.auth.signInAnonymously()
            return data
        } catch {
            return { user: { id: 'guest-user' } as any, session: {} as any }
        }
    },
}

// ============================================================
// scenesApi
// ============================================================
export const scenesApi = {
    /** Get the default scene for a user, or null if none exists. */
    async getDefault(userId: string): Promise<Scene | null> {
        const { data, error } = await supabase
            .from('scenes')
            .select('*')
            .eq('user_id', userId)
            .eq('is_default', true)
            .limit(1)
        
        if (error) throw new Error(`[Supabase/scenesApi.getDefault] ${error.message}`)
        return data && data.length > 0 ? data[0] : null
    },

    /** Get a scene by ID, or null if not found. */
    async getById(id: string): Promise<Scene | null> {
        const { data, error } = await supabase
            .from('scenes')
            .select('*')
            .eq('id', id)
            .maybeSingle()
        if (error) throw new Error(`[Supabase/scenesApi.getById] ${error.message}`)
        return data
    },

    /** Create a new scene and return it. */
    async create(scene: SceneInsert): Promise<Scene> {
        const { data, error } = await supabase
            .from('scenes')
            .insert(scene)
            .select()
            .single()
        return assertData(data, error, 'scenesApi.create')
    },

    /** Update a scene and return the updated record. */
    async update(id: string, updates: Partial<Scene>): Promise<Scene> {
        const { data, error } = await supabase
            .from('scenes')
            .update(updates)
            .eq('id', id)
            .select()
            .single()
        return assertData(data, error, 'scenesApi.update')
    },
}

// ============================================================
// sceneObjectsApi
// ============================================================
export const sceneObjectsApi = {
    /** List all objects for a given scene, ordered by created_at. */
    async listForScene(sceneId: string): Promise<SceneObject[]> {
        const { data, error } = await supabase
            .from('objects_3d')
            .select('*')
            .eq('scene_id', sceneId)
            .order('created_at', { ascending: true })
        if (error) throw new Error(`[Supabase/sceneObjectsApi.listForScene] ${error.message}`)
        return data ?? []
    },

    /** Upsert a scene object (insert or update on conflict). Returns the saved record. */
    async upsert(obj: SceneObjectInsert): Promise<SceneObject> {
        const { data, error } = await supabase
            .from('objects_3d')
            .upsert(obj, { onConflict: 'id' })
            .select()
            .single()
        return assertData(data, error, 'sceneObjectsApi.upsert')
    },

    /** Update specific fields of a scene object and return the updated record. */
    async update(id: string, updates: Record<string, unknown>): Promise<SceneObject> {
        const { data, error } = await supabase
            .from('objects_3d')
            .update(updates)
            .eq('id', id)
            .select()
            .single()
        return assertData(data, error, 'sceneObjectsApi.update')
    },

    /** Delete a scene object by ID. */
    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('objects_3d')
            .delete()
            .eq('id', id)
        if (error) throw new Error(`[Supabase/sceneObjectsApi.delete] ${error.message}`)
    },
}

// ============================================================
// sessionsApi
// ============================================================
export const sessionsApi = {
    /** Create a new chat session and return it. */
    async create(session: SessionInsert): Promise<Session> {
        const { data, error } = await supabase
            .from('sessions')
            .insert(session)
            .select()
            .single()
        return assertData(data, error, 'sessionsApi.create')
    },

    /** Mark a session as ended by setting ended_at to now. */
    async end(id: string): Promise<void> {
        const { error } = await supabase
            .from('sessions')
            .update({ ended_at: new Date().toISOString() })
            .eq('id', id)
        if (error) throw new Error(`[Supabase/sessionsApi.end] ${error.message}`)
    },
}

// ============================================================
// messagesApi
// ============================================================
export const messagesApi = {
    /** Persist a chat message and return the saved record. */
    async create(message: MessageInsert): Promise<Message> {
        const { data, error } = await supabase
            .from('messages')
            .insert(message)
            .select()
            .single()
        return assertData(data, error, 'messagesApi.create')
    },
}

// ============================================================
// avatarConfigsApi
// ============================================================
export const avatarConfigsApi = {
    /** Get the active avatar config for a user, or null. */
    async getActive(userId: string): Promise<AvatarConfig | null> {
        const { data, error } = await supabase
            .from('avatar_configs')
            .select('*')
            .eq('user_id', userId)
            .eq('is_active', true)
            .maybeSingle()
        if (error) throw new Error(`[Supabase/avatarConfigsApi.getActive] ${error.message}`)
        return data
    },

    /** Upsert an avatar config (keyed on user_id + config_name) and return it. */
    async upsert(config: AvatarConfigInsert): Promise<AvatarConfig> {
        const { data, error } = await supabase
            .from('avatar_configs')
            .upsert(config, { onConflict: 'user_id,config_name' })
            .select()
            .single()
        return assertData(data, error, 'avatarConfigsApi.upsert')
    },
}

// ============================================================
// realtimeApi
// ============================================================
type RealtimeChannel = ReturnType<typeof supabase.channel>

export const realtimeApi = {
    /**
     * Subscribe to INSERT/UPDATE/DELETE events on scene_objects
     * for a given scene. Returns the channel handle.
     */
    subscribeToScene(
        sceneId: string,
        callback: (payload: unknown) => void
    ): RealtimeChannel {
        const channel = supabase
            .channel(`scene-objects:${sceneId}`)
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'objects_3d',
                    filter: `scene_id=eq.${sceneId}`,
                },
                callback
            )
            .subscribe()

        return channel
    },

    /** Unsubscribe and remove a realtime channel. */
    unsubscribe(channel: RealtimeChannel): void {
        supabase.removeChannel(channel)
    },
}

// ============================================================
// sessionUsersApi
// Manages the session_users table for multiplayer presence persistence.
// ============================================================
export const sessionUsersApi = {
    /**
     * Insert or update a session_users row for a user joining a session.
     * Returns the upserted row.
     */
    async join(sessionId: string, userId: string, avatarId?: string): Promise<SessionUser> {
        const { data, error } = await supabase
            .from('session_users')
            .upsert(
                {
                    session_id: sessionId,
                    user_id: userId,
                    avatar_id: avatarId ?? null,
                    last_seen_at: new Date().toISOString(),
                },
                { onConflict: 'session_id,user_id' }
            )
            .select()
            .single()
        return assertData(data, error, 'sessionUsersApi.join') as SessionUser
    },

    /**
     * Remove a user's presence row when they leave a session.
     */
    async leave(sessionId: string, userId: string): Promise<void> {
        const { error } = await supabase
            .from('session_users')
            .delete()
            .eq('session_id', sessionId)
            .eq('user_id', userId)
        if (error) throw new Error(`[Supabase/sessionUsersApi.leave] ${error.message}`)
    },

    /**
     * List all users who were active in a session in the last 60 seconds.
     */
    async listActive(sessionId: string): Promise<SessionUser[]> {
        const cutoff = new Date(Date.now() - 60_000).toISOString()
        const { data, error } = await supabase
            .from('session_users')
            .select('*')
            .eq('session_id', sessionId)
            .gte('last_seen_at', cutoff)
            .order('last_seen_at', { ascending: false })
        if (error) throw new Error(`[Supabase/sessionUsersApi.listActive] ${error.message}`)
        return (data ?? []) as SessionUser[]
    },

    /**
     * Update the position of a session_user row and refresh last_seen_at.
     */
    async updatePosition(id: string, position: [number, number, number]): Promise<void> {
        const { error } = await supabase
            .from('session_users')
            .update({
                position,
                last_seen_at: new Date().toISOString(),
            })
            .eq('id', id)
        if (error) throw new Error(`[Supabase/sessionUsersApi.updatePosition] ${error.message}`)
    },
}

// ============================================================
// physicsEventsApi
// Persists physics events emitted during a multiplayer session.
// ============================================================

interface PhysicsEventInsert {
    scene_id: string
    user_id: string
    event_type: string
    payload: Record<string, unknown>
}

interface PhysicsEventRow {
    id: string
    event_type: string
    payload: Record<string, unknown>
    created_at: string
}

export const physicsEventsApi = {
    /**
     * Persist a physics event for a scene.
     */
    async create(event: PhysicsEventInsert): Promise<void> {
        const { error } = await supabase
            .from('physics_events')
            .insert({
                scene_id: event.scene_id,
                user_id: event.user_id,
                event_type: event.event_type,
                payload: event.payload,
            })
        if (error) throw new Error(`[Supabase/physicsEventsApi.create] ${error.message}`)
    },

    /**
     * Fetch the most recent physics events for a scene.
     * Defaults to the last 50 events ordered by creation time (newest first).
     */
    async listRecent(sceneId: string, limit = 50): Promise<PhysicsEventRow[]> {
        const { data, error } = await supabase
            .from('physics_events')
            .select('id, event_type, payload, created_at')
            .eq('scene_id', sceneId)
            .order('created_at', { ascending: false })
            .limit(limit)
        if (error) throw new Error(`[Supabase/physicsEventsApi.listRecent] ${error.message}`)
        return (data ?? []) as PhysicsEventRow[]
    },
}
