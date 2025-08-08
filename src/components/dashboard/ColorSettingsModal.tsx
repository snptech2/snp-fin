// src/components/dashboard/ColorSettingsModal.tsx
import React from 'react'
import { Modal } from '@/components/base/Modal'
import ColorPicker from '@/components/ui/ColorPicker'
import { formatCurrency } from '@/utils/formatters'

interface ChartColors {
  fondiDisponibili: string
  contiInvestimento: string
  holdingsInvestimenti: string
  contiBancari: string
  contiInvestimentoPatr: string
  assets: string
  beniNonCorrenti: string
  crediti: string
}

interface Budget {
  id: number
  name: string
  allocatedAmount: number
  color: string
}

interface ColorSettingsModalProps {
  isOpen: boolean
  onClose: () => void
  chartColors: ChartColors
  onColorsChange: (colors: ChartColors) => void
  budgets: Budget[]
  userCurrency?: string
}

export const ColorSettingsModal = ({ 
  isOpen, 
  onClose, 
  chartColors, 
  onColorsChange, 
  budgets,
  userCurrency = 'EUR'
}: ColorSettingsModalProps) => {
  
  const formatCurrencyWithUserCurrency = (amount: number): string => {
    return formatCurrency(amount, userCurrency)
  }

  const updateColor = (key: keyof ChartColors, value: string) => {
    onColorsChange({ ...chartColors, [key]: value })
  }

  const resetToDefaults = () => {
    onColorsChange({
      fondiDisponibili: '#22D3EE',
      contiInvestimento: '#A855F7',
      holdingsInvestimenti: '#F59E0B',
      contiBancari: '#3B82F6',
      contiInvestimentoPatr: '#8B5CF6',
      assets: '#F59E0B',
      beniNonCorrenti: '#10B981',
      crediti: '#EF4444'
    })
  }

  const handleSave = () => {
    // Usa la callback per aggiornare i colori
    onColorsChange(chartColors)
    onClose()
  }

  const ColorInput = ({ 
    label, 
    colorKey, 
    placeholder 
  }: { 
    label: string
    colorKey: keyof ChartColors
    placeholder: string 
  }) => (
    <ColorPicker
      value={chartColors[colorKey]}
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
      title="🎨 Personalizza Colori Grafici"
      size="lg"
    >
      <div className="space-y-6 max-h-96 overflow-y-auto">
        {/* Grafico Liquidità + Assets */}
        <div>
          <h4 className="text-sm font-medium mb-3 text-adaptive-700">💰 Grafico Liquidità + Assets</h4>
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
        </div>

        {/* Grafico Patrimonio */}
        <div className="border-t border-adaptive pt-4">
          <h4 className="text-sm font-medium mb-3 text-adaptive-700">💎 Grafico Patrimonio Totale</h4>
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
              label="Assets"
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
        </div>

        {/* Budget Individuali */}
        <div className="border-t border-adaptive pt-4">
          <h4 className="text-sm font-medium mb-3 text-adaptive-700">Budget Individuali</h4>
          <p className="text-xs text-adaptive-500 mb-3">
            I colori dei budget si modificano dalla pagina Budget
          </p>
          
          <div className="space-y-2">
            {budgets.filter(budget => budget.allocatedAmount > 0).map((budget, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-adaptive-50 rounded">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-4 h-4 rounded-full border border-adaptive" 
                    style={{ backgroundColor: budget.color || '#3B82F6' }}
                  />
                  <span className="text-sm text-adaptive-700">{budget.name}</span>
                </div>
                <span className="text-xs text-adaptive-500">
                  {formatCurrencyWithUserCurrency(budget.allocatedAmount)}
                </span>
              </div>
            ))}
          </div>
        </div>
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