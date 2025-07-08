// src/components/onboarding/OnboardingWizard.tsx - Wizard onboarding guidato
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { APP_PROFILES, APP_MODULES, UserModuleSettings, getDefaultModuleSettings } from '@/utils/modules'

interface OnboardingWizardProps {
  onComplete: () => void
}

export default function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [selectedProfile, setSelectedProfile] = useState<string>('')
  const [customModules, setCustomModules] = useState<string[]>([])
  const [accountData, setAccountData] = useState({
    name: 'Conto Principale',
    type: 'bank' as 'bank' | 'investment',
    balance: 0,
    currency: 'EUR'
  })

  const totalSteps = 5

  const handleProfileSelect = (profileId: string) => {
    setSelectedProfile(profileId)
    if (profileId !== 'custom') {
      setCustomModules(APP_PROFILES[profileId]?.modules || [])
    }
  }

  const handleModuleToggle = (moduleId: string) => {
    setCustomModules(prev => 
      prev.includes(moduleId)
        ? prev.filter(id => id !== moduleId)
        : [...prev, moduleId]
    )
  }

  const handleNext = async () => {
    setLoading(true)
    
    try {
      let requestData: any = { step: currentStep + 1 }

      // Step 2: Salva profilo selezionato
      if (currentStep === 2 && selectedProfile) {
        requestData.profileId = selectedProfile
      }

      // Step 3: Salva moduli custom
      if (currentStep === 3 && selectedProfile === 'custom') {
        // 🔧 FIX: Includi sempre i moduli core per il profilo custom
        const coreModules = Object.keys(APP_MODULES).filter(moduleId => 
          APP_MODULES[moduleId].category === 'core'
        )
        
        // Combina core modules con i moduli opzionali selezionati
        const allEnabledModules = Array.from(new Set([...coreModules, ...customModules]))
        
        console.log('🔧 ONBOARDING DEBUG:')
        console.log('- Core modules:', coreModules)
        console.log('- Custom modules:', customModules)
        console.log('- All enabled modules:', allEnabledModules)
        
        const moduleSettings: UserModuleSettings = {
          enabledModules: allEnabledModules,
          preferences: {}
        }
        requestData.moduleSettings = moduleSettings
      }

      // Step 4: Salva dati iniziali
      if (currentStep === 4) {
        requestData.accountData = accountData
        requestData.categoryData = getDefaultCategories(selectedProfile)
      }
      
      // Step 5: Completa onboarding e crea dati finali se non già fatto
      if (currentStep === 5) {
        requestData.accountData = accountData
        requestData.categoryData = getDefaultCategories(selectedProfile)
      }

      console.log('🚀 Sending to API:', requestData)
      
      const response = await fetch('/api/user/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestData)
      })

      if (response.ok) {
        if (currentStep >= totalSteps) {
          onComplete()
        } else {
          setCurrentStep(prev => prev + 1)
        }
      } else {
        throw new Error('Errore nel salvataggio')
      }
    } catch (error) {
      console.error('Errore onboarding:', error)
      alert('Errore nel salvataggio. Riprova.')
    } finally {
      setLoading(false)
    }
  }

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1)
    }
  }

  return (
    <div className="min-h-screen bg-adaptive-50 flex items-center justify-center p-4">
      <div className="card-adaptive rounded-2xl shadow-xl w-full max-w-4xl p-8 border border-adaptive">
        
        {/* Header con progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <h1 className="text-3xl font-bold text-adaptive-900">
              Benvenuto in SNP Finance! 🎉
            </h1>
            <div className="text-sm text-adaptive-600">
              Step {currentStep} di {totalSteps}
            </div>
          </div>
          
          {/* Progress bar */}
          <div className="w-full bg-adaptive-200 rounded-full h-2">
            <div 
              className="bg-info h-2 rounded-full transition-all duration-300"
              style={{ width: `${(currentStep / totalSteps) * 100}%` }}
            />
          </div>
        </div>

        {/* Step Content */}
        <div className="mb-8 min-h-[400px]">
          {currentStep === 1 && <WelcomeStep />}
          {currentStep === 2 && (
            <ProfileSelectionStep 
              selectedProfile={selectedProfile}
              onProfileSelect={handleProfileSelect}
            />
          )}
          {currentStep === 3 && selectedProfile === 'custom' && (
            <CustomModulesStep
              selectedModules={customModules}
              onModuleToggle={handleModuleToggle}
            />
          )}
          {currentStep === 3 && selectedProfile !== 'custom' && (
            <ProfileSummaryStep profileId={selectedProfile} />
          )}
          {currentStep === 4 && (
            <InitialSetupStep
              accountData={accountData}
              setAccountData={setAccountData}
              profileId={selectedProfile}
            />
          )}
          {currentStep === 5 && (
            <CompletionStep profileId={selectedProfile} />
          )}
        </div>

        {/* Navigation */}
        <div className="flex justify-between">
          <button
            onClick={handleBack}
            disabled={currentStep === 1 || loading}
            className="px-6 py-2 text-adaptive-600 hover:text-adaptive-800 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            ← Indietro
          </button>
          
          <button
            onClick={handleNext}
            disabled={loading || (currentStep === 2 && !selectedProfile)}
            className="px-8 py-3 bg-info text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {loading && <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent" />}
            <span>
              {currentStep >= totalSteps ? 'Inizia!' : 'Continua →'}
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}

