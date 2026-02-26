import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { CharacterConfig } from '../constants/characters'

export interface CharacterOverride {
    scale?: number
    shaderColor?: string
    intensity?: number
    useEnergyShader?: boolean
    positionY?: number
}

interface SoulState {
    isThinking: boolean
    mood: string
    lastMessage: string
    intensity: number
    activeCharacterId: string
    setIsThinking: (thinking: boolean) => void
    setMood: (mood: string) => void
    setLastMessage: (msg: string) => void
    setIntensity: (intensity: number) => void
    setActiveCharacterId: (id: string) => void

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

    // API Connection Settings
    apiBaseUrl: string
    apiModel: string
    apiToken: string
    setApiConfig: (config: Partial<{ apiBaseUrl: string, apiModel: string, apiToken: string }>) => void
}

export const useSoulStore = create<SoulState>()(
    persist(
        (set) => ({
            isThinking: false,
            mood: 'calm',
            lastMessage: '',
            intensity: 0.5,
            activeCharacterId: 'happy-idle',
            setIsThinking: (thinking) => set({ isThinking: thinking }),
            setMood: (mood) => set({ mood }),
            setLastMessage: (msg) => set({ lastMessage: msg }),
            setIntensity: (intensity) => set({ intensity }),
            setActiveCharacterId: (id) => set({ activeCharacterId: id }),

            customCharacters: [],
            addCustomCharacter: (config) => set((state) => ({
                customCharacters: [...state.customCharacters, config]
            })),
            removeCustomCharacter: (id) => set((state) => {
                const char = state.customCharacters.find(c => c.id === id)
                if (char?.modelUrl) URL.revokeObjectURL(char.modelUrl)
                const { [id]: _, ...remainingOverrides } = state.characterOverrides
                return {
                    customCharacters: state.customCharacters.filter(c => c.id !== id),
                    activeCharacterId: state.activeCharacterId === id ? 'happy-idle' : state.activeCharacterId,
                    characterOverrides: remainingOverrides,
                }
            }),

            characterOverrides: {},
            setCharacterOverride: (id, overrides) => set((state) => ({
                characterOverrides: {
                    ...state.characterOverrides,
                    [id]: { ...state.characterOverrides[id], ...overrides }
                }
            })),

            activeCategoryId: null,
            setActiveCategoryId: (id) => set((state) => ({
                activeCategoryId: state.activeCategoryId === id ? null : id
            })),

            // Default API values (can be overridden by UI)
            apiBaseUrl: import.meta.env.VITE_OPENCLAW_API_URL || '',
            apiModel: import.meta.env.VITE_OPENCLAW_MODEL || 'claude-3-5-sonnet-20241022',
            apiToken: import.meta.env.VITE_OPENCLAW_TOKEN || '',
            setApiConfig: (config) => set((state) => ({ ...state, ...config })),
        }),
        {
            name: 'physicclaw-storage', // unique name for localStorage
            partialize: (state) => ({
                apiBaseUrl: state.apiBaseUrl,
                apiModel: state.apiModel,
                apiToken: state.apiToken,
                customCharacters: state.customCharacters,
                characterOverrides: state.characterOverrides
            }), // specify what to persist
        }
    ))
