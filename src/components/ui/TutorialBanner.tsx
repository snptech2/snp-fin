'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { XMarkIcon, LightBulbIcon, QuestionMarkCircleIcon } from '@heroicons/react/24/outline'
import { usePreferences } from '@/hooks/usePreferences'

interface TutorialBannerProps {
  id: string // Unique ID to track if user has dismissed it
  title: string
  steps: string[]
  variant?: 'info' | 'success' | 'warning'
  className?: string
  forceShow?: boolean // Force show tutorial even if dismissed
}

export default function TutorialBanner({
  id,
  title,
  steps,
  variant = 'info',
  className = '',
  forceShow = false
}: TutorialBannerProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [isDismissed, setIsDismissed] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const { preferences, updatePreference, loading } = usePreferences()

  // Memoizza il valore dismissed specifico per questo tutorial
  const dismissed = useMemo(() => {
    return preferences?.tutorialsDismissed?.[id] || false
  }, [preferences?.tutorialsDismissed, id])

  // Logica reattiva: tutorial visibile se NON dismissed (o forceShow)
  useEffect(() => {
    if (!loading) {
      const shouldBeVisible = !dismissed || forceShow
      setIsVisible(shouldBeVisible)
      setIsDismissed(dismissed)
    }
  }, [loading, dismissed, forceShow])

  const handleDismiss = useCallback(async () => {
    setIsUpdating(true)
    setIsVisible(false)
    setIsDismissed(true)
    
    try {
      // Accesso diretto alle preferenze invece di getPreference
      const currentTutorialsDismissed = preferences?.tutorialsDismissed || {}
      await updatePreference('tutorialsDismissed', {
        ...currentTutorialsDismissed,
        [id]: true
      })
    } catch (error) {
      console.error('Error saving tutorial dismissal:', error)
    } finally {
      setIsUpdating(false)
    }
  }, [id, preferences?.tutorialsDismissed, updatePreference])

  const handleReopen = useCallback(async () => {
    setIsUpdating(true)
    setIsVisible(true)
    setIsDismissed(false)
    
    try {
      // Accesso diretto alle preferenze invece di getPreference
      const currentTutorialsDismissed = preferences?.tutorialsDismissed || {}
      const updatedTutorials = { ...currentTutorialsDismissed }
      delete updatedTutorials[id]
      
      await updatePreference('tutorialsDismissed', updatedTutorials)
    } catch (error) {
      console.error('Error reopening tutorial:', error)
    } finally {
      setIsUpdating(false)
    }
  }, [id, preferences?.tutorialsDismissed, updatePreference])

  // Debug log per monitorare i cambiamenti di stato
  useEffect(() => {
    const tutorialsDismissed = preferences?.tutorialsDismissed || {}
    const dismissed = tutorialsDismissed[id] || false
    console.log(`🔍 Tutorial ${id}: dismissed=${dismissed}, isVisible=${isVisible}, isDismissed=${isDismissed}, loading=${loading}, isUpdating=${isUpdating}`)
  }, [id, isVisible, isDismissed, loading, isUpdating, preferences?.tutorialsDismissed])

  // Se il tutorial è stato dismisso, mostra solo un piccolo pulsante di help
  if (!isVisible && isDismissed) {
    return (
      <button
        onClick={handleReopen}
        className="inline-flex items-center gap-1 text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-200 text-sm hover:bg-blue-50 dark:hover:bg-blue-900/20 px-2 py-1 rounded transition-colors"
        title="Mostra tutorial"
      >
        <QuestionMarkCircleIcon className="w-4 h-4" />
        <span className="text-xs">Aiuto</span>
      </button>
    )
  }

  if (!isVisible) return null

  const variantClasses = {
    info: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200',
    success: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800 text-green-800 dark:text-green-200',
    warning: 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800 text-yellow-800 dark:text-yellow-200'
  }

  const iconColors = {
    info: 'text-blue-600 dark:text-blue-400',
    success: 'text-green-600 dark:text-green-400',
    warning: 'text-yellow-600 dark:text-yellow-400'
  }

  return (
    <div className={`rounded-lg border p-4 mb-6 ${variantClasses[variant]} ${className}`}>
      <div className="flex items-start gap-3">
        <LightBulbIcon className={`w-6 h-6 flex-shrink-0 mt-0.5 ${iconColors[variant]}`} />
        
        <div className="flex-1">
          <div className="flex items-start justify-between">
            <h3 className="font-semibold text-sm mb-2">{title}</h3>
            <button
              onClick={handleDismiss}
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 ml-2"
              aria-label="Chiudi tutorial"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
          
          <ol className="space-y-1 text-xs">
            {steps.map((step, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="font-semibold">{index + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  )
}