// Step Components
function WelcomeStep() {
  return (
    <div className="text-center py-12">
      <div className="text-6xl mb-6">🚀</div>
      <h2 className="text-3xl font-bold mb-4 text-adaptive-900">Configuriamo l'app per te!</h2>
      <p className="text-xl text-adaptive-600 mb-8 max-w-2xl mx-auto">
        In pochi minuti personalizzeremo SNP Finance in base alle tue necessità.
        Potrai sempre modificare queste impostazioni in seguito.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-12">
        <div className="p-6 card-adaptive border border-adaptive rounded-lg">
          <div className="text-3xl mb-3">⚡</div>
          <h3 className="font-semibold mb-2 text-adaptive-900">Setup Veloce</h3>
          <p className="text-sm text-adaptive-700">Solo 5 minuti per configurare tutto</p>
        </div>
        <div className="p-6 card-adaptive border border-adaptive rounded-lg">
          <div className="text-3xl mb-3">🎯</div>
          <h3 className="font-semibold mb-2 text-adaptive-900">Personalizzato</h3>
          <p className="text-sm text-adaptive-700">App su misura per le tue esigenze</p>
        </div>
        <div className="p-6 card-adaptive border border-adaptive rounded-lg">
          <div className="text-3xl mb-3">🔧</div>
          <h3 className="font-semibold mb-2 text-adaptive-900">Modificabile</h3>
          <p className="text-sm text-adaptive-700">Puoi cambiare tutto quando vuoi</p>
        </div>
      </div>
    </div>
  )
}

