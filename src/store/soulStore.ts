import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CharacterConfig } from '../constants/characters'
import type { Mood, Intensity, CharacterId } from '../lib/constraints'

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
    content?: string    // used by openClawService / chatMessages
    text?: string       // used by ChatInterface / messages
    mood?: string
    timestamp: number
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

interface SoulState {
    isThinking: boolean
    mood: Mood
    lastMessage: string
    intensity: Intensity
    activeCharacterId: CharacterId
    setIsThinking: (thinking: boolean) => void
    setMood: (mood: Mood) => void
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

    // Per-character overrides
    characterOverrides: Record<string, CharacterOverride>
    setCharacterOverride: (id: string, overrides: Partial<CharacterOverride>) => void

    // UI state for avatar panel
    activeCategoryId: string | null
    setActiveCategoryId: (id: string | null) => void

    // Auth — userId for Supabase UUID, userName for display
    userId: string | null
    setUserId: (id: string | null) => void
    userName: string | null
    setUserName: (name: string | null) => void

    // Session chat history (used by ChatInterface)
    messages: ChatMessage[]
    addMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void
    clearMessages: () => void


    // API Connection Settings
    apiBaseUrl: string
    apiModel: string
    apiToken: string
    setApiConfig: (config: Partial<{ apiBaseUrl: string; apiModel: string; apiToken: string }>) => void
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
                })),
            removeCustomCharacter: (id) =>
                set((state) => {
                    const char = state.customCharacters.find((c) => c.id === id)
                    if (char?.modelUrl) URL.revokeObjectURL(char.modelUrl)
                    const { [id]: _, ...remainingOverrides } = state.characterOverrides
                    return {
                        customCharacters: state.customCharacters.filter((c) => c.id !== id),
                        activeCharacterId:
                            state.activeCharacterId === id
                                ? 'happy-idle' as CharacterId
                                : state.activeCharacterId,
                        characterOverrides: remainingOverrides,
                    }
                }),

            characterOverrides: {},
            setCharacterOverride: (id, overrides) =>
                set((state) => ({
                    characterOverrides: {
                        ...state.characterOverrides,
                        [id]: { ...state.characterOverrides[id], ...overrides },
                    },
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

            // Session chat history (ChatInterface local display)
            messages: [],
            addMessage: (msg) =>
                set((state) => ({
                    messages: [
                        ...state.messages,
                        {
                            ...msg,
                            id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
                            timestamp: Date.now(),
                        },
                    ],
                })),
            clearMessages: () => set({ messages: [] }),

            // API settings
            apiBaseUrl: import.meta.env.VITE_OPENCLAW_API_URL || '',
            apiModel: import.meta.env.VITE_OPENCLAW_MODEL || 'claude-3-5-sonnet-20241022',
            apiToken: import.meta.env.VITE_OPENCLAW_TOKEN || '',
            setApiConfig: (config) => set((state) => ({ ...state, ...config })),
        }),
        {
            name: 'physicclaw-storage',
            // session-only fields excluded — only persist api config + customizations
            partialize: (state) => ({
                apiBaseUrl: state.apiBaseUrl,
                apiModel: state.apiModel,
                apiToken: state.apiToken,
                customCharacters: state.customCharacters,
                characterOverrides: state.characterOverrides,
            }),
        }
    )
)
