import { create } from 'zustand'

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
}

export const useSoulStore = create<SoulState>((set) => ({
    isThinking: false,
    mood: 'calm', // 'calm', 'excited', 'thinking', 'listening'
    lastMessage: '',
    intensity: 0.5,
    activeCharacterId: 'happy-idle', // Default character
    setIsThinking: (thinking) => set({ isThinking: thinking }),
    setMood: (mood) => set({ mood }),
    setLastMessage: (msg) => set({ lastMessage: msg }),
    setIntensity: (intensity) => set({ intensity }),
    setActiveCharacterId: (id) => set({ activeCharacterId: id }),
}))
