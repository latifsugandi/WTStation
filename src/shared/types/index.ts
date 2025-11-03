export type WorkspaceType = 'whatsapp' | 'telegram' | 'custom'

export interface Workspace {
  id: string
  name: string
  type: WorkspaceType
  color?: string
  icon?: string
  createdAt: number
  updatedAt: number
}

export interface Session {
  id: string
  workspaceId: string
  name: string
  partition: string
  status: 'disconnected' | 'connecting' | 'connected' | 'qr-pending'
  qrCode?: string
  unreadCount: number
  lastActiveAt: number
  createdAt: number
}

export interface Tab {
  id: string
  workspaceId: string
  sessionId?: string
  type: 'inbox' | 'chat' | 'broadcast' | 'settings' | 'templates' | 'labels'
  title: string
  url?: string
  chatId?: string
  active: boolean
  muted: boolean
  createdAt: number
}

export interface Template {
  id: string
  name: string
  content: string
  variables: string[]
  category?: string
  createdAt: number
  updatedAt: number
}

export interface Label {
  id: string
  name: string
  color: string
  createdAt: number
}

export interface ChatLabel {
  sessionId: string
  chatId: string
  labelIds: string[]
}

export interface ProxyConfig {
  type: 'http' | 'https' | 'socks4' | 'socks5'
  host: string
  port: number
  username?: string
  password?: string
}

export interface WorkspaceConfig {
  workspaceId: string
  proxy?: ProxyConfig
  autoReply?: boolean
  notifications?: boolean
}

export interface Settings {
  theme: 'light' | 'dark' | 'system'
  language: string
  startup: boolean
  minimizeToTray: boolean
  notificationsEnabled: boolean
  lockEnabled: boolean
  lockTimeout: number
  autoUpdate: boolean
  checkUpdateInterval: number
}

export interface CommandPaletteAction {
  id: string
  label: string
  icon?: string
  category: string
  action: () => void
  shortcut?: string
}
