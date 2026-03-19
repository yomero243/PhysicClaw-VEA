import { useEffect, useState } from 'react'
import { Experience } from './components/Experience'
import { ChatInterface } from './components/ChatInterface'
import { AvatarPanel } from './components/AvatarPanel'
import { GLBUploadPanel } from './components/GLBUploadPanel'
import { LoginPage } from './components/LoginPage'
import { MoodDemo } from './components/MoodDemo'
import { AuthProvider, useAuth } from './auth'
import { useOpenClawControl } from './hooks/useOpenClawControl'
import { useSoulStore } from './store/soulStore'

// Public demo — accessible at /?demo without authentication
const isDemoMode = new URLSearchParams(window.location.search).has('demo')

function AppContent() {
    const { session, user, loading, signOut } = useAuth()
    const setUserId = useSoulStore((s) => s.setUserId)
    const [signingOut, setSigningOut] = useState(false)
    useOpenClawControl()

    useEffect(() => {
        setUserId(user?.id ?? null)
    }, [user, setUserId])

    if (loading) {
        return (
            <div style={{
                width: '100vw',
                height: '100vh',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#030810',
                color: '#00d4ff',
                fontFamily: '"Courier New", monospace',
                fontSize: 16,
            }}>
                Loading...
            </div>
        )
    }

    if (!session) {
        return <LoginPage />
    }

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
                <ChatInterface />
            </div>

            {/* Sign Out Button */}
            <button
                onClick={async () => {
                    if (signingOut) return
                    setSigningOut(true)
                    await signOut()
                    setSigningOut(false)
                }}
                disabled={signingOut}
                style={{
                    position: 'fixed',
                    top: 12,
                    right: 12,
                    padding: '6px 14px',
                    background: 'rgba(10, 16, 32, 0.8)',
                    border: '1px solid #1a2a40',
                    borderRadius: 4,
                    color: signingOut ? '#3a4a60' : '#6b7a90',
                    fontSize: 11,
                    fontFamily: '"Courier New", monospace',
                    cursor: signingOut ? 'wait' : 'pointer',
                    zIndex: 1000,
                }}
            >
                {signingOut ? 'SIGNING OUT...' : 'Sign Out'}
            </button>
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
