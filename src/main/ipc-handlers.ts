import { ipcMain, app, BrowserWindow, Notification } from 'electron'
import { getDatabase } from './database'
import { sessionManager } from './session-manager'
import { attachSessionView, detachSessionView, initializeAllViews, removeAllViewsFromWindow, hideAllViews, setSidebarCollapsed } from './window-manager'
import type {
  Workspace,
  Session,
  Template,
  Label,
  ChatLabel,
  Settings,
  ProxyConfig,
  WorkspaceType,
} from '@shared/types'
import { IPC_CHANNELS, PARTITION_PREFIX } from '@shared/utils/constants'
import { v4 as uuidv4 } from 'uuid'
import updater from 'electron-updater'
const { autoUpdater } = updater

// Workspace handlers
ipcMain.handle(IPC_CHANNELS.WORKSPACES_LIST, async (): Promise<Workspace[]> => {
  const db = getDatabase()
  const rows = db.prepare('SELECT * FROM workspaces ORDER BY createdAt ASC').all() as any[]
  
  // Ensure all workspaces have a type (migration for old data)
  return rows.map((row) => ({
    ...row,
    type: row.type || 'whatsapp',
  })) as Workspace[]
})

ipcMain.handle(
  IPC_CHANNELS.WORKSPACES_ADD,
  async (_event, workspace: Omit<Workspace, 'id' | 'createdAt' | 'updatedAt'>): Promise<Workspace> => {
    const db = getDatabase()
    const id = uuidv4()
    const now = Date.now()
    
    // Ensure type column exists (handle migration edge cases)
    try {
      const tableInfo = db.prepare("PRAGMA table_info(workspaces)").all() as Array<{ name: string }>
      const hasTypeColumn = tableInfo.some((col) => col.name === 'type')
      
      if (!hasTypeColumn) {
        db.exec('ALTER TABLE workspaces ADD COLUMN type TEXT')
        db.exec("UPDATE workspaces SET type = 'whatsapp' WHERE type IS NULL")
      }
    } catch (error) {
      console.error('[IPC] Migration check error:', error)
    }
    
    const newWorkspace: Workspace = {
      ...workspace,
      type: workspace.type || 'whatsapp',
      id,
      createdAt: now,
      updatedAt: now,
    }
    
    db.prepare(
      'INSERT INTO workspaces (id, name, type, color, icon, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)'
    ).run(
      newWorkspace.id,
      newWorkspace.name,
      newWorkspace.type || 'whatsapp',
      newWorkspace.color || null,
      newWorkspace.icon || null,
      newWorkspace.createdAt,
      newWorkspace.updatedAt
    )
    
    return newWorkspace
  }
)

ipcMain.handle(
  IPC_CHANNELS.WORKSPACES_UPDATE,
  async (_event, workspace: Partial<Workspace> & { id: string }): Promise<Workspace> => {
    const db = getDatabase()
    const now = Date.now()
    
    const existing = db.prepare('SELECT * FROM workspaces WHERE id = ?').get(workspace.id) as any
    if (!existing) {
      throw new Error('Workspace not found')
    }
    
    const updated: Workspace = {
      ...existing,
      type: existing.type || 'whatsapp',
      ...workspace,
      updatedAt: now,
    }
    
    db.prepare(
      'UPDATE workspaces SET name = ?, type = ?, color = ?, icon = ?, updatedAt = ? WHERE id = ?'
    ).run(
      updated.name,
      updated.type || 'whatsapp',
      updated.color || null,
      updated.icon || null,
      updated.updatedAt,
      updated.id
    )
    
    return updated
  }
)

ipcMain.handle(
  IPC_CHANNELS.WORKSPACES_DELETE,
  async (_event, workspaceId: string): Promise<void> => {
    const db = getDatabase()
    
    // Remove associated sessions
    const sessions = db.prepare('SELECT * FROM sessions WHERE workspaceId = ?').all(workspaceId) as Session[]
    sessions.forEach((s) => {
      sessionManager.removeSession(s.id)
    })
    
    db.prepare('DELETE FROM workspaces WHERE id = ?').run(workspaceId)
  }
)

