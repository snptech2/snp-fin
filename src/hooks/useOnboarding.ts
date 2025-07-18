// src/hooks/useOnboarding.ts - Hook per gestire stato onboarding
import { useState, useEffect, useCallback, useMemo } from 'react'
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
  const [loading, setLoading] = useState(true) // 🔧 FIX: Inizia con true per evitare flash
  const [error, setError] = useState<string | null>(null)

  const fetchOnboardingState = useCallback(async () => {
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
        
        // 🔧 FIX: Riduci il tempo di loading per UX migliore
        // Nascondi subito il loading se abbiamo dati validi
        setLoading(false)
      } else {
        throw new Error('Errore nel caricamento stato onboarding')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Errore sconosciuto')
      setLoading(false)
    }
  }, [user])

  const needsOnboarding = useMemo(() => {
    // Se non c'è utente o stiamo ancora caricando, non mostrare onboarding
    if (!user || loading) return false
    
    // 🔧 FIX: Prevenire flash dell'onboarding
    // Se l'onboarding state è ancora nel valore di default, probabilmente stiamo ancora caricando
    if (onboardingState.onboardingStep === 0 && 
        onboardingState.onboardingCompleted === false && 
        onboardingState.appProfile === null) {
      return false // Non mostrare onboarding finché non abbiamo dati reali
    }
    
    const needs = !onboardingState.onboardingCompleted || onboardingState.onboardingStep < 5
    
    // Riduci il logging per evitare spam
    if (Math.random() < 0.1) { // Log solo il 10% delle volte
      console.log('🎯 Checking onboarding needs:', {
        onboardingCompleted: onboardingState.onboardingCompleted,
        onboardingStep: onboardingState.onboardingStep,
        needsOnboarding: needs,
        hasDefaultState: onboardingState.onboardingStep === 0 && onboardingState.onboardingCompleted === false
      })
    }
    
    return needs
  }, [user, loading, onboardingState.onboardingCompleted, onboardingState.onboardingStep, onboardingState.appProfile])

  const completeOnboarding = useCallback(() => {
    setOnboardingState(prev => ({
      ...prev,
      onboardingCompleted: true,
      onboardingStep: 5
    }))
  }, [])

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
  }, [user]) // Rimossa dipendenza circolare fetchOnboardingState

  return {
    onboardingState,
    loading,
    error,
    needsOnboarding,
    completeOnboarding,
    refreshOnboardingState: fetchOnboardingState
  }
}