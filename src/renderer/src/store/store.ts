import { create } from 'zustand'
import type { Workspace, Session, Template, Label, Settings, Tab } from '@shared/types'

interface AppState {
  // Data
  workspaces: Workspace[]
  sessions: Session[]
  templates: Template[]
  labels: Label[]
  tabs: Tab[]
  settings: Settings
  activeWorkspaceId: string | null
  activeTabId: string | null
  activeView: 'workspace' | 'settings' | null
  isLocked: boolean
  commandPaletteOpen: boolean
  sidebarCollapsed: boolean

  // Actions
  setWorkspaces: (workspaces: Workspace[]) => void
  addWorkspace: (workspace: Workspace) => void
  updateWorkspace: (workspace: Workspace) => void
  removeWorkspace: (workspaceId: string) => void
  setSessions: (sessions: Session[]) => void
  addSession: (session: Session) => void
  updateSession: (session: Session) => void
  removeSession: (sessionId: string) => void
  setTemplates: (templates: Template[]) => void
  addTemplate: (template: Template) => void
  updateTemplate: (template: Template) => void
  removeTemplate: (templateId: string) => void
  setLabels: (labels: Label[]) => void
  addLabel: (label: Label) => void
  updateLabel: (label: Label) => void
  removeLabel: (labelId: string) => void
  setTabs: (tabs: Tab[]) => void
  addTab: (tab: Tab) => void
  updateTab: (tab: Tab) => void
  removeTab: (tabId: string) => void
  setActiveTab: (tabId: string) => void
  setActiveWorkspace: (workspaceId: string | null) => void
  setActiveView: (view: 'workspace' | 'settings' | null) => void
  setSettings: (settings: Settings) => void
  loadSettings: () => Promise<void>
  setLocked: (locked: boolean) => void
  setCommandPaletteOpen: (open: boolean) => void
  setSidebarCollapsed: (collapsed: boolean) => void
  restoreState: () => void
}

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

