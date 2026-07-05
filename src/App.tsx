import { useEffect } from 'react'
import { Experience } from './components/Experience'
import { ChatInterface } from './components/ChatInterface'
import { CubeGenerator } from './components/CubeGenerator'
import { AvatarPanel } from './components/AvatarPanel'
import { GLBUploadPanel } from './components/GLBUploadPanel'
import { GaussianSplatPanel } from './components/GaussianSplatPanel'
import { MoodDemo } from './components/MoodDemo'
import { InterfaceChrome } from './components/InterfaceChrome'
import { UserDiscoveryPanel } from './components/UserDiscoveryPanel'
import { Toasts } from './components/Toasts'
import { AgentTokenPanel } from './components/AgentTokenPanel'
import { AuthProvider } from './auth'
import { useOpenClawControl } from './hooks/useOpenClawControl'
import { useProductionControl } from './hooks/useProductionControl'
import { useMultiplayer } from './hooks/useMultiplayer'
import { useSoulStore } from './store/soulStore'
import { useSceneStore } from './store/sceneStore'

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
    useProductionControl()

    useEffect(function initStore() {
        initialize()
    }, [initialize])

    useEffect(function syncUserId() {
        if (userId) setUserId(userId)
    }, [userId, setUserId])

    return (
        <div
            style={{
                width: '100vw',
                height: '100vh',
                display: 'flex',
                flexDirection: 'row',
                background: '#0A0B0A',
                overflow: 'hidden',
            }}
        >
            <AvatarPanel />
            <GLBUploadPanel />

            <div style={{ flex: 1, position: 'relative', minWidth: 0 }}>
                <Experience
                    remoteUsers={remoteUsers}
                    emitMultiplayerEvent={emit}
                    localUserId={userId}
                />
                <InterfaceChrome
                    sceneName={currentScene?.name ?? null}
                    sceneId={currentScene?.id ?? null}
                    remoteCount={remoteUsers.length}
                    lowPerformanceMode={lowPerformanceMode}
                    onTogglePerformance={() => setLowPerformanceMode(!lowPerformanceMode)}
                />
                <CubeGenerator />
                <GaussianSplatPanel />
                <UserDiscoveryPanel remoteUsers={remoteUsers} sceneId={currentScene?.id ?? null} />
                <AgentTokenPanel />
                <ChatInterface />
                <Toasts />
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
