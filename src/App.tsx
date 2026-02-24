import { Experience } from './components/Experience'
import { ChatInterface } from './components/ChatInterface'
import { useOpenClawControl } from './hooks/useOpenClawControl'

function App() {
    useOpenClawControl()

    return (
        <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#111', overflow: 'hidden' }}>
            <Experience />
            <ChatInterface />
        </div>
    )
}

export default App
