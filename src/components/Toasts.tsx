import { useEffect } from 'react'
import { useToastStore, type ToastType } from '../store/toastStore'
import { useSceneStore } from '../store/sceneStore'

const ACCENTS: Record<ToastType, string> = {
    error: '#FB7185',
    success: '#A78BFA',
    info: '#F0ABFC',
}

const LABELS: Record<ToastType, string> = {
    error: 'ERROR',
    success: 'OK',
    info: 'INFO',
}

export function Toasts() {
    const toasts = useToastStore((s) => s.toasts)
    const removeToast = useToastStore((s) => s.removeToast)
    const addToast = useToastStore((s) => s.addToast)

    const sceneError = useSceneStore((s) => s.error)
    const clearError = useSceneStore((s) => s.clearError)

    useEffect(function surfaceSceneErrors() {
        if (sceneError) {
            addToast(sceneError, 'error')
            clearError()
        }
    }, [sceneError, addToast, clearError])

    return (
        <div
            role="status"
            aria-live="polite"
            style={{
                position: 'absolute',
                top: 76,
                right: 18,
                zIndex: 30,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: 8,
                pointerEvents: 'none',
                fontFamily: '"JetBrains Mono", "Courier New", monospace',
            }}
        >
            <style>{`
                @keyframes vea-toast-in {
                    from { opacity: 0; transform: translateX(16px); }
                    to { opacity: 1; transform: translateX(0); }
                }
            `}</style>
            {toasts.map((t) => (
                <div
                    key={t.id}
                    onClick={() => removeToast(t.id)}
                    title="Cerrar"
                    style={{
                        pointerEvents: 'auto',
                        cursor: 'pointer',
                        maxWidth: 340,
                        padding: '10px 14px',
                        borderRadius: 6,
                        border: '1px solid rgba(167,139,250,0.14)',
                        borderLeft: `3px solid ${ACCENTS[t.type]}`,
                        background: 'rgba(12,9,18,0.92)',
                        backdropFilter: 'blur(14px)',
                        boxShadow: '0 12px 32px rgba(0,0,0,0.45)',
                        animation: 'vea-toast-in 0.18s ease-out',
                    }}
                >
                    <div
                        style={{
                            fontSize: 9,
                            letterSpacing: 2,
                            fontWeight: 700,
                            color: ACCENTS[t.type],
                            marginBottom: 3,
                        }}
                    >
                        {LABELS[t.type]}
                    </div>
                    <div style={{ fontSize: 12, lineHeight: 1.5, color: '#F4F1FF' }}>
                        {t.message}
                    </div>
                </div>
            ))}
        </div>
    )
}
