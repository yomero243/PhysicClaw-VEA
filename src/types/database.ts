// ============================================================
// PhysicClaw-VEA v2.0 — Database Types
// Auto-generado manualmente desde 001_v2_schema.sql
// ============================================================

export type ModelType = 'fbx' | 'glb'
export type MoodType =
    | 'calm'
    | 'excited'
    | 'thinking'
    | 'listening'
    | 'sad'
    | 'happy'
    | 'angry'
    | 'surprised'
    | 'curious'
    | 'love'
export type ObjectType = 'character' | 'prop' | 'light' | 'camera'
export type MessageRole = 'user' | 'assistant' | 'agent' | 'system'
export type QualityPreset = 'low' | 'medium' | 'high' | 'ultra'

// ---- characters ----
export interface Character {
    id: string
    slug: string
    name: string
    model_url: string
    model_type: ModelType
    scale: number
    position: [number, number, number]
    default_animation: string | null
    animations: Record<string, string>
    thumbnail_url: string | null
    is_active: boolean
    created_at: string
    updated_at: string
}

// ---- scenes ----
export interface Scene {
    id: string
    user_id: string
    name: string
    description: string | null
    environment: string
    background_color: string
    camera_position: [number, number, number]
    camera_fov: number
    ambient_intensity: number
    lighting_config: Record<string, unknown>
    is_default: boolean
    thumbnail_url: string | null
    created_at: string
    updated_at: string
}

export type SceneInsert = Omit<Scene, 'id' | 'created_at' | 'updated_at'>
export type SceneUpdate = Partial<Omit<Scene, 'id' | 'user_id' | 'created_at' | 'updated_at'>>

// ---- scene_objects ----
export interface SceneObject {
    id: string
    scene_id: string
    user_id: string
    object_type: ObjectType
    character_id: string | null
    label: string | null
    model_url: string | null
    position: [number, number, number]
    rotation: [number, number, number]
    scale_v: [number, number, number]
    metadata: Record<string, unknown>
    sort_order: number
    is_visible: boolean
    created_at: string
    updated_at: string
}

export type SceneObjectInsert = Omit<SceneObject, 'id' | 'created_at' | 'updated_at'>
export type SceneObjectUpdate = Partial<Omit<SceneObject, 'id' | 'user_id' | 'scene_id' | 'created_at' | 'updated_at'>>

// ---- agents ----
export interface Agent {
    id: string
    user_id: string
    character_id: string | null
    name: string
    personality: string | null
    system_prompt: string
    current_mood: MoodType
    intensity: number
    is_active: boolean
    avatar_config: Record<string, unknown>
    created_at: string
    updated_at: string
}

export type AgentInsert = Omit<Agent, 'id' | 'created_at' | 'updated_at'>
export type AgentUpdate = Partial<Omit<Agent, 'id' | 'user_id' | 'created_at' | 'updated_at'>>

// ---- sessions ----
export interface Session {
    id: string
    user_id: string
    agent_id: string | null
    scene_id: string | null
    title: string | null
    started_at: string
    ended_at: string | null
    metadata: Record<string, unknown>
}

export type SessionInsert = Omit<Session, 'id' | 'started_at'>

// ---- messages ----
export interface Message {
    id: string
    session_id: string | null
    user_id: string
    agent_id: string | null
    role: MessageRole
    content: string
    mood_snapshot: MoodType | null
    intensity_snapshot: number | null
    audio_url: string | null
    created_at: string
}

export type MessageInsert = Omit<Message, 'id' | 'created_at'>

// ---- avatar_configs ----
export interface AvatarConfig {
    id: string
    user_id: string
    character_id: string | null
    config_name: string
    custom_colors: {
        primary?: string
        secondary?: string
        glow?: string
        emission?: string
        background?: string
    }
    shader_params: {
        wireframeOpacity?: number
        glowIntensity?: number
        pulseSpeed?: number
        distortion?: number
        [key: string]: unknown
    }
    scale: number | null
    position: [number, number, number] | null
    extra: Record<string, unknown>
    is_active: boolean
    created_at: string
    updated_at: string
}

export type AvatarConfigInsert = Omit<AvatarConfig, 'id' | 'created_at' | 'updated_at'>
export type AvatarConfigUpdate = Partial<Omit<AvatarConfig, 'id' | 'user_id' | 'created_at' | 'updated_at'>>

// ---- user_preferences ----
export interface UserPreferences {
    user_id: string
    default_scene_id: string | null
    default_agent_id: string | null
    language: string
    speech_enabled: boolean
    tts_enabled: boolean
    quality_preset: QualityPreset
    theme: string
    extra: Record<string, unknown>
    updated_at: string
}

// ---- Relaciones compuestas (joins) ----
export interface SceneWithObjects extends Scene {
    scene_objects: SceneObject[]
}

export interface SessionWithMessages extends Session {
    messages: Message[]
    agent: Agent | null
    scene: Scene | null
}