function ProfileSelectionStep({ selectedProfile, onProfileSelect }: {
  selectedProfile: string
  onProfileSelect: (profileId: string) => void
}) {
  return (
    <div className="py-8">
      <h2 className="text-2xl font-bold mb-4 text-center text-adaptive-900">
        Come userai SNP Finance?
      </h2>
      <p className="text-adaptive-600 text-center mb-8">
        Scegli il profilo che meglio descrive le tue necessità
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {Object.values(APP_PROFILES).map(profile => (
          <button
            key={profile.id}
            onClick={() => onProfileSelect(profile.id)}
            className={`p-6 rounded-xl border-2 text-left transition-all ${
              selectedProfile === profile.id
                ? 'border-info card-adaptive ring-2 ring-info ring-opacity-20'
                : 'border-adaptive hover:border-adaptive card-adaptive'
            }`}
          >
            <div className="flex items-start space-x-4">
              <div className="text-3xl">{profile.icon}</div>
              <div className="flex-1">
                <h3 className="font-semibold text-lg mb-2 text-adaptive-900">{profile.name}</h3>
                <p className="text-adaptive-600 text-sm mb-3">{profile.description}</p>
                <div className="flex flex-wrap gap-1">
                  {profile.modules.map(moduleId => {
                    const module = APP_MODULES[moduleId]
                    return module ? (
                      <span key={moduleId} className="text-xs card-adaptive border border-adaptive px-2 py-1 rounded">
                        {module.icon} {module.name}
                      </span>
                    ) : null
                  })}
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

function CustomModulesStep({ selectedModules, onModuleToggle }: {
  selectedModules: string[]
  onModuleToggle: (moduleId: string) => void
}) {
  const coreModules = Object.values(APP_MODULES).filter(m => m.category === 'core')
  const optionalModules = Object.values(APP_MODULES).filter(m => m.category === 'optional')

  return (
    <div className="py-8">
      <h2 className="text-2xl font-bold mb-4 text-center text-adaptive-900">
        Personalizza i tuoi moduli
      </h2>
      <p className="text-adaptive-600 text-center mb-8">
        Scegli quali funzionalità attivare nell'app
      </p>

      <div className="space-y-8">
        {/* Core Modules */}
        <div>
          <h3 className="font-semibold mb-4 text-adaptive-800">
            📦 Moduli Base (sempre attivi)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {coreModules.map(module => (
              <div key={module.id} className="p-4 card-adaptive border border-adaptive rounded-lg opacity-75">
                <div className="flex items-center space-x-3">
                  <span className="text-2xl">{module.icon}</span>
                  <div>
                    <div className="font-medium text-adaptive-900">{module.name}</div>
                    <div className="text-sm text-adaptive-600">{module.description}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Optional Modules */}
        <div>
          <h3 className="font-semibold mb-4 text-adaptive-800">
            🎯 Moduli Opzionali
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {optionalModules.map(module => {
              const isSelected = selectedModules.includes(module.id)
              return (
                <button
                  key={module.id}
                  onClick={() => onModuleToggle(module.id)}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    isSelected
                      ? 'border-info card-adaptive ring-2 ring-info ring-opacity-20'
                      : 'border-adaptive hover:border-adaptive card-adaptive'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <span className="text-2xl">{module.icon}</span>
                    <div className="flex-1">
                      <div className="font-medium text-adaptive-900">{module.name}</div>
                      <div className="text-sm text-adaptive-600">{module.description}</div>
                    </div>
                    <div className={`w-5 h-5 rounded border-2 ${
                      isSelected ? 'bg-info border-info' : 'border-adaptive'
                    }`}>
                      {isSelected && (
                        <svg className="w-3 h-3 text-white m-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      )}
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}

function ProfileSummaryStep({ profileId }: { profileId: string }) {
  const profile = APP_PROFILES[profileId]
  if (!profile) return null

  return (
    <div className="py-8 text-center">
      <div className="text-4xl mb-4">{profile.icon}</div>
      <h2 className="text-2xl font-bold mb-4 text-adaptive-900">
        Perfetto! Hai scelto "{profile.name}"
      </h2>
      <p className="text-adaptive-600 mb-8 max-w-2xl mx-auto">
        {profile.description}
      </p>
      
      <div className="card-adaptive border border-adaptive rounded-lg p-6 max-w-2xl mx-auto">
        <h3 className="font-semibold mb-4 text-adaptive-900">Moduli che verranno attivati:</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {profile.modules.map(moduleId => {
            const module = APP_MODULES[moduleId]
            return module ? (
              <div key={moduleId} className="flex items-center space-x-2 text-sm text-adaptive-700">
                <span>{module.icon}</span>
                <span>{module.name}</span>
              </div>
            ) : null
          })}
        </div>
      </div>
    </div>
  )
}

function InitialSetupStep({ accountData, setAccountData, profileId }: {
  accountData: any
  setAccountData: (data: any) => void
  profileId: string
}) {
  return (
    <div className="py-8">
      <h2 className="text-2xl font-bold mb-4 text-center text-adaptive-900">
        Configura il tuo primo conto
      </h2>
      <p className="text-adaptive-600 text-center mb-8">
        Creiamo il tuo conto principale per iniziare
      </p>

      <div className="max-w-md mx-auto space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2 text-adaptive-700">Nome conto</label>
          <input
            type="text"
            value={accountData.name}
            onChange={(e) => setAccountData({...accountData, name: e.target.value})}
            className="w-full px-3 py-2 border border-adaptive rounded-lg focus:ring-2 focus:ring-info focus:border-transparent"
            placeholder="Es: Conto Corrente Principale"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-adaptive-700">Tipo conto</label>
          <select
            value={accountData.type}
            onChange={(e) => setAccountData({...accountData, type: e.target.value as 'bank' | 'investment'})}
            className="w-full px-3 py-2 border border-adaptive rounded-lg focus:ring-2 focus:ring-info focus:border-transparent"
          >
            <option value="bank">🏦 Conto Bancario</option>
            <option value="investment">📈 Conto Investimenti</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-adaptive-700">Valuta</label>
          <select
            value={accountData.currency}
            onChange={(e) => setAccountData({...accountData, currency: e.target.value})}
            className="w-full px-3 py-2 border border-adaptive rounded-lg focus:ring-2 focus:ring-info focus:border-transparent"
          >
            <option value="EUR">🇪🇺 Euro (€)</option>
            <option value="USD">🇺🇸 US Dollar ($)</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-adaptive-700">Saldo iniziale (opzionale)</label>
          <input
            type="number"
            value={accountData.balance}
            onChange={(e) => {
              const value = parseFloat(e.target.value) || 0
              // 🔒 VALIDAZIONE: Limita saldo iniziale
              const cappedValue = Math.max(0, Math.min(value, 1000000)) // Max 1M, min 0
              setAccountData({...accountData, balance: cappedValue})
            }}
            className="w-full px-3 py-2 border border-adaptive rounded-lg focus:ring-2 focus:ring-info focus:border-transparent"
            placeholder="0.00"
            step="0.01"
            min="0"
            max="1000000"
          />
          <p className="text-xs text-adaptive-500 mt-1">
            💡 Se inserisci un saldo, verrà creata automaticamente una transazione "Saldo Iniziale"
          </p>
        </div>
      </div>
    </div>
  )
}

function CompletionStep({ profileId }: { profileId: string }) {
  const profile = APP_PROFILES[profileId]
  
  const getProfileSuggestions = (profileId: string) => {
    switch (profileId) {
      case 'personal':
        return [
          '• Configura il tuo budget mensile nella sezione Budget',
          '• Aggiungi le tue categorie di spesa preferite',
          '• Imposta i tuoi conti bancari principali',
          '• Inizia a tracciare entrate e uscite giornaliere'
        ]
      case 'business':
        return [
          '• Configura la tua Partita IVA nella sezione dedicata',
          '• Inizia a creare fatture per i tuoi clienti',
          '• Gestisci i tuoi beni aziendali e ammortamenti',
          '• Tieni traccia di crediti e debiti commerciali'
        ]
      case 'investor':
        return [
          '• Crea il tuo primo portafoglio crypto',
          '• Imposta il DCA Bitcoin per investimenti automatici',
          '• Registra i tuoi beni non correnti (immobili, ecc.)',
          '• Analizza le performance dei tuoi investimenti'
        ]
      case 'custom':
        return [
          '• Esplora i moduli che hai attivato',
          '• Personalizza l\'app secondo le tue esigenze',
          '• Configura le funzionalità più importanti per te',
          '• Modifica i moduli quando necessario dalle impostazioni'
        ]
      default:
        return [
          '• Inizia a registrare entrate e uscite',
          '• Esplora i moduli attivati',
          '• Personalizza categorie e budget',
          '• Accedi alle impostazioni per modifiche'
        ]
    }
  }

  return (
    <div className="py-8 text-center">
      <div className="text-6xl mb-6">🎉</div>
      <h2 className="text-3xl font-bold mb-4 text-adaptive-900">
        Perfetto! Sei pronto per iniziare!
      </h2>
      <p className="text-xl text-adaptive-600 mb-8 max-w-2xl mx-auto">
        SNP Finance è stato configurato per il profilo "{profile?.name}".
        Puoi sempre modificare queste impostazioni dalle impostazioni dell'app.
      </p>
      
      <div className="card-adaptive border border-adaptive rounded-lg p-6 max-w-2xl mx-auto">
        <h3 className="font-semibold text-adaptive-800 mb-2">🚀 Cosa puoi fare ora:</h3>
        <ul className="text-left text-adaptive-700 space-y-1">
          {getProfileSuggestions(profileId).map((suggestion, index) => (
            <li key={index}>{suggestion}</li>
          ))}
        </ul>
      </div>
    </div>
  )
}

// Helper function per categorie default
function getDefaultCategories(profileId: string) {
  const baseCategories = [
    // Income categories
    { name: 'Stipendio', type: 'income', color: '#10B981' },
    { name: 'Freelance', type: 'income', color: '#3B82F6' },
    { name: 'Altro', type: 'income', color: '#6B7280' },
    
    // Expense categories
    { name: 'Alimentari', type: 'expense', color: '#EF4444' },
    { name: 'Trasporti', type: 'expense', color: '#F59E0B' },
    { name: 'Bollette', type: 'expense', color: '#8B5CF6' },
    { name: 'Tempo Libero', type: 'expense', color: '#EC4899' },
    { name: 'Altro', type: 'expense', color: '#6B7280' }
  ]

  if (profileId === 'business') {
    baseCategories.push(
      { name: 'Fatturato', type: 'income', color: '#059669' },
      { name: 'Spese Business', type: 'expense', color: '#DC2626' },
      { name: 'Tasse', type: 'expense', color: '#7C2D12' }
    )
  }

  return baseCategories
}