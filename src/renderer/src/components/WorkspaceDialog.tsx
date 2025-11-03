import { useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, MessageCircle, Send, Upload } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import type { WorkspaceType } from '@shared/types'

interface WorkspaceDialogProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: (name: string, type: WorkspaceType, icon?: string) => void
}

export default function WorkspaceDialog({ isOpen, onClose, onConfirm }: WorkspaceDialogProps) {
  const [name, setName] = useState('')
  const [type, setType] = useState<WorkspaceType>('whatsapp')
  const [iconPreview, setIconPreview] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    if (name.trim()) {
      onConfirm(name.trim(), type, iconPreview || undefined)
      setName('')
      setType('whatsapp')
      setIconPreview(null)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
      onClose()
    }
  }
  
  const handleClose = () => {
    setName('')
    setType('whatsapp')
    setIconPreview(null)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
    onClose()
  }

  if (!isOpen) return null

  const dialogContent = (
    <AnimatePresence mode="wait">
      {isOpen && (
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
              Add Apps
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
                  id="logo-upload"
                />
                <label
                  htmlFor="logo-upload"
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
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="Masukkan nama app"
                autoFocus
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Pilih Tipe App
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setType('whatsapp')}
                  className={`p-4 border-2 rounded-xl transition-all ${
                    type === 'whatsapp'
                      ? 'border-accent bg-accent/10'
                      : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <MessageCircle
                      size={32}
                      className={type === 'whatsapp' ? 'text-accent' : 'text-gray-400'}
                    />
                    <span
                      className={`text-sm font-medium ${
                        type === 'whatsapp' ? 'text-accent' : 'text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      WhatsApp
                    </span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setType('telegram')}
                  className={`p-4 border-2 rounded-xl transition-all ${
                    type === 'telegram'
                      ? 'border-accent bg-accent/10'
                      : 'border-gray-300 dark:border-gray-700 hover:border-gray-400 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="flex flex-col items-center gap-2">
                    <Send
                      size={32}
                      className={type === 'telegram' ? 'text-accent' : 'text-gray-400'}
                    />
                    <span
                      className={`text-sm font-medium ${
                        type === 'telegram' ? 'text-accent' : 'text-gray-600 dark:text-gray-400'
                      }`}
                    >
                      Telegram
                    </span>
                  </div>
                </button>
              </div>
            </div>

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
                disabled={!name.trim()}
                className="px-4 py-2 bg-accent text-white rounded-xl hover:bg-accent/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Buat
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
