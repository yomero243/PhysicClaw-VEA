import { useEffect } from 'react'
import { useSoulStore } from '../store/soulStore'

const VALID_MOODS = ['calm', 'excited', 'thinking', 'listening'] as const

interface ControlCommand {
    command: string
    value: unknown
    id?: string
}

function applyCommand(cmd: ControlCommand) {
    const store = useSoulStore.getState()
    switch (cmd.command) {
        case 'setMood':
            if (typeof cmd.value === 'string' && (VALID_MOODS as readonly string[]).includes(cmd.value))
                store.setMood(cmd.value)
            break
        case 'setIsThinking':
            if (typeof cmd.value === 'boolean')
                store.setIsThinking(cmd.value)
            break
        case 'setIntensity':
            if (typeof cmd.value === 'number' && cmd.value >= 0 && cmd.value <= 2)
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

export function useOpenClawControl() {
    useEffect(() => {
        if (!import.meta.hot) return

        const handler = (data: ControlCommand) => applyCommand(data)
        import.meta.hot.on('openclaw-command', handler)

        return () => {
            import.meta.hot?.off('openclaw-command', handler)
        }
    }, [])
}
