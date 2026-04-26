// ============================================================
// PhysicClaw-VEA v2.0 — useScenePersistence Hook
// src/hooks/useScenePersistence.ts
//
// Gestiona persistencia bidireccional de escenas con Supabase:
// - Carga la escena por defecto del usuario al iniciar
// - Guarda cambios de escena, objetos 3D y configuración de avatar
// - Maneja sesiones de chat + mensajes
// - Suscripción realtime a objetos de la escena
// ============================================================
import { useState, useEffect, useCallback, useRef } from 'react'
import {
    auth,
    scenesApi,
    sceneObjectsApi,
    sessionsApi,
    messagesApi,
    avatarConfigsApi,
} from '../lib/supabase'
import { realtimeApi, supabase } from '../lib/supabase'
import type {
    Scene,
    SceneObject,
    SceneInsert,
    SceneObjectInsert,
    AvatarConfig,
    Message,
    MoodType,
} from '../types/database'

// ============================================================
// Types
// ============================================================
export interface ScenePersistenceState {
    // Auth
    userId: string | null
    isAuthenticated: boolean

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
}

export interface ScenePersistenceActions {
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
        role: 'user' | 'agent' | 'system',
        mood?: MoodType,
        intensity?: number
    ) => Promise<Message | null>

    // Avatar
    saveAvatarConfig: (config: Partial<AvatarConfig>) => Promise<void>

    // Misc
    clearError: () => void
}

export type UseScenePersistenceReturn = ScenePersistenceState & ScenePersistenceActions

// ============================================================
// Default Scene factory
// ============================================================
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

