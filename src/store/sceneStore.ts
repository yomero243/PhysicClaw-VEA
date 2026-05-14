// ============================================================
// PhysicClaw-VEA — Scene Store
// src/store/sceneStore.ts
//
// Gestiona el estado global de la escena, persistencia y realtime.
// Sustituye a useScenePersistence para evitar múltiples sesiones.
// ============================================================

import { create } from 'zustand'
import {
    scenesApi,
    sceneObjectsApi,
    sessionsApi,
    messagesApi,
    avatarConfigsApi,
    auth,
    realtimeApi,
    supabase,
} from '../lib/supabase'
import type {
    Scene,
    SceneObject,
    SceneInsert,
    SceneObjectInsert,
    AvatarConfig,
    Message,
    MessageRole,
    MoodType,
} from '../types/database'

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------

export interface SceneState {
    // Auth
    userId: string | null
    isAuthenticated: boolean
    isInitializing: boolean

    // Escena activa
    currentScene: Scene | null
    sceneObjects: SceneObject[]
    isLoadingScene: boolean

    // Chat session
    currentSessionId: string | null
    messages: Message[]
    isLoadingMessages: boolean

    // Avatar
    avatarConfig: AvatarConfig | null

    // Error
    error: string | null

    // Realtime handle
    _channel: ReturnType<typeof supabase.channel> | null

    // --- Actions ---
    
    // Auth e Init
    initialize: () => Promise<void>
    
    // Escena
    loadDefaultScene: () => Promise<void>
    loadScene: (sceneId: string) => Promise<void>
    saveSceneSettings: (updates: Partial<Scene>) => Promise<void>
    createScene: (scene: Omit<SceneInsert, 'user_id'>) => Promise<Scene | null>

    // Objetos 3D
    upsertObject: (obj: Omit<SceneObjectInsert, 'user_id' | 'scene_id'>) => Promise<void>
    removeObject: (objectId: string) => Promise<void>
    updateObjectTransform: (
        objectId: string,
        position?: [number, number, number],
        rotation?: [number, number, number],
        scale?: [number, number, number]
    ) => Promise<void>

    // Sesión de chat
    startSession: (agentId?: string) => Promise<string | null>
    endSession: () => Promise<void>
    saveMessage: (
        content: string,
        role: MessageRole,
        mood?: MoodType,
        intensity?: number
    ) => Promise<Message | null>

    // Avatar
    saveAvatarConfig: (config: Partial<AvatarConfig>) => Promise<void>

    // Misc
    clearError: () => void
    _subscribeToScene: (sceneId: string) => void
    _cleanupRealtime: () => void
}

// ----------------------------------------------------------------
// Default Scene factory
// ----------------------------------------------------------------
const makeDefaultScene = (userId: string): SceneInsert => ({
    user_id: userId,
    name: 'Escena Principal',
    description: 'Escena inicial de PhysicClaw-VEA',
    environment: 'city',
    background_color: '#111111',
    camera_position: [0, 0, 5],
    camera_fov: 45,
    ambient_intensity: 0.5,
    lighting_config: {},
    is_default: true,
    thumbnail_url: null,
})

// ----------------------------------------------------------------
// Store
// ----------------------------------------------------------------

