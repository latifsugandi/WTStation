export const WHATSAPP_WEB_URL = 'https://web.whatsapp.com'
export const TELEGRAM_WEB_URL = 'https://web.telegram.org'

export const PARTITION_PREFIX = 'persist:wa'

export const STORAGE_PATHS = {
  USER_DATA: 'userData',
  DATABASE: 'database.sqlite',
  COOKIES: 'cookies',
  SESSIONS: 'sessions',
} as const

export const IPC_CHANNELS = {
  // Workspaces
  WORKSPACES_LIST: 'workspaces:list',
  WORKSPACES_ADD: 'workspaces:add',
  WORKSPACES_UPDATE: 'workspaces:update',
  WORKSPACES_DELETE: 'workspaces:delete',
  
  // Sessions
  SESSIONS_LIST: 'sessions:list',
  SESSIONS_ADD: 'sessions:add',
  SESSIONS_REMOVE: 'sessions:remove',
  SESSIONS_GET_QR: 'sessions:get-qr',
  SESSIONS_STATUS: 'sessions:status',
  
  // Tabs
  TABS_LIST: 'tabs:list',
  TABS_ADD: 'tabs:add',
  TABS_REMOVE: 'tabs:remove',
  TABS_UPDATE: 'tabs:update',
  TABS_ACTIVATE: 'tabs:activate',
  
  // Templates
  TEMPLATES_LIST: 'templates:list',
  TEMPLATES_SAVE: 'templates:save',
  TEMPLATES_DELETE: 'templates:delete',
  
  // Labels
  LABELS_LIST: 'labels:list',
  LABELS_SAVE: 'labels:save',
  LABELS_DELETE: 'labels:delete',
  LABELS_ATTACH: 'labels:attach',
  
  // Settings
  SETTINGS_GET: 'settings:get',
  SETTINGS_SET: 'settings:set',
  
  // Notifications
  NOTIFY_SHOW: 'notify:show',
  
  // Updates
  UPDATES_CHECK: 'updates:check',
  UPDATES_APPLY: 'updates:apply',
  
  // Window
  WINDOW_MINIMIZE: 'window:minimize',
  WINDOW_MAXIMIZE: 'window:maximize',
  WINDOW_CLOSE: 'window:close',
  
  // Security
  SECURITY_LOCK: 'security:lock',
  SECURITY_UNLOCK: 'security:unlock',
  
  // Renderer events (sent from renderer to main)
  RENDERER_ACTIVE_VIEW_CHANGED: 'renderer:active-view-changed',
} as const
