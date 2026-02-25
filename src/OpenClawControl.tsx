import { useEffect, useRef } from 'react';
import { useSoulStore } from './store/soulStore';

const VALID_MOODS = ['calm', 'excited', 'thinking', 'listening'] as const;

type AllowedCommand = 'setMood' | 'setIsThinking' | 'setIntensity' | 'setLastMessage' | 'setActiveCharacterId';

interface ControlCommand {
    command: AllowedCommand;
    value: unknown;
    id?: string;
}

const ALLOWED_COMMANDS: AllowedCommand[] = [
    'setMood', 'setIsThinking', 'setIntensity', 'setLastMessage', 'setActiveCharacterId',
];

function validateAndApply(control: ControlCommand) {
    if (!ALLOWED_COMMANDS.includes(control.command)) return;

    const store = useSoulStore.getState();
    switch (control.command) {
        case 'setMood':
            if (typeof control.value === 'string' && (VALID_MOODS as readonly string[]).includes(control.value))
                store.setMood(control.value);
            break;
        case 'setIsThinking':
            if (typeof control.value === 'boolean')
                store.setIsThinking(control.value);
            break;
        case 'setIntensity':
            if (typeof control.value === 'number' && control.value >= 0 && control.value <= 2)
                store.setIntensity(control.value);
            break;
        case 'setLastMessage':
            if (typeof control.value === 'string' && control.value.length <= 500)
                store.setLastMessage(control.value);
            break;
        case 'setActiveCharacterId':
            if (typeof control.value === 'string' && control.value.length > 0 && control.value.length <= 64)
                store.setActiveCharacterId(control.value);
            break;
    }
}

export function OpenClawControl() {
    const lastProcessedCommandId = useRef<string | undefined>(undefined);

    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                const response = await fetch('/openclaw-control.json');
                if (!response.ok) return;

                const raw: unknown = await response.json();
                if (
                    typeof raw !== 'object' ||
                    raw === null ||
                    !('command' in raw) ||
                    typeof (raw as Record<string, unknown>).command !== 'string'
                ) return;

                const control = raw as ControlCommand;
                if (control.id !== undefined && typeof control.id !== 'string') return;

                if (control.command && control.id !== lastProcessedCommandId.current) {
                    validateAndApply(control);
                    lastProcessedCommandId.current = control.id;
                }
            } catch {
                // file not ready yet or invalid JSON — silent
            }
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    return null;
}
