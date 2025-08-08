// src/hooks/usePreferences.ts
import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/contexts/AuthContext'

// Tipizzazione delle preferenze
export interface UserPreferences {
  theme?: 'light' | 'dark' | 'system'
  tutorialsDismissed?: Record<string, boolean>
  expensesExcludedCategories?: (string | number)[]
  dashboardChartColors?: Record<string, any>
  autoSnapshotSettings?: {
    enabled?: boolean
    lastSnapshot?: string
    frequency?: '6h' | '12h' | '24h'
    [key: string]: any
  }
}

// Chiavi localStorage da migrare
const LEGACY_KEYS = [
  'theme',
  'expensesExcludedCategories', 
  'dashboardChartColors',
  'autoSnapshotSettings'
] as const

// Pattern per tutorial dismissals
const TUTORIAL_PATTERN = /^tutorial_dismissed_(.+)$/

interface UsePreferencesReturn {
  preferences: UserPreferences
  loading: boolean
  error: string | null
  updatePreference: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => Promise<void>
  updatePreferences: (newPreferences: Partial<UserPreferences>) => Promise<void>
  getPreference: <K extends keyof UserPreferences>(key: K, defaultValue?: UserPreferences[K]) => UserPreferences[K]
  resetPreferences: () => Promise<void>
}

export function usePreferences(): UsePreferencesReturn {
  const { user } = useAuth()
  const [preferences, setPreferences] = useState<UserPreferences>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [hasMigrated, setHasMigrated] = useState(false)

  // Funzione per migrare da localStorage
  const migrateFromLocalStorage = useCallback((): UserPreferences => {
    if (typeof window === 'undefined') return {}
    
    const migrated: UserPreferences = {}
    
    try {
      // Migra le chiavi semplici
      LEGACY_KEYS.forEach(key => {
        const value = localStorage.getItem(key)
        if (value) {
          try {
            // Prova a parsare come JSON, altrimenti usa il valore stringa
            const parsed = key === 'theme' ? value : JSON.parse(value)
            migrated[key] = parsed
          } catch {
            // Se non è JSON valido, usa come stringa (per theme)
            if (key === 'theme') {
              migrated[key] = value as 'light' | 'dark' | 'system'
            }
          }
        }
      })

      // Migra tutorial dismissals
      const tutorialsDismissed: Record<string, boolean> = {}
      Object.keys(localStorage).forEach(key => {
        const match = key.match(TUTORIAL_PATTERN)
        if (match && localStorage.getItem(key) === 'true') {
          tutorialsDismissed[match[1]] = true
        }
      })
      
      if (Object.keys(tutorialsDismissed).length > 0) {
        migrated.tutorialsDismissed = tutorialsDismissed
      }

    } catch (error) {
      console.warn('Error during localStorage migration:', error)
    }

    return migrated
  }, [])

  // Funzione per pulire localStorage dopo migrazione
  const cleanupLocalStorage = useCallback(() => {
    if (typeof window === 'undefined') return
    
    try {
      // Rimuovi le chiavi migrate
      LEGACY_KEYS.forEach(key => {
        localStorage.removeItem(key)
      })

      // Rimuovi tutorial dismissals
      Object.keys(localStorage).forEach(key => {
        if (TUTORIAL_PATTERN.test(key)) {
          localStorage.removeItem(key)
        }
      })

      console.log('🧹 localStorage cleaned up after migration')
    } catch (error) {
      console.warn('Error cleaning up localStorage:', error)
    }
  }, [])

  // Carica preferenze dal server
  const loadPreferences = useCallback(async () => {
    if (!user) {
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/user/preferences')
      
      if (response.ok) {
        const data = await response.json()
        let serverPreferences = data.preferences || {}

        // Se non ci sono preferenze sul server e non abbiamo ancora migrato
        if (Object.keys(serverPreferences).length === 0 && !hasMigrated) {
          const migratedPreferences = migrateFromLocalStorage()
          
          if (Object.keys(migratedPreferences).length > 0) {
            console.log('📦 Migrating preferences from localStorage to server')
            
            // Salva le preferenze migrate sul server
            await updatePreferences(migratedPreferences)
            serverPreferences = migratedPreferences
            
            // Pulisci localStorage solo dopo il successo
            cleanupLocalStorage()
            setHasMigrated(true)
          }
        }

        setPreferences(serverPreferences)
        setError(null)
      } else {
        throw new Error('Failed to load preferences')
      }
    } catch (err) {
      console.error('Error loading preferences:', err)
      setError('Errore nel caricamento delle preferenze')
      
      // Fallback a localStorage se il server non è disponibile
      const localPreferences = migrateFromLocalStorage()
      setPreferences(localPreferences)
    } finally {
      setLoading(false)
    }
  }, [user, hasMigrated, migrateFromLocalStorage, cleanupLocalStorage])

  // Aggiorna multiple preferenze
  const updatePreferences = useCallback(async (newPreferences: Partial<UserPreferences>) => {
    if (!user) return

    try {
      const response = await fetch('/api/user/preferences', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ preferences: newPreferences })
      })

      if (response.ok) {
        const data = await response.json()
        setPreferences(data.preferences)
        setError(null)
      } else {
        throw new Error('Failed to update preferences')
      }
    } catch (err) {
      console.error('Error updating preferences:', err)
      setError('Errore nell\'aggiornamento delle preferenze')
    }
  }, [user])

  // Aggiorna singola preferenza
  const updatePreference = useCallback(async <K extends keyof UserPreferences>(
    key: K, 
    value: UserPreferences[K]
  ) => {
    await updatePreferences({ [key]: value })
  }, [updatePreferences])

  // Ottieni singola preferenza con valore di default
  const getPreference = useCallback(<K extends keyof UserPreferences>(
    key: K, 
    defaultValue?: UserPreferences[K]
  ): UserPreferences[K] => {
    return preferences[key] ?? defaultValue
  }, [preferences])

  // Reset tutte le preferenze
  const resetPreferences = useCallback(async () => {
    if (!user) return

    try {
      const response = await fetch('/api/user/preferences', {
        method: 'DELETE'
      })

      if (response.ok) {
        setPreferences({})
        setError(null)
        
        // Pulisci anche localStorage
        cleanupLocalStorage()
      } else {
        throw new Error('Failed to reset preferences')
      }
    } catch (err) {
      console.error('Error resetting preferences:', err)
      setError('Errore nel reset delle preferenze')
    }
  }, [user, cleanupLocalStorage])

  // Carica preferenze quando l'utente cambia
  useEffect(() => {
    loadPreferences()
  }, [loadPreferences])

  return {
    preferences,
    loading,
    error,
    updatePreference,
    updatePreferences,
    getPreference,
    resetPreferences
  }
}

// Hook semplificato per singole preferenze
export function usePreference<K extends keyof UserPreferences>(
  key: K, 
  defaultValue?: UserPreferences[K]
): [UserPreferences[K], (value: UserPreferences[K]) => Promise<void>, boolean] {
  const { getPreference, updatePreference, loading } = usePreferences()
  
  const value = getPreference(key, defaultValue)
  const setValue = useCallback((newValue: UserPreferences[K]) => {
    return updatePreference(key, newValue)
  }, [updatePreference, key])

  return [value, setValue, loading]
}