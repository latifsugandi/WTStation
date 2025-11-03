import { Minimize2, Maximize2, X } from 'lucide-react'

export default function TitleBar() {
  const handleMinimize = () => {
    window.electronAPI.window.minimize()
  }

  const handleMaximize = () => {
    window.electronAPI.window.maximize()
  }

  const handleClose = () => {
    window.electronAPI.window.close()
  }

  return (
    <div 
      className="titlebar flex items-center justify-between px-4" 
      style={{ 
        position: 'fixed', 
        top: 0,
        left: 0,
        right: 0,
        width: '100%',
        zIndex: 999999, 
        pointerEvents: 'auto'
      }}
    >
      <div className="flex items-center gap-2">
        <span className="font-semibold text-base text-gray-900 dark:text-gray-100">WTStation</span>
      </div>
      <div className="flex items-center" style={{ position: 'relative', zIndex: 1000000 }}>
        <button 
          className="titlebar-button" 
          onClick={handleMinimize} 
          aria-label="Minimize" 
          style={{ pointerEvents: 'auto', zIndex: 1000001 }}
        >
          <Minimize2 size={16} />
        </button>
        <button 
          className="titlebar-button" 
          onClick={handleMaximize} 
          aria-label="Maximize" 
          style={{ pointerEvents: 'auto', zIndex: 1000001 }}
        >
          <Maximize2 size={16} />
        </button>
        <button 
          className="titlebar-button" 
          onClick={handleClose} 
          aria-label="Close" 
          style={{ pointerEvents: 'auto', zIndex: 1000001 }}
        >
          <X size={16} />
        </button>
      </div>
    </div>
  )
}
