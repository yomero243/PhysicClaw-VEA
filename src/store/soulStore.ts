import { create } from 'zustand'
import { type Mood, type Intensity, type CharacterId, toIntensity } from '../lib/constraints'

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
    setActiveCharacterId: (id: CharacterId) => void
}

export const useSoulStore = create<SoulState>((set) => ({
    isThinking: false,
    mood: 'calm',
    lastMessage: '',
    intensity: toIntensity(0.5),
    activeCharacterId: 'happy-idle' as CharacterId,
    setIsThinking: (thinking) => set({ isThinking: thinking }),
    setMood: (mood) => set({ mood }),
    setLastMessage: (msg) => set({ lastMessage: msg }),
    setIntensity: (intensity) => set({ intensity: toIntensity(intensity) }),
    setActiveCharacterId: (id) => set({ activeCharacterId: id }),
}))
