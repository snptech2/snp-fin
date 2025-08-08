'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'
import { usePreference } from '@/hooks/usePreferences'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: Theme
  actualTheme: 'light' | 'dark'
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
  loading: boolean
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

interface ThemeProviderProps {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('dark')
  const [theme, setThemePreference, loading] = usePreference('theme', 'system')

  // Detect system theme preference
  const getSystemTheme = (): 'light' | 'dark' => {
    if (typeof window !== 'undefined') {
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    }
    return 'dark'
  }

  // Update actual theme based on theme setting
  const updateActualTheme = useCallback((newTheme: Theme) => {
    let resolvedTheme: 'light' | 'dark'
    
    if (newTheme === 'system') {
      resolvedTheme = getSystemTheme()
    } else {
      resolvedTheme = newTheme
    }
    
    setActualTheme(resolvedTheme)
    
    // Apply theme to document
    if (typeof window !== 'undefined') {
      document.documentElement.setAttribute('data-theme', resolvedTheme)
      document.documentElement.classList.remove('light', 'dark')
      document.documentElement.classList.add(resolvedTheme)
    }
  }, [])

  // Update actual theme when theme preference changes
  useEffect(() => {
    if (theme && !loading) {
      updateActualTheme(theme)
    }
  }, [theme, loading, updateActualTheme])

  // Listen for system theme changes
  useEffect(() => {
    if (theme === 'system') {
      const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
      
      const handleChange = () => {
        updateActualTheme('system')
      }
      
      mediaQuery.addEventListener('change', handleChange)
      return () => mediaQuery.removeEventListener('change', handleChange)
    }
  }, [theme, updateActualTheme])

  const setTheme = useCallback(async (newTheme: Theme) => {
    try {
      await setThemePreference(newTheme)
      updateActualTheme(newTheme)
    } catch (error) {
      console.error('Error updating theme preference:', error)
    }
  }, [setThemePreference, updateActualTheme])

  const toggleTheme = useCallback(() => {
    if (theme === 'system') {
      // From system, go to opposite of current system preference
      const systemTheme = getSystemTheme()
      setTheme(systemTheme === 'dark' ? 'light' : 'dark')
    } else if (theme === 'dark') {
      setTheme('light')
    } else {
      setTheme('dark')
    }
  }, [theme, setTheme])

  const value: ThemeContextType = {
    theme: theme || 'system',
    actualTheme,
    setTheme,
    toggleTheme,
    loading
  }

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  const context = useContext(ThemeContext)
  if (context === undefined) {
    throw new Error('useTheme deve essere usato all\'interno di ThemeProvider')
  }
  return context
}