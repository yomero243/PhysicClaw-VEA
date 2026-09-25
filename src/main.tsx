import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { startThemeClock } from './theme/theme'

// Before the first render, so the page never flashes the wrong palette.
startThemeClock()

ReactDOM.createRoot(document.getElementById('app')!).render(
    <React.StrictMode>
        <App />
    </React.StrictMode>,
)
