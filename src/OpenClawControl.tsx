/**
 * @deprecated This component is no longer used.
 *
 * Its polling logic has been superseded by the `useOpenClawControl` hook
 * (src/hooks/useOpenClawControl.ts) which:
 *   - Uses Vite HMR custom events in dev (zero latency, no polling)
 *   - Falls back to polling `openclaw-control.json` in production
 *
 * This file is kept for historical reference only and will be removed in a
 * future cleanup. Do NOT import it — use `useOpenClawControl` instead.
 */

// Legacy implementation preserved below for reference:

// import { useEffect, useRef } from 'react';
// import { useSoulStore } from './store/soulStore';
//
// interface ControlCommand {
//     command: 'setMood' | 'setIsThinking' | 'setIntensity' | 'setLastMessage' | 'setActiveCharacterId';
//     value: any;
//     id?: string;
// }
//
// export function OpenClawControl() {
//     const lastProcessedCommandId = useRef<string | undefined>(undefined);
//     useEffect(() => {
//         const interval = setInterval(async () => {
//             try {
//                 const response = await fetch('/openclaw-control.json');
//                 if (!response.ok) return;
//                 const control = await response.json() as ControlCommand;
//                 if (control.command && control.id !== lastProcessedCommandId.current) {
//                     const store = useSoulStore.getState();
//                     switch (control.command) {
//                         case 'setMood': store.setMood(control.value); break;
//                         case 'setIsThinking': store.setIsThinking(control.value); break;
//                         case 'setIntensity': store.setIntensity(control.value); break;
//                         case 'setLastMessage': store.setLastMessage(control.value); break;
//                         case 'setActiveCharacterId': store.setActiveCharacterId(control.value); break;
//                     }
//                     lastProcessedCommandId.current = control.id;
//                 }
//             } catch { /* ignore */ }
//         }, 1000);
//         return () => clearInterval(interval);
//     }, []);
//     return null;
// }
export {}
