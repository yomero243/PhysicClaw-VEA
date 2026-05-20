import { useEffect } from 'react'
import { Experience } from './components/Experience'
import { ChatInterface } from './components/ChatInterface'
import { CubeGenerator } from './components/CubeGenerator'
import { AvatarPanel } from './components/AvatarPanel'
import { GLBUploadPanel } from './components/GLBUploadPanel'
import { GaussianSplatPanel } from './components/GaussianSplatPanel'
import { MoodDemo } from './components/MoodDemo'
import { AuthProvider } from './auth'
import { useOpenClawControl } from './hooks/useOpenClawControl'
import { useMultiplayer } from './hooks/useMultiplayer'
import { useSoulStore } from './store/soulStore'
import { useSceneStore } from './store/sceneStore'

// Public demo — accessible at /?demo without authentication
const isDemoMode = new URLSearchParams(window.location.search).has('demo')

function AppContent() {
    const setUserId = useSoulStore((s) => s.setUserId)
    const initialize = useSceneStore((s) => s.initialize)
    const userId = useSceneStore((s) => s.userId)
    const currentScene = useSceneStore((s) => s.currentScene)
    const { remoteUsers, emit } = useMultiplayer(currentScene?.id ?? null)
    const lowPerformanceMode = useSoulStore((s) => s.lowPerformanceMode)
    const setLowPerformanceMode = useSoulStore((s) => s.setLowPerformanceMode)
    useOpenClawControl()

    useEffect(function initStore() {
        initialize()
    }, [initialize])

    useEffect(function syncUserId() {
        if (userId) setUserId(userId)
    }, [userId, setUserId])

    return (
        <div style={{
            width: '100vw',
            height: '100vh',
            display: 'flex',
            flexDirection: 'row',
            background: '#111',
            overflow: 'hidden',
        }}>
            {/* Left - Avatar Customization Panel */}
            <AvatarPanel />

            {/* Performance Mode Toggle Button */}
            <button
                onClick={() => setLowPerformanceMode(!lowPerformanceMode)}
                title={lowPerformanceMode ? 'Activar Modo Ultra (Gaussian Splats + Sombras)' : 'Activar Modo Optimizado (Bajo Rendimiento)'}
                style={{
                    position: 'absolute',
                    top: 20,
                    left: 74, // 20 (margen) + 44 (ancho panel trigger) + 10 (gap)
                    zIndex: 20,
                    height: 44,
                    padding: '0 12px',
                    borderRadius: 4,
                    background: 'rgba(2,8,18,0.75)',
                    backdropFilter: 'blur(12px)',
                    border: `1px solid ${lowPerformanceMode ? 'rgba(42,90,122,0.5)' : 'rgba(0,212,255,0.4)'}`,
                    color: lowPerformanceMode ? '#4a7a9a' : '#00d4ff',
                    fontSize: 10,
                    fontWeight: 'bold',
                    letterSpacing: 1.5,
                    fontFamily: '"Courier New", monospace',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    boxShadow: lowPerformanceMode ? 'none' : '0 0 16px rgba(0,212,255,0.15)',
                    transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                    e.currentTarget.style.border = `1px solid ${lowPerformanceMode ? 'rgba(74,122,154,0.8)' : 'rgba(0,212,255,0.8)'}`
                    if (!lowPerformanceMode) {
                        e.currentTarget.style.boxShadow = '0 0 20px rgba(0,212,255,0.3)'
                    }
                }}
                onMouseLeave={(e) => {
                    e.currentTarget.style.border = `1px solid ${lowPerformanceMode ? 'rgba(42,90,122,0.5)' : 'rgba(0,212,255,0.4)'}`
                    e.currentTarget.style.boxShadow = lowPerformanceMode ? 'none' : '0 0 16px rgba(0,212,255,0.15)'
                }}
            >
                <span style={{ fontSize: 12 }}>{lowPerformanceMode ? '⚡' : '✨'}</span>
                <span>{lowPerformanceMode ? 'PERF:ECO' : 'PERF:ULTRA'}</span>
            </button>

            {/* GLB Upload Panel */}
            <GLBUploadPanel />

            {/* Center - 3D Viewport */}
            <div style={{ flex: 1, position: 'relative' }}>
                <Experience remoteUsers={remoteUsers} emitMultiplayerEvent={emit} localUserId={userId} />
                <CubeGenerator />
                <GaussianSplatPanel />
                <ChatInterface />
            </div>
        </div>
    )
}

function App() {
    if (isDemoMode) return <MoodDemo />
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    )
}

export default App
