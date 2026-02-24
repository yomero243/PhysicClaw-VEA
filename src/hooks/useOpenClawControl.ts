import { useEffect } from 'react'
import { useSoulStore } from '../store/soulStore'

interface ControlCommand {
    command: string
    value: unknown
    id?: string
}

function applyCommand(cmd: ControlCommand) {
    const store = useSoulStore.getState()
    switch (cmd.command) {
        case 'setMood':             store.setMood(cmd.value as string); break
        case 'setIsThinking':       store.setIsThinking(cmd.value as boolean); break
        case 'setIntensity':        store.setIntensity(cmd.value as number); break
        case 'setLastMessage':      store.setLastMessage(cmd.value as string); break
        case 'setActiveCharacterId': store.setActiveCharacterId(cmd.value as string); break
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
