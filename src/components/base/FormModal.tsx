import React, { ReactNode } from 'react'
import { Modal } from './Modal'

interface FormModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  // Form-specific props
  onSubmit?: () => void | Promise<void>
  onCancel?: () => void
  submitText?: string
  cancelText?: string
  isSubmitting?: boolean
  isValid?: boolean
  showActions?: boolean
  submitButtonVariant?: 'primary' | 'danger' | 'success'
}

export const FormModal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'md',
  onSubmit,
  onCancel,
  submitText = 'Salva',
  cancelText = 'Annulla',
  isSubmitting = false,
  isValid = true,
  showActions = true,
  submitButtonVariant = 'primary'
}: FormModalProps) => {
  
  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    } else {
      onClose()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (onSubmit && !isSubmitting) {
      await onSubmit()
    }
  }

  // Configurazione pulsante submit based su variant
  const submitButtonClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 text-white',
    danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-500 text-white',
    success: 'bg-green-600 hover:bg-green-700 focus:ring-green-500 text-white'
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={title} 
      size={size}
      showCloseButton={!isSubmitting}
      closeOnBackdrop={!isSubmitting}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Form Content */}
        <div className="space-y-4">
          {children}
        </div>
        
        {/* Actions */}
        {showActions && (
          <div className="flex justify-end space-x-3 pt-4 border-t border-adaptive">
            <button
              type="button"
              onClick={handleCancel}
              disabled={isSubmitting}
              className="px-4 py-2 border border-adaptive rounded-md text-adaptive-700 hover:bg-gray-50 dark:hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {cancelText}
            </button>
            
            {onSubmit && (
              <button
                type="submit"
                disabled={isSubmitting || !isValid}
                className={`px-4 py-2 rounded-md font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${submitButtonClasses[submitButtonVariant]}`}
              >
                {isSubmitting ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                    <span>Salvataggio...</span>
                  </div>
                ) : (
                  submitText
                )}
              </button>
            )}
          </div>
        )}
      </form>
    </Modal>
  )
}