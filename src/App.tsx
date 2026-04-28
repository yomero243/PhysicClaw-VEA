import { useEffect } from 'react'
import { Experience } from './components/Experience'
import { ChatInterface } from './components/ChatInterface'
import { CubeGenerator } from './components/CubeGenerator'
import { AvatarPanel } from './components/AvatarPanel'
import { GLBUploadPanel } from './components/GLBUploadPanel'
import { MoodDemo } from './components/MoodDemo'
import { AuthProvider, useAuth } from './auth'
import { useOpenClawControl } from './hooks/useOpenClawControl'
import { useSoulStore } from './store/soulStore'

// Public demo — accessible at /?demo without authentication
const isDemoMode = new URLSearchParams(window.location.search).has('demo')

function AppContent() {
    const { user } = useAuth()
    const setUserId = useSoulStore((s) => s.setUserId)
    useOpenClawControl()

    useEffect(() => {
        setUserId(user?.id ?? 'guest-user')
    }, [user, setUserId])

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

            {/* GLB Upload Panel */}
            <GLBUploadPanel />

            {/* Center - 3D Viewport */}
            <div style={{ flex: 1, position: 'relative' }}>
                <Experience />
                <CubeGenerator />
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
