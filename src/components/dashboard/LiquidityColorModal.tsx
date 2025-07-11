// src/components/dashboard/LiquidityColorModal.tsx
import React from 'react'
import { Modal } from '@/components/base/Modal'

interface LiquidityColors {
  fondiDisponibili: string
  contiInvestimento: string
  holdingsInvestimenti: string
}

interface LiquidityColorModalProps {
  isOpen: boolean
  onClose: () => void
  colors: LiquidityColors
  onColorsChange: (colors: LiquidityColors) => void
}

export const LiquidityColorModal = ({ 
  isOpen, 
  onClose, 
  colors, 
  onColorsChange
}: LiquidityColorModalProps) => {

  const updateColor = (key: keyof LiquidityColors, value: string) => {
    onColorsChange({ ...colors, [key]: value })
  }

  const resetToDefaults = () => {
    onColorsChange({
      fondiDisponibili: '#22D3EE',
      contiInvestimento: '#A855F7',
      holdingsInvestimenti: '#F59E0B'
    })
  }

  const handleSave = () => {
    // Salva solo i colori della liquidità
    const currentColors = JSON.parse(localStorage.getItem('dashboardChartColors') || '{}')
    const updatedColors = { ...currentColors, ...colors }
    localStorage.setItem('dashboardChartColors', JSON.stringify(updatedColors))
    onClose()
  }

  const ColorInput = ({ 
    label, 
    colorKey, 
    placeholder 
  }: { 
    label: string
    colorKey: keyof LiquidityColors
    placeholder: string 
  }) => (
    <div>
      <label className="block text-sm font-medium mb-2 text-adaptive-700">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <input
          type="color"
          value={colors[colorKey]}
          onChange={(e) => updateColor(colorKey, e.target.value)}
          className="w-12 h-8 rounded border border-adaptive cursor-pointer"
        />
        <input
          type="text"
          value={colors[colorKey]}
          onChange={(e) => updateColor(colorKey, e.target.value)}
          className="flex-1 px-3 py-2 border border-adaptive rounded-md text-sm text-adaptive-900 bg-white dark:bg-gray-800"
          placeholder={placeholder}
        />
      </div>
    </div>
  )

  return (
    <Modal 
      isOpen={isOpen} 
      onClose={onClose} 
      title="💰 Colori Grafico Liquidità"
      size="md"
    >
      <div className="space-y-4">
        <ColorInput 
          label="Fondi Disponibili"
          colorKey="fondiDisponibili"
          placeholder="#22D3EE"
        />
        <ColorInput 
          label="Conti Investimento"
          colorKey="contiInvestimento"
          placeholder="#A855F7"
        />
        <ColorInput 
          label="Holdings Investimenti"
          colorKey="holdingsInvestimenti"
          placeholder="#F59E0B"
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-6 border-t border-adaptive mt-6">
        <button
          onClick={resetToDefaults}
          className="flex-1 px-4 py-2 text-adaptive-700 bg-adaptive-50 border border-adaptive rounded-lg hover:bg-adaptive-100 transition-colors"
        >
          Reset Default
        </button>
        <button
          onClick={handleSave}
          className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
        >
          Salva
        </button>
      </div>
    </Modal>
  )
}