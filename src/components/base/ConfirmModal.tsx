import React from 'react'
import { ExclamationTriangleIcon, InformationCircleIcon, CheckCircleIcon } from '@heroicons/react/24/outline'

interface ConfirmModalProps {
  isOpen: boolean
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info' | 'success'
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({
  isOpen,
  title,
  message,
  confirmText = 'Conferma',
  cancelText = 'Annulla',
  variant = 'warning',
  onConfirm,
  onCancel
}: ConfirmModalProps) {
  if (!isOpen) return <div style={{ display: 'none' }} />

  // Configurazione basata su variant
  const config = {
    danger: {
      icon: ExclamationTriangleIcon,
      iconColor: 'text-red-600',
      iconBg: 'bg-error-adaptive',
      confirmButton: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
      confirmTextColor: 'text-white'
    },
    warning: {
      icon: ExclamationTriangleIcon,
      iconColor: 'text-yellow-600',
      iconBg: 'bg-warning-adaptive',
      confirmButton: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500',
      confirmTextColor: 'text-white'
    },
    info: {
      icon: InformationCircleIcon,
      iconColor: 'text-blue-600',
      iconBg: 'bg-info-adaptive',
      confirmButton: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
      confirmTextColor: 'text-white'
    },
    success: {
      icon: CheckCircleIcon,
      iconColor: 'text-green-600',
      iconBg: 'bg-success-adaptive',
      confirmButton: 'bg-green-600 hover:bg-green-700 focus:ring-green-500',
      confirmTextColor: 'text-white'
    }
  }

  const { icon: Icon, iconColor, iconBg, confirmButton, confirmTextColor } = config[variant]

  // Gestisci ESC key
  React.useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onCancel()
      }
    }
    
    if (isOpen) {
      document.addEventListener('keydown', handleEsc)
      // Prevent body scroll
      document.body.style.overflow = 'hidden'
    }
    
    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onCancel])

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onCancel}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative transform overflow-hidden rounded-lg card-adaptive shadow-xl transition-all w-full max-w-md border border-adaptive">
          <div className="p-6">
            <div className="flex items-start gap-4">
              {/* Icon */}
              <div className={`flex h-12 w-12 items-center justify-center rounded-full ${iconBg}`}>
                <Icon className={`h-6 w-6 ${iconColor}`} />
              </div>
              
              {/* Content */}
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-adaptive-900 mb-2">
                  {title}
                </h3>
                <p className="text-sm text-adaptive-600">
                  {message}
                </p>
              </div>
            </div>
          </div>
          
          {/* Actions */}
          <div className="modal-footer-adaptive px-6 py-4 flex gap-3 justify-end border-t border-adaptive">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-sm font-medium modal-button-adaptive rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-colors"
            >
              {cancelText}
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className={`px-4 py-2 text-sm font-medium ${confirmTextColor} ${confirmButton} border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}