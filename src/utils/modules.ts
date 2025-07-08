// src/utils/modules.ts - Configurazione sistema modulare
export interface AppModule {
  id: string
  name: string
  description: string
  icon: string
  href: string
  category: 'core' | 'optional'
  dependencies?: string[] // Moduli richiesti
  profiles: ('personal' | 'business' | 'investor' | 'custom')[]
}

export const APP_MODULES: Record<string, AppModule> = {
  // Moduli Core (sempre attivi)
  dashboard: {
    id: 'dashboard',
    name: 'Dashboard',
    description: 'Panoramica generale delle finanze',
    icon: '🏠',
    href: '/',
    category: 'core',
    profiles: ['personal', 'business', 'investor', 'custom']
  },
  accounts: {
    id: 'accounts',
    name: 'Conti',
    description: 'Gestione conti bancari e di investimento',
    icon: '🏦',
    href: '/accounts',
    category: 'core',
    profiles: ['personal', 'business', 'investor', 'custom']
  },
  income: {
    id: 'income',
    name: 'Entrate',
    description: 'Tracciamento entrate e ricavi',
    icon: '⬆️',
    href: '/income',
    category: 'core',
    profiles: ['personal', 'business', 'investor', 'custom']
  },
  expenses: {
    id: 'expenses',
    name: 'Uscite',
    description: 'Gestione spese e costi',
    icon: '⬇️',
    href: '/expenses',
    category: 'core',
    profiles: ['personal', 'business', 'investor', 'custom']
  },

  // Moduli Opzionali
  budget: {
    id: 'budget',
    name: 'Budget',
    description: 'Pianificazione e controllo budget',
    icon: '📊',
    href: '/budget',
    category: 'optional',
    profiles: ['personal', 'business', 'investor', 'custom']
  },
  investments: {
    id: 'investments',
    name: 'Investimenti',
    description: 'Portafogli crypto e DCA Bitcoin',
    icon: '📈',
    href: '/investments',
    category: 'optional',
    dependencies: ['accounts'],
    profiles: ['investor', 'custom']
  },
  partitaiva: {
    id: 'partitaiva',
    name: 'Partita IVA',
    description: 'Gestione fatturazione e tasse business',
    icon: '📋',
    href: '/partita-iva',
    category: 'optional',
    dependencies: ['accounts', 'income'],
    profiles: ['business', 'custom']
  },
  noncurrentassets: {
    id: 'noncurrentassets',
    name: 'Beni Non Correnti',
    description: 'Casa, auto, terreni e beni durevoli',
    icon: '🏠',
    href: '/beni-non-correnti',
    category: 'optional',
    profiles: ['business', 'investor', 'custom']
  },
  credits: {
    id: 'credits',
    name: 'Crediti',
    description: 'Prestiti e crediti verso terzi',
    icon: '💰',
    href: '/crediti',
    category: 'optional',
    profiles: ['business', 'custom']
  }
}

export interface AppProfile {
  id: string
  name: string
  description: string
  icon: string
  modules: string[]
  color: string
}

export const APP_PROFILES: Record<string, AppProfile> = {
  personal: {
    id: 'personal',
    name: 'Finanze Personali',
    description: 'Gestione semplice di entrate, uscite e budget familiari',
    icon: '🏠',
    modules: ['dashboard', 'accounts', 'income', 'expenses', 'budget'],
    color: '#3B82F6'
  },
  business: {
    id: 'business',
    name: 'Business/Freelancer',
    description: 'Gestione completa per attività commerciali e partita IVA',
    icon: '💼',
    modules: ['dashboard', 'accounts', 'income', 'expenses', 'budget', 'partitaiva', 'noncurrentassets', 'credits'],
    color: '#059669'
  },
  investor: {
    id: 'investor',
    name: 'Investitore',
    description: 'Focus su investimenti crypto, DCA e asset management',
    icon: '📈',
    modules: ['dashboard', 'accounts', 'income', 'expenses', 'budget', 'investments', 'noncurrentassets'],
    color: '#7C3AED'
  },
  custom: {
    id: 'custom',
    name: 'Personalizzato',
    description: 'Scegli tu quali moduli attivare in base alle tue necessità',
    icon: '⚙️',
    modules: [], // Verrà personalizzato dall'utente
    color: '#F59E0B'
  }
}

export type UserModuleSettings = {
  enabledModules: string[]
  preferences?: {
    [moduleId: string]: Record<string, any>
  }
}

export const getDefaultModuleSettings = (profileId: string): UserModuleSettings => {
  const profile = APP_PROFILES[profileId]
  
  // 🔧 FIX: I moduli core devono essere sempre inclusi
  const coreModules = Object.keys(APP_MODULES).filter(moduleId => 
    APP_MODULES[moduleId].category === 'core'
  )
  
  const profileModules = profile?.modules || []
  
  // Combina core modules con i moduli del profilo (senza duplicati)
  const enabledModules = Array.from(new Set([...coreModules, ...profileModules]))
  
  return {
    enabledModules,
    preferences: {}
  }
}

export const isModuleEnabled = (moduleSettings: UserModuleSettings | null, moduleId: string): boolean => {
  if (!moduleSettings) return false
  return moduleSettings.enabledModules.includes(moduleId)
}

export const getEnabledModules = (moduleSettings: UserModuleSettings | null): AppModule[] => {
  if (!moduleSettings) return []
  
  // Ordine personalizzato per i moduli core
  const coreOrder = ['dashboard', 'accounts', 'income', 'expenses']
  
  return moduleSettings.enabledModules
    .map(moduleId => APP_MODULES[moduleId])
    .filter(Boolean)
    .sort((a, b) => {
      // Core modules first, then by name
      if (a.category !== b.category) {
        return a.category === 'core' ? -1 : 1
      }
      
      // Se entrambi sono core, usa l'ordine personalizzato
      if (a.category === 'core' && b.category === 'core') {
        const aIndex = coreOrder.indexOf(a.id)
        const bIndex = coreOrder.indexOf(b.id)
        if (aIndex !== -1 && bIndex !== -1) {
          return aIndex - bIndex
        }
      }
      
      // Altrimenti ordina per nome
      return a.name.localeCompare(b.name)
    })
}

export const validateModuleDependencies = (enabledModules: string[]): string[] => {
  const errors: string[] = []
  
  enabledModules.forEach(moduleId => {
    const module = APP_MODULES[moduleId]
    if (module?.dependencies) {
      module.dependencies.forEach(depId => {
        if (!enabledModules.includes(depId)) {
          const depModule = APP_MODULES[depId]
          errors.push(`${module.name} richiede il modulo ${depModule?.name}`)
        }
      })
    }
  })
  
  return errors
}