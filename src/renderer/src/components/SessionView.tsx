import { useEffect } from 'react'
import { useStore } from '../store/store'

interface SessionViewProps {
  sessionId?: string
}

export default function SessionView({ sessionId }: SessionViewProps) {
  const { sessions } = useStore()

  useEffect(() => {
    if (sessionId) {
      // Attach session view (will show it, others will be hidden)
      window.electronAPI.sessionView.attach(sessionId)
      // Don't detach on cleanup - keep it mounted but hidden to prevent reload
      // The attachSessionView will handle hiding previous active session
      return () => {
        // No-op: keep view mounted to prevent reload
      }
    }
  }, [sessionId])

  // No loading indicators, just show empty div - BrowserView will handle the display
  return (
    <div className="flex-1 bg-gray-50 dark:bg-gray-900" />
  )
}
