import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Edit2, Trash2 } from 'lucide-react'

interface ContextMenuProps {
  isOpen: boolean
  x: number
  y: number
  onClose: () => void
  onEdit: () => void
  onDelete: () => void
}

export default function ContextMenu({ isOpen, x, y, onClose, onEdit, onDelete }: ContextMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose()
      }
    }

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose()
      }
    }

    // Add event listeners after a small delay to avoid immediate closure
    const timeout = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside)
      document.addEventListener('contextmenu', handleClickOutside)
      document.addEventListener('keydown', handleEscape)
    }, 10)

    return () => {
      clearTimeout(timeout)
      document.removeEventListener('mousedown', handleClickOutside)
      document.removeEventListener('contextmenu', handleClickOutside)
      document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        ref={menuRef}
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="fixed bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl py-1 min-w-[160px] z-[9999999]"
        style={{
          left: `${Math.min(x, window.innerWidth - 180)}px`,
          top: `${Math.min(y, window.innerHeight - 100)}px`,
          position: 'fixed'
        }}
      >
        <button
          onClick={(e) => {
            e.preventDefault()
            e.stopPropagation()
            onEdit()
            // Don't close immediately, let Sidebar handle it
          }}
          className="w-full px-4 py-2 text-left flex items-center gap-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          <Edit2 size={16} className="text-blue-500" />
          <span>Edit</span>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onDelete()
            onClose()
          }}
          className="w-full px-4 py-2 text-left flex items-center gap-2 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
        >
          <Trash2 size={16} />
          <span>Hapus</span>
        </button>
      </motion.div>
    </AnimatePresence>
  )
}