// Session handlers
ipcMain.handle(IPC_CHANNELS.SESSIONS_LIST, async (): Promise<Session[]> => {
  const db = getDatabase()
  const rows = db.prepare('SELECT * FROM sessions ORDER BY lastActiveAt DESC').all() as Session[]
  
  // Ensure BrowserViews are created for all sessions
  rows.forEach((session) => {
    // Check if BrowserView already exists
    if (!sessionManager.getSession(session.id)) {
      // Get workspace type to determine which URL to load
      const workspace = db.prepare('SELECT type FROM workspaces WHERE id = ?').get(session.workspaceId) as { type: string } | undefined
      const workspaceType = (workspace?.type || 'whatsapp') as WorkspaceType
      
      // Create BrowserView for this session
      sessionManager.createSession(session.partition, session, workspaceType)
    }
  })
  
  // Initialize all views after creating missing ones
  setTimeout(() => {
    initializeAllViews()
  }, 100)
  
  return rows
})

ipcMain.handle(
  IPC_CHANNELS.SESSIONS_ADD,
  async (_event, sessionData: Omit<Session, 'id' | 'partition' | 'createdAt' | 'status' | 'unreadCount'>): Promise<Session> => {
    const db = getDatabase()
    const id = uuidv4()
    const partition = `${PARTITION_PREFIX}-${sessionData.workspaceId}-${id}`
    const now = Date.now()
    
    const newSession: Session = {
      ...sessionData,
      id,
      partition,
      status: 'connecting',
      unreadCount: 0,
      createdAt: now,
      lastActiveAt: now,
    }
    
    db.prepare(
      'INSERT INTO sessions (id, workspaceId, name, partition, status, unreadCount, lastActiveAt, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
    ).run(
      newSession.id,
      newSession.workspaceId,
      newSession.name,
      newSession.partition,
      newSession.status,
      newSession.unreadCount,
      newSession.lastActiveAt,
      newSession.createdAt
    )
    
    // Get workspace type to determine which URL to load
    const workspace = db.prepare('SELECT type FROM workspaces WHERE id = ?').get(sessionData.workspaceId) as { type: string } | undefined
    const workspaceType = (workspace?.type || 'whatsapp') as WorkspaceType
    
           // Create BrowserView for this session
           const view = sessionManager.createSession(partition, newSession, workspaceType)
           
           // Initialize all views (attach all but hide inactive ones)
           // This prevents reload when switching
           setTimeout(() => {
             initializeAllViews()
           }, 100)
           
           return newSession
         }
       )

ipcMain.handle(IPC_CHANNELS.SESSIONS_REMOVE, async (_event, sessionId: string): Promise<void> => {
  const db = getDatabase()
  sessionManager.removeSession(sessionId)
  db.prepare('DELETE FROM sessions WHERE id = ?').run(sessionId)
})

ipcMain.handle(IPC_CHANNELS.SESSIONS_GET_QR, async (_event, sessionId: string): Promise<string | null> => {
  const sessionData = sessionManager.getSessionData(sessionId)
  return sessionData?.qrCode || null
})

ipcMain.handle(IPC_CHANNELS.SESSIONS_STATUS, async (_event, sessionId: string): Promise<Session['status']> => {
  const sessionData = sessionManager.getSessionData(sessionId)
  return sessionData?.status || 'disconnected'
})

ipcMain.handle('sessions:updateLastActive', async (_event, sessionId: string): Promise<void> => {
  const db = getDatabase()
  const now = Date.now()
  db.prepare('UPDATE sessions SET lastActiveAt = ? WHERE id = ?').run(now, sessionId)
  
  // Also update in session manager
  const sessionData = sessionManager.getSessionData(sessionId)
  if (sessionData) {
    sessionData.lastActiveAt = now
    // Access private sessionData map using bracket notation since it's private
    const sessionDataMap = (sessionManager as any).sessionData
    if (sessionDataMap) {
      sessionDataMap.set(sessionId, sessionData)
    }
  }
})

ipcMain.handle('session:attach', async (_event, sessionId: string): Promise<void> => {
  attachSessionView(sessionId)
})

ipcMain.handle('session:detach', async (_event, sessionId: string): Promise<void> => {
  detachSessionView(sessionId)
})

// Template handlers
ipcMain.handle(IPC_CHANNELS.TEMPLATES_LIST, async (): Promise<Template[]> => {
  const db = getDatabase()
  const rows = db.prepare('SELECT * FROM templates ORDER BY updatedAt DESC').all() as Template[]
  return rows.map((row) => ({
    ...row,
    variables: row.variables ? JSON.parse(row.variables as unknown as string) : [],
  }))
})

