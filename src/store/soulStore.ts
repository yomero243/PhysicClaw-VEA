import { create } from 'zustand'
import { type Mood } from '../lib/clawControl'

interface SoulState {
    isThinking: boolean
    mood: Mood
    lastMessage: string
    intensity: number
    activeCharacterId: string
    setIsThinking: (thinking: boolean) => void
    setMood: (mood: Mood) => void
    setLastMessage: (msg: string) => void
    setIntensity: (intensity: number) => void
    setActiveCharacterId: (id: string) => void
}

export const useSoulStore = create<SoulState>((set) => ({
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
}))
