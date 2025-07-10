'use client'

import { createContext, useContext, useEffect, useState, ReactNode, useCallback } from 'react'

type Theme = 'light' | 'dark' | 'system'

interface ThemeContextType {
  theme: Theme
  actualTheme: 'light' | 'dark'
  setTheme: (theme: Theme) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined)

interface ThemeProviderProps {
  children: ReactNode
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>('system')
  const [actualTheme, setActualTheme] = useState<'light' | 'dark'>('dark')

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

  // Load theme from localStorage on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme') as Theme
    const initialTheme = savedTheme || 'system'
    
    setThemeState(initialTheme)
    updateActualTheme(initialTheme)
  }, [updateActualTheme])

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

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme)
    updateActualTheme(newTheme)
    localStorage.setItem('theme', newTheme)
  }

  const toggleTheme = () => {
    if (theme === 'system') {
      // From system, go to opposite of current system preference
      const systemTheme = getSystemTheme()
      setTheme(systemTheme === 'dark' ? 'light' : 'dark')
    } else if (theme === 'dark') {
      setTheme('light')
    } else {
      setTheme('dark')
    }
  }

  const value: ThemeContextType = {
    theme,
    actualTheme,
    setTheme,
    toggleTheme
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