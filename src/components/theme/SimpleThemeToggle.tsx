'use client'

import { useTheme } from '@/contexts/ThemeContext.simple'

export const SimpleThemeToggle = () => {
  const { theme, toggleTheme } = useTheme()

  return (
    <button
      onClick={toggleTheme}
      className="w-8 h-8 rounded-full card-adaptive hover:bg-adaptive-50 border-2 border-adaptive transition-all duration-300 flex items-center justify-center shadow-sm"
      title={theme === 'dark' ? 'Passa al tema chiaro' : 'Passa al tema scuro'}
    >
      {theme === 'dark' ? '🌙' : '☀️'}
    </button>
  )
}