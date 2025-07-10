import React from 'react'
import { 
  ExclamationTriangleIcon, 
  InformationCircleIcon, 
  CheckCircleIcon, 
  XCircleIcon 
} from '@heroicons/react/24/outline'

interface AlertModalProps {
  isOpen: boolean
  title: string
  message: string
  buttonText?: string
  variant?: 'danger' | 'warning' | 'info' | 'success' | 'error'
  onClose: () => void
}

export default function AlertModal({
  isOpen,
  title,
  message,
  buttonText = 'OK',
  variant = 'info',
  onClose
}: AlertModalProps) {
  if (!isOpen) return <div style={{ display: 'none' }} />

  // Configurazione basata su variant
  const config = {
    danger: {
      icon: ExclamationTriangleIcon,
      iconColor: 'text-red-600',
      iconBg: 'bg-red-100',
      button: 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
    },
    error: {
      icon: XCircleIcon,
      iconColor: 'text-red-600',
      iconBg: 'bg-red-100',
      button: 'bg-red-600 hover:bg-red-700 focus:ring-red-500'
    },
    warning: {
      icon: ExclamationTriangleIcon,
      iconColor: 'text-yellow-600',
      iconBg: 'bg-yellow-100',
      button: 'bg-yellow-600 hover:bg-yellow-700 focus:ring-yellow-500'
    },
    info: {
      icon: InformationCircleIcon,
      iconColor: 'text-blue-600',
      iconBg: 'bg-blue-100',
      button: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500'
    },
    success: {
      icon: CheckCircleIcon,
      iconColor: 'text-green-600',
      iconBg: 'bg-green-100',
      button: 'bg-green-600 hover:bg-green-700 focus:ring-green-500'
    }
  }

  const { icon: Icon, iconColor, iconBg, button } = config[variant]

  // Gestisci ESC key e Enter
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === 'Enter') {
        onClose()
      }
    }
    
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      // Prevent body scroll
      document.body.style.overflow = 'hidden'
      
      // Auto focus sul pulsante OK
      setTimeout(() => {
        const okButton = document.querySelector('[data-alert-ok-button]') as HTMLButtonElement
        if (okButton) {
          okButton.focus()
        }
      }, 100)
    }
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow-xl transition-all w-full max-w-md">
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
                <p className="text-sm text-adaptive-600 whitespace-pre-wrap">
                  {message}
                </p>
              </div>
            </div>
          </div>
          
          {/* Actions */}
          <div className="bg-gray-50 dark:bg-gray-700 px-6 py-4 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              data-alert-ok-button
              className={`px-4 py-2 text-sm font-medium text-white ${button} border border-transparent rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors`}
            >
              {buttonText}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}