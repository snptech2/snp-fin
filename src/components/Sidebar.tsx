// src/components/Sidebar.tsx - SIDEBAR MODULARE
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useUserModules } from '@/hooks/useUserModules'
import { useNotifications } from '@/contexts/NotificationContext'
import { useState } from 'react'
import { SimpleThemeToggle } from '@/components/theme/SimpleThemeToggle'

interface SidebarProps {
  isOpen?: boolean
  onClose?: () => void
  headerVisible?: boolean
}

export default function Sidebar({ isOpen = true, onClose, headerVisible = true }: SidebarProps) {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const { getEnabledModulesList, loading: modulesLoading, refreshModuleSettings } = useUserModules()
  const { confirm } = useNotifications()
  const [showSettings, setShowSettings] = useState(false)

  const handleLogout = async () => {
    const confirmed = await confirm({
      title: 'Conferma Logout',
      message: 'Sei sicuro di voler uscire dall\'applicazione?',
      confirmText: 'Esci',
      cancelText: 'Annulla',
      variant: 'warning'
    })
    
    if (confirmed) {
      await logout()
    }
  }

  const handleLinkClick = () => {
    // Chiudi la sidebar su mobile dopo aver cliccato un link
    if (onClose && window.innerWidth < 1024) {
      onClose()
    }
  }

  // Se non c'è utente, non mostrare la sidebar
  if (!user) return null

  return (
    <>
      {/* Backdrop per mobile - solo quando aperto */}
      {isOpen && (
        <div 
          className="lg:hidden fixed inset-0 z-10 bg-black bg-opacity-50 transition-opacity"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar */}
      <div className={`
        fixed sidebar-adaptive shadow-lg border-adaptive
        transition-all duration-300 ease-in-out
        lg:inset-y-0 lg:left-0 lg:w-64 lg:border-r lg:translate-y-0 lg:z-50
        ${isOpen 
          ? `inset-x-0 ${headerVisible ? 'top-16' : 'top-0'} bottom-0 translate-y-0 border-b z-20 lg:block` 
          : `inset-x-0 ${headerVisible ? 'top-16' : 'top-0'} bottom-0 -translate-y-full border-b z-20 lg:block`
        }
      `}>
        <div className="flex h-full flex-col">
        {/* Logo - Solo Desktop */}
        <div className="hidden lg:flex h-16 shrink-0 items-center justify-center px-6 border-b border-adaptive">
          <h1 className="text-xl font-bold">
            <span className="text-adaptive-900">SNP</span>
            <span className="ml-2 text-green-500 animate-pulse">Finance</span>
          </h1>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 px-4 py-6 lg:space-y-1 flex lg:flex-col items-center lg:items-stretch justify-center lg:justify-start">
          {modulesLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 lg:space-y-1 lg:grid-cols-1 lg:gap-0 w-full max-w-md lg:max-w-none">
              {getEnabledModulesList().map((module) => {
                const isActive = pathname === module.href
                return (
                  <Link
                    key={module.id}
                    href={module.href}
                    onClick={handleLinkClick}
                    className={`
                      group flex flex-col lg:flex-row items-center justify-center lg:justify-start rounded-md px-3 py-4 lg:py-2 text-sm font-medium transition-colors
                      ${isActive 
                        ? 'bg-blue-500 text-white' 
                        : 'text-adaptive-700 hover:bg-sidebar-hover hover:text-adaptive-900'
                      }
                    `}
                  >
                    <span className="mb-1 lg:mb-0 lg:mr-3 text-2xl lg:text-lg">
                      {module.icon}
                    </span>
                    <span className="text-xs lg:text-sm">{module.name}</span>
                  </Link>
                )
              })}
              
              {/* Settings Button */}
              <button
                onClick={() => {
                  console.log('🔧 Settings button clicked')
                  setShowSettings(true)
                }}
                className="group flex flex-col lg:flex-row items-center justify-center lg:justify-start rounded-md px-3 py-4 lg:py-2 text-sm font-medium transition-colors text-adaptive-700 hover:bg-sidebar-hover hover:text-adaptive-900 w-full"
              >
                <span className="mb-1 lg:mb-0 lg:mr-3 text-2xl lg:text-lg">⚙️</span>
                <span className="text-xs lg:text-sm">Impostazioni</span>
              </button>
              
              {/* Theme Toggle - Solo Mobile */}
              <div className="flex flex-col items-center space-y-2 lg:hidden col-span-2">
                <SimpleThemeToggle />
                <span className="text-xs text-adaptive-600 font-medium">Seleziona Tema</span>
              </div>
            </div>
          )}
        </nav>

        {/* User Section - Solo Desktop */}
        <div className="hidden lg:block border-t border-adaptive p-4">
          <div className="flex items-center mb-3">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="ml-3 flex-1 min-w-0">
              <p className="text-sm font-medium text-adaptive-700 truncate">{user.name}</p>
              <p className="text-xs text-adaptive-600 truncate">{user.email}</p>
              <p className="text-xs text-adaptive-600">{user.currency}</p>
            </div>
            <div className="ml-2">
              <SimpleThemeToggle />
            </div>
          </div>
          
          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full text-left px-3 py-2 text-sm text-adaptive-700 rounded-md transition-colors"
          >
            Esci
          </button>
        </div>
      </div>
      
      </div>
      
      {/* Settings Modal - Renderizzato fuori dalla sidebar */}
      {showSettings && (
        <SettingsModal 
          onClose={() => setShowSettings(false)}
          onModulesChanged={refreshModuleSettings}
        />
      )}
    </>
  )
}

