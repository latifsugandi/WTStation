import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { X, Upload } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { Workspace } from '@shared/types'

interface EditWorkspaceDialogProps {
  isOpen: boolean
  workspace: Workspace | null
  onClose: () => void
  onConfirm: (workspaceId: string, name: string, icon?: string) => void
}

export default function EditWorkspaceDialog({ isOpen, workspace, onClose, onConfirm }: EditWorkspaceDialogProps) {
  const [name, setName] = useState('')
  const [iconPreview, setIconPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Load workspace data when dialog opens or workspace changes
  useEffect(() => {
    if (workspace) {
      console.log('[EditWorkspaceDialog] Loading workspace data:', workspace)
      setName(workspace.name)
      setIconPreview(workspace.icon || null)
    } else if (isOpen && !workspace) {
      console.warn('[EditWorkspaceDialog] Dialog is open but workspace is null')
      // Reset form if workspace becomes null while dialog is open
      setName('')
      setIconPreview(null)
    }
  }, [workspace, isOpen])

  // Debug: Log when dialog should be visible
  useEffect(() => {
    console.log('[EditWorkspaceDialog] isOpen:', isOpen, 'workspace:', workspace)
  }, [isOpen, workspace])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // Validate file type
      if (!file.type.startsWith('image/')) {
        alert('File harus berupa gambar')
        return
      }
      
      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        alert('Ukuran file maksimal 2MB')
        return
      }
      
      const reader = new FileReader()
      reader.onloadend = () => {
        setIconPreview(reader.result as string)
      }
      reader.onerror = () => {
        alert('Gagal membaca file')
      }
      reader.readAsDataURL(file)
    }
  }

  const handleRemoveIcon = () => {
    setIconPreview(null)
    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim() && workspace) {
      onConfirm(workspace.id, name.trim(), iconPreview || undefined)
      onClose()
    } else {
      console.warn('[EditWorkspaceDialog] Cannot submit: name or workspace missing', { name, workspace })
    }
  }
  
  const handleClose = () => {
    if (workspace) {
      setName(workspace.name)
      setIconPreview(workspace.icon || null)
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onClose()
  }

  if (!isOpen) return null
  
  // Don't render dialog content if workspace is not available
  if (!workspace) {
    console.warn('[EditWorkspaceDialog] Cannot render: workspace is null')
    return null
  }

  const dialogContent = (
    <AnimatePresence mode="wait">
      {isOpen && workspace && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/50 flex items-center justify-center"
          onClick={handleClose}
          style={{ 
            pointerEvents: 'auto',
            zIndex: 99999999,
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0
          }}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 relative"
            onClick={(e) => e.stopPropagation()}
            style={{ 
              pointerEvents: 'auto',
              zIndex: 100000000
            }}
          >
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              Edit App
            </h2>
            <button
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <form onSubmit={handleSubmit}>
            {/* Logo Upload Section */}
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Logo App <span className="text-gray-400 text-xs">(Opsional)</span>
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  ref={fileInputRef}
                  className="hidden"
                  id="logo-upload-edit"
                />
                <label
                  htmlFor="logo-upload-edit"
                  className="flex items-center justify-center gap-2 px-4 py-2 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-xl cursor-pointer hover:border-accent hover:bg-accent/5 transition-colors text-gray-700 dark:text-gray-300"
                >
                  <Upload size={18} />
                  <span className="text-sm">{iconPreview ? 'Ganti Logo' : 'Upload Logo'}</span>
                </label>
                
                {iconPreview && (
                  <div className="flex items-center gap-2 flex-1">
                    <div className="relative">
                      <img 
                        src={iconPreview} 
                        alt="Logo preview" 
                        className="w-12 h-12 rounded-lg object-cover border-2 border-gray-200 dark:border-gray-700"
                      />
                      <button
                        type="button"
                        onClick={handleRemoveIcon}
                        className="absolute -top-1 -right-1 p-1 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"
                        title="Hapus logo"
                      >
                        <X size={12} />
                      </button>
                    </div>
                    <span className="text-xs text-gray-500 dark:text-gray-400 flex-1 truncate">
                      Logo dipilih
                    </span>
                  </div>
                )}
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Format: JPG, PNG, atau GIF. Maksimal 2MB
              </p>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Nama App
              </label>
              <input
                type="text"
                value={workspace ? name : ''}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="Masukkan nama app"
                autoFocus
                disabled={!workspace}
              />
            </div>

            {!workspace && (
              <div className="mb-4 text-sm text-gray-500 dark:text-gray-400 text-center">
                Memuat data aplikasi...
              </div>
            )}

            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-xl transition-colors"
              >
                Batal
              </button>
              <button
                type="submit"
                disabled={!name.trim() || !workspace}
                className="px-4 py-2 bg-accent text-white rounded-xl hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Simpan
              </button>
            </div>
          </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )

  // Render to document.body to ensure it's above everything
  return createPortal(dialogContent, document.body)
}

