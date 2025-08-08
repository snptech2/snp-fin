// src/components/ui/ColorPicker.tsx
'use client'

import React, { useState, useCallback } from 'react'
import { CheckIcon } from '@heroicons/react/24/outline'

interface ColorPickerProps {
  value: string
  onChange: (color: string) => void
  presetColors?: string[]
  allowCustom?: boolean
  label?: string
  placeholder?: string
  className?: string
}

// Palette di colori predefiniti ottimizzata per grafici e dashboard
const DEFAULT_PRESET_COLORS = [
  // Rossi
  '#EF4444', '#DC2626', '#B91C1C', '#991B1B',
  // Rosa
  '#EC4899', '#DB2777', '#BE185D', '#9D174D',
  // Arancioni
  '#F97316', '#EA580C', '#D97706', '#B45309',
  // Gialli
  '#F59E0B', '#FBBF24', '#F3A833', '#92400E',
  // Verdi
  '#10B981', '#059669', '#047857', '#065F46',
  '#22C55E', '#16A34A', '#15803D', '#166534',
  // Azzurri
  '#06B6D4', '#0891B2', '#0E7490', '#155E75',
  '#0EA5E9', '#0284C7', '#0369A1', '#075985',
  // Blu
  '#3B82F6', '#2563EB', '#1D4ED8', '#1E40AF',
  '#6366F1', '#4F46E5', '#4338CA', '#3730A3',
  // Viola
  '#8B5CF6', '#7C3AED', '#6D28D9', '#5B21B6',
  '#A855F7', '#9333EA', '#7E22CE', '#6B21A8',
  // Grigi
  '#6B7280', '#4B5563', '#374151', '#1F2937',
  '#9CA3AF', '#71717A', '#52525B', '#27272A'
]

export default function ColorPicker({
  value,
  onChange,
  presetColors = DEFAULT_PRESET_COLORS,
  allowCustom = true,
  label,
  placeholder = '#000000',
  className = ''
}: ColorPickerProps) {
  const [customValue, setCustomValue] = useState(value)
  const [isValidHex, setIsValidHex] = useState(true)

  // Validazione colore hex
  const validateHex = useCallback((color: string): boolean => {
    const hexRegex = /^#([0-9A-F]{3}){1,2}$/i
    return hexRegex.test(color)
  }, [])

  // Gestisce il cambiamento del custom input
  const handleCustomChange = useCallback((newValue: string) => {
    setCustomValue(newValue)
    
    if (validateHex(newValue)) {
      setIsValidHex(true)
      onChange(newValue.toUpperCase())
    } else {
      setIsValidHex(!!newValue) // Solo rosso se non è vuoto
    }
  }, [onChange, validateHex])

  // Gestisce la selezione da preset
  const handlePresetSelect = useCallback((color: string) => {
    setCustomValue(color)
    setIsValidHex(true)
    onChange(color)
  }, [onChange])

  // Formatta l'hex input
  const formatHexInput = (inputValue: string): string => {
    let formatted = inputValue.trim().toUpperCase()
    if (formatted && !formatted.startsWith('#')) {
      formatted = '#' + formatted
    }
    return formatted
  }

  return (
    <div className={`space-y-3 ${className}`}>
      {label && (
        <label className="block text-sm font-medium text-adaptive-700">
          {label}
        </label>
      )}

      {/* Preview del colore selezionato */}
      <div className="flex items-center gap-3">
        <div 
          className="w-12 h-8 rounded-lg border-2 border-adaptive-300 flex-shrink-0 relative overflow-hidden"
          style={{ backgroundColor: validateHex(value) ? value : '#CCCCCC' }}
        >
          {!validateHex(value) && (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
              <span className="text-xs text-gray-500">?</span>
            </div>
          )}
        </div>
        
        {allowCustom && (
          <div className="flex-1">
            <input
              type="text"
              value={customValue}
              onChange={(e) => handleCustomChange(formatHexInput(e.target.value))}
              placeholder={placeholder}
              className={`w-full px-3 py-2 border rounded-md text-sm font-mono bg-adaptive-50 text-adaptive-900 ${
                isValidHex 
                  ? 'border-adaptive focus:ring-blue-500 focus:border-blue-500' 
                  : 'border-red-300 focus:ring-red-500 focus:border-red-500'
              }`}
              maxLength={7}
            />
            {!isValidHex && customValue && (
              <p className="text-xs text-red-600 mt-1">Formato hex non valido (es: #FF5733)</p>
            )}
          </div>
        )}
      </div>

      {/* Palette colori predefiniti */}
      <div>
        <p className="text-xs text-adaptive-600 mb-2">Colori predefiniti:</p>
        <div className="grid grid-cols-8 gap-2">
          {presetColors.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => handlePresetSelect(color)}
              className={`
                w-8 h-8 rounded-lg border-2 transition-all relative
                hover:scale-110 hover:shadow-md
                ${value === color 
                  ? 'border-gray-900 dark:border-white scale-110' 
                  : 'border-gray-300 dark:border-gray-600'
                }
              `}
              style={{ backgroundColor: color }}
              title={color}
            >
              {value === color && (
                <CheckIcon className="w-4 h-4 text-white absolute inset-0 m-auto drop-shadow-sm" />
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Colori rapidi per grafici */}
      <div>
        <p className="text-xs text-adaptive-600 mb-2">Suggeriti per grafici:</p>
        <div className="flex flex-wrap gap-2">
          {[
            { color: '#3B82F6', name: 'Blu' },
            { color: '#10B981', name: 'Verde' },
            { color: '#F59E0B', name: 'Giallo' },
            { color: '#EF4444', name: 'Rosso' },
            { color: '#8B5CF6', name: 'Viola' },
            { color: '#EC4899', name: 'Rosa' },
            { color: '#06B6D4', name: 'Azzurro' },
            { color: '#F97316', name: 'Arancione' }
          ].map(({ color, name }) => (
            <button
              key={color}
              type="button"
              onClick={() => handlePresetSelect(color)}
              className={`
                px-3 py-1 text-xs rounded-full transition-all border
                ${value === color
                  ? 'bg-gray-900 text-white border-gray-900 dark:bg-white dark:text-gray-900 dark:border-white'
                  : 'bg-adaptive-50 text-adaptive-700 border-adaptive-300 hover:bg-adaptive-100'
                }
              `}
            >
              <span 
                className="inline-block w-3 h-3 rounded-full mr-1"
                style={{ backgroundColor: color }}
              />
              {name}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}