import { useEffect } from 'react'
import { Experience } from './components/Experience'
import { ChatInterface } from './components/ChatInterface'
import { AvatarPanel } from './components/AvatarPanel'
import { GLBUploadPanel } from './components/GLBUploadPanel'
import { InterfaceChrome } from './components/InterfaceChrome'
import { UserDiscoveryPanel } from './components/UserDiscoveryPanel'
import { Toasts } from './components/Toasts'
import { AgentTokenPanel } from './components/AgentTokenPanel'
import { AuthProvider, useAuth } from './auth'
import { LoginPage } from './components/LoginPage'
import { useOpenClawControl } from './hooks/useOpenClawControl'
import { useProductionControl } from './hooks/useProductionControl'
import { useMultiplayer } from './hooks/useMultiplayer'
import { useSoulStore } from './store/soulStore'
import { useSceneStore } from './store/sceneStore'

function AppContent({ userId: sessionUserId, displayName }: { userId: string; displayName: string }) {
    const setUserId = useSoulStore((s) => s.setUserId)
    const initialize = useSceneStore((s) => s.initialize)
    const userId = useSceneStore((s) => s.userId)
    const currentScene = useSceneStore((s) => s.currentScene)
    const { remoteUsers, emit } = useMultiplayer(currentScene?.id ?? null)
    const lowPerformanceMode = useSoulStore((s) => s.lowPerformanceMode)
    const setLowPerformanceMode = useSoulStore((s) => s.setLowPerformanceMode)
    useOpenClawControl()
    useProductionControl()

    const setUserName = useSoulStore((s) => s.setUserName)

    useEffect(function initStore() {
        initialize(sessionUserId)
    }, [initialize, sessionUserId])

    useEffect(function showWhoIsSignedIn() {
        setUserName(displayName)
    }, [displayName, setUserName])

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
                background: 'var(--bg)',
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
                <UserDiscoveryPanel remoteUsers={remoteUsers} sceneId={currentScene?.id ?? null} />
                <AgentTokenPanel />
                <ChatInterface />
                <Toasts />
            </div>
        </div>
    )
}

/**
 * One account for PhysicClaw and VEA perZona: same Supabase project, same
 * email + password. Anonymous sessions left over from older builds do not
 * count; they could not be recovered after a reload anyway.
 */
function AuthGate() {
    const { user, loading } = useAuth()
    const resetScene = useSceneStore((s) => s.reset)
    const signedIn = Boolean(user && !user.is_anonymous)

    useEffect(function dropWorldOnSignOut() {
        if (!loading && !signedIn) resetScene()
    }, [loading, signedIn, resetScene])

    if (loading) return null
    if (!user || !signedIn) return <LoginPage />
    const displayName = user.email?.split('@')[0] ?? 'user'
    // Keyed by account, so switching users remounts with a clean slate.
    return <AppContent key={user.id} userId={user.id} displayName={displayName} />
}

function App() {
    return (
        <AuthProvider>
            <AuthGate />
        </AuthProvider>
    )
}

export default App
