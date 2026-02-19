import { Experience } from './components/Experience'
import { ChatInterface } from './components/ChatInterface'
import { OpenClawControl } from './OpenClawControl';

function App() {
    return (
        <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#111', overflow: 'hidden' }}>
            <OpenClawControl />
            <Experience />
            <ChatInterface />
        </div>
    )
}

export default App
