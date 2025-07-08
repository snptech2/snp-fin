// src/components/Sidebar.tsx - SIDEBAR MODULARE
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useAuth } from '@/contexts/AuthContext'
import { useUserModules } from '@/hooks/useUserModules'
import { useState } from 'react'

export default function Sidebar() {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const { getEnabledModulesList, loading: modulesLoading, refreshModuleSettings } = useUserModules()
  const [showSettings, setShowSettings] = useState(false)

  const handleLogout = async () => {
    if (confirm('Sei sicuro di voler uscire?')) {
      await logout()
    }
  }

  // Se non c'è utente, non mostrare la sidebar
  if (!user) return null

  return (
    <div className="fixed inset-y-0 left-0 z-50 w-64 sidebar-adaptive shadow-lg border-r border-adaptive">
      <div className="flex h-full flex-col">
        {/* Logo */}
        <div className="flex h-16 shrink-0 items-center px-6 border-b border-adaptive">
          <h1 className="text-xl font-bold text-adaptive-900">SNP Finance</h1>
        </div>
        
        {/* Navigation */}
        <nav className="flex-1 space-y-1 px-4 py-6">
          {modulesLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-6 w-6 border-2 border-blue-600 border-t-transparent"></div>
            </div>
          ) : (
            <>
              {getEnabledModulesList().map((module) => {
                const isActive = pathname === module.href
                return (
                  <Link
                    key={module.id}
                    href={module.href}
                    className={`
                      group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors
                      ${isActive 
                        ? 'bg-blue-500 text-white' 
                        : 'text-adaptive-700 hover:bg-gray-50 hover:text-adaptive-900'
                      }
                    `}
                  >
                    <span className="mr-3 text-lg">
                      {module.icon}
                    </span>
                    {module.name}
                  </Link>
                )
              })}
              
              {/* Spacer */}
              <div className="py-2"></div>
              
              {/* Settings Button */}
              <button
                onClick={() => setShowSettings(true)}
                className="group flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors text-adaptive-700 w-full"
              >
                <span className="mr-3 text-lg">⚙️</span>
                Impostazioni
              </button>
            </>
          )}
        </nav>

        {/* User Section */}
        <div className="border-t border-adaptive p-4">
          <div className="flex items-center mb-3">
            <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-sm font-medium">
              {user.name.charAt(0).toUpperCase()}
            </div>
            <div className="ml-3 flex-1 min-w-0">
              <p className="text-sm font-medium text-adaptive-700 truncate">{user.name}</p>
              <p className="text-xs text-adaptive-600 truncate">{user.email}</p>
              <p className="text-xs text-adaptive-600">{user.currency}</p>
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
      
      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal 
          onClose={() => setShowSettings(false)}
          onModulesChanged={refreshModuleSettings}
        />
      )}
    </div>
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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={handleClose}>
      <div className="card-adaptive rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden border border-adaptive" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-6 border-b border-adaptive">
          <h2 className="text-xl font-semibold text-adaptive-900">⚙️ Impostazioni</h2>
          <button
            onClick={handleClose}
            className="text-adaptive-600 hover:text-adaptive-800"
          >
            ✕
          </button>
        </div>
        
        <div className="flex">
          {/* Sidebar Tabs */}
          <div className="w-64 card-adaptive border-r border-adaptive p-4">
            <nav className="space-y-2">
              {[
                { id: 'modules', name: 'Moduli', icon: '📦' },
                { id: 'account', name: 'Account', icon: '🔐' }
              ].map(tab => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
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
          <div className="flex-1 p-6 overflow-y-auto max-h-[70vh]">
            {activeTab === 'modules' && (
              <ModulesSettings 
                moduleSettings={moduleSettings}
                onToggleModule={toggleModule}
              />
            )}
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
  const { user } = useAuth()

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4 text-adaptive-900">Impostazioni Account</h3>
        <p className="text-adaptive-600 mb-6">
          Informazioni e preferenze del tuo account
        </p>
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
              <div className="mt-1 text-sm text-adaptive-900">{user?.currency}</div>
            </div>
          </div>
        </div>

        <div className="p-4 border border-warning bg-warning bg-opacity-10 rounded-lg">
          <h4 className="font-medium text-adaptive-900 mb-2">🚧 In Sviluppo</h4>
          <p className="text-sm text-adaptive-700">
            Le modifiche alle impostazioni dell'account saranno disponibili presto.
          </p>
        </div>
      </div>
    </div>
  )
}