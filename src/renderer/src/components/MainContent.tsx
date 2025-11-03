import { useEffect } from 'react'
import { useStore } from '../store/store'
import SessionView from './SessionView'
import SettingsView from './SettingsView'
import TemplatesView from './TemplatesView'
import LabelsView from './LabelsView'

export default function MainContent() {
  const { activeWorkspaceId, activeView, workspaces, sessions, sidebarCollapsed } = useStore()
  
  // CRITICAL: Ensure all BrowserViews are removed when showing settings
  // Must call useEffect outside conditional to follow Rules of Hooks
  useEffect(() => {
    if (activeView === 'settings') {
      console.log('[MainContent] Settings view activated, removing all BrowserViews...')
      // Remove all BrowserViews from window immediately when settings opens
      const removeViews = () => {
        try {
          // CRITICAL: Remove all views from window IMMEDIATELY (don't await, just fire)
          if (window.electronAPI?.window?.removeAllViews) {
            console.log('[MainContent] Calling removeAllViews()...')
            window.electronAPI.window.removeAllViews().catch((err) => {
              console.error('[MainContent] Error calling removeAllViews:', err)
            })
          }
          // Also detach all sessions (move off-screen as backup)
          if (window.electronAPI?.sessionView) {
            const allSessions = sessions
            console.log(`[MainContent] Detaching ${allSessions.length} sessions...`)
            for (const session of allSessions) {
              try {
                window.electronAPI.sessionView.detach(session.id).catch(() => {})
              } catch (error) {
                // Silent fail
              }
            }
          }
          // Send IPC message to main process
          if (window.electronAPI?.send) {
            window.electronAPI.send('renderer:active-view-changed', 'settings')
          }
        } catch (error) {
          console.error('[MainContent] Failed to remove views:', error)
        }
      }
      // Run immediately and also after a small delay to catch any stragglers
      removeViews()
      const timeout1 = setTimeout(() => {
        console.log('[MainContent] Second removal attempt...')
        removeViews()
      }, 50)
      const timeout2 = setTimeout(() => {
        console.log('[MainContent] Third removal attempt...')
        removeViews()
      }, 200)
      return () => {
        clearTimeout(timeout1)
        clearTimeout(timeout2)
      }
    }
  }, [activeView, sessions])
  
  // Show settings if activeView is 'settings'
  if (activeView === 'settings') {
    // Calculate sidebar width dynamically
    const sidebarWidth = sidebarCollapsed ? 80 : 256
    
    console.log(`[MainContent] Rendering SettingsView with sidebar width: ${sidebarWidth}px`)
    
    // Force remove views one more time right before rendering
    if (window.electronAPI?.window?.removeAllViews) {
      window.electronAPI.window.removeAllViews().catch(() => {})
    }
    if (window.electronAPI?.send) {
      window.electronAPI.send('renderer:active-view-changed', 'settings')
    }
    
    return (
      <div 
        className="flex-1 flex flex-col overflow-hidden bg-gray-50 dark:bg-gray-900"
        style={{ 
          position: 'fixed',
          top: '50px', // Below title bar
          left: `${sidebarWidth}px`, // Dynamic sidebar width
          right: '0',
          bottom: '0',
          zIndex: 2147483647, // Maximum z-index value
          width: `calc(100% - ${sidebarWidth}px)`,
          height: `calc(100vh - 50px)`,
          pointerEvents: 'auto',
          overflow: 'auto',
          isolation: 'isolate'
        }}
      >
        <SettingsView />
      </div>
    )
  }
  
  // Find active workspace
  const activeWorkspace = workspaces.find(w => w.id === activeWorkspaceId)
  
  if (!activeWorkspace) {
    // Empty div, no messages
    return <div className="flex-1 bg-gray-50 dark:bg-gray-900" />
  }
  
  // Find session for this workspace (1 app = 1 session, no tabs needed)
  const session = sessions.find(s => s.workspaceId === activeWorkspaceId)
  
  if (!session) {
    // Session will be auto-created, just return empty div
    return <div className="flex-1 bg-gray-50 dark:bg-gray-900" />
  }

  // Show session view directly (no tab bar, no loading)
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      <div className="flex-1 overflow-hidden">
        <SessionView sessionId={session.id} />
      </div>
    </div>
  )
}
