import { ControlCommandSchema, type ControlCommand, toIntensity, toCharacterId } from './constraints'
import { useSoulStore } from '../store/soulStore'
import { REGISTERED_CHARACTER_IDS } from '../constants/characters'

export type { ControlCommand }

export function parseControlCommand(raw: unknown): ControlCommand | null {
    const result = ControlCommandSchema.safeParse(raw)
    return result.success ? result.data : null
}

export function applyCommand(cmd: ControlCommand) {
    const store = useSoulStore.getState()
    switch (cmd.command) {
        case 'setMood':
            store.setMood(cmd.value)
            break
        case 'setIsThinking':
            store.setIsThinking(cmd.value)
            break
        case 'setIntensity':
            store.setIntensity(toIntensity(cmd.value))
            break
        case 'setLastMessage':
            store.setLastMessage(cmd.value)
            break
        case 'setActiveCharacterId': {
            const id = toCharacterId(cmd.value, REGISTERED_CHARACTER_IDS)
            if (id) store.setActiveCharacterId(id)
            break
        }
    }
}