// ============================================================
// Hook
// ============================================================
export function useScenePersistence(): UseScenePersistenceReturn {
    const [state, setState] = useState<ScenePersistenceState>({
        userId: null,
        isAuthenticated: false,
        currentScene: null,
        sceneObjects: [],
        isLoadingScene: false,
        currentSessionId: null,
        messages: [],
        isLoadingMessages: false,
        avatarConfig: null,
        error: null,
    })

    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null)
    const loadingAttemptRef = useRef<string | null>(null)

    // ---- Helpers ----
    const setError = (error: string | null) =>
        setState(s => ({ ...s, error }))

    const clearError = useCallback(() => setError(null), [])

    // ============================================================
    // AUTH — Bypass real auth for Guest Mode
    // ============================================================
    useEffect(() => {
        const GUEST_ID = '00000000-0000-0000-0000-000000000000'
        setState(s => ({
            ...s,
            userId: GUEST_ID,
            isAuthenticated: true,
        }))
    }, [])

    // ============================================================
    // SCENE LOADING
    // ============================================================
    const loadDefaultScene = useCallback(async () => {
        const { userId } = state
        if (!userId || loadingAttemptRef.current === userId) return

        loadingAttemptRef.current = userId
        setState(s => ({ ...s, isLoadingScene: true, error: null }))

        try {
            console.log('[useScenePersistence] Cargando escena para usuario:', userId)
            // Intentar cargar la escena por defecto
            let scene = await scenesApi.getDefault(userId)

            if (!scene) {
                console.log('[useScenePersistence] No se encontró escena, creando una por defecto...')
                // Crear escena por defecto si no existe
                scene = await scenesApi.create(makeDefaultScene(userId))
            }

            console.log('[useScenePersistence] Escena activa:', scene.id)

            // Cargar objetos de la escena
            const objects = await sceneObjectsApi.listForScene(scene.id)

            // Cargar config de avatar activa
            const avatarConfig = await avatarConfigsApi.getActive(userId)

            setState(s => ({
                ...s,
                currentScene: scene,
                sceneObjects: objects,
                avatarConfig,
                isLoadingScene: false,
            }))

            // Suscripción realtime a objetos de la escena
            _subscribeToScene(scene.id)

        } catch (err) {
            console.error('[useScenePersistence] loadDefaultScene error:', err)
            setState(s => ({
                ...s,
                isLoadingScene: false,
                error: 'No se pudo cargar la escena. Revisa la conexión con Supabase.',
            }))
            // Reset attempt on error so it can be retried if needed, 
            // but the useEffect condition should handle not looping.
            loadingAttemptRef.current = null 
        }
    }, [state.userId])

    const loadScene = useCallback(async (sceneId: string) => {
        setState(s => ({ ...s, isLoadingScene: true, error: null }))

        try {
            const scene = await scenesApi.getById(sceneId)
            if (!scene) throw new Error(`Escena ${sceneId} no encontrada`)

            const objects = await sceneObjectsApi.listForScene(sceneId)

            setState(s => ({
                ...s,
                currentScene: scene,
                sceneObjects: objects,
                isLoadingScene: false,
            }))

            _subscribeToScene(sceneId)

        } catch (err) {
            console.error('[useScenePersistence] loadScene error:', err)
            setState(s => ({
                ...s,
                isLoadingScene: false,
                error: `Error al cargar escena: ${err instanceof Error ? err.message : err}`,
            }))
        }
    }, [])

    // ============================================================
    // SCENE SETTINGS
    // ============================================================
    const saveSceneSettings = useCallback(async (updates: Partial<Scene>) => {
        const { currentScene } = state
        if (!currentScene) return

        try {
            const updated = await scenesApi.update(currentScene.id, updates)
            setState(s => ({ ...s, currentScene: updated }))
        } catch (err) {
            setError(`Error al guardar escena: ${err instanceof Error ? err.message : err}`)
        }
    }, [state.currentScene])

    const createScene = useCallback(async (
        sceneData: Omit<SceneInsert, 'user_id'>
    ): Promise<Scene | null> => {
        const { userId } = state
        if (!userId) return null

        try {
            const scene = await scenesApi.create({ ...sceneData, user_id: userId })
            return scene
        } catch (err) {
            setError(`Error al crear escena: ${err instanceof Error ? err.message : err}`)
            return null
        }
    }, [state.userId])

    // ============================================================
    // SCENE OBJECTS
    // ============================================================
    const upsertObject = useCallback(async (
        obj: Omit<SceneObjectInsert, 'user_id' | 'scene_id'>
    ) => {
        const { userId, currentScene } = state
        if (!userId || !currentScene) return

        try {
            const result = await sceneObjectsApi.upsert({
                ...obj,
                user_id: userId,
                scene_id: currentScene.id,
            })

            setState(s => {
                const existing = s.sceneObjects.findIndex(o => o.id === result.id)
                if (existing >= 0) {
                    const updated = [...s.sceneObjects]
                    updated[existing] = result
                    return { ...s, sceneObjects: updated }
                }
                return { ...s, sceneObjects: [...s.sceneObjects, result] }
            })
        } catch (err) {
            setError(`Error al guardar objeto: ${err instanceof Error ? err.message : err}`)
        }
    }, [state.userId, state.currentScene])

    const removeObject = useCallback(async (objectId: string) => {
        try {
            await sceneObjectsApi.delete(objectId)
            setState(s => ({
                ...s,
                sceneObjects: s.sceneObjects.filter(o => o.id !== objectId),
            }))
        } catch (err) {
            setError(`Error al eliminar objeto: ${err instanceof Error ? err.message : err}`)
        }
    }, [])

    const updateObjectTransform = useCallback(async (
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
            setState(s => ({
                ...s,
                sceneObjects: s.sceneObjects.map(o => o.id === objectId ? result : o),
            }))
        } catch (err) {
            setError(`Error al actualizar transform: ${err instanceof Error ? err.message : err}`)
        }
    }, [])

    // ============================================================
    // SESSIONS & MESSAGES
    // ============================================================
    const startSession = useCallback(async (agentId?: string): Promise<string | null> => {
        const { userId, currentScene } = state
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

            setState(s => ({ ...s, currentSessionId: session.id, messages: [] }))
            return session.id
        } catch (err) {
            setError(`Error al iniciar sesión: ${err instanceof Error ? err.message : err}`)
            return null
        }
    }, [state.userId, state.currentScene])

    const endSession = useCallback(async () => {
        const { currentSessionId } = state
        if (!currentSessionId) return

        try {
            await sessionsApi.end(currentSessionId)
            setState(s => ({ ...s, currentSessionId: null }))
        } catch (err) {
            setError(`Error al cerrar sesión: ${err instanceof Error ? err.message : err}`)
        }
    }, [state.currentSessionId])

    const saveMessage = useCallback(async (
        content: string,
        role: 'user' | 'agent' | 'system',
        mood?: MoodType,
        intensity?: number
    ): Promise<Message | null> => {
        const { userId, currentSessionId } = state
        if (!userId || !currentSessionId) {
            // Auto-crear sesión si no existe
            const sessionId = await startSession()
            if (!sessionId) return null
        }

        const sessionId = state.currentSessionId
        if (!sessionId) return null

        try {
            const msg = await messagesApi.create({
                session_id: sessionId,
                user_id: userId!,
                agent_id: null,
                role,
                content,
                mood_snapshot: mood ?? null,
                intensity_snapshot: intensity ?? null,
                audio_url: null,
            })

            setState(s => ({ ...s, messages: [...s.messages, msg] }))
            return msg
        } catch (err) {
            console.warn('[useScenePersistence] saveMessage error (non-fatal):', err)
            // No bloqueamos la UI si falla el guardado de mensajes
            return null
        }
    }, [state.userId, state.currentSessionId, startSession])

    // ============================================================
    // AVATAR CONFIG
    // ============================================================
    const saveAvatarConfig = useCallback(async (config: Partial<AvatarConfig>) => {
        const { userId, avatarConfig } = state
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

            setState(s => ({ ...s, avatarConfig: updated }))
        } catch (err) {
            setError(`Error al guardar avatar: ${err instanceof Error ? err.message : err}`)
        }
    }, [state.userId, state.avatarConfig])

    // ============================================================
    // REALTIME subscription
    // ============================================================
    const _subscribeToScene = useCallback((sceneId: string) => {
        // Limpiar suscripción anterior
        if (channelRef.current) {
            realtimeApi.unsubscribe(channelRef.current)
        }

        channelRef.current = realtimeApi.subscribeToScene(sceneId, (payload: unknown) => {
            const p = payload as { eventType: string; new: SceneObject; old: { id: string } }

            setState(s => {
                switch (p.eventType) {
                    case 'INSERT':
                        return { ...s, sceneObjects: [...s.sceneObjects, p.new] }
                    case 'UPDATE':
                        return {
                            ...s,
                            sceneObjects: s.sceneObjects.map(o =>
                                o.id === p.new.id ? p.new : o
                            ),
                        }
                    case 'DELETE':
                        return {
                            ...s,
                            sceneObjects: s.sceneObjects.filter(o => o.id !== p.old.id),
                        }
                    default:
                        return s
                }
            })
        })
    }, [])

    // Cleanup al desmontar
    useEffect(() => {
        return () => {
            if (channelRef.current) {
                realtimeApi.unsubscribe(channelRef.current)
            }
        }
    }, [])

    // Auto-cargar escena cuando el usuario se autentica
    useEffect(() => {
        if (state.userId && !state.currentScene && !state.isLoadingScene) {
            loadDefaultScene()
        }
    }, [state.userId, state.currentScene, state.isLoadingScene, loadDefaultScene])

    // ============================================================
    return {
        ...state,

        // Actions
        loadDefaultScene,
        loadScene,
        saveSceneSettings,
        createScene,

        upsertObject,
        removeObject,
        updateObjectTransform,

        startSession,
        endSession,
        saveMessage,

        saveAvatarConfig,
        clearError,
    }
}
