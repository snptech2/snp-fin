// src/hooks/useUserModules.ts - Hook per gestire moduli utente
import { useState, useEffect } from 'react'
import { UserModuleSettings, getEnabledModules, isModuleEnabled, AppModule } from '@/utils/modules'

export const useUserModules = () => {
  const [moduleSettings, setModuleSettings] = useState<UserModuleSettings | null>(null)
  const [appProfile, setAppProfile] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchModuleSettings = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/user/modules')
      
      if (response.ok) {
        const data = await response.json()
        setModuleSettings(data.moduleSettings)
        setAppProfile(data.appProfile)
      } else {
        throw new Error('Errore nel caricamento moduli')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto')
    } finally {
      setLoading(false)
    }
  }

  const updateModuleSettings = async (newSettings: UserModuleSettings, newProfile?: string) => {
    try {
      const response = await fetch('/api/user/modules', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          moduleSettings: newSettings,
          appProfile: newProfile
        })
      })

      if (response.ok) {
        const data = await response.json()
        setModuleSettings(data.moduleSettings)
        setAppProfile(data.appProfile)
        return { success: true }
      } else {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Errore nell\'aggiornamento')
      }
    } catch (err) {
      return { 
        success: false, 
        error: err instanceof Error ? err.message : 'Errore sconosciuto' 
      }
    }
  }

  const toggleModule = async (moduleId: string) => {
    console.log('🔄 Toggle module called:', moduleId)
    if (!moduleSettings) {
      console.error('❌ Module settings not loaded')
      return { success: false, error: 'Configurazione non caricata' }
    }

    const currentModules = moduleSettings.enabledModules
    
    let newModules: string[]
    
    if (currentModules.includes(moduleId)) {
      // Disattivazione - rimuovi il modulo
      newModules = currentModules.filter(id => id !== moduleId)
    } else {
      // Attivazione - aggiungi il modulo e le sue dipendenze
      const { APP_MODULES } = await import('@/utils/modules')
      const module = APP_MODULES[moduleId]
      
      // Aggiungi il modulo stesso
      newModules = [...currentModules, moduleId]
      
      // Aggiungi automaticamente le dipendenze se non ci sono
      if (module?.dependencies) {
        module.dependencies.forEach(depId => {
          if (!newModules.includes(depId)) {
            newModules.push(depId)
            console.log(`🔗 Auto-adding dependency: ${depId}`)
          }
        })
      }
    }

    console.log('📦 Current modules:', currentModules)
    console.log('📦 New modules:', newModules)

    const newSettings: UserModuleSettings = {
      ...moduleSettings,
      enabledModules: newModules
    }

    const result = await updateModuleSettings(newSettings)
    console.log('✅ Toggle result:', result)
    return result
  }

  const getEnabledModulesList = (): AppModule[] => {
    return getEnabledModules(moduleSettings)
  }

  const isModuleActive = (moduleId: string): boolean => {
    return isModuleEnabled(moduleSettings, moduleId)
  }

  useEffect(() => {
    fetchModuleSettings()
  }, [])

  return {
    moduleSettings,
    appProfile,
    loading,
    error,
    updateModuleSettings,
    toggleModule,
    getEnabledModulesList,
    isModuleActive,
    refreshModuleSettings: fetchModuleSettings
  }
}