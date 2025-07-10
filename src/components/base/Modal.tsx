// src/components/base/Modal.tsx
import React, { ReactNode, useEffect, useRef } from 'react'
import { XMarkIcon } from '@heroicons/react/24/outline'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg' | 'xl' | '2xl'
  showCloseButton?: boolean
  closeOnBackdrop?: boolean
}

export const Modal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'md',
  showCloseButton = true,
  closeOnBackdrop = true
}: ModalProps) => {
  const modalRef = useRef<HTMLDivElement>(null)

  // Gestione ESC key e focus trap
  useEffect(() => {
    if (!isOpen) return

    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
      }
    }

    // Focus trap
    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      const modal = modalRef.current
      if (!modal) return

      const focusableElements = modal.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      )
      const firstElement = focusableElements[0] as HTMLElement
      const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement?.focus()
          e.preventDefault()
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement?.focus()
          e.preventDefault()
        }
      }
    }

    // Event listeners
    document.addEventListener('keydown', handleEsc)
    document.addEventListener('keydown', handleTabKey)
    
    // Prevent body scroll
    document.body.style.overflow = 'hidden'
    
    // Auto focus sul primo elemento focusabile
    setTimeout(() => {
      const modal = modalRef.current
      if (modal) {
        const firstFocusable = modal.querySelector(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        ) as HTMLElement
        firstFocusable?.focus()
      }
    }, 100)

    return () => {
      document.removeEventListener('keydown', handleEsc)
      document.removeEventListener('keydown', handleTabKey)
      document.body.style.overflow = 'unset'
    }
  }, [isOpen, onClose])

  if (!isOpen) return null

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md', 
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl'
  }

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (closeOnBackdrop && e.target === e.currentTarget) {
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={handleBackdropClick}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div 
          ref={modalRef}
          className={`relative transform overflow-hidden rounded-lg card-adaptive shadow-xl transition-all w-full ${sizeClasses[size]}`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-adaptive">
            <h3 className="text-lg font-semibold text-adaptive-900">
              {title}
            </h3>
            {showCloseButton && (
              <button
                type="button"
                onClick={onClose}
                className="rounded-md text-adaptive-400 hover:text-adaptive-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors"
                aria-label="Chiudi modal"
              >
                <XMarkIcon className="h-6 w-6" />
              </button>
            )}
          </div>
          
          {/* Content */}
          <div className="p-6">
            {children}
          </div>
        </div>
      </div>
    </div>
  )
}