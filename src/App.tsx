import { Experience } from './components/Experience'
import { ChatInterface } from './components/ChatInterface'
import { AvatarPanel } from './components/AvatarPanel'
import { useOpenClawControl } from './hooks/useOpenClawControl'

function App() {
    useOpenClawControl()

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
        </div>
    )
}

export default App
