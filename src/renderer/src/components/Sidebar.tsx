import { useState, useEffect } from 'react'
import { Plus, MessageSquare, Settings, MessageCircle, Send, ChevronLeft, ChevronRight } from 'lucide-react'
import { useStore } from '../store/store'
import { motion } from 'framer-motion'
import WorkspaceDialog from './WorkspaceDialog'
import EditWorkspaceDialog from './EditWorkspaceDialog'
import ContextMenu from './ContextMenu'
import { waitForElectronAPI, isElectronAvailable } from '../utils/check-electron'
import type { WorkspaceType, Workspace } from '@shared/types'

export default function Sidebar() {
  const { 
    workspaces, 
    activeWorkspaceId, 
    activeView, 
    sidebarCollapsed,
    setActiveWorkspace, 
    setActiveView, 
    setSidebarCollapsed,
    sessions 
  } = useStore()
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; workspace: Workspace } | null>(null)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [selectedWorkspace, setSelectedWorkspace] = useState<Workspace | null>(null)

  const handleAddWorkspace = () => {
    // Hide all BrowserViews before opening dialog
    const allSessions = useStore.getState().sessions
    allSessions.forEach((session) => {
      try {
        window.electronAPI?.sessionView?.detach?.(session.id)
      } catch (error) {
        console.error('Failed to detach session:', error)
      }
    })
    setIsDialogOpen(true)
  }

  const handleConfirmWorkspace = async (name: string, type: WorkspaceType, icon?: string) => {
    try {
      // Wait for Electron API to be available
      let electronAPI = window.electronAPI
      if (!isElectronAvailable()) {
        console.log('Waiting for Electron API...')
        electronAPI = await waitForElectronAPI(3000)
      }
      
      if (!electronAPI?.workspaces) {
        throw new Error('Electron API workspaces not available. Please check the console for errors.')
      }
      
      const workspace = await electronAPI.workspaces.add({ name, type, icon })
      useStore.getState().addWorkspace(workspace)
      
      // Auto-create session based on type (1 app = 1 session)
      // Check if session already exists
      const existingSessions = useStore.getState().sessions.filter(s => s.workspaceId === workspace.id)
      
      if (existingSessions.length === 0 && (type === 'whatsapp' || type === 'telegram')) {
        try {
          const sessionName = type === 'telegram' ? 'Telegram Web' : 'WhatsApp Web'
          const session = await electronAPI.sessions.add({
            workspaceId: workspace.id,
            name: sessionName,
          })
          useStore.getState().addSession(session)
        } catch (error) {
          console.error('Failed to auto-create session:', error)
        }
      }
      
      // Auto-select the workspace (which will show its session)
      setActiveWorkspace(workspace.id)
    } catch (error) {
      console.error('Failed to add workspace:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error'
      alert(`Failed to create workspace: ${errorMessage}\n\nPlease check the console (F12) for more details.`)
    }
  }

  const getUnreadCount = (workspaceId: string) => {
    return sessions
      .filter((s) => s.workspaceId === workspaceId)
      .reduce((sum, s) => sum + s.unreadCount, 0)
  }

  return (
    <div className={`${sidebarCollapsed ? 'w-20' : 'w-64'} ${sidebarCollapsed ? 'bg-white dark:bg-slate-800' : 'bg-white dark:bg-gray-800'} border-r border-gray-200 dark:border-gray-700 flex flex-col transition-all duration-300 relative z-50`} style={{ height: 'calc(100vh - 40px)' }}>
      {!sidebarCollapsed && (
        <div className="p-3 border-b border-gray-200 dark:border-gray-700 pr-12 relative z-10">
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleAddWorkspace()
            }}
            className="w-full px-3 py-1.5 bg-accent text-white rounded-lg hover:bg-accent/90 transition-colors flex items-center gap-2 justify-center text-sm relative z-20 pointer-events-auto"
          >
            <Plus size={14} />
            <span>Add Apps</span>
          </button>
        </div>
      )}

      {sidebarCollapsed && (
        <div className="p-2 border-b border-gray-200 dark:border-slate-700 relative z-10">
          <button
            onClick={(e) => {
              e.stopPropagation()
              handleAddWorkspace()
            }}
            className="w-10 h-10 bg-gray-100 dark:bg-slate-700/50 hover:bg-gray-200 dark:hover:bg-slate-600/50 border border-gray-300 dark:border-slate-600/50 rounded-full transition-colors flex items-center justify-center relative z-20 pointer-events-auto mx-auto"
            title="Add Apps"
          >
            <Plus size={16} className="text-gray-700 dark:text-slate-200" />
          </button>
        </div>
      )}

      {/* Toggle Button */}
      <button
        onClick={(e) => {
          e.stopPropagation()
          setSidebarCollapsed(!sidebarCollapsed)
        }}
        className={`absolute -right-3 top-3 z-50 p-1 ${sidebarCollapsed ? 'bg-gray-100 dark:bg-slate-700/50 hover:bg-gray-200 dark:hover:bg-slate-600/50 border border-gray-300 dark:border-slate-600/50 text-gray-700 dark:text-slate-200' : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'} rounded-full shadow-md transition-colors pointer-events-auto flex items-center justify-center w-6 h-6`}
        title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {sidebarCollapsed ? (
          <ChevronRight size={14} />
        ) : (
          <ChevronLeft size={14} />
        )}
      </button>

      <div className="flex-1 overflow-y-auto p-2 relative z-10">
        {workspaces.map((workspace) => {
          const isActive = activeWorkspaceId === workspace.id
          const unreadCount = getUnreadCount(workspace.id)
          const workspaceSessions = sessions.filter((s) => s.workspaceId === workspace.id)

          return (
            <div key={workspace.id}>
              <motion.div
                onClick={async (e) => {
                  e.stopPropagation()
                  // Close context menu if open
                  if (contextMenu) {
                    setContextMenu(null)
                    return
                  }
                  const wasActive = isActive
                  // When clicking workspace, set activeView to workspace and activate the workspace
                  if (wasActive) {
                    // Deselect
                    setActiveWorkspace(null)
                    setActiveView(null)
                         } else {
                           // Select workspace (no tabs needed, 1 app = 1 session)
                           setActiveWorkspace(workspace.id)
                           setActiveView('workspace')
                         }
                }}
                onContextMenu={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  setContextMenu({
                    x: e.clientX,
                    y: e.clientY,
                    workspace
                  })
                }}
                className={`${sidebarCollapsed ? 'mx-2 my-1 flex justify-center items-center hover:bg-transparent' : 'sidebar-item'} ${isActive ? 'active' : ''} ${!sidebarCollapsed ? 'px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800' : (isActive ? 'bg-sky-500/20 dark:bg-sky-500/30' : '')} transition-colors cursor-pointer relative`}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                title={sidebarCollapsed ? workspace.name : undefined}
              >
                {workspace.icon ? (
                  <div className={`${sidebarCollapsed ? 'w-10 h-10' : 'w-8 h-8'} rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center ${sidebarCollapsed ? (isActive ? 'bg-sky-500 border-2 border-white dark:border-sky-300' : 'bg-gray-100 dark:bg-slate-700/50 border border-gray-300 dark:border-slate-600/50') : 'bg-gray-100 dark:bg-gray-700'}`}>
                    <img 
                      src={workspace.icon} 
                      alt={workspace.name} 
                      className={`${sidebarCollapsed ? 'w-8 h-8' : 'w-full h-full'} ${sidebarCollapsed && isActive ? 'rounded-full' : ''} object-cover`}
                    />
                  </div>
                ) : workspace.type === 'whatsapp' ? (
                  <div className={`${sidebarCollapsed ? 'w-10 h-10' : 'w-8 h-8'} rounded-full ${sidebarCollapsed ? (isActive ? 'bg-sky-500 border-2 border-white dark:border-sky-300' : 'bg-gray-100 dark:bg-slate-700/50 border border-gray-300 dark:border-slate-600/50') : 'bg-green-100 dark:bg-green-900/30'} flex items-center justify-center flex-shrink-0`}>
                    <MessageCircle size={sidebarCollapsed ? 20 : 20} className={sidebarCollapsed && isActive ? 'text-white dark:text-white' : (sidebarCollapsed ? 'text-gray-700 dark:text-slate-200' : 'text-green-500 dark:text-green-400')} />
                  </div>
                ) : workspace.type === 'telegram' ? (
                  <div className={`${sidebarCollapsed ? 'w-10 h-10' : 'w-8 h-8'} rounded-full ${sidebarCollapsed ? 'bg-gray-100 dark:bg-slate-700/50 border border-gray-300 dark:border-slate-600/50' : 'bg-blue-100 dark:bg-blue-900/30'} flex items-center justify-center flex-shrink-0`}>
                    <Send size={sidebarCollapsed ? 20 : 20} className={sidebarCollapsed ? 'text-gray-700 dark:text-slate-200' : 'text-blue-400 dark:text-blue-300'} />
                  </div>
                ) : (
                  <div className={`${sidebarCollapsed ? 'w-10 h-10' : 'w-8 h-8'} rounded-full ${sidebarCollapsed ? 'bg-gray-100 dark:bg-slate-700/50 border border-gray-300 dark:border-slate-600/50' : 'bg-gray-100 dark:bg-gray-700'} flex items-center justify-center flex-shrink-0`}>
                    <MessageSquare size={sidebarCollapsed ? 20 : 20} className={sidebarCollapsed ? 'text-gray-700 dark:text-slate-200' : 'text-gray-600 dark:text-gray-300'} />
                  </div>
                )}
                {!sidebarCollapsed && (
                  <>
                    <span className="font-medium text-base flex-1">{workspace.name}</span>
                    {unreadCount > 0 && (
                      <span className="bg-accent text-white text-xs px-2 py-0.5 rounded-full">
                        {unreadCount}
                      </span>
                    )}
                  </>
                )}
                {sidebarCollapsed && unreadCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-slate-600 dark:border-slate-800 text-[10px] text-white flex items-center justify-center">
                    {unreadCount > 9 ? '9+' : unreadCount}
                  </span>
                )}
              </motion.div>
              
            </div>
          )
        })}
      </div>

             <div className="p-2 border-t border-gray-200 dark:border-gray-700 relative z-10">
               <button
                 onClick={(e) => {
                  e.stopPropagation()
                  // CRITICAL: Remove all BrowserViews from window FIRST before opening settings
                  // This ensures BrowserViews don't block the Settings UI or window controls
                  const removeAll = async () => {
                    try {
                      console.log('[Sidebar] Starting view removal process for settings...')
                      
                      // STEP 1: Send IPC message to main process FIRST
                      if (window.electronAPI?.send) {
                        window.electronAPI.send('renderer:active-view-changed', 'settings')
                      }
                      
                      // STEP 2: Remove all views from window IMMEDIATELY (synchronous-like)
                      if (window.electronAPI?.window?.removeAllViews) {
                        await window.electronAPI.window.removeAllViews()
                      }
                      
                      // STEP 3: Also detach all sessions (move off-screen)
                      const allSessions = useStore.getState().sessions
                      for (const session of allSessions) {
                        try {
                          if (window.electronAPI?.sessionView?.detach) {
                            await window.electronAPI.sessionView.detach(session.id).catch(() => {})
                          }
                        } catch (error) {
                          // Silent fail
                        }
                      }
                      
                      // STEP 4: Small delay to ensure views are removed
                      await new Promise(resolve => setTimeout(resolve, 150))
                      
                      // STEP 5: Double-check and remove again
                      if (window.electronAPI?.window?.removeAllViews) {
                        await window.electronAPI.window.removeAllViews()
                      }
                      
                      // STEP 6: Now safe to open settings
                      console.log('[Sidebar] Views removed, opening settings...')
                      setActiveView('settings')
                      setActiveWorkspace(null)
                    } catch (error) {
                      console.error('[Sidebar] Failed to remove views:', error)
                      // Still open settings even if remove failed, but notify main process
                      if (window.electronAPI?.send) {
                        window.electronAPI.send('renderer:active-view-changed', 'settings')
                      }
                      setTimeout(() => {
                        setActiveView('settings')
                        setActiveWorkspace(null)
                      }, 50)
                    }
                  }
                  removeAll()
                 }}
                 className={`${sidebarCollapsed ? 'mx-2 my-1 flex justify-center items-center hover:bg-transparent' : 'sidebar-item'} ${activeView === 'settings' ? 'active' : ''} ${!sidebarCollapsed ? 'px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800' : ''} transition-colors cursor-pointer relative z-20 pointer-events-auto`}
                 title={sidebarCollapsed ? 'Settings' : undefined}
               >
          <div className={`${sidebarCollapsed ? 'w-10 h-10' : 'w-8 h-8'} rounded-full ${sidebarCollapsed ? 'bg-gray-100 dark:bg-slate-700/50 border border-gray-300 dark:border-slate-600/50' : 'bg-gray-100 dark:bg-gray-700'} flex items-center justify-center flex-shrink-0`}>
            <Settings size={sidebarCollapsed ? 20 : 20} className={sidebarCollapsed ? 'text-gray-700 dark:text-slate-200' : 'text-gray-600 dark:text-gray-300'} />
          </div>
          {!sidebarCollapsed && <span className="font-medium text-base">Settings</span>}
        </button>
      </div>

      <WorkspaceDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        onConfirm={handleConfirmWorkspace}
      />

      <ContextMenu
        isOpen={contextMenu !== null}
        x={contextMenu?.x || 0}
        y={contextMenu?.y || 0}
        onClose={() => setContextMenu(null)}
        onEdit={() => {
          if (contextMenu?.workspace) {
            const workspace = contextMenu.workspace
            console.log('[Sidebar] Edit clicked, workspace:', workspace)
            
            // Save workspace reference before closing context menu
            const workspaceCopy = { ...workspace }
            
            // Close context menu first
            setContextMenu(null)
            
            // Set workspace and open dialog immediately
            setSelectedWorkspace(workspaceCopy)
            setEditDialogOpen(true)
            
            console.log('[Sidebar] Edit dialog should be open:', true, 'workspace:', workspaceCopy)
          }
        }}
        onDelete={async () => {
          if (contextMenu?.workspace) {
            const workspace = contextMenu.workspace
            const sessions = useStore.getState().sessions.filter(s => s.workspaceId === workspace.id)
            
            if (window.confirm(`Hapus app "${workspace.name}"?\n\nSemua data dan session dari app ini akan dihapus. Tindakan ini tidak bisa dibatalkan.`)) {
              try {
                await window.electronAPI.workspaces.delete(workspace.id)
                useStore.getState().removeWorkspace(workspace.id)
                
                // Remove sessions from this workspace
                sessions.forEach(session => {
                  useStore.getState().removeSession(session.id)
                })
                
                // If this was active, clear selection
                if (useStore.getState().activeWorkspaceId === workspace.id) {
                  useStore.getState().setActiveWorkspace(null)
                }
                
                alert(`App "${workspace.name}" berhasil dihapus`)
              } catch (error) {
                console.error('Failed to delete workspace:', error)
                alert(`Gagal menghapus app: ${error instanceof Error ? error.message : 'Unknown error'}`)
              }
            }
            setContextMenu(null)
          }
        }}
      />

      <EditWorkspaceDialog
        isOpen={editDialogOpen}
        workspace={selectedWorkspace}
        onClose={() => {
          setEditDialogOpen(false)
          setSelectedWorkspace(null)
        }}
        onConfirm={async (workspaceId, name, icon) => {
          try {
            const updated = await window.electronAPI.workspaces.update({
              id: workspaceId,
              name,
              icon,
            })
            useStore.getState().updateWorkspace(updated)
            setEditDialogOpen(false)
            setSelectedWorkspace(null)
          } catch (error) {
            console.error('Failed to update workspace:', error)
            alert(`Gagal mengupdate app: ${error instanceof Error ? error.message : 'Unknown error'}`)
          }
        }}
      />
    </div>
  )
}
