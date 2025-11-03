import { contextBridge, ipcRenderer } from 'electron'
import type {
  Workspace,
  Session,
  Template,
  Label,
  ChatLabel,
  Settings,
} from '@shared/types'
import { IPC_CHANNELS } from '@shared/utils/constants'

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electronAPI', {
  // Workspaces
  workspaces: {
    list: (): Promise<Workspace[]> => ipcRenderer.invoke(IPC_CHANNELS.WORKSPACES_LIST),
    add: (workspace: Omit<Workspace, 'id' | 'createdAt' | 'updatedAt'>): Promise<Workspace> =>
      ipcRenderer.invoke(IPC_CHANNELS.WORKSPACES_ADD, workspace),
    update: (workspace: Partial<Workspace> & { id: string }): Promise<Workspace> =>
      ipcRenderer.invoke(IPC_CHANNELS.WORKSPACES_UPDATE, workspace),
    delete: (workspaceId: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.WORKSPACES_DELETE, workspaceId),
  },

  // Sessions
  sessions: {
    list: (): Promise<Session[]> => ipcRenderer.invoke(IPC_CHANNELS.SESSIONS_LIST),
    add: (sessionData: Omit<Session, 'id' | 'partition' | 'createdAt' | 'status' | 'unreadCount'>): Promise<Session> =>
      ipcRenderer.invoke(IPC_CHANNELS.SESSIONS_ADD, sessionData),
    remove: (sessionId: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.SESSIONS_REMOVE, sessionId),
    getQR: (sessionId: string): Promise<string | null> =>
      ipcRenderer.invoke(IPC_CHANNELS.SESSIONS_GET_QR, sessionId),
    getStatus: (sessionId: string): Promise<Session['status']> =>
      ipcRenderer.invoke(IPC_CHANNELS.SESSIONS_STATUS, sessionId),
    updateLastActive: (sessionId: string): Promise<void> =>
      ipcRenderer.invoke('sessions:updateLastActive', sessionId),
  },

  // Templates
  templates: {
    list: (): Promise<Template[]> => ipcRenderer.invoke(IPC_CHANNELS.TEMPLATES_LIST),
    save: (template: Omit<Template, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }): Promise<Template> =>
      ipcRenderer.invoke(IPC_CHANNELS.TEMPLATES_SAVE, template),
    delete: (templateId: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.TEMPLATES_DELETE, templateId),
  },

  // Labels
  labels: {
    list: (): Promise<Label[]> => ipcRenderer.invoke(IPC_CHANNELS.LABELS_LIST),
    save: (label: Omit<Label, 'id' | 'createdAt'> & { id?: string }): Promise<Label> =>
      ipcRenderer.invoke(IPC_CHANNELS.LABELS_SAVE, label),
    delete: (labelId: string): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.LABELS_DELETE, labelId),
    attach: (chatLabel: ChatLabel): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.LABELS_ATTACH, chatLabel),
  },

  // Settings
  settings: {
    get: (): Promise<Settings> => ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_GET),
    set: (key: keyof Settings, value: any): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.SETTINGS_SET, key, value),
  },

  // Notifications
  notify: {
    show: (options: { title: string; body: string; badge?: number }): Promise<void> =>
      ipcRenderer.invoke(IPC_CHANNELS.NOTIFY_SHOW, options),
  },

  // Updates
  updates: {
    check: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.UPDATES_CHECK),
    apply: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.UPDATES_APPLY),
  },

  // Window
  window: {
    minimize: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_MINIMIZE),
    maximize: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_MAXIMIZE),
    close: (): Promise<void> => ipcRenderer.invoke(IPC_CHANNELS.WINDOW_CLOSE),
    removeAllViews: (): Promise<void> => ipcRenderer.invoke('window:removeAllViews'),
  },

  // Session view
  sessionView: {
    attach: (sessionId: string): Promise<void> => ipcRenderer.invoke('session:attach', sessionId),
    detach: (sessionId: string): Promise<void> => ipcRenderer.invoke('session:detach', sessionId),
  },

  // IPC send (for one-way messages to main process)
  send: (channel: string, ...args: any[]) => {
    ipcRenderer.send(channel, ...args)
  },

  // Events
  on: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.on(channel, (_event, ...args) => callback(...args))
  },
  
  off: (channel: string, callback: (...args: any[]) => void) => {
    ipcRenderer.removeListener(channel, callback)
  },
})

// Type declaration for TypeScript
declare global {
  interface Window {
    electronAPI: {
      workspaces: {
        list: () => Promise<Workspace[]>
        add: (workspace: Omit<Workspace, 'id' | 'createdAt' | 'updatedAt'>) => Promise<Workspace>
        update: (workspace: Partial<Workspace> & { id: string }) => Promise<Workspace>
        delete: (workspaceId: string) => Promise<void>
      }
      sessions: {
        list: () => Promise<Session[]>
        add: (sessionData: Omit<Session, 'id' | 'partition' | 'createdAt' | 'status' | 'unreadCount'>) => Promise<Session>
        remove: (sessionId: string) => Promise<void>
        getQR: (sessionId: string) => Promise<string | null>
        getStatus: (sessionId: string) => Promise<Session['status']>
        updateLastActive: (sessionId: string) => Promise<void>
      }
      templates: {
        list: () => Promise<Template[]>
        save: (template: Omit<Template, 'id' | 'createdAt' | 'updatedAt'> & { id?: string }) => Promise<Template>
        delete: (templateId: string) => Promise<void>
      }
      labels: {
        list: () => Promise<Label[]>
        save: (label: Omit<Label, 'id' | 'createdAt'> & { id?: string }) => Promise<Label>
        delete: (labelId: string) => Promise<void>
        attach: (chatLabel: ChatLabel) => Promise<void>
      }
      settings: {
        get: () => Promise<Settings>
        set: (key: keyof Settings, value: any) => Promise<void>
      }
      notify: {
        show: (options: { title: string; body: string; badge?: number }) => Promise<void>
      }
      updates: {
        check: () => Promise<void>
        apply: () => Promise<void>
      }
      window: {
        minimize: () => Promise<void>
        maximize: () => Promise<void>
        close: () => Promise<void>
        removeAllViews: () => Promise<void>
      }
      sessionView: {
        attach: (sessionId: string) => Promise<void>
        detach: (sessionId: string) => Promise<void>
      }
      send: (channel: string, ...args: any[]) => void
      on: (channel: string, callback: (...args: any[]) => void) => void
      off: (channel: string, callback: (...args: any[]) => void) => void
    }
  }
}
