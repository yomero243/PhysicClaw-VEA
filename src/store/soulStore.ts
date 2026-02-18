import { create } from 'zustand'

interface SoulState {
    isThinking: boolean
    mood: string
    lastMessage: string
    intensity: number
    setIsThinking: (thinking: boolean) => void
    setMood: (mood: string) => void
    setLastMessage: (msg: string) => void
    setIntensity: (intensity: number) => void
}

export const useSoulStore = create<SoulState>((set) => ({
    isThinking: false,
    mood: 'calm', // 'calm', 'excited', 'thinking', 'listening'
    lastMessage: '',
    intensity: 0.5,
    setIsThinking: (thinking) => set({ isThinking: thinking }),
    setMood: (mood) => set({ mood }),
    setLastMessage: (msg) => set({ lastMessage: msg }),
    setIntensity: (intensity) => set({ intensity }),
}))