// Settings Modal Component
function SettingsModal({ onClose, onModulesChanged }: { 
  onClose: () => void
  onModulesChanged: () => void
}) {
  const { moduleSettings, appProfile, toggleModule, updateModuleSettings } = useUserModules()
  const [activeTab, setActiveTab] = useState('modules')
  
  const handleClose = () => {
    console.log('🔄 Closing settings, refreshing sidebar modules...')
    // Forza refresh dei moduli nella sidebar principale
    onModulesChanged()
    onClose()
  }
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]" onClick={handleClose}>
      <div className="card-adaptive rounded-lg shadow-xl max-w-4xl w-full mx-2 sm:mx-4 max-h-[90vh] overflow-hidden border border-adaptive" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 sm:p-6 border-b border-adaptive">
          <h2 className="text-lg sm:text-xl font-semibold text-adaptive-900">⚙️ Impostazioni</h2>
          <button
            onClick={handleClose}
            className="text-adaptive-600 hover:text-adaptive-800"
          >
            ✕
          </button>
        </div>
        
        <div className="flex flex-col lg:flex-row">
          {/* Sidebar Tabs - Horizontal su mobile */}
          <div className="lg:w-64 card-adaptive lg:border-r border-adaptive p-4">
            <nav className="flex lg:flex-col lg:space-y-2 space-x-2 lg:space-x-0 overflow-x-auto lg:overflow-x-visible">
              {[
                { id: 'modules', name: 'Moduli', icon: '📦' },
                { id: 'account', name: 'Account', icon: '🔐' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex-shrink-0 lg:w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                    activeTab === tab.id
                      ? 'bg-info text-white'
                      : 'text-adaptive-600 hover:bg-adaptive-50'
                  }`}
                >
                  <span className="mr-2">{tab.icon}</span>
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>
          
          {/* Content */}
          <div className="flex-1 p-4 sm:p-6 overflow-y-auto max-h-[60vh] lg:max-h-[70vh]">
            {activeTab === 'modules' && (
              <ModulesSettings 
                moduleSettings={moduleSettings}
                onToggleModule={toggleModule}
              />
            )}
            {/* {activeTab === 'theme' && (
              <ThemeSelector />
            )} */}
            {activeTab === 'account' && (
              <AccountSettings />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// Modules Settings Component
function ModulesSettings({ moduleSettings, onToggleModule }: {
  moduleSettings: any
  onToggleModule: (moduleId: string) => Promise<any>
}) {
  const { APP_MODULES } = require('@/utils/modules')
  const coreModules = Object.values(APP_MODULES).filter((m: any) => m.category === 'core')
  const optionalModules = Object.values(APP_MODULES).filter((m: any) => m.category === 'optional')

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4 text-adaptive-900">Gestisci Moduli</h3>
        <p className="text-adaptive-600 mb-6">
          Attiva o disattiva i moduli in base alle tue necessità
        </p>
      </div>

      {/* Core Modules */}
      <div>
        <h4 className="font-semibold mb-3 text-adaptive-800">📦 Moduli Base (sempre attivi)</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {coreModules.map((module: any) => (
            <div key={module.id} className="p-3 card-adaptive border border-adaptive rounded-lg opacity-75">
              <div className="flex items-center space-x-3">
                <span className="text-xl">{module.icon}</span>
                <div>
                  <div className="font-medium text-sm text-adaptive-900">{module.name}</div>
                  <div className="text-xs text-adaptive-600">{module.description}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Optional Modules */}
      <div>
        <h4 className="font-semibold mb-3 text-adaptive-800">🎯 Moduli Opzionali</h4>
        <div className="space-y-3">
          {optionalModules.map((module: any) => {
            const isEnabled = moduleSettings?.enabledModules?.includes(module.id) || false
            return (
              <div key={module.id} className="flex items-center justify-between p-3 border border-adaptive rounded-lg card-adaptive">
                <div className="flex items-center space-x-3">
                  <span className="text-xl">{module.icon}</span>
                  <div>
                    <div className="font-medium text-adaptive-900">{module.name}</div>
                    <div className="text-sm text-adaptive-600">{module.description}</div>
                  </div>
                </div>
                <button
                  onClick={() => onToggleModule(module.id)}
                  className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                    isEnabled
                      ? 'bg-success text-white hover:bg-green-600'
                      : 'card-adaptive border border-adaptive text-adaptive-700 hover:bg-adaptive-50'
                  }`}
                >
                  {isEnabled ? 'Attivo' : 'Disattivo'}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}


