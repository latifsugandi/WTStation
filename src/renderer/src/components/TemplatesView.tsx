import { useState, useEffect } from 'react'
import { Plus, Edit, Trash2 } from 'lucide-react'
import { useStore } from '../store/store'
import type { Template } from '@shared/types'

export default function TemplatesView() {
  const { templates, addTemplate, updateTemplate, removeTemplate } = useStore()
  const [isEditing, setIsEditing] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null)
  const [formData, setFormData] = useState({
    name: '',
    content: '',
    category: '',
  })

  const handleSave = async () => {
    try {
      if (editingTemplate) {
        const updated = await window.electronAPI.templates.save({
          ...editingTemplate,
          ...formData,
        })
        updateTemplate(updated)
      } else {
        const template = await window.electronAPI.templates.save({
          name: formData.name,
          content: formData.content,
          variables: extractVariables(formData.content),
          category: formData.category || undefined,
        })
        addTemplate(template)
      }
      resetForm()
    } catch (error) {
      console.error('Failed to save template:', error)
    }
  }

  const handleDelete = async (templateId: string) => {
    if (confirm('Are you sure you want to delete this template?')) {
      try {
        await window.electronAPI.templates.delete(templateId)
        removeTemplate(templateId)
      } catch (error) {
        console.error('Failed to delete template:', error)
      }
    }
  }

  const handleEdit = (template: Template) => {
    setEditingTemplate(template)
    setFormData({
      name: template.name,
      content: template.content,
      category: template.category || '',
    })
    setIsEditing(true)
  }

  const resetForm = () => {
    setFormData({ name: '', content: '', category: '' })
    setIsEditing(false)
    setEditingTemplate(null)
  }

  const extractVariables = (content: string): string[] => {
    const matches = content.match(/\{(\w+)\}/g)
    return matches ? [...new Set(matches.map((m) => m.slice(1, -1)))] : []
  }

  return (
    <div className="flex-1 flex overflow-hidden bg-gray-50 dark:bg-gray-900">
      <div className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-semibold">Templates</h2>
            <button
              onClick={() => setIsEditing(true)}
              className="px-4 py-2 bg-accent text-white rounded-xl hover:bg-accent/90 transition-colors flex items-center gap-2"
            >
              <Plus size={16} />
              New Template
            </button>
          </div>

          {isEditing && (
            <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 mb-6 border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4">
                {editingTemplate ? 'Edit Template' : 'New Template'}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Name</label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl"
                    placeholder="Template name"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Content</label>
                  <textarea
                    value={formData.content}
                    onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                    className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl min-h-32"
                    placeholder="Template content. Use {variable} for placeholders."
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    Available variables: {extractVariables(formData.content).join(', ') || 'none'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Category (optional)</label>
                  <input
                    type="text"
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full px-4 py-2 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-700 rounded-xl"
                    placeholder="Category"
                  />
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

          <div className="grid gap-4">
            {templates.map((template) => (
              <div
                key={template.id}
                className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <h3 className="font-semibold text-lg">{template.name}</h3>
                    {template.category && (
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {template.category}
                      </span>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleEdit(template)}
                      className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                      <Edit size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(template.id)}
                      className="p-2 hover:bg-red-100 dark:hover:bg-red-900/20 rounded-lg transition-colors text-red-600 dark:text-red-400"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
                <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                  {template.content}
                </p>
                {template.variables.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {template.variables.map((variable) => (
                      <span
                        key={variable}
                        className="px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-accent text-xs rounded"
                      >
                        {`{${variable}}`}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

          {templates.length === 0 && !isEditing && (
            <div className="text-center py-12 text-gray-500 dark:text-gray-400">
              No templates yet. Create your first template!
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
