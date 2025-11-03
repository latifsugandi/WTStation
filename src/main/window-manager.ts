import { BrowserWindow, BrowserView } from 'electron'
import { sessionManager } from './session-manager'
import { getDatabase } from './database'

let mainWindow: BrowserWindow | null = null
let activeSessionId: string | null = null
const attachedViews: Set<BrowserView> = new Set()
let sidebarCollapsed = false // Track sidebar collapsed state

export function setMainWindow(window: BrowserWindow): void {
  mainWindow = window
}

export function setSidebarCollapsed(collapsed: boolean): void {
  sidebarCollapsed = collapsed
  // Update BrowserView bounds when sidebar state changes
  if (activeSessionId) {
    attachSessionView(activeSessionId)
  } else {
    // Also update all views bounds
    updateViewBounds()
  }
}

function getVisibleBounds() {
  if (!mainWindow) return null
  const bounds = mainWindow.getBounds()
  // Sidebar width: 256px (w-64) when expanded, 80px (w-20) when collapsed
  const sidebarWidth = sidebarCollapsed ? 80 : 256
  const yOffset = 40 // TitleBar height (h-10 = 40px) - webview starts below title bar
  
  // Ensure BrowserView never overlaps with sidebar
  // Add small buffer to prevent any overlap
  const xStart = sidebarWidth + 1
  
  return {
    x: xStart,
    y: yOffset, // Start below title bar
    width: Math.max(1, bounds.width - xStart), // Width adjusts when sidebar collapses
    height: Math.max(1, bounds.height - yOffset), // Full height minus title bar
  }
}

function getHiddenBounds() {
  // Move off-screen to hide but keep mounted
  return {
    x: -10000,
    y: -10000,
    width: 1,
    height: 1,
  }
}

export function attachSessionView(sessionId: string): void {
  if (!mainWindow) return

  const sessionData = sessionManager.getSessionData(sessionId)
  if (!sessionData) {
    console.error(`[WindowManager] No session data found for ${sessionId}`)
    return
  }
  
  // Get workspace to determine type from database
  const db = getDatabase()
  const workspace = db.prepare('SELECT type FROM workspaces WHERE id = ?').get(sessionData.workspaceId) as { type?: string } | undefined
  const workspaceType = (workspace?.type || 'whatsapp') as 'whatsapp' | 'telegram' | 'custom'
  
  // CRITICAL: Use existing view if available and valid (don't recreate unnecessarily)
  // Only recreate if view was actually destroyed
  let view = sessionManager.getSession(sessionId)
  
  if (!view || (view.webContents && view.webContents.isDestroyed())) {
    // View doesn't exist or was destroyed, need to recreate
    console.log(`[WindowManager] View for session ${sessionId} doesn't exist or was destroyed, recreating...`)
    view = sessionManager.recreateSessionIfNeeded(sessionId, workspaceType)
    if (!view) {
      console.log(`[WindowManager] Creating new BrowserView for session ${sessionId}`)
      view = sessionManager.createSession(sessionData.partition, sessionData, workspaceType)
    }
  } else {
    console.log(`[WindowManager] Reusing existing BrowserView for session ${sessionId} (no reload needed)`)
  }

  const visibleBounds = getVisibleBounds()
  if (!visibleBounds) return

  // Hide all other sessions first (but keep them alive!)
  const allSessions = sessionManager.getAllSessions()
  const hiddenBounds = getHiddenBounds()
  
  allSessions.forEach((session) => {
    if (session.id !== sessionId) {
      const otherView = sessionManager.getSession(session.id)
      if (otherView) {
        try {
          // Only hide if view is still valid (not destroyed)
          if (!otherView.webContents.isDestroyed()) {
            // Hide off-screen but preserve the view
            otherView.setBounds(hiddenBounds)
            // Remove from window if attached, but keep view in memory
            try {
              if (attachedViews.has(otherView)) {
                mainWindow.removeBrowserView(otherView)
                attachedViews.delete(otherView)
              }
            } catch (error) {
              // View might not be attached, that's okay
            }
          }
        } catch (error) {
          console.error(`[WindowManager] Error hiding other session ${session.id}:`, error)
        }
      }
    }
  })

  // Show active view
  try {
    view.setBounds(visibleBounds)
    
    // Attach to window if not already attached
    if (!attachedViews.has(view)) {
      try {
        mainWindow.addBrowserView(view)
        attachedViews.add(view)
        console.log(`[WindowManager] Attached view for session ${sessionId}`)
      } catch (error) {
        console.error(`[WindowManager] Failed to attach view for session ${sessionId}:`, error)
      }
    }

    // Update active session ID
    activeSessionId = sessionId
  } catch (error) {
    console.error(`[WindowManager] Error attaching view for session ${sessionId}:`, error)
  }
}

export function detachSessionView(sessionId: string): void {
  if (!mainWindow) return
  
  // Hide it off-screen to prevent reload
  const view = sessionManager.getSession(sessionId)
  if (view) {
    const hiddenBounds = getHiddenBounds()
    view.setBounds(hiddenBounds)
    
    // If this was the active one, clear active
    if (activeSessionId === sessionId) {
      activeSessionId = null
    }
  }
}

// Force hide all BrowserViews (for settings, dialogs, etc)
// IMPORTANT: Only hide views, preserve them for later use
export function hideAllViews(): void {
  if (!mainWindow) return
  
  const allSessions = sessionManager.getAllSessions()
  const hiddenBounds = getHiddenBounds()
  
  allSessions.forEach((session) => {
    const view = sessionManager.getSession(session.id)
    if (view) {
      try {
        // Move off-screen but keep view alive
        if (!view.webContents.isDestroyed()) {
          view.setBounds(hiddenBounds)
          // Remove from window but keep in memory
          try {
            if (attachedViews.has(view)) {
              mainWindow.removeBrowserView(view)
              attachedViews.delete(view)
            }
          } catch (error) {
            // View might not be attached, that's okay
          }
        }
      } catch (error) {
        console.error(`[WindowManager] Error hiding session ${session.id}:`, error)
      }
    }
  })
  
  activeSessionId = null
}

