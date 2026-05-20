import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CharacterConfig } from '../constants/characters'
import type { Intensity, CharacterId, RigType } from '../lib/constraints'

// ----------------------------------------------------------------
// Types
// ----------------------------------------------------------------


export interface CharacterOverride {
    scale?: number
    shaderColor?: string
    intensity?: number
    useEnergyShader?: boolean
    positionY?: number
}

export interface ChatMessage {
    id?: string
    role: 'user' | 'assistant'
    content: string
    mood?: string
    timestamp: number
}

const BUILT_IN_CHARACTER_IDS = new Set([
    'happy-idle',
    'base-sphere',
    'cyber-sentinel',
    'logic-guardian',
])

function isTransientModelUrl(url: string): boolean {
    return url.startsWith('blob:') || url.startsWith('data:') || url.includes('/storage/v1/object/sign/')
}

function filterRecord<T>(record: Record<string, T>, allowedIds: Set<string>): Record<string, T> {
    return Object.fromEntries(
        Object.entries(record).filter(([id]) => allowedIds.has(id)),
    )
}

function toPersistableCustomCharacter(config: CharacterConfig): CharacterConfig | null {
    if (config.storagePath) {
        return { ...config, modelUrl: '' }
    }
    if (!config.modelUrl || isTransientModelUrl(config.modelUrl)) return null
    return config
}

// Mood → color mapping for automatic avatar color changes
export const MOOD_COLORS: Record<string, string> = {
    calm: '#00ffff',
    happy: '#44ff88',
    excited: '#ffcc00',
    thinking: '#aa44ff',
    listening: '#4488ff',
    sad: '#4466aa',
    angry: '#ff4444',
    surprised: '#ff44aa',
    curious: '#ff8844',
    love: '#ff66cc',
}

export interface SoulState {
    isThinking: boolean
    mood: string
    lastMessage: string
    intensity: Intensity
    activeCharacterId: CharacterId
    setIsThinking: (thinking: boolean) => void
    setMood: (mood: string) => void
    setLastMessage: (msg: string) => void
    setIntensity: (intensity: number) => void
    setActiveCharacterId: (id: string) => void

    // Chat messages history (used by openClawService)
    chatMessages: ChatMessage[]
    addChatMessage: (msg: ChatMessage) => void
    clearChatMessages: () => void


    // Custom characters (uploaded by user)
    customCharacters: CharacterConfig[]
    addCustomCharacter: (config: CharacterConfig) => void
    removeCustomCharacter: (id: string) => void

    // Visibility: which objects are shown in the scene (multi-object support)
    visibleObjects: Record<string, boolean>
    toggleObjectVisibility: (id: string) => void
    setObjectVisible: (id: string, visible: boolean) => void

    // Per-character overrides
    characterOverrides: Record<string, CharacterOverride>
    setCharacterOverride: (id: string, overrides: Partial<CharacterOverride>) => void

    // Custom model URLs for uploaded GLBs (keyed by character id)
    customModelUrls: Record<string, string>
    setCustomModelUrl: (id: string, url: string) => void

    // Rig type per character (keyed by character id)
    characterRigTypes: Record<string, RigType>
    setRigType: (id: string, type: RigType) => void

    // UI state for avatar panel
    activeCategoryId: string | null
    setActiveCategoryId: (id: string | null) => void

    // Auth — userId for Supabase UUID, userName for display
    userId: string | null
    setUserId: (id: string | null) => void
    userName: string | null
    setUserName: (name: string | null) => void

    // API Connection Settings
    apiBaseUrl: string
    apiModel: string
    apiToken: string
    setApiConfig: (config: Partial<{ apiBaseUrl: string; apiModel: string; apiToken: string }>) => void

    // Performance Settings
    lowPerformanceMode: boolean
    setLowPerformanceMode: (enabled: boolean) => void
}

// ----------------------------------------------------------------
// Store
// ----------------------------------------------------------------


