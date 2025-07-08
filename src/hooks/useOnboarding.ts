// src/hooks/useOnboarding.ts - Hook per gestire stato onboarding
import { useState, useEffect } from 'react'
import { UserModuleSettings } from '@/utils/modules'
import { useAuth } from '@/contexts/AuthContext'

interface OnboardingState {
  onboardingStep: number
  onboardingCompleted: boolean
  appProfile: string | null
  moduleSettings: UserModuleSettings | null
  onboardingCompletedAt: string | null
}

export const useOnboarding = () => {
  const { user } = useAuth()
  const [onboardingState, setOnboardingState] = useState<OnboardingState>({
    onboardingStep: 0,
    onboardingCompleted: false,
    appProfile: null,
    moduleSettings: null,
    onboardingCompletedAt: null
  })
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchOnboardingState = async () => {
    // Non fare nulla se l'utente non è autenticato
    if (!user) {
      setLoading(false)
      return
    }
    
    try {
      setLoading(true)
      const response = await fetch('/api/user/onboarding')
      
      if (response.ok) {
        const data = await response.json()
        console.log('📊 Onboarding state fetched:', data)
        setOnboardingState(data)
        
        // Se l'onboarding è completato, nascondi subito il loading
        if (data.onboardingCompleted) {
          setLoading(false)
        }
      } else {
        throw new Error('Errore nel caricamento stato onboarding')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto')
    } finally {
      setLoading(false)
    }
  }

  const needsOnboarding = () => {
    // Se non c'è utente o stiamo ancora caricando, non mostrare onboarding
    if (!user || loading) return false
    
    console.log('🎯 Checking onboarding needs:', {
      onboardingCompleted: onboardingState.onboardingCompleted,
      onboardingStep: onboardingState.onboardingStep,
      needsOnboarding: !onboardingState.onboardingCompleted || onboardingState.onboardingStep < 5
    })
    return !onboardingState.onboardingCompleted || onboardingState.onboardingStep < 5
  }

  const completeOnboarding = () => {
    setOnboardingState(prev => ({
      ...prev,
      onboardingCompleted: true,
      onboardingStep: 5
    }))
  }

  useEffect(() => {
    // Solo se l'utente è presente, controlla l'onboarding
    if (user) {
      fetchOnboardingState()
    } else {
      // Se non c'è utente, resetta lo stato
      setOnboardingState({
        onboardingStep: 0,
        onboardingCompleted: false,
        appProfile: null,
        moduleSettings: null,
        onboardingCompletedAt: null
      })
      setLoading(false)
    }
  }, [user]) // Ricarica quando l'utente cambia

  return {
    onboardingState,
    loading,
    error,
    needsOnboarding: needsOnboarding(),
    completeOnboarding,
    refreshOnboardingState: fetchOnboardingState
  }
}