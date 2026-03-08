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

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string | undefined
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

// Guard: fail loudly in dev, fail gracefully in production so the UI still renders.
if (!supabaseUrl || !supabaseAnonKey) {
    const msg =
        '[Supabase] VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in .env\n' +
        'Copy .env.example to .env and fill in your Supabase project credentials.\n' +
        'Authentication will NOT work until these variables are configured.'
    if (import.meta.env.DEV) {
        // In dev mode, throw immediately so the developer sees a clear error.
        throw new Error(msg)
    } else {
        console.error(msg)
    }
}

// Falls back to localhost so createClient does not throw on undefined – the
// Supabase SDK will return auth errors when the user tries to sign in.
export const supabase = createClient(
    supabaseUrl ?? 'http://localhost:54321',
    supabaseAnonKey ?? 'anon-key-not-configured',
)

// ============================================================
// Helpers — throw on Supabase errors
// ============================================================
function assertData<T>(data: T | null, error: { message: string } | null, label: string): T {
    if (error) throw new Error(`[Supabase/${label}] ${error.message}`)
    if (data === null) throw new Error(`[Supabase/${label}] No data returned`)
    return data
}

// ============================================================
// auth — thin wrapper around supabase.auth
// ============================================================
export const auth = {
    /** Returns the currently logged-in user (null if none). */
    async getUser() {
        const { data, error } = await supabase.auth.getUser()
        if (error) throw new Error(`[Supabase/auth.getUser] ${error.message}`)
        return data
    },

    /** Sign in anonymously (Supabase anonymous auth). */
    async signInAnon() {
        const { data, error } = await supabase.auth.signInAnonymously()
        if (error) throw new Error(`[Supabase/auth.signInAnon] ${error.message}`)
        return data
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
            .maybeSingle()
        if (error) throw new Error(`[Supabase/scenesApi.getDefault] ${error.message}`)
        return data
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
    /** List all objects for a given scene, ordered by sort_order. */
    async listForScene(sceneId: string): Promise<SceneObject[]> {
        const { data, error } = await supabase
            .from('scene_objects')
            .select('*')
            .eq('scene_id', sceneId)
            .order('sort_order', { ascending: true })
        if (error) throw new Error(`[Supabase/sceneObjectsApi.listForScene] ${error.message}`)
        return data ?? []
    },

    /** Upsert a scene object (insert or update on conflict). Returns the saved record. */
    async upsert(obj: SceneObjectInsert): Promise<SceneObject> {
        const { data, error } = await supabase
            .from('scene_objects')
            .upsert(obj, { onConflict: 'id' })
            .select()
            .single()
        return assertData(data, error, 'sceneObjectsApi.upsert')
    },

    /** Update specific fields of a scene object and return the updated record. */
    async update(id: string, updates: Record<string, unknown>): Promise<SceneObject> {
        const { data, error } = await supabase
            .from('scene_objects')
            .update(updates)
            .eq('id', id)
            .select()
            .single()
        return assertData(data, error, 'sceneObjectsApi.update')
    },

    /** Delete a scene object by ID. */
    async delete(id: string): Promise<void> {
        const { error } = await supabase
            .from('scene_objects')
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
                    table: 'scene_objects',
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
