// src/components/dashboard/LiquidityColorModal.tsx
import React from 'react'
import { Modal } from '@/components/base/Modal'
import ColorPicker from '@/components/ui/ColorPicker'

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
    // Usa la callback per aggiornare i colori
    onColorsChange(colors)
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
    <ColorPicker
      value={colors[colorKey]}
      onChange={(color) => updateColor(colorKey, color)}
      label={label}
      placeholder={placeholder}
      allowCustom={true}
    />
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