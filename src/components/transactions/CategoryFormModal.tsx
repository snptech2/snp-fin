// src/components/transactions/CategoryFormModal.tsx
import React from 'react'
import { FormModal } from '@/components/base/FormModal'

interface Category {
  id: number
  name: string
  color?: string
}

interface CategoryForm {
  name: string
  color: string
}

interface CategoryFormModalProps {
  isOpen: boolean
  onClose: () => void
  transactionType: 'income' | 'expense'
  editingCategory: Category | null
  categoryForm: CategoryForm
  onFormChange: (form: CategoryForm) => void
  onSubmit: (e: React.FormEvent) => void
  availableColors: string[]
  error?: string
  isSubmitting?: boolean
}

export const CategoryFormModal = ({
  isOpen,
  onClose,
  transactionType,
  editingCategory,
  categoryForm,
  onFormChange,
  onSubmit,
  availableColors,
  error,
  isSubmitting = false
}: CategoryFormModalProps) => {
  
  const title = editingCategory ? 'Modifica Categoria' : 'Nuova Categoria'

  const handleSubmit = async () => {
    const event = new Event('submit') as any
    event.preventDefault = () => {}
    await onSubmit(event)
  }

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      onSubmit={handleSubmit}
      onCancel={onClose}
      submitText={isSubmitting ? 'Salvando...' : editingCategory ? 'Aggiorna' : 'Crea'}
      isSubmitting={isSubmitting}
      size="md"
    >
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-adaptive-700">
            Nome Categoria *
          </label>
          <input
            type="text"
            value={categoryForm.name}
            onChange={(e) => onFormChange({ ...categoryForm, name: e.target.value })}
            placeholder="Es: Alimentari"
            required
            className="w-full px-3 py-2 border border-adaptive rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-adaptive-700">
            🎨 Colore Categoria
          </label>
          <div className="grid grid-cols-10 gap-2">
            {availableColors.map((color) => (
              <button
                key={color}
                type="button"
                onClick={() => onFormChange({ ...categoryForm, color })}
                className={`w-8 h-8 rounded-lg border-2 transition-all ${
                  categoryForm.color === color 
                    ? 'border-gray-900 scale-110' 
                    : 'border-gray-300 hover:border-gray-500'
                }`}
                style={{ backgroundColor: color }}
                title={color}
              />
            ))}
          </div>
        </div>
      </div>
    </FormModal>
  )
}