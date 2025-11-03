import { BrowserView, session, shell } from 'electron'
import type { Session as SessionType, WorkspaceType } from '@shared/types'
import { WHATSAPP_WEB_URL, PARTITION_PREFIX } from '@shared/utils/constants'

const TELEGRAM_WEB_URL = 'https://web.telegram.org'

export class SessionManager {
  private sessions: Map<string, BrowserView> = new Map()
  private sessionData: Map<string, SessionType> = new Map()

  createSession(partition: string, sessionData: SessionType, workspaceType: WorkspaceType = 'whatsapp'): BrowserView {
    // Use persistent partition to save cookies and session data
    const sess = session.fromPartition(partition, { cache: true })
    
    const view = new BrowserView({
      webPreferences: {
        partition,
        nodeIntegration: false,
        contextIsolation: true,
        sandbox: false,
        webSecurity: true,
      },
    })

    view.setAutoResize({ width: true, height: true })
    
    // Set a modern User-Agent string to avoid WhatsApp Web browser compatibility issues
    // Electron 28 uses Chromium 120, so we use Chrome 120 User-Agent
    const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    view.webContents.setUserAgent(userAgent)
    
    // Load URL based on workspace type
    const url = workspaceType === 'telegram' ? TELEGRAM_WEB_URL : WHATSAPP_WEB_URL
    
    // Inject CSS to hide tab bar and loading indicators from WhatsApp Web
    view.webContents.on('did-finish-load', () => {
      if (workspaceType === 'whatsapp') {
        // Hide WhatsApp Web's native tab bar and loading indicators
        view.webContents.insertCSS(`
          /* Hide WhatsApp Web's tab bar */
          header[role="banner"],
          div[role="tablist"],
          nav[role="navigation"],
          /* Hide loading spinner */
          ._1Ra05,
          ._2kHpK,
          div[data-testid="chatlist-loading"],
          div[data-testid="spinner"],
          /* Hide any loading overlays */
          [aria-label*="loading"],
          [aria-label*="Loading"],
          /* Hide WhatsApp loading screen */
          .landing-wrapper,
          #app > div > div:first-child:has(img[alt*="WhatsApp"]),
          /* Hide browser-like elements */
          div[role="tab"],
          button[aria-label*="tab"] {
            display: none !important;
            visibility: hidden !important;
            opacity: 0 !important;
            height: 0 !important;
            overflow: hidden !important;
          }
          
          /* Ensure main content takes full space */
          #app {
            height: 100vh !important;
            overflow: hidden !important;
          }
          
          /* Hide any loading messages */
          span:contains("memuat"),
          div:contains("Memuat"),
          span:contains("Loading") {
            display: none !important;
          }
        `).catch((err) => {
          console.error('Failed to inject CSS:', err)
        })
      }
    })
    
    view.webContents.loadURL(url)

    // Monitor connection status
    view.webContents.on('did-finish-load', () => {
      this.updateSessionStatus(sessionData.id, 'connected')
    })

    view.webContents.on('did-fail-load', () => {
      this.updateSessionStatus(sessionData.id, 'disconnected')
    })

    // Handle new window requests (e.g., external links should open in default browser)
    view.webContents.setWindowOpenHandler(({ url }) => {
      shell.openExternal(url)
      return { action: 'deny' }
    })

    // Check for QR code (only for WhatsApp)
    if (workspaceType === 'whatsapp') {
      view.webContents.on('dom-ready', () => {
        this.checkQRCode(view, sessionData.id)
      })
    }

    this.sessions.set(sessionData.id, view)
    this.sessionData.set(sessionData.id, sessionData)

    return view
  }

  getSession(sessionId: string): BrowserView | undefined {
    return this.sessions.get(sessionId)
  }

  getSessionData(sessionId: string): SessionType | undefined {
    return this.sessionData.get(sessionId)
  }

  removeSession(sessionId: string): void {
    const view = this.sessions.get(sessionId)
    if (view) {
      try {
        // First, destroy webContents if not already destroyed
        if (!view.webContents.isDestroyed()) {
          view.webContents.destroy()
        }
      } catch (error) {
        console.error(`[SessionManager] Error destroying webContents for session ${sessionId}:`, error)
      }
      this.sessions.delete(sessionId)
      this.sessionData.delete(sessionId)
    }
  }
  
  // Recreate session view if it was destroyed (e.g., after settings was closed)
  recreateSessionIfNeeded(sessionId: string, workspaceType: WorkspaceType = 'whatsapp'): BrowserView | null {
    const sessionData = this.sessionData.get(sessionId)
    if (!sessionData) {
      console.log(`[SessionManager] Cannot recreate: session data not found for ${sessionId}`)
      return null
    }
    
    const existingView = this.sessions.get(sessionId)
    if (existingView) {
      // Check if view is still valid
      try {
        if (!existingView.webContents.isDestroyed()) {
          // View still exists and is valid
          console.log(`[SessionManager] View for session ${sessionId} is still valid`)
          return existingView
        } else {
          console.log(`[SessionManager] View for session ${sessionId} was destroyed, removing from map`)
          // Remove destroyed view from map
          this.sessions.delete(sessionId)
        }
      } catch (error) {
        console.error(`[SessionManager] Error checking view for session ${sessionId}:`, error)
        // Remove invalid view from map
        this.sessions.delete(sessionId)
      }
    }
    
    // Need to recreate
    console.log(`[SessionManager] Recreating BrowserView for session ${sessionId}`)
    try {
      const newView = this.createSession(sessionData.partition, sessionData, workspaceType)
      return newView
    } catch (error) {
      console.error(`[SessionManager] Failed to recreate view for session ${sessionId}:`, error)
      return null
    }
  }

  updateSessionStatus(sessionId: string, status: SessionType['status']): void {
    const data = this.sessionData.get(sessionId)
    if (data) {
      data.status = status
      this.sessionData.set(sessionId, data)
    }
  }

  private async checkQRCode(view: BrowserView, sessionId: string): Promise<void> {
    try {
      const qrScript = `
        (() => {
          const qrElement = document.querySelector('canvas, img[alt*="QR"]');
          if (qrElement) {
            return qrElement.src || qrElement.toDataURL?.();
          }
          return null;
        })();
      `
      
      const qrCode = await view.webContents.executeJavaScript(qrScript)
      if (qrCode) {
        const data = this.sessionData.get(sessionId)
        if (data) {
          data.qrCode = qrCode
          data.status = 'qr-pending'
          this.sessionData.set(sessionId, data)
        }
      }
    } catch (error) {
      console.error('Error checking QR code:', error)
    }
  }

  getAllSessions(): SessionType[] {
    return Array.from(this.sessionData.values())
  }

  getSessionsByWorkspace(workspaceId: string): SessionType[] {
    return Array.from(this.sessionData.values()).filter(
      (s) => s.workspaceId === workspaceId
    )
  }
}

export const sessionManager = new SessionManager()