// Account Settings Component
function AccountSettings() {
  const { user, refreshUser, logout } = useAuth()
  const [loading, setLoading] = useState(false)
  const [feedback, setFeedback] = useState<{type: 'success' | 'error', message: string} | null>(null)
  const [showDeleteModal, setShowDeleteModal] = useState(false)

  const handleCurrencyChange = async (newCurrency: string) => {
    if (user?.currency === newCurrency) return
    
    setLoading(true)
    setFeedback(null)
    
    try {
      const response = await fetch('/api/user/currency', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currency: newCurrency })
      })
      
      if (response.ok) {
        await refreshUser()
        setFeedback({ 
          type: 'success', 
          message: `Valuta cambiata in ${newCurrency}. I prezzi verranno aggiornati automaticamente.` 
        })
        setTimeout(() => setFeedback(null), 5000)
      } else {
        throw new Error('Errore nel cambio valuta')
      }
    } catch (error) {
      setFeedback({ type: 'error', message: 'Errore nel cambio valuta' })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4 text-adaptive-900">Impostazioni Account</h3>
        <p className="text-adaptive-600 mb-6">
          Informazioni e preferenze del tuo account
        </p>
        
        {/* Feedback Toast */}
        {feedback && (
          <div className={`p-3 rounded-lg mb-4 ${
            feedback.type === 'success' 
              ? 'bg-success bg-opacity-10 border border-success text-success'
              : 'bg-error bg-opacity-10 border border-error text-error'
          }`}>
            {feedback.message}
          </div>
        )}
      </div>

      <div className="space-y-4">
        <div className="p-4 card-adaptive border border-adaptive rounded-lg">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-adaptive-700">Nome</label>
              <div className="mt-1 text-sm text-adaptive-900">{user?.name}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-adaptive-700">Email</label>
              <div className="mt-1 text-sm text-adaptive-900">{user?.email}</div>
            </div>
            <div>
              <label className="block text-sm font-medium text-adaptive-700">Valuta</label>
              <div className="mt-1">
                <select
                  value={user?.currency || 'EUR'}
                  onChange={(e) => handleCurrencyChange(e.target.value)}
                  disabled={loading}
                  className="text-sm border border-adaptive rounded px-2 py-1 bg-transparent text-adaptive-900 disabled:opacity-50"
                >
                  <option value="EUR">🇪🇺 Euro (€)</option>
                  <option value="USD">🇺🇸 US Dollar ($)</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border border-info bg-info bg-opacity-10 rounded-lg">
          <h4 className="font-medium text-adaptive-900 mb-2">💡 Nota sulla valuta</h4>
          <p className="text-sm text-adaptive-700">
            Cambiando valuta, i prezzi crypto verranno aggiornati automaticamente. 
            I dati esistenti (transazioni, saldi) mantengono il loro valore numerico ma cambiano solo il simbolo.
          </p>
        </div>

        {/* Danger Zone */}
        <div className="p-4 border border-red-300 bg-red-50 rounded-lg">
          <h4 className="font-medium text-red-900 mb-2">⚠️ Zona Pericolosa</h4>
          <p className="text-sm text-red-700 mb-4">
            L'eliminazione dell'account è <strong>irreversibile</strong>. Tutti i tuoi dati verranno eliminati permanentemente.
          </p>
          <button
            onClick={() => setShowDeleteModal(true)}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
          >
            Elimina Account
          </button>
        </div>
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <DeleteAccountModal 
          onClose={() => setShowDeleteModal(false)}
          onConfirm={logout}
        />
      )}
    </div>
  )
}