export const useStore = create<AppState>((set, get) => ({
  workspaces: [],
  sessions: [],
  templates: [],
  labels: [],
  tabs: [],
  settings: defaultSettings,
  activeWorkspaceId: null,
  activeTabId: null,
  activeView: null,
  isLocked: false,
  commandPaletteOpen: false,
  sidebarCollapsed: false,

  setWorkspaces: (workspaces) => set({ workspaces }),
  addWorkspace: (workspace) => set((state) => ({ workspaces: [...state.workspaces, workspace] })),
  updateWorkspace: (workspace) =>
    set((state) => ({
      workspaces: state.workspaces.map((w) => (w.id === workspace.id ? workspace : w)),
    })),
  removeWorkspace: (workspaceId) =>
    set((state) => ({
      workspaces: state.workspaces.filter((w) => w.id !== workspaceId),
      sessions: state.sessions.filter((s) => s.workspaceId !== workspaceId),
    })),

  setSessions: (sessions) => set({ sessions }),
  addSession: (session) => set((state) => ({ sessions: [...state.sessions, session] })),
  updateSession: (session) =>
    set((state) => ({
      sessions: state.sessions.map((s) => (s.id === session.id ? session : s)),
    })),
  removeSession: (sessionId) =>
    set((state) => ({
      sessions: state.sessions.filter((s) => s.id !== sessionId),
      tabs: state.tabs.filter((t) => t.sessionId !== sessionId),
    })),

  setTemplates: (templates) => set({ templates }),
  addTemplate: (template) => set((state) => ({ templates: [...state.templates, template] })),
  updateTemplate: (template) =>
    set((state) => ({
      templates: state.templates.map((t) => (t.id === template.id ? template : t)),
    })),
  removeTemplate: (templateId) =>
    set((state) => ({
      templates: state.templates.filter((t) => t.id !== templateId),
    })),

  setLabels: (labels) => set({ labels }),
  addLabel: (label) => set((state) => ({ labels: [...state.labels, label] })),
  updateLabel: (label) =>
    set((state) => ({
      labels: state.labels.map((l) => (l.id === label.id ? label : l)),
    })),
  removeLabel: (labelId) =>
    set((state) => ({
      labels: state.labels.filter((l) => l.id !== labelId),
    })),

  setTabs: (tabs) => set({ tabs }),
  addTab: (tab) =>
    set((state) => {
      const updatedTabs = state.tabs.map((t) => ({ ...t, active: false }))
      return { tabs: [...updatedTabs, { ...tab, active: true }], activeTabId: tab.id }
    }),
  updateTab: (tab) =>
    set((state) => ({
      tabs: state.tabs.map((t) => (t.id === tab.id ? tab : t)),
    })),
  removeTab: (tabId) =>
    set((state) => {
      const remainingTabs = state.tabs.filter((t) => t.id !== tabId)
      const activeTab = remainingTabs[0]
      if (activeTab) {
        activeTab.active = true
      }
      return {
        tabs: remainingTabs,
        activeTabId: activeTab?.id || null,
      }
    }),
  setActiveTab: (tabId) =>
    set((state) => {
      // Deactivate all other tabs in the same workspace
      const workspaceId = state.tabs.find(t => t.id === tabId)?.workspaceId
      return {
        tabs: state.tabs.map((t) => ({ 
          ...t, 
          active: t.id === tabId || (workspaceId && t.workspaceId !== workspaceId ? t.active : false)
        })),
        activeTabId: tabId,
      }
    }),
  setActiveWorkspace: (workspaceId) => {
    const currentView = get().activeView
    // Only change activeView to 'workspace' if we're not already in settings
    const newView = workspaceId 
      ? (currentView === 'settings' ? currentView : 'workspace')
      : (currentView === 'settings' ? currentView : null)
    
    // Persist to localStorage
    if (typeof window !== 'undefined') {
      try {
        if (workspaceId) {
          localStorage.setItem('wtstation_lastWorkspaceId', workspaceId)
          localStorage.setItem('wtstation_lastActiveView', newView || 'workspace')
          
          // Update lastActiveAt in database for the session
          if (window.electronAPI?.sessions?.updateLastActive) {
            const session = get().sessions.find(s => s.workspaceId === workspaceId)
            if (session) {
              window.electronAPI.sessions.updateLastActive(session.id).catch((err: any) => {
                console.error('Failed to update lastActiveAt:', err)
              })
            }
          }
        } else {
          localStorage.removeItem('wtstation_lastWorkspaceId')
        }
      } catch (error) {
        console.error('Failed to save active workspace to localStorage:', error)
      }
    }
    
    return set({ 
      activeWorkspaceId: workspaceId,
      activeView: newView
    })
  },
  setActiveView: (view) => {
    // Store in window for main process to access if needed
    if (typeof window !== 'undefined') {
      (window as any).__wtstationActiveView = view
      // Send IPC message to main process immediately
      if (window.electronAPI?.send) {
        try {
          window.electronAPI.send('renderer:active-view-changed', view)
          console.log(`[Store] Sent active view change to main process: ${view}`)
        } catch (error) {
          console.error('[Store] Failed to send active view change:', error)
        }
      }
      
      // Persist to localStorage
      try {
        if (view) {
          localStorage.setItem('wtstation_lastActiveView', view)
        } else {
          localStorage.removeItem('wtstation_lastActiveView')
        }
      } catch (error) {
        console.error('Failed to save active view to localStorage:', error)
      }
    }
    return set({ 
      activeView: view,
      activeWorkspaceId: view === 'settings' ? null : (view === 'workspace' ? get().activeWorkspaceId : null)
    })
  },

  setSettings: (settings) => set({ settings }),
  loadSettings: async () => {
    try {
      const settings = await window.electronAPI.settings.get()
      set({ settings })
    } catch (error) {
      console.error('Failed to load settings:', error)
    }
  },
  setLocked: (locked) => set({ isLocked: locked }),
  setCommandPaletteOpen: (open) => set({ commandPaletteOpen: open }),
  setSidebarCollapsed: (collapsed) => {
    // Notify main process about sidebar state change
    if (typeof window !== 'undefined' && window.electronAPI?.send) {
      try {
        window.electronAPI.send('renderer:sidebar-collapsed', collapsed)
      } catch (error) {
        console.error('[Store] Failed to send sidebar collapsed state:', error)
      }
    }
    
    // Persist to localStorage
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem('wtstation_sidebarCollapsed', collapsed ? 'true' : 'false')
      } catch (error) {
        console.error('Failed to save sidebar state to localStorage:', error)
      }
    }
    
    return set({ sidebarCollapsed: collapsed })
  },
  
  // Restore state from localStorage
  restoreState: () => {
    if (typeof window === 'undefined') return
    
    try {
      const lastWorkspaceId = localStorage.getItem('wtstation_lastWorkspaceId')
      const lastActiveView = localStorage.getItem('wtstation_lastActiveView') as 'workspace' | 'settings' | null
      const sidebarCollapsed = localStorage.getItem('wtstation_sidebarCollapsed') === 'true'
      
      const state: Partial<AppState> = {}
      
      if (sidebarCollapsed !== undefined) {
        state.sidebarCollapsed = sidebarCollapsed
      }
      
      if (lastWorkspaceId) {
        state.activeWorkspaceId = lastWorkspaceId
      }
      
      if (lastActiveView) {
        state.activeView = lastActiveView
      } else if (lastWorkspaceId) {
        state.activeView = 'workspace'
      }
      
      if (Object.keys(state).length > 0) {
        set(state)
      }
    } catch (error) {
      console.error('Failed to restore state from localStorage:', error)
    }
  },
}))

export const useWorkspaces = () => useStore((state) => state.workspaces)
export const useSessions = () => useStore((state) => state.sessions)
export const useTemplates = () => useStore((state) => state.templates)
export const useLabels = () => useStore((state) => state.labels)
export const useTabs = () => useStore((state) => state.tabs)
export const useSettings = () => useStore((state) => state.settings)
