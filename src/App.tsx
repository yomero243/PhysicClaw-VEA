import { Experience } from './components/Experience'
import { ChatInterface } from './components/ChatInterface'


function App() {
    return (
        <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#111', overflow: 'hidden' }}>
            <Experience />
            <ChatInterface />
        </div>
    )
}

export default App
