import React, { ReactNode } from 'react'
import { Modal } from './Modal'
import { DocumentArrowUpIcon, CheckCircleIcon, XCircleIcon } from '@heroicons/react/24/outline'

interface ImportProgress {
  current: number
  total: number
  currentBatch?: number
  totalBatches?: number
  imported?: number
  message?: string
}

interface ImportResult {
  success: boolean
  imported: number
  errors: string[]
  message?: string
}

interface ImportModalProps {
  isOpen: boolean
  onClose: () => void
  title: string
  // Import states
  isImporting?: boolean
  progress?: ImportProgress
  result?: ImportResult | null
  // File handling
  onFileSelect?: (file: File) => void
  acceptedFileTypes?: string
  // Actions
  onStartImport?: () => void | Promise<void>
  onCancel?: () => void
  onReset?: () => void
  // Custom content
  children?: ReactNode
  // Options
  showProgress?: boolean
  showResult?: boolean
}

export const ImportModal = ({ 
  isOpen, 
  onClose, 
  title,
  isImporting = false,
  progress,
  result,
  onFileSelect,
  acceptedFileTypes = '.csv',
  onStartImport,
  onCancel,
  onReset,
  children,
  showProgress = true,
  showResult = true
}: ImportModalProps) => {

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && onFileSelect) {
      onFileSelect(file)
    }
  }

  const handleCancel = () => {
    if (onCancel) {
      onCancel()
    } else {
      onClose()
    }
  }

  const handleReset = () => {
    if (onReset) {
      onReset()
    }
  }

  const getProgressPercentage = () => {
    if (!progress) return 0
    return progress.total > 0 ? (progress.current / progress.total) * 100 : 0
  }

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title={title} 
      size="lg"
      showCloseButton={!isImporting}
      closeOnBackdrop={!isImporting}
    >
      <div className="space-y-6">
        
        {/* File Upload Section */}
        {!isImporting && !result && (
          <div>
            <label className="block text-sm font-medium text-adaptive-700 mb-2">
              Seleziona File CSV
            </label>
            <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-adaptive border-dashed rounded-md hover:border-blue-400 transition-colors">
              <div className="space-y-1 text-center">
                <DocumentArrowUpIcon className="mx-auto h-12 w-12 text-adaptive-400" />
                <div className="flex text-sm text-adaptive-600">
                  <label
                    htmlFor="file-upload"
                    className="relative cursor-pointer bg-white dark:bg-gray-800 rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                  >
                    <span>Carica un file</span>
                    <input
                      id="file-upload"
                      name="file-upload"
                      type="file"
                      className="sr-only"
                      accept={acceptedFileTypes}
                      onChange={handleFileChange}
                    />
                  </label>
                  <p className="pl-1">o trascina qui</p>
                </div>
                <p className="text-xs text-adaptive-500">
                  File CSV fino a 10MB
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Custom Content */}
        {children && (
          <div>
            {children}
          </div>
        )}

        {/* Progress Section */}
        {isImporting && showProgress && progress && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
              <div className="flex-1">
                <div className="flex justify-between text-sm">
                  <span className="text-adaptive-700">Importazione in corso...</span>
                  <span className="text-adaptive-600">
                    {progress.current} / {progress.total}
                    {progress.imported && ` (${progress.imported} importati)`}
                  </span>
                </div>
                <div className="mt-2 w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${getProgressPercentage()}%` }}
                  />
                </div>
              </div>
            </div>
            
            {progress.message && (
              <div className="text-sm text-adaptive-600 bg-blue-50 dark:bg-blue-900/20 p-3 rounded-md">
                {progress.message}
              </div>
            )}

            {progress.currentBatch && progress.totalBatches && (
              <div className="text-xs text-adaptive-500">
                Batch {progress.currentBatch} di {progress.totalBatches}
              </div>
            )}
          </div>
        )}

        {/* Result Section */}
        {result && showResult && (
          <div className="space-y-4">
            <div className={`flex items-start gap-3 p-4 rounded-md ${
              result.success 
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800' 
                : 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800'
            }`}>
              {result.success ? (
                <CheckCircleIcon className="h-6 w-6 text-green-600 flex-shrink-0 mt-0.5" />
              ) : (
                <XCircleIcon className="h-6 w-6 text-red-600 flex-shrink-0 mt-0.5" />
              )}
              
              <div className="flex-1">
                <h4 className={`font-medium ${result.success ? 'text-green-900 dark:text-green-100' : 'text-red-900 dark:text-red-100'}`}>
                  {result.success ? 'Import Completato' : 'Import Fallito'}
                </h4>
                <p className={`text-sm mt-1 ${result.success ? 'text-green-700 dark:text-green-200' : 'text-red-700 dark:text-red-200'}`}>
                  {result.message || `${result.imported} elementi importati con successo`}
                </p>
              </div>
            </div>

            {/* Errors */}
            {result.errors && result.errors.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-sm font-medium text-red-900 dark:text-red-100">
                  Errori ({result.errors.length}):
                </h5>
                <div className="max-h-32 overflow-y-auto space-y-1">
                  {result.errors.map((error, index) => (
                    <div key={index} className="text-sm text-red-700 dark:text-red-200 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                      {error}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Actions */}
        <div className="flex justify-end space-x-3 pt-4 border-t border-adaptive">
          {isImporting ? (
            <button
              type="button"
              onClick={handleCancel}
              className="px-4 py-2 border border-adaptive rounded-md text-adaptive-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
            >
              Annulla
            </button>
          ) : result ? (
            <>
              {onReset && (
                <button
                  type="button"
                  onClick={handleReset}
                  className="px-4 py-2 border border-adaptive rounded-md text-adaptive-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Nuovo Import
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                Chiudi
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={handleCancel}
                className="px-4 py-2 border border-adaptive rounded-md text-adaptive-700 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                Annulla
              </button>
              {onStartImport && (
                <button
                  type="button"
                  onClick={onStartImport}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Avvia Import
                </button>
              )}
            </>
          )}
        </div>
      </div>
    </Modal>
  )
}