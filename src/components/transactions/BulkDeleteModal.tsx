// src/components/transactions/BulkDeleteModal.tsx
import React from 'react'
import { Modal } from '@/components/base/Modal'

interface DeleteProgress {
  current: number
  total: number
}

interface BulkDeleteModalProps {
  isOpen: boolean
  progress: DeleteProgress
}

export const BulkDeleteModal = ({ isOpen, progress }: BulkDeleteModalProps) => {
  const percentage = progress.total > 0 ? (progress.current / progress.total) * 100 : 0

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={() => {}} // Non può essere chiuso durante l'eliminazione
      title="Cancellazione in corso..."
      showCloseButton={false}
      closeOnBackdrop={false}
      size="md"
    >
      <div className="space-y-4">
        {/* Progress bar */}
        <div className="w-full bg-gray-200 rounded-full h-3">
          <div 
            className="bg-red-600 h-3 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${percentage}%` }}
          />
        </div>
        
        {/* Stats */}
        <div className="flex justify-between text-sm text-adaptive-900 font-medium">
          <span>Cancellate: {progress.current} / {progress.total}</span>
          <span className="font-medium">
            {Math.round(percentage)}%
          </span>
        </div>
        
        {/* Loading indicator */}
        <div className="flex items-center justify-center space-x-2 pt-2">
          <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600"></div>
          <span className="text-sm text-adaptive-900 font-medium">Eliminazione transazioni...</span>
        </div>
      </div>
    </Modal>
  )
}