// Delete Account Modal Component
function DeleteAccountModal({ onClose, onConfirm }: {
  onClose: () => void
  onConfirm: () => void
}) {
  const [password, setPassword] = useState('')
  const [confirmText, setConfirmText] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleDeleteAccount = async () => {
    if (confirmText !== 'ELIMINA ACCOUNT') {
      setError('Devi digitare "ELIMINA ACCOUNT" per confermare')
      return
    }

    if (!password) {
      setError('Inserisci la tua password per confermare')
      return
    }

    setLoading(true)
    setError('')

    try {
      const response = await fetch('/api/user/account', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      })

      if (response.ok) {
        // Account eliminato con successo
        onConfirm() // Logout automatico
        onClose()
      } else {
        const data = await response.json()
        setError(data.error || 'Errore durante eliminazione account')
      }
    } catch (error) {
      setError('Errore di connessione')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[9999]" onClick={onClose}>
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-red-900">⚠️ Elimina Account</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        <div className="space-y-4">
          <div className="p-3 bg-red-50 border border-red-200 rounded">
            <p className="text-sm text-red-800 font-medium">Questa azione è irreversibile!</p>
            <p className="text-xs text-red-700 mt-1">
              Verranno eliminati: tutti i conti, transazioni, portfolio crypto/DCA, dati Partita IVA, budget, categorie e tutti gli altri dati associati.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-100 border border-red-300 text-red-700 rounded text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Inserisci la tua password per confermare:
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="Password"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Digita <code className="bg-gray-100 px-1 rounded">ELIMINA ACCOUNT</code> per confermare:
            </label>
            <input
              type="text"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
              placeholder="ELIMINA ACCOUNT"
            />
          </div>

          <div className="flex space-x-3 pt-4">
            <button
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
            >
              Annulla
            </button>
            <button
              onClick={handleDeleteAccount}
              disabled={loading || confirmText !== 'ELIMINA ACCOUNT' || !password}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? 'Eliminazione...' : 'Elimina Account'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}