import { useState } from 'react'
import { Plus, Edit, Trash2 } from 'lucide-react'
import { useStore } from '../store/store'
import type { Label } from '@shared/types'

const COLORS = [
  '#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899',
  '#6366f1', '#14b8a6', '#f97316', '#84cc16',
]

export default function LabelsView() {
  const { labels, addLabel, updateLabel, removeLabel } = useStore()
  const [isEditing, setIsEditing] = useState(false)
  const [editingLabel, setEditingLabel] = useState<Label | null>(null)
  const [formData, setFormData] = useState({ name: '', color: COLORS[0] })

  const handleSave = async () => {
    try {
      if (editingLabel) {
        const updated = await window.electronAPI.labels.save({
          ...editingLabel,
          ...formData,
        })
        updateLabel(updated)
      } else {
        const label = await window.electronAPI.labels.save(formData)
        addLabel(label)
      }
      resetForm()
    } catch (error) {
      console.error('Failed to save label:', error)
    }
  }

  const handleDelete = async (labelId: string) => {
    if (confirm('Are you sure you want to delete this label?')) {
      try {
        await window.electronAPI.labels.delete(labelId)
        removeLabel(labelId)
      } catch (error) {
        console.error('Failed to delete label:', error)
      }
    }
  }

  const handleEdit = (label: Label) => {
    setEditingLabel(label)
    setFormData({ name: label.name, color: label.color })
    setIsEditing(true)
  }

  const resetForm = () => {
    setFormData({ name: '', color: COLORS[0] })
    setIsEditing(false)
    setEditingLabel(null)
  }

  return (
    <div className="flex-1 flex overflow-hidden bg-gray-50 dark:bg-gray-900">
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">Labels</h2>
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-accent text-white rounded-xl hover:bg-accent/90 transition-colors flex items-center gap-2"
            >
              <Plus size={16} />
              New Label
            </button>
          </div>

          {isEditing && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 mb-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4">
                {editingLabel ? 'Edit Label' : 'New Label'}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl"
                    placeholder="Label name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Color</label>
                  <div className="flex gap-2 flex-wrap">
                    {COLORS.map((color) => (
                      <button
                        key={color}
                        onClick={() => setFormData({ ...formData, color })}
                        className={`w-10 h-10 rounded-lg border-2 transition-all ${
                          formData.color === color
                            ? 'border-gray-900 dark:border-white scale-110'
                            : 'border-gray-300 dark:border-gray-700'
                        }`}
                        style={{ backgroundColor: color }}
                      />
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    className="px-4 py-2 bg-accent text-white rounded-xl hover:bg-accent/90 transition-colors"
                  >
                    Save
                  </button>
                  <button
                    onClick={resetForm}
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-900 dark:text-gray-100 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {labels.map((label) => (
              <div
                key={label.id}
                className="bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <div
                      className="w-4 h-4 rounded-full"
                      style={{ backgroundColor: label.color }}
                    />
                    <span className="font-semibold">{label.name}</span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(label)}
                      className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
                    >
                      <Edit size={14} />
                    </button>
                    <button
                      onClick={() => handleDelete(label.id)}
                      className="p-1 hover:bg-red-100 dark:hover:bg-red-900/20 rounded transition-colors text-red-600 dark:text-red-400"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {labels.length === 0 && !isEditing && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              No labels yet. Create your first label!
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
