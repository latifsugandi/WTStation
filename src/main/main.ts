import { app, BrowserWindow, Tray, Menu, nativeTheme, shell } from 'electron'
import { join } from 'path'
import { existsSync } from 'fs'
import updater from 'electron-updater'
const { autoUpdater } = updater
import { initDatabase, closeDatabase } from './database'
import './ipc-handlers'
import { sessionManager } from './session-manager'
import { setMainWindow, attachSessionView, detachSessionView, updateViewBounds, initializeAllViews } from './window-manager'
import type { Settings } from '@shared/types'
import { IPC_CHANNELS } from '@shared/utils/constants'

let mainWindow: BrowserWindow | null = null
let tray: Tray | null = null
let isLocked = false

const isDev = process.env.NODE_ENV === 'development'

function createWindow(): void {
  // Set application icon
  const iconPath = join(__dirname, '../../assets/logo.png')
  const fallbackIconPath = join(__dirname, '../../assets/icon.png')
  
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 800,
    minHeight: 600,
    titleBarStyle: 'hidden',
    frame: false,
    show: false,
    backgroundColor: '#000000',
    icon: existsSync(iconPath) ? iconPath : (existsSync(fallbackIconPath) ? fallbackIconPath : undefined),
    webPreferences: {
      preload: join(__dirname, isDev 
        ? '../preload/preload.js' 
        : (process.env.ELECTRON_IS_DEV ? '../preload/preload.js' : '../preload/preload.mjs')),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false, // Disable sandbox untuk preload bisa akses electron APIs
      webSecurity: true,
    },
  })

  // Load the app
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173')
    mainWindow.webContents.openDevTools()
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
    mainWindow?.focus()
    if (mainWindow) {
      setMainWindow(mainWindow)
      // Initialize all views after window is ready
      setTimeout(() => {
        initializeAllViews()
      }, 500)
    }
  })

  let safetyInterval: NodeJS.Timeout | null = null

  mainWindow.on('closed', () => {
    mainWindow = null
    // Clear any intervals
    if (safetyInterval) {
      clearInterval(safetyInterval)
      safetyInterval = null
    }
  })

  mainWindow.on('resize', () => {
    updateViewBounds()
  })

  // Safety: Ensure BrowserViews don't block window controls
  // Periodically check and DESTROY views if they're covering important UI
  safetyInterval = setInterval(() => {
    if (mainWindow) {
      const views = mainWindow.getBrowserViews()
      // If there are views, check renderer state
      if (views.length > 0) {
        mainWindow.webContents.executeJavaScript(`
          (() => {
            return window.__wtstationActiveView || null;
          })()
        `).then((activeView) => {
          // If settings is active but views are still attached, FORCE DESTROY
          if (activeView === 'settings' && views.length > 0) {
            console.error('[Main] CRITICAL SAFETY: Settings active but views still exist! DESTROYING...')
            const { removeAllViewsFromWindow } = require('./window-manager')
            removeAllViewsFromWindow()
          }
        }).catch(() => {})
      }
    } else {
      if (safetyInterval) {
        clearInterval(safetyInterval)
        safetyInterval = null
      }
    }
  }, 200) // Check more frequently: every 200ms

  // Handle external links
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })
}

function createTray(): void {
  // Use logo.png for tray icon
  const iconPath = join(__dirname, '../../assets/logo.png')
  const fallbackPath = join(__dirname, '../../assets/icon.png')
  const fallbackIco = join(__dirname, '../../assets/icon.ico')

  // Try assets/logo.png first, then fallback to other assets
  let trayIconPath = iconPath
  if (!existsSync(trayIconPath)) {
    trayIconPath = existsSync(fallbackPath) ? fallbackPath : fallbackIco
  }
  
  tray = new Tray(trayIconPath)
  
  const contextMenu = Menu.buildFromTemplate([
    {
      label: 'Show WTStation',
      click: () => {
        if (mainWindow) {
          mainWindow.show()
          mainWindow.focus()
        }
      },
    },
    {
      label: 'Quit',
      click: () => {
        app.quit()
      },
    },
  ])
  
  tray.setContextMenu(contextMenu)
  tray.setToolTip('WTStation - WhatsApp Multi-Account Manager')
  
  tray.on('click', () => {
    if (mainWindow) {
      if (mainWindow.isVisible()) {
        mainWindow.hide()
      } else {
        mainWindow.show()
        mainWindow.focus()
      }
    }
  })
}

async function setupAutoUpdater(): Promise<void> {
  if (isDev) return

  autoUpdater.checkForUpdatesAndNotify()
  
  autoUpdater.on('update-available', () => {
    if (mainWindow) {
      mainWindow.webContents.send('update-available')
    }
  })
  
  autoUpdater.on('update-downloaded', () => {
    if (mainWindow) {
      mainWindow.webContents.send('update-downloaded')
    }
  })
}

async function loadSettings(): Promise<Settings> {
  // Settings will be loaded via IPC from renderer
  // This is just a placeholder for initialization
  return {
    theme: 'system',
    language: 'en',
    startup: false,
    minimizeToTray: true,
    lockEnabled: false,
    lockTimeout: 300000,
    autoUpdate: true,
    checkUpdateInterval: 3600000,
  }
}

app.whenReady().then(async () => {
  // Initialize database
  initDatabase()
  
  // Create window
  createWindow()
  
  // Create tray
  if (process.platform !== 'darwin') {
    createTray()
  }
  
  // Setup auto-updater
  if (!isDev) {
    await setupAutoUpdater()
  }
  
  // Load settings and apply theme
  const settings = await loadSettings()
  if (settings.theme === 'system') {
    nativeTheme.themeSource = 'system'
  } else {
    nativeTheme.themeSource = settings.theme
  }
  
  // Apply auto-start setting
  if (settings.startup) {
    app.setLoginItemSettings({
      openAtLogin: true,
      openAsHidden: false,
      name: 'WTStation',
      path: process.execPath,
    })
    console.log('[Main] Auto-start enabled on app startup')
  } else {
    app.setLoginItemSettings({
      openAtLogin: false,
    })
    console.log('[Main] Auto-start disabled on app startup')
  }
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    } else {
      mainWindow?.show()
      mainWindow?.focus()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    closeDatabase()
    app.quit()
  }
})

app.on('before-quit', () => {
  closeDatabase()
})

// Security: Prevent new window creation
app.on('web-contents-created', (_event, contents) => {
  contents.on('new-window', (event, navigationUrl) => {
    event.preventDefault()
    shell.openExternal(navigationUrl)
  })
})
