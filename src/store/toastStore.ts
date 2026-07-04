import { create } from 'zustand'

// ----------------------------------------------------------------
// Toast Store — transient user-facing notifications (errors, confirmations).
// Components render them via <Toasts />; any module can push one with toast().
// ----------------------------------------------------------------

export type ToastType = 'error' | 'success' | 'info'

export interface Toast {
    id: number
    type: ToastType
    message: string
}

interface ToastState {
    toasts: Toast[]
    addToast: (message: string, type?: ToastType) => void
    removeToast: (id: number) => void
}

const TOAST_DURATION_MS = 6000
const MAX_VISIBLE_TOASTS = 4
let nextId = 1

export const useToastStore = create<ToastState>()((set) => ({
    toasts: [],

    addToast: (message, type = 'error') => {
        const id = nextId++
        set((s) => ({
            toasts: [...s.toasts.slice(-(MAX_VISIBLE_TOASTS - 1)), { id, type, message }],
        }))
        setTimeout(() => {
            set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }))
        }, TOAST_DURATION_MS)
    },

    removeToast: (id) =>
        set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}))

/** Convenience helper for non-React modules (services, stores). */
export function toast(message: string, type: ToastType = 'error'): void {
    useToastStore.getState().addToast(message, type)
}
