import { useEffect, useRef } from 'react';
import { applyCommand, type ControlCommand } from './lib/clawControl';

function parseCommand(raw: unknown): ControlCommand | null {
    if (
        typeof raw !== 'object' ||
        raw === null ||
        !('command' in raw) ||
        typeof (raw as Record<string, unknown>).command !== 'string'
    ) return null;

    const rec = raw as Record<string, unknown>;
    if (rec.id !== undefined && typeof rec.id !== 'string') return null;

    return rec as unknown as ControlCommand;
}

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

                const control = parseCommand(await response.json());
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
