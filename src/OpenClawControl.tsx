import { useEffect, useRef } from 'react';
import { applyCommand, parseControlCommand } from './lib/clawControl';

export function OpenClawControl() {
    const lastProcessedId = useRef<string | undefined>(undefined);
    const fetching = useRef(false);

    useEffect(() => {
        const interval = setInterval(async () => {
            if (fetching.current) return;
            fetching.current = true;
            try {
                const response = await fetch('/openclaw-control.json');
                if (!response.ok) return;

                const control = parseControlCommand(await response.json());
                if (!control) return;

                if (control.id !== lastProcessedId.current) {
                    applyCommand(control);
                    lastProcessedId.current = control.id;
                }
            } catch {
                // file not ready yet or invalid JSON — silent
            } finally {
                fetching.current = false;
            }
        }, 1000);

        return () => clearInterval(interval);
    }, []);

    return null;
}