// Remove all BrowserViews from window (for settings, dialogs)
// IMPORTANT: Only hide views, don't destroy them to preserve sessions
export function removeAllViewsFromWindow(): void {
  if (!mainWindow) {
    console.log('[WindowManager] removeAllViewsFromWindow: mainWindow is null')
    return
  }

  console.log('[WindowManager] removeAllViewsFromWindow: Hiding all views (preserving sessions)')

  // Get all currently attached views
  const currentViews = mainWindow.getBrowserViews()
  console.log(`[WindowManager] Found ${currentViews.length} BrowserViews attached.`)

  // Remove from window but DON'T destroy - just hide off-screen
  const hiddenBounds = getHiddenBounds()
  currentViews.forEach((view) => {
    try {
      // Move off-screen first
      view.setBounds(hiddenBounds)
      // Remove from window but keep view alive
      try {
        mainWindow!.removeBrowserView(view)
      } catch (e) {
        // Already removed or error, that's okay
      }
    } catch (error) {
      console.error('[WindowManager] Error hiding view:', error)
    }
  })

  // Remove all from window (fallback)
  try {
    mainWindow.removeAllBrowserViews()
    console.log('[WindowManager] Called removeAllBrowserViews()')
  } catch (error) {
    console.error('[WindowManager] Error calling removeAllBrowserViews:', error)
  }

  // Move all session views to hidden bounds (off-screen) but keep them alive
  const allSessions = sessionManager.getAllSessions()
  allSessions.forEach((session) => {
    const view = sessionManager.getSession(session.id)
    if (view) {
      try {
        // Move off-screen but don't destroy
        view.setBounds(hiddenBounds)
        // Remove from window if attached but keep view in memory
        try {
          if (attachedViews.has(view)) {
            mainWindow!.removeBrowserView(view)
            attachedViews.delete(view)
          }
        } catch (e) {
          // Not attached, that's okay
        }
      } catch (error) {
        console.error(`[WindowManager] Error hiding session ${session.id}:`, error)
      }
    }
  })

  // Clear active session tracking but keep views alive
  activeSessionId = null

  // Verify
  const finalViews = mainWindow.getBrowserViews()
  console.log(`[WindowManager] BrowserViews after hiding: ${finalViews.length} (should be 0)`)
  
  if (finalViews.length > 0) {
    console.warn(`[WindowManager] Warning: ${finalViews.length} views still attached after removal attempt`)
    // Remove remaining views but still don't destroy
    finalViews.forEach((view) => {
      try {
        view.setBounds(hiddenBounds)
        mainWindow!.removeBrowserView(view)
      } catch (e) {
        // Ignore
      }
    })
    mainWindow.removeAllBrowserViews()
  }

  console.log('[WindowManager] removeAllViewsFromWindow: All views hidden (preserved for later use)')
}

export function detachAllViews(): void {
  if (!mainWindow) return
  
  // Hide all views off-screen instead of removing
  const allSessions = sessionManager.getAllSessions()
  const hiddenBounds = getHiddenBounds()
  
  allSessions.forEach((session) => {
    const view = sessionManager.getSession(session.id)
    if (view) {
      view.setBounds(hiddenBounds)
    }
  })
  
  activeSessionId = null
}

export function updateViewBounds(): void {
  if (!mainWindow) return
  
  const visibleBounds = getVisibleBounds()
  const hiddenBounds = getHiddenBounds()
  if (!visibleBounds) return
  
  // Update bounds for all sessions
  const db = getDatabase()
  sessionManager.getAllSessions().forEach((session) => {
    // Get workspace type for recreation if needed
    const workspace = db.prepare('SELECT type FROM workspaces WHERE id = ?').get(session.workspaceId) as { type?: string } | undefined
    const workspaceType = (workspace?.type || 'whatsapp') as 'whatsapp' | 'telegram' | 'custom'
    
    // Ensure view exists and is valid
    let view = sessionManager.recreateSessionIfNeeded(session.id, workspaceType)
    if (!view) {
      view = sessionManager.getSession(session.id)
    }
    
    if (view) {
      // Active session gets visible bounds, others get hidden bounds
      if (activeSessionId === session.id) {
        view.setBounds(visibleBounds)
      } else {
        view.setBounds(hiddenBounds)
      }
    }
  })
}

// Initialize all views when app starts - attach all but hide inactive ones
export function initializeAllViews(): void {
  if (!mainWindow) return
  
  const allSessions = sessionManager.getAllSessions()
  const hiddenBounds = getHiddenBounds()
  
  const db = getDatabase()
  allSessions.forEach((session) => {
    // Get workspace type for recreation if needed
    const workspace = db.prepare('SELECT type FROM workspaces WHERE id = ?').get(session.workspaceId) as { type?: string } | undefined
    const workspaceType = (workspace?.type || 'whatsapp') as 'whatsapp' | 'telegram' | 'custom'
    
    // Recreate if needed, then attach
    let view = sessionManager.recreateSessionIfNeeded(session.id, workspaceType)
    if (!view) {
      view = sessionManager.getSession(session.id)
    }
    
    if (view && !attachedViews.has(view)) {
      // Attach to window but keep hidden
      view.setBounds(hiddenBounds)
      mainWindow!.addBrowserView(view)
      attachedViews.add(view)
    }
  })
}
