import { useEffect } from 'react'
import { Experience } from './components/Experience'
import { ChatInterface } from './components/ChatInterface'
import { AvatarPanel } from './components/AvatarPanel'
import { LoginPage } from './components/LoginPage'
import { AuthProvider, useAuth } from './auth'
import { useOpenClawControl } from './hooks/useOpenClawControl'
import { useSoulStore } from './store/soulStore'

function AppContent() {
    const { session, user, loading, signOut } = useAuth()
    const setUserId = useSoulStore((s) => s.setUserId)
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

            {/* Center - 3D Viewport */}
            <div style={{ flex: 1, position: 'relative' }}>
                <Experience />
                <ChatInterface />
            </div>

            {/* Sign Out Button */}
            <button
                onClick={signOut}
                style={{
                    position: 'fixed',
                    top: 12,
                    right: 12,
                    padding: '6px 14px',
                    background: 'rgba(10, 16, 32, 0.8)',
                    border: '1px solid #1a2a40',
                    borderRadius: 4,
                    color: '#6b7a90',
                    fontSize: 11,
                    fontFamily: '"Courier New", monospace',
                    cursor: 'pointer',
                    zIndex: 1000,
                }}
            >
                Sign Out
            </button>
        </div>
    )
}

function App() {
    return (
        <AuthProvider>
            <AppContent />
        </AuthProvider>
    )
}

export default App
