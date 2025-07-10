'use client'

import { useTheme } from '@/contexts/ThemeContext'

interface ThemeToggleProps {
  size?: 'sm' | 'md' | 'lg'
  className?: string
}

export const ThemeToggle = ({ size = 'md', className = '' }: ThemeToggleProps) => {
  const { theme, actualTheme, toggleTheme } = useTheme()

  const sizes = {
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-12 h-12 text-lg'
  }

  const getIcon = () => {
    if (theme === 'system') {
      return actualTheme === 'dark' ? '🌙' : '☀️'
    }
    return actualTheme === 'dark' ? '🌙' : '☀️'
  }

  const getTooltip = () => {
    if (theme === 'system') {
      return `Sistema (${actualTheme === 'dark' ? 'Scuro' : 'Chiaro'})`
    }
    return actualTheme === 'dark' ? 'Tema Scuro' : 'Tema Chiaro'
  }

  return (
    <button
      onClick={toggleTheme}
      className={`
        ${sizes[size]}
        ${className}
        relative
        rounded-full
        bg-gray-200 dark:bg-gray-700
        hover:bg-gray-300 dark:hover:bg-gray-600
        border-2 border-gray-300 dark:border-gray-600
        transition-all duration-300 ease-in-out
        flex items-center justify-center
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        group
        shadow-sm hover:shadow-md
      `}
      title={getTooltip()}
      aria-label={`Cambia tema - Corrente: ${getTooltip()}`}
    >
      <span 
        className="
          transition-transform duration-300 ease-in-out
          group-hover:scale-110
          group-active:scale-95
        "
      >
        {getIcon()}
      </span>
      
      {/* Indicator for system theme */}
      {theme === 'system' && (
        <div className="
          absolute -top-1 -right-1
          w-3 h-3
          bg-blue-500
          rounded-full
          border-2 border-white dark:border-gray-800
          transition-all duration-300
        " />
      )}
    </button>
  )
}

// Advanced theme selector component for settings
export const ThemeSelector = () => {
  const { theme, setTheme, actualTheme } = useTheme()

  const options = [
    { value: 'light' as const, label: 'Chiaro', icon: '☀️' },
    { value: 'dark' as const, label: 'Scuro', icon: '🌙' },
    { value: 'system' as const, label: 'Sistema', icon: '🖥️' }
  ]

  return (
    <div className="space-y-3">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
        Tema dell&apos;interfaccia
      </h3>
      <div className="grid grid-cols-3 gap-3">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => setTheme(option.value)}
            className={`
              p-4 rounded-lg border-2 transition-all duration-200
              flex flex-col items-center space-y-2
              ${theme === option.value
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400'
              }
            `}
          >
            <span className="text-2xl">{option.icon}</span>
            <span className="text-sm font-medium text-gray-900 dark:text-white">
              {option.label}
            </span>
            {option.value === 'system' && (
              <span className="text-xs text-gray-500">
                ({actualTheme === 'dark' ? 'Scuro' : 'Chiaro'})
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  )
}