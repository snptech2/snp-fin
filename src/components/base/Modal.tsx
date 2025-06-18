// src/components/base/Modal.tsx
import { ReactNode } from 'react'

interface ModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  children: ReactNode
  size?: 'sm' | 'md' | 'lg'
}

export const Modal = ({ isOpen, onClose, title, children, size = 'md' }: ModalProps) => {
  if (!isOpen) return null

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md', 
    lg: 'max-w-lg'
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className={`modal-content rounded-lg p-6 w-full ${sizeClasses[size]} mx-4 max-h-screen overflow-y-auto`}>
        <h3 className="text-lg font-semibold text-adaptive-900 mb-4">
          {title}
        </h3>
        {children}
      </div>
    </div>
  )
}