ipcMain.handle(
  IPC_CHANNELS.TEMPLATES_SAVE,
  async (_event, template: Omit<Template, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<Template> => {
    const db = getDatabase()
    const now = Date.now()
    
    if (template.id) {
      // Update existing
      const existing = db.prepare('SELECT * FROM templates WHERE id = ?').get(template.id) as Template
      if (!existing) {
        throw new Error('Template not found')
      }
      
      const updated: Template = {
        ...existing,
        ...template,
        updatedAt: now,
      }
      
      db.prepare(
        'UPDATE templates SET name = ?, content = ?, variables = ?, category = ?, updatedAt = ? WHERE id = ?'
      ).run(
        updated.name,
        updated.content,
        JSON.stringify(updated.variables),
        updated.category || null,
        updated.updatedAt,
        updated.id
      )
      
      return updated
    } else {
      // Create new
      const id = uuidv4()
      const newTemplate: Template = {
        ...template,
        id,
        createdAt: now,
        updatedAt: now,
      }
      
      db.prepare(
        'INSERT INTO templates (id, name, content, variables, category, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).run(
        newTemplate.id,
        newTemplate.name,
        newTemplate.content,
        JSON.stringify(newTemplate.variables),
        newTemplate.category || null,
        newTemplate.createdAt,
        newTemplate.updatedAt
      )
      
      return newTemplate
    }
  }
)

ipcMain.handle(IPC_CHANNELS.TEMPLATES_DELETE, async (_event, templateId: string): Promise<void> => {
  const db = getDatabase()
  db.prepare('DELETE FROM templates WHERE id = ?').run(templateId)
})

// Label handlers
ipcMain.handle(IPC_CHANNELS.LABELS_LIST, async (): Promise<Label[]> => {
  const db = getDatabase()
  const rows = db.prepare('SELECT * FROM labels ORDER BY createdAt ASC').all() as Label[]
  return rows
})

ipcMain.handle(
  IPC_CHANNELS.LABELS_SAVE,
  async (_event, label: Omit<Label, 'id' | 'createdAt'> & { id?: string }): Promise<Label> => {
    const db = getDatabase()
    const now = Date.now()
    
    if (label.id) {
      const existing = db.prepare('SELECT * FROM labels WHERE id = ?').get(label.id) as Label
      if (!existing) {
        throw new Error('Label not found')
      }
      
      const updated: Label = { ...existing, ...label }
      db.prepare('UPDATE labels SET name = ?, color = ? WHERE id = ?').run(
        updated.name,
        updated.color,
        updated.id
      )
      
      return updated
    } else {
      const id = uuidv4()
      const newLabel: Label = { ...label, id, createdAt: now }
      
      db.prepare('INSERT INTO labels (id, name, color, createdAt) VALUES (?, ?, ?, ?)').run(
        newLabel.id,
        newLabel.name,
        newLabel.color,
        newLabel.createdAt
      )
      
      return newLabel
    }
  }
)

ipcMain.handle(IPC_CHANNELS.LABELS_DELETE, async (_event, labelId: string): Promise<void> => {
  const db = getDatabase()
  db.prepare('DELETE FROM labels WHERE id = ?').run(labelId)
})

ipcMain.handle(
  IPC_CHANNELS.LABELS_ATTACH,
  async (_event, chatLabel: ChatLabel): Promise<void> => {
    const db = getDatabase()
    const deleteStmt = db.prepare('DELETE FROM chat_labels WHERE sessionId = ? AND chatId = ?')
    const insertStmt = db.prepare('INSERT INTO chat_labels (sessionId, chatId, labelId) VALUES (?, ?, ?)')
    
    deleteStmt.run(chatLabel.sessionId, chatLabel.chatId)
    
    chatLabel.labelIds.forEach((labelId) => {
      insertStmt.run(chatLabel.sessionId, chatLabel.chatId, labelId)
    })
  }
)

// Settings handlers
ipcMain.handle(IPC_CHANNELS.SETTINGS_GET, async (): Promise<Settings> => {
  const db = getDatabase()
  const rows = db.prepare('SELECT key, value FROM settings').all() as Array<{ key: string; value: string }>
  
  // Default settings as fallback
  const defaultSettings: Settings = {
    theme: 'system',
    language: 'en',
    startup: false,
    minimizeToTray: true,
    lockEnabled: false,
    lockTimeout: 300000,
    autoUpdate: true,
    checkUpdateInterval: 3600000,
  }
  
  const settings: Partial<Settings> = { ...defaultSettings }
  rows.forEach((row) => {
    try {
      settings[row.key as keyof Settings] = JSON.parse(row.value)
    } catch (error) {
      console.error(`Failed to parse setting ${row.key}:`, error)
    }
  })
  
  // Ensure all required fields are present
  return {
    theme: settings.theme ?? defaultSettings.theme,
    language: settings.language ?? defaultSettings.language,
    startup: settings.startup ?? defaultSettings.startup,
    minimizeToTray: settings.minimizeToTray ?? defaultSettings.minimizeToTray,
    lockEnabled: settings.lockEnabled ?? defaultSettings.lockEnabled,
    lockTimeout: settings.lockTimeout ?? defaultSettings.lockTimeout,
    autoUpdate: settings.autoUpdate ?? defaultSettings.autoUpdate,
    checkUpdateInterval: settings.checkUpdateInterval ?? defaultSettings.checkUpdateInterval,
  }
})

// Helper function to update auto-start
function updateAutoStart(enabled: boolean): void {
  try {
    app.setLoginItemSettings({
      openAtLogin: enabled,
      openAsHidden: false, // Don't start hidden
      name: 'WTStation',
      path: process.execPath,
    })
    console.log(`[Settings] Auto-start ${enabled ? 'enabled' : 'disabled'}`)
  } catch (error) {
    console.error('[Settings] Failed to update auto-start:', error)
  }
}

ipcMain.handle(IPC_CHANNELS.SETTINGS_SET, async (_event, key: keyof Settings, value: any): Promise<void> => {
  const db = getDatabase()
  db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)').run(key, JSON.stringify(value))
  
  // Update auto-start if startup setting changed
  if (key === 'startup') {
    updateAutoStart(value as boolean)
  }
})

