'use client'

import React, { createContext, useContext, useState, ReactNode } from 'react'
import ConfirmModal from '@/components/base/ConfirmModal'
import AlertModal from '@/components/base/AlertModal'

// Types
interface ConfirmOptions {
  title: string
  message: string
  confirmText?: string
  cancelText?: string
  variant?: 'danger' | 'warning' | 'info' | 'success'
}

interface AlertOptions {
  title: string
  message: string
  buttonText?: string
  variant?: 'danger' | 'warning' | 'info' | 'success' | 'error'
}

interface NotificationContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>
  alert: (options: AlertOptions) => Promise<void>
}

// Context
const NotificationContext = createContext<NotificationContextType | undefined>(undefined)

// Hook
export function useNotifications() {
  const context = useContext(NotificationContext)
  if (context === undefined) {
    throw new Error('useNotifications must be used within a NotificationProvider')
  }
  return context
}

// Provider
interface NotificationProviderProps {
  children: ReactNode
}

export function NotificationProvider({ children }: NotificationProviderProps) {
  // State per ConfirmModal
  const [confirmState, setConfirmState] = useState<{
    isOpen: boolean
    options: ConfirmOptions
    resolve: ((value: boolean) => void) | null
  }>({
    isOpen: false,
    options: { title: 'Conferma', message: 'Sei sicuro?' },
    resolve: null
  })

  // State per AlertModal
  const [alertState, setAlertState] = useState<{
    isOpen: boolean
    options: AlertOptions
    resolve: (() => void) | null
  }>({
    isOpen: false,
    options: { title: 'Informazione', message: 'Operazione completata' },
    resolve: null
  })

  // Confirm function
  const confirm = (options: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setConfirmState({
        isOpen: true,
        options,
        resolve
      })
    })
  }

  // Alert function
  const alert = (options: AlertOptions): Promise<void> => {
    return new Promise((resolve) => {
      setAlertState({
        isOpen: true,
        options,
        resolve
      })
    })
  }

  // Handlers per ConfirmModal
  const handleConfirm = () => {
    if (confirmState.resolve) {
      confirmState.resolve(true)
    }
    setConfirmState(prev => ({ ...prev, isOpen: false, resolve: null }))
  }

  const handleCancel = () => {
    if (confirmState.resolve) {
      confirmState.resolve(false)
    }
    setConfirmState(prev => ({ ...prev, isOpen: false, resolve: null }))
  }

  // Handler per AlertModal
  const handleAlertClose = () => {
    if (alertState.resolve) {
      alertState.resolve()
    }
    setAlertState(prev => ({ ...prev, isOpen: false, resolve: null }))
  }

  return (
    <NotificationContext.Provider value={{ confirm, alert }}>
      {children}
      
      {/* ConfirmModal */}
      <ConfirmModal
        key="confirm-modal"
        isOpen={confirmState.isOpen}
        title={confirmState.options.title || 'Conferma'}
        message={confirmState.options.message || 'Sei sicuro?'}
        confirmText={confirmState.options.confirmText || 'Conferma'}
        cancelText={confirmState.options.cancelText || 'Annulla'}
        variant={confirmState.options.variant || 'warning'}
        onConfirm={handleConfirm}
        onCancel={handleCancel}
      />
      
      {/* AlertModal */}
      <AlertModal
        key="alert-modal"
        isOpen={alertState.isOpen}
        title={alertState.options.title || 'Informazione'}
        message={alertState.options.message || 'Operazione completata'}
        buttonText={alertState.options.buttonText || 'OK'}
        variant={alertState.options.variant || 'info'}
        onClose={handleAlertClose}
      />
    </NotificationContext.Provider>
  )
}