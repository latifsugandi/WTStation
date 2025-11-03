import { useState, useEffect } from 'react'
import { useStore } from '../store/store'
import { Trash2, MessageCircle, Send, MessageSquare, AlertTriangle } from 'lucide-react'
import type { Settings } from '@shared/types'

export default function SettingsView() {
  const { settings, loadSettings } = useStore()
  const [localSettings, setLocalSettings] = useState<Settings>(settings)
  const [activeTab, setActiveTab] = useState('general')

  useEffect(() => {
    // Load settings when component mounts (silently, no loading indicator)
    const initSettings = async () => {
      try {
        await loadSettings()
      } catch (error) {
        console.error('Failed to load settings:', error)
      }
    }
    initSettings()
  }, [loadSettings])

  useEffect(() => {
    setLocalSettings(settings)
  }, [settings])

  const handleSave = async (key: keyof Settings, value: any) => {
    try {
      await window.electronAPI.settings.set(key, value)
      const updatedSettings = { ...localSettings, [key]: value }
      setLocalSettings(updatedSettings)
      useStore.getState().setSettings(updatedSettings)
    } catch (error) {
      console.error('Failed to save setting:', error)
    }
  }

  const tabs = [
    { id: 'general', label: 'General' },
    { id: 'apps', label: 'Applications' },
    { id: 'templates', label: 'Templates' },
    { id: 'labels', label: 'Labels' },
    { id: 'network', label: 'Network' },
    { id: 'privacy', label: 'Privacy' },
    { id: 'updates', label: 'Updates' },
    { id: 'about', label: 'About' },
  ]

  // Use settings or fallback to defaults
  const defaultSettings: Settings = {
    theme: 'system',
    language: 'en',
    startup: false,
    minimizeToTray: true,
    notificationsEnabled: true,
    lockEnabled: false,
    lockTimeout: 300000,
    autoUpdate: true,
    checkUpdateInterval: 3600000,
  }
  
  const currentSettings: Settings = localSettings || settings || defaultSettings

  console.log('[SettingsView] Rendering settings view with currentSettings:', currentSettings)

  return (
    <div 
      className="flex-1 flex overflow-hidden bg-gray-50 dark:bg-gray-900" 
      style={{ 
        position: 'absolute',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'auto',
        zIndex: 999999,
        overflow: 'auto',
        display: 'flex',
        isolation: 'isolate'
      }}
    >
      <div className="w-64 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4" style={{ zIndex: 10000 }}>
        <h2 className="font-semibold text-lg mb-4 text-gray-900 dark:text-gray-100">Settings</h2>
        <div className="space-y-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`w-full text-left px-4 py-2 rounded-lg transition-colors ${
                activeTab === tab.id
                  ? 'bg-blue-50 dark:bg-blue-900/20 text-accent'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-8 bg-gray-50 dark:bg-gray-900" style={{ zIndex: 10000, minHeight: '400px' }}>
        {activeTab === 'general' && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold mb-4 text-gray-900 dark:text-gray-100">General Settings</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Theme</label>
                <select
                  value={currentSettings.theme}
                  onChange={(e) => handleSave('theme', e.target.value)}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl"
                >
                  <option value="light">Light</option>
                  <option value="dark">Dark</option>
                  <option value="system">System</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Language</label>
                <select
                  value={currentSettings.language}
                  onChange={(e) => handleSave('language', e.target.value)}
                  className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl"
                >
                  <option value="en">English</option>
                  <option value="id">Bahasa Indonesia</option>
                </select>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium">Start on system startup</label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Launch WTStation when your computer starts
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={currentSettings.startup}
                  onChange={(e) => handleSave('startup', e.target.checked)}
                  className="w-5 h-5"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium">Minimize to tray</label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Minimize to system tray instead of taskbar
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={currentSettings.minimizeToTray}
                  onChange={(e) => handleSave('minimizeToTray', e.target.checked)}
                  className="w-5 h-5"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium">Enable notifications</label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Show desktop notifications for new messages and updates
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={currentSettings.notificationsEnabled ?? true}
                  onChange={(e) => handleSave('notificationsEnabled', e.target.checked)}
                  className="w-5 h-5"
                />
              </div>
            </div>
          </div>
        )}

        {activeTab === 'privacy' && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold mb-4">Privacy & Security</h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium">Enable lock screen</label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Lock the app after inactivity
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={currentSettings.lockEnabled}
                  onChange={(e) => handleSave('lockEnabled', e.target.checked)}
                  className="w-5 h-5"
                />
              </div>

              {currentSettings.lockEnabled && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    Lock timeout (minutes)
                  </label>
                  <input
                    type="number"
                    value={currentSettings.lockTimeout / 60000}
                    onChange={(e) =>
                      handleSave('lockTimeout', parseInt(e.target.value) * 60000)
                    }
                    className="w-full px-4 py-2 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-xl"
                    min="1"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'updates' && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold mb-4">Updates</h3>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="block text-sm font-medium">Auto-update</label>
                  <p className="text-sm text-gray-500 dark:text-gray-400">
                    Automatically check for and install updates
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={currentSettings.autoUpdate}
                  onChange={(e) => handleSave('autoUpdate', e.target.checked)}
                  className="w-5 h-5"
                />
              </div>

              <button
                onClick={() => window.electronAPI.updates.check()}
                className="px-4 py-2 bg-accent text-white rounded-xl hover:bg-accent/90 transition-colors"
              >
                Check for updates
              </button>
            </div>
          </div>
        )}

        {activeTab === 'apps' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold">Applications</h3>
              {useStore.getState().workspaces.length > 0 && (
                <button
                  onClick={async () => {
                    const workspaces = useStore.getState().workspaces
                    const sessions = useStore.getState().sessions
                    
                    if (window.confirm(`Hapus semua ${workspaces.length} app? Tindakan ini tidak bisa dibatalkan.`)) {
                      try {
                        // Delete all workspaces
                        for (const workspace of workspaces) {
                          await window.electronAPI.workspaces.delete(workspace.id)
                        }
                        // Clear from store
                        useStore.getState().setWorkspaces([])
                        // Clear all sessions
                        sessions.forEach(session => {
                          useStore.getState().removeSession(session.id)
                        })
                        // Clear active selection
                        useStore.getState().setActiveWorkspace(null)
                        
                        alert('Semua app berhasil dihapus')
                      } catch (error) {
                        console.error('Failed to delete all workspaces:', error)
                        alert(`Gagal menghapus semua app: ${error instanceof Error ? error.message : 'Unknown error'}`)
                      }
                    }
                  }}
                  className="px-4 py-2 bg-red-500 text-white rounded-xl hover:bg-red-600 transition-colors flex items-center gap-2 text-sm"
                >
                  <Trash2 size={16} />
                  <span>Hapus Semua App</span>
                </button>
              )}
            </div>

            <div className="space-y-3">
              {useStore.getState().workspaces.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                  <p>Belum ada aplikasi yang ditambahkan</p>
                  <p className="text-sm mt-2">Klik "Add Apps" di sidebar untuk menambahkan aplikasi baru</p>
                </div>
              ) : (
                useStore.getState().workspaces.map((workspace) => {
                  const sessions = useStore.getState().sessions.filter(s => s.workspaceId === workspace.id)
                  const unreadCount = sessions.reduce((sum, s) => sum + s.unreadCount, 0)
                  
                  return (
                    <div
                      key={workspace.id}
                      className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        {workspace.icon ? (
                          <img 
                            src={workspace.icon} 
                            alt={workspace.name} 
                            className="w-6 h-6 rounded object-cover"
                          />
                        ) : workspace.type === 'whatsapp' ? (
                          <MessageCircle size={24} className="text-green-500" />
                        ) : workspace.type === 'telegram' ? (
                          <Send size={24} className="text-blue-400" />
                        ) : (
                          <MessageSquare size={24} />
                        )}
                        <div className="flex-1">
                          <div className="font-medium text-gray-900 dark:text-gray-100">
                            {workspace.name}
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400">
                            {workspace.type === 'whatsapp' ? 'WhatsApp' : workspace.type === 'telegram' ? 'Telegram' : 'Custom'}
                            {unreadCount > 0 && (
                              <span className="ml-2 text-accent">
                                • {unreadCount} unread
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-2">
                        <button
                          onClick={async () => {
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
                          }}
                          className="p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                          title="Hapus app"
                        >
                          <Trash2 size={18} />
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {useStore.getState().workspaces.length > 0 && (
              <div className="mt-6 p-4 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-xl">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={20} className="text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-800 dark:text-yellow-200">
                    <p className="font-medium mb-1">Peringatan</p>
                    <p>Menghapus app akan menghapus semua data, session, dan tab yang terkait dengan app tersebut. Tindakan ini tidak bisa dibatalkan.</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'about' && (
          <div className="space-y-6">
            <h3 className="text-xl font-semibold mb-4">About WTStation</h3>
            <div className="space-y-2">
              <p className="text-gray-600 dark:text-gray-400">
                Version: 1.0.0
              </p>
              <p className="text-gray-600 dark:text-gray-400">
                Dev by : Latief
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
