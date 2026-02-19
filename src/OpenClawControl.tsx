import { useEffect, useRef } from 'react';
import { useSoulStore } from './store/soulStore';

interface ControlCommand {
    command: 'setMood' | 'setIsThinking' | 'setIntensity' | 'setLastMessage' | 'setActiveCharacterId';
    value: any;
    id?: string; // Optional ID to prevent reprocessing
}

export function OpenClawControl() {
    const lastProcessedCommandId = useRef<string | undefined>(undefined);

    useEffect(() => {
        const interval = setInterval(async () => {
            try {
                // Fetch the control file from the root
                const response = await fetch('/openclaw-control.json');
                if (!response.ok) {
                    // console.warn('openclaw-control.json not found or accessible, skipping.');
                    return;
                }
                const control = await response.json() as ControlCommand;

                if (control.command && control.id !== lastProcessedCommandId.current) {
                    console.log('OpenClawControl: Processing command', control);
                    const store = useSoulStore.getState();
                    switch (control.command) {
                        case 'setMood':
                            store.setMood(control.value);
                            break;
                        case 'setIsThinking':
                            store.setIsThinking(control.value);
                            break;
                        case 'setIntensity':
                            store.setIntensity(control.value);
                            break;
                        case 'setLastMessage':
                            store.setLastMessage(control.value);
                            break;
                        case 'setActiveCharacterId':
                            store.setActiveCharacterId(control.value);
                            break;
                        default:
                            console.warn('Unknown command:', control.command);
                    }
                    lastProcessedCommandId.current = control.id;
                }
            } catch (error) {
                // console.error('Error reading openclaw-control.json:', error);
            }
        }, 1000); // Check every second

        return () => clearInterval(interval);
    }, []);

    return null; // This component does not render anything
}
