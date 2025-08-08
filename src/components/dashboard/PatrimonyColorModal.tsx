// src/components/dashboard/PatrimonyColorModal.tsx
import React from 'react'
import { Modal } from '@/components/base/Modal'
import ColorPicker from '@/components/ui/ColorPicker'

interface PatrimonyColors {
  contiBancari: string
  contiInvestimentoPatr: string
  assets: string
  beniNonCorrenti: string
  crediti: string
}

interface PatrimonyColorModalProps {
  isOpen: boolean
  onClose: () => void
  colors: PatrimonyColors
  onColorsChange: (colors: PatrimonyColors) => void
}

export const PatrimonyColorModal = ({ 
  isOpen, 
  onClose, 
  colors, 
  onColorsChange
}: PatrimonyColorModalProps) => {

  const updateColor = (key: keyof PatrimonyColors, value: string) => {
    onColorsChange({ ...colors, [key]: value })
  }

  const resetToDefaults = () => {
    onColorsChange({
      contiBancari: '#3B82F6',
      contiInvestimentoPatr: '#8B5CF6',
      assets: '#F59E0B',
      beniNonCorrenti: '#10B981',
      crediti: '#EF4444'
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
    colorKey: keyof PatrimonyColors
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
      title="💎 Colori Grafico Patrimonio"
      size="md"
    >
      <div className="space-y-4">
        <ColorInput 
          label="Conti Bancari - Tasse"
          colorKey="contiBancari"
          placeholder="#3B82F6"
        />
        <ColorInput 
          label="Conti Investimento"
          colorKey="contiInvestimentoPatr"
          placeholder="#8B5CF6"
        />
        <ColorInput 
          label="Assets Crypto/DCA"
          colorKey="assets"
          placeholder="#F59E0B"
        />
        <ColorInput 
          label="Beni Non Correnti"
          colorKey="beniNonCorrenti"
          placeholder="#10B981"
        />
        <ColorInput 
          label="Crediti"
          colorKey="crediti"
          placeholder="#EF4444"
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