export const useSoulStore = create<SoulState>()(
    persist(
        (set) => ({
            isThinking: false,
            mood: 'calm',
            lastMessage: '',
            intensity: 0.5 as Intensity,
            activeCharacterId: 'happy-idle' as CharacterId,
            setIsThinking: (thinking) => set({ isThinking: thinking }),
            setMood: (mood) => set({ mood }),
            setLastMessage: (msg) => set({ lastMessage: msg }),
            setIntensity: (intensity) => set({ intensity: intensity as Intensity }),
            setActiveCharacterId: (id) => set({ activeCharacterId: id as CharacterId }),

            chatMessages: [],
            addChatMessage: (msg) => set((state) => ({
                chatMessages: [...state.chatMessages, msg],
            })),
            clearChatMessages: () => set({ chatMessages: [] }),

            customCharacters: [],
            addCustomCharacter: (config) =>
                set((state) => ({
                    customCharacters: [...state.customCharacters, config],
                    visibleObjects: { ...state.visibleObjects, [config.id]: true },
                })),
            removeCustomCharacter: (id) =>
                set((state) => {
                    const char = state.customCharacters.find((c) => c.id === id)
                    if (char?.modelUrl?.startsWith('blob:')) URL.revokeObjectURL(char.modelUrl)
                    const { [id]: _, ...remainingOverrides } = state.characterOverrides
                    const { [id]: __, ...remainingVisibility } = state.visibleObjects
                    return {
                        customCharacters: state.customCharacters.filter((c) => c.id !== id),
                        activeCharacterId:
                            state.activeCharacterId === id
                                ? 'happy-idle' as CharacterId
                                : state.activeCharacterId,
                        characterOverrides: remainingOverrides,
                        visibleObjects: remainingVisibility,
                    }
                }),

            visibleObjects: { 
                'happy-idle': true,
                'cyber-sentinel': true,
                'logic-guardian': true 
            },
            toggleObjectVisibility: (id) =>
                set((state) => ({
                    visibleObjects: {
                        ...state.visibleObjects,
                        [id]: !state.visibleObjects[id],
                    },
                })),
            setObjectVisible: (id, visible) =>
                set((state) => ({
                    visibleObjects: {
                        ...state.visibleObjects,
                        [id]: visible,
                    },
                })),

            characterOverrides: {
                'cyber-sentinel': { shaderColor: '#ff0033', intensity: 1.5 },
                'logic-guardian': { shaderColor: '#ffcc00', intensity: 1.2 }
            },
            setCharacterOverride: (id, overrides) =>
                set((state) => ({
                    characterOverrides: {
                        ...state.characterOverrides,
                        [id]: { ...state.characterOverrides[id], ...overrides },
                    },
                })),

            customModelUrls: {},
            setCustomModelUrl: (id, url) =>
                set((state) => ({
                    customModelUrls: { ...state.customModelUrls, [id]: url },
                })),

            characterRigTypes: {},
            setRigType: (id, type) =>
                set((state) => ({
                    characterRigTypes: { ...state.characterRigTypes, [id]: type },
                })),

            activeCategoryId: null,
            setActiveCategoryId: (id) =>
                set((state) => ({
                    activeCategoryId: state.activeCategoryId === id ? null : id,
                })),

            // Auth
            userId: null,
            setUserId: (id) => set({ userId: id }),
            userName: null,
            setUserName: (name) => set({ userName: name }),

            // API settings
            apiBaseUrl: import.meta.env.VITE_OPENCLAW_API_URL || '',
            apiModel: import.meta.env.VITE_OPENCLAW_MODEL || 'claude-3-5-sonnet-20241022',
            apiToken: '',
            setApiConfig: (config) => set((state) => ({ ...state, ...config })),

            // Performance Settings
            lowPerformanceMode: typeof window !== 'undefined' && (/Mobi|Android|iPhone/i.test(navigator.userAgent) || window.innerWidth < 768),
            setLowPerformanceMode: (enabled) => set({ lowPerformanceMode: enabled }),
        }),
        {
            name: 'physicclaw-storage',
            // session-only fields excluded — only persist api config + customizations
            partialize: (state) => {
                const customCharacters = state.customCharacters
                    .map(toPersistableCustomCharacter)
                    .filter((config): config is CharacterConfig => config !== null)
                const allowedIds = new Set([
                    ...BUILT_IN_CHARACTER_IDS,
                    ...customCharacters.map((config) => config.id),
                ])

                return {
                    apiBaseUrl: state.apiBaseUrl,
                    apiModel: state.apiModel,
                    customCharacters,
                    characterOverrides: filterRecord(state.characterOverrides, allowedIds),
                    visibleObjects: filterRecord(state.visibleObjects, allowedIds),
                    lowPerformanceMode: state.lowPerformanceMode,
                }
            },
        }
    )
)
