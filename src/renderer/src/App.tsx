import { useEffect } from 'react'
import { useStore } from './store/store'
import TitleBar from './components/TitleBar'
import Sidebar from './components/Sidebar'
import MainContent from './components/MainContent'
import CommandPalette from './components/CommandPalette'
import LockScreen from './components/LockScreen'

function App() {
  const { settings, loadSettings, isLocked, theme } = useStore()

  useEffect(() => {
    // Load initial data
    const initializeApp = async () => {
      try {
        // Load all data in parallel
        await Promise.all([
          loadSettings(),
          loadWorkspaces(),
          loadSessions(),
          loadTemplates(),
          loadLabels()
        ])
        
        // Small delay to ensure all state is set
        setTimeout(() => {
          const { restoreState, workspaces, sessions } = useStore.getState()
          
          // Restore sidebar state immediately
          restoreState()
          
          // Restore active workspace if it still exists
          const lastWorkspaceId = localStorage.getItem('wtstation_lastWorkspaceId')
          if (lastWorkspaceId && workspaces.some(w => w.id === lastWorkspaceId)) {
            const session = sessions.find(s => s.workspaceId === lastWorkspaceId)
            if (session) {
              // Activate the workspace (this will also update lastActiveAt)
              useStore.getState().setActiveWorkspace(lastWorkspaceId)
              useStore.getState().setActiveView('workspace')
              
              // Attach the session view (will use existing BrowserView, no reload)
              if (window.electronAPI?.sessionView?.attach) {
                setTimeout(() => {
                  window.electronAPI.sessionView.attach(session.id)
                }, 200)
              }
            }
          }
        }, 300)
      } catch (error) {
        console.error('Failed to initialize app:', error)
      }
    }
    
    initializeApp()
  }, [])

  useEffect(() => {
    if (settings.theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      const updateTheme = (e: MediaQueryListEvent) => {
        document.documentElement.classList.toggle('dark', e.matches)
      }
      mediaQuery.addEventListener('change', updateTheme)
      document.documentElement.classList.toggle('dark', mediaQuery.matches)
      
      return () => mediaQuery.removeEventListener('change', updateTheme)
    } else {
      document.documentElement.classList.toggle('dark', settings.theme === 'dark')
    }
  }, [settings.theme])

  const loadWorkspaces = async () => {
    try {
      if (!window.electronAPI?.workspaces) {
        console.error('Electron API not available')
        return
      }
      const workspaces = await window.electronAPI.workspaces.list()
      useStore.getState().setWorkspaces(workspaces)
    } catch (error) {
      console.error('Failed to load workspaces:', error)
    }
  }

  const loadSessions = async () => {
    try {
      const sessions = await window.electronAPI.sessions.list()
      useStore.getState().setSessions(sessions)
    } catch (error) {
      console.error('Failed to load sessions:', error)
    }
  }

  const loadTemplates = async () => {
    try {
      const templates = await window.electronAPI.templates.list()
      useStore.getState().setTemplates(templates)
    } catch (error) {
      console.error('Failed to load templates:', error)
    }
  }

  const loadLabels = async () => {
    try {
      const labels = await window.electronAPI.labels.list()
      useStore.getState().setLabels(labels)
    } catch (error) {
      console.error('Failed to load labels:', error)
    }
  }

  if (isLocked) {
    return <LockScreen />
  }

  return (
    <div className="flex flex-col h-screen overflow-hidden">
      <TitleBar />
      <div className="flex flex-1 overflow-hidden" style={{ marginTop: '40px' }}>
        <Sidebar />
        <MainContent />
      </div>
      <CommandPalette />
    </div>
  )
}

export default App
