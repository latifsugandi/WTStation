import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// Debug: Check Electron API availability
if (typeof window !== 'undefined') {
  console.log('[Renderer] Window object:', typeof window)
  console.log('[Renderer] Electron API:', typeof window.electronAPI)
  console.log('[Renderer] Electron API workspaces:', typeof window.electronAPI?.workspaces)
  
  // Wait a bit and check again (preload might load async)
  setTimeout(() => {
    console.log('[Renderer] Electron API after timeout:', typeof window.electronAPI)
    if (!window.electronAPI) {
      console.error('[Renderer] ⚠️ Electron API is not available!')
      console.error('[Renderer] This usually means preload script failed to load.')
    }
  }, 1000)
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
