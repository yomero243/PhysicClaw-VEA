import { useSoulStore } from '../store/soulStore'

export const VALID_MOODS = ['calm', 'excited', 'thinking', 'listening'] as const
export type Mood = typeof VALID_MOODS[number]

export const INTENSITY_MIN = 0
export const INTENSITY_MAX = 2

export interface ControlCommand {
    command: string
    value: unknown
    id?: string
}

export function applyCommand(cmd: ControlCommand) {
    const store = useSoulStore.getState()
    switch (cmd.command) {
        case 'setMood':
            if (typeof cmd.value === 'string' && (VALID_MOODS as readonly string[]).includes(cmd.value))
                store.setMood(cmd.value as Mood)
            break
        case 'setIsThinking':
            if (typeof cmd.value === 'boolean')
                store.setIsThinking(cmd.value)
            break
        case 'setIntensity':
            if (typeof cmd.value === 'number' && cmd.value >= INTENSITY_MIN && cmd.value <= INTENSITY_MAX)
                store.setIntensity(cmd.value)
            break
        case 'setLastMessage':
            if (typeof cmd.value === 'string' && cmd.value.length <= 500)
                store.setLastMessage(cmd.value)
            break
        case 'setActiveCharacterId':
            if (typeof cmd.value === 'string' && cmd.value.length > 0 && cmd.value.length <= 64)
                store.setActiveCharacterId(cmd.value)
            break
    }
}