// Notification handler
ipcMain.handle(
  IPC_CHANNELS.NOTIFY_SHOW,
  async (_event, options: { title: string; body: string; badge?: number }): Promise<void> => {
    // Check if notifications are enabled in settings
    const db = getDatabase()
    const settingsRow = db.prepare('SELECT value FROM settings WHERE key = ?').get('notificationsEnabled') as { value: string } | undefined
    const notificationsEnabled = settingsRow ? JSON.parse(settingsRow.value) : true // Default to enabled
    
    if (!notificationsEnabled) {
      console.log('[IPC] Notifications are disabled in settings')
      return
    }
    
    if (Notification.isSupported()) {
      const notification = new Notification({
        title: options.title,
        body: options.body,
        silent: false,
      })
      notification.show()
    }
  }
)

// Update handlers
ipcMain.handle(IPC_CHANNELS.UPDATES_CHECK, async (): Promise<void> => {
  await autoUpdater.checkForUpdates()
})

ipcMain.handle(IPC_CHANNELS.UPDATES_APPLY, async (): Promise<void> => {
  autoUpdater.quitAndInstall()
})

// Window handlers
ipcMain.handle(IPC_CHANNELS.WINDOW_MINIMIZE, (event): void => {
  const win = BrowserWindow.fromWebContents(event.sender)
  win?.minimize()
})

ipcMain.handle(IPC_CHANNELS.WINDOW_MAXIMIZE, (event): void => {
  const win = BrowserWindow.fromWebContents(event.sender)
  if (win?.isMaximized()) {
    win.unmaximize()
  } else {
    win?.maximize()
  }
})

ipcMain.handle(IPC_CHANNELS.WINDOW_CLOSE, (event): void => {
  const win = BrowserWindow.fromWebContents(event.sender)
  win?.close()
})

ipcMain.handle('window:removeAllViews', (): void => {
  removeAllViewsFromWindow()
})

// Handle sidebar collapsed state change
ipcMain.on('renderer:sidebar-collapsed', (_event, collapsed: boolean) => {
  console.log(`[IPC] Sidebar collapsed state changed: ${collapsed}`)
  setSidebarCollapsed(collapsed)
})

// Listen for active view changes from renderer
ipcMain.on(IPC_CHANNELS.RENDERER_ACTIVE_VIEW_CHANGED, (_event, activeView: 'workspace' | 'settings' | null) => {
  console.log(`[IPC] Active view changed to: ${activeView}`)
  if (activeView === 'settings') {
    // Hide all BrowserViews when settings is activated (but preserve them!)
    console.log('[IPC] Settings activated, hiding all BrowserViews (preserving sessions).')
    hideAllViews()
    
    // Double-check after a delay
    setTimeout(() => {
      const { BrowserWindow } = require('electron')
      const windows = BrowserWindow.getAllWindows()
      if (windows.length > 0) {
        const remaining = windows[0].getBrowserViews()
        if (remaining && remaining.length > 0) {
          console.warn(`[IPC] Warning: ${remaining.length} views still attached, hiding again...`)
          hideAllViews()
        } else {
          console.log(`[IPC] Verified: All views hidden after delay`)
        }
      }
    }, 100)
  } else if (activeView === 'workspace') {
    // When switching back to workspace, existing views will be reused (no reload needed)
    console.log('[IPC] Workspace activated, existing views will be reused when attached.')
  }
})