export const useSceneStore = create<SceneState>()((set, get) => ({
    userId: null,
    isAuthenticated: false,
    isInitializing: false,
    currentScene: null,
    sceneObjects: [],
    isLoadingScene: false,
    currentSessionId: null,
    messages: [],
    isLoadingMessages: false,
    avatarConfig: null,
    error: null,
    _channel: null,

    // ── Actions ──────────────────────────────────────────────────

    clearError: () => set({ error: null }),

    initialize: async () => {
        const { isAuthenticated, isInitializing, isLoadingScene, loadDefaultScene } = get()
        if (isAuthenticated || isInitializing || isLoadingScene) return

        set({ isInitializing: true, error: null })

        try {
            console.log('[sceneStore] Inicializando sesión anónima...')
            const data = await auth.signInAnon()
            const user = data?.user

            if (!user) {
                set({ error: 'No se pudo obtener el usuario anónimo.' })
                return
            }

            set({
                userId: user.id,
                isAuthenticated: true,
            })
            console.log('[sceneStore] Sesión iniciada:', user.id)
            await loadDefaultScene()
        } catch (err) {
            console.error('[sceneStore] Error en inicialización:', err)
            set({ error: 'Error al iniciar sesión anónima.' })
        } finally {
            set({ isInitializing: false })
        }
    },

    loadDefaultScene: async () => {
        const { userId, isLoadingScene } = get()
        if (!userId || isLoadingScene) return

        set({ isLoadingScene: true, error: null })

        try {
            console.log('[sceneStore] Cargando escena para usuario:', userId)
            
            const [sceneResult, avatarConfig] = await Promise.all([
                scenesApi.getDefault(userId).then(async (sc) => {
                    if (sc) return sc
                    console.log('[sceneStore] No se encontró escena, creando una por defecto...')
                    return await scenesApi.create(makeDefaultScene(userId))
                }),
                avatarConfigsApi.getActive(userId)
            ])
            
            const scene = sceneResult
            console.log('[sceneStore] Escena activa:', scene.id)

            // Cargar objetos de la escena
            const objects = await sceneObjectsApi.listForScene(scene.id)

            set({
                currentScene: scene,
                sceneObjects: objects,
                avatarConfig,
                isLoadingScene: false,
            })

            // Suscripción realtime
            get()._subscribeToScene(scene.id)

        } catch (err) {
            console.error('[sceneStore] loadDefaultScene error:', err)
            set({
                isLoadingScene: false,
                error: 'No se pudo cargar la escena predeterminada.',
            })
        }
    },

    loadScene: async (sceneId: string) => {
        set({ isLoadingScene: true, error: null })

        try {
            const scene = await scenesApi.getById(sceneId)
            if (!scene) throw new Error(`Escena ${sceneId} no encontrada`)

            const objects = await sceneObjectsApi.listForScene(sceneId)

            set({
                currentScene: scene,
                sceneObjects: objects,
                isLoadingScene: false,
            })

            get()._subscribeToScene(sceneId)

        } catch (err) {
            console.error('[sceneStore] loadScene error:', err)
            set({
                isLoadingScene: false,
                error: `Error al cargar escena: ${err instanceof Error ? err.message : err}`,
            })
        }
    },

    saveSceneSettings: async (updates: Partial<Scene>) => {
        const { currentScene } = get()
        if (!currentScene) return

        try {
            const updated = await scenesApi.update(currentScene.id, updates)
            set({ currentScene: updated })
        } catch (err) {
            set({ error: `Error al guardar configuración: ${err instanceof Error ? err.message : err}` })
        }
    },

    createScene: async (sceneData: Omit<SceneInsert, 'user_id'>): Promise<Scene | null> => {
        const { userId } = get()
        if (!userId) return null

        try {
            const scene = await scenesApi.create({ ...sceneData, user_id: userId })
            return scene
        } catch (err) {
            set({ error: `Error al crear escena: ${err instanceof Error ? err.message : err}` })
            return null
        }
    },

    upsertObject: async (obj: Omit<SceneObjectInsert, 'user_id' | 'scene_id'>) => {
        const { userId, currentScene } = get()
        if (!userId || !currentScene) return

        try {
            const result = await sceneObjectsApi.upsert({
                ...obj,
                user_id: userId,
                scene_id: currentScene.id,
            })

            set(s => {
                const existing = s.sceneObjects.findIndex(o => o.id === result.id)
                if (existing >= 0) {
                    const updated = [...s.sceneObjects]
                    updated[existing] = result
                    return { sceneObjects: updated }
                }
                return { sceneObjects: [...s.sceneObjects, result] }
            })
        } catch (err) {
            set({ error: `Error al guardar objeto: ${err instanceof Error ? err.message : err}` })
        }
    },

    removeObject: async (objectId: string) => {
        try {
            await sceneObjectsApi.delete(objectId)
            set(s => ({
                sceneObjects: s.sceneObjects.filter(o => o.id !== objectId),
            }))
        } catch (err) {
            set({ error: `Error al eliminar objeto: ${err instanceof Error ? err.message : err}` })
        }
    },

    updateObjectTransform: async (
        objectId: string,
        position?: [number, number, number],
        rotation?: [number, number, number],
        scale?: [number, number, number]
    ) => {
        const updates: Record<string, unknown> = {}
        if (position) updates.position = position
        if (rotation) updates.rotation = rotation
        if (scale) updates.scale_v = scale

        try {
            const result = await sceneObjectsApi.update(objectId, updates)
            set(s => ({
                sceneObjects: s.sceneObjects.map(o => o.id === objectId ? result : o),
            }))
        } catch (err) {
            set({ error: `Error al actualizar transform: ${err instanceof Error ? err.message : err}` })
        }
    },

    startSession: async (agentId?: string): Promise<string | null> => {
        const { userId, currentScene } = get()
        if (!userId) return null

        try {
            const session = await sessionsApi.create({
                user_id: userId,
                agent_id: agentId ?? null,
                scene_id: currentScene?.id ?? null,
                title: null,
                ended_at: null,
                metadata: {},
            })

            set({ currentSessionId: session.id, messages: [] })
            return session.id
        } catch (err) {
            set({ error: `Error al iniciar sesión: ${err instanceof Error ? err.message : err}` })
            return null
        }
    },

    endSession: async () => {
        const { currentSessionId } = get()
        if (!currentSessionId) return

        try {
            await sessionsApi.end(currentSessionId)
            set({ currentSessionId: null })
        } catch (err) {
            set({ error: `Error al cerrar sesión: ${err instanceof Error ? err.message : err}` })
        }
    },

    saveMessage: async (
        content: string,
        role: MessageRole,
        mood?: MoodType,
        intensity?: number
    ): Promise<Message | null> => {
        const { userId, currentSessionId, startSession } = get()
        if (!userId) return null

        const sessionId = currentSessionId ?? await startSession()
        if (!sessionId) return null

        try {
            const msg = await messagesApi.create({
                session_id: sessionId,
                user_id: userId,
                agent_id: null,
                role,
                content,
                mood_snapshot: mood ?? null,
                intensity_snapshot: intensity ?? null,
                audio_url: null,
            })

            set(s => ({ messages: [...s.messages, msg] }))
            return msg
        } catch (err) {
            console.warn('[sceneStore] saveMessage error (non-fatal):', err)
            return null
        }
    },

    saveAvatarConfig: async (config: Partial<AvatarConfig>) => {
        const { userId, avatarConfig } = get()
        if (!userId) return

        try {
            const updated = await avatarConfigsApi.upsert({
                user_id: userId,
                character_id: config.character_id ?? avatarConfig?.character_id ?? null,
                config_name: config.config_name ?? avatarConfig?.config_name ?? 'Mi Avatar',
                custom_colors: config.custom_colors ?? avatarConfig?.custom_colors ?? {},
                shader_params: config.shader_params ?? avatarConfig?.shader_params ?? {},
                scale: config.scale ?? avatarConfig?.scale ?? 1.0,
                position: config.position ?? avatarConfig?.position ?? [0, 0, 0],
                extra: config.extra ?? avatarConfig?.extra ?? {},
                is_active: true,
            })

            set({ avatarConfig: updated })
        } catch (err) {
            set({ error: `Error al guardar avatar: ${err instanceof Error ? err.message : err}` })
        }
    },

    _subscribeToScene: (sceneId: string) => {
        get()._cleanupRealtime()

        const channel = realtimeApi.subscribeToScene(sceneId, (payload: any) => {
            const { eventType, new: newObj, old: oldObj } = payload

            set(s => {
                switch (eventType) {
                    case 'INSERT':
                        return { sceneObjects: [...s.sceneObjects, newObj] }
                    case 'UPDATE':
                        return {
                            sceneObjects: s.sceneObjects.map(o =>
                                o.id === newObj.id ? newObj : o
                            ),
                        }
                    case 'DELETE':
                        return {
                            sceneObjects: s.sceneObjects.filter(o => o.id !== oldObj.id),
                        }
                    default:
                        return s
                }
            })
        })

        set({ _channel: channel })
    },

    _cleanupRealtime: () => {
        const { _channel } = get()
        if (_channel) {
            realtimeApi.unsubscribe(_channel)
            set({ _channel: null })
        }
    },
}))
