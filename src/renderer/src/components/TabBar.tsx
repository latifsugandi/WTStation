import { X, Plus } from 'lucide-react'
import { useStore } from '../store/store'
import { motion } from 'framer-motion'

export default function TabBar() {
  const { 
    activeWorkspaceId, 
    activeTabId, 
    tabs, 
    setActiveTab, 
    removeTab,
    addTab 
  } = useStore()
  
  // Filter tabs for active workspace
  const workspaceTabs = activeWorkspaceId 
    ? tabs.filter(t => t.workspaceId === activeWorkspaceId)
    : []
  
  if (workspaceTabs.length === 0) {
    return null
  }
  
  // Sort tabs by createdAt (most recent first for ordering)
  const sortedTabs = [...workspaceTabs].sort((a, b) => {
    // Active tab should be first
    if (a.id === activeTabId) return -1
    if (b.id === activeTabId) return 1
    return b.createdAt - a.createdAt
  })

  const handleTabClick = (tabId: string) => {
    setActiveTab(tabId)
  }

  const handleCloseTab = (e: React.MouseEvent, tabId: string) => {
    e.stopPropagation()
    const tab = tabs.find(t => t.id === tabId)
    if (!tab) return
    
    // If closing active tab, switch to another tab or create new one
    if (tabId === activeTabId) {
      const otherTabs = sortedTabs.filter(t => t.id !== tabId)
      if (otherTabs.length > 0) {
        setActiveTab(otherTabs[0].id)
      } else if (activeWorkspaceId) {
        // Create new home tab if no tabs left
        const session = useStore.getState().sessions.find(s => s.workspaceId === activeWorkspaceId)
        if (session) {
          const newTab = {
            id: `tab-${Date.now()}`,
            workspaceId: activeWorkspaceId,
            sessionId: session.id,
            type: 'chat' as const,
            title: session.name,
            active: true,
            muted: false,
            createdAt: Date.now()
          }
          addTab(newTab)
          setActiveTab(newTab.id)
        }
      }
    }
    
    removeTab(tabId)
  }

  const handleNewTab = () => {
    if (!activeWorkspaceId) return
    
    const session = useStore.getState().sessions.find(s => s.workspaceId === activeWorkspaceId)
    if (!session) return
    
    const newTab = {
      id: `tab-${Date.now()}`,
      workspaceId: activeWorkspaceId,
      sessionId: session.id,
      type: 'chat' as const,
      title: `${session.name} (${workspaceTabs.length + 1})`,
      active: true,
      muted: false,
      createdAt: Date.now()
    }
    
    // Deactivate current active tab
    if (activeTabId) {
      const currentTab = tabs.find(t => t.id === activeTabId)
      if (currentTab) {
        useStore.getState().updateTab({ ...currentTab, active: false })
      }
    }
    
    addTab(newTab)
    setActiveTab(newTab.id)
  }

  return (
    <div className="flex items-center bg-gray-100 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 overflow-x-auto">
      <div className="flex items-center flex-1 min-w-0">
        {sortedTabs.map((tab) => {
          const isActive = tab.id === activeTabId
          
          return (
            <motion.div
              key={tab.id}
              onClick={() => handleTabClick(tab.id)}
              className={`
                flex items-center gap-2 px-4 py-2 min-w-[200px] max-w-[300px]
                border-r border-gray-200 dark:border-gray-700
                cursor-pointer transition-colors relative group
                ${isActive 
                  ? 'bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100' 
                  : 'bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800'
                }
              `}
              whileHover={{ backgroundColor: isActive ? undefined : 'rgba(0,0,0,0.05)' }}
              whileTap={{ scale: 0.98 }}
            >
              <span className="truncate text-sm font-medium flex-1">
                {tab.title}
              </span>
              
              {tab.muted && (
                <span className="text-xs text-gray-400">🔇</span>
              )}
              
              <button
                onClick={(e) => handleCloseTab(e, tab.id)}
                className={`
                  opacity-0 group-hover:opacity-100 transition-opacity
                  p-1 rounded hover:bg-red-100 dark:hover:bg-red-900/20
                  text-gray-400 hover:text-red-600 dark:hover:text-red-400
                `}
                title="Close tab"
              >
                <X size={14} />
              </button>
              
              {isActive && (
                <motion.div
                  layoutId="activeTabIndicator"
                  className="absolute bottom-0 left-0 right-0 h-0.5 bg-accent"
                  initial={false}
                />
              )}
            </motion.div>
          )
        })}
      </div>
      
      {/* New Tab Button */}
      <button
        onClick={handleNewTab}
        className="px-3 py-2 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        title="New tab"
      >
        <Plus size={16} />
      </button>
    </div>
  )
}
