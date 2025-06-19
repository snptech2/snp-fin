// src/components/investments/DCAStatsGrid.tsx - Componente statistiche DCA riutilizzabile

import { useMemo } from 'react'
import { formatCurrency, formatBTC, formatPercentage, calculateROI } from '@/utils/formatters'

interface DCAStats {
  totalBTC: number
  totalEUR: number
  totalFeesBTC: number
  netBTC: number
  transactionCount: number
  feesCount: number
}

interface BitcoinPrice {
  btcUsd: number
  btcEur: number
  cached: boolean
  timestamp: string
}

interface DCAStatsGridProps {
  stats: DCAStats
  btcPrice?: BitcoinPrice | null
  className?: string
}

export const DCAStatsGrid = ({ stats, btcPrice, className = '' }: DCAStatsGridProps) => {
  // Calcoli ottimizzati con useMemo
  const calculations = useMemo(() => {
    const avgLoadPrice = stats.netBTC > 0 ? stats.totalEUR / stats.netBTC : 0
    const currentValue = btcPrice && stats.netBTC > 0 ? stats.netBTC * btcPrice.btcEur : 0
    const roi = calculateROI(currentValue, stats.totalEUR)
    const profit = currentValue - stats.totalEUR

    return {
      avgLoadPrice,
      currentValue,
      roi,
      profit
    }
  }, [stats, btcPrice])

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 ${className}`}>
      {/* Bitcoin Netti */}
      <div className="card-adaptive p-6 rounded-lg shadow-sm border-adaptive">
        <div className="text-sm text-adaptive-600 mb-1">Bitcoin Netti</div>
        <div className="text-xl font-bold text-adaptive-900">
          {formatBTC(stats.netBTC)}
        </div>
        <div className="text-xs text-adaptive-500 mt-1">
          ({formatBTC(stats.totalBTC)} - {formatBTC(stats.totalFeesBTC)} fee)
        </div>
      </div>

      {/* Investimento Totale */}
      <div className="card-adaptive p-6 rounded-lg shadow-sm border-adaptive">
        <div className="text-sm text-adaptive-600 mb-1">Investimento Totale</div>
        <div className="text-xl font-bold text-adaptive-900">
          {formatCurrency(stats.totalEUR)}
        </div>
        <div className="text-xs text-adaptive-500 mt-1">
          {stats.transactionCount} transazioni
        </div>
      </div>

      {/* Prezzo Medio Carico */}
      <div className="card-adaptive p-6 rounded-lg shadow-sm border-adaptive">
        <div className="text-sm text-adaptive-600 mb-1">Prezzo Medio Carico</div>
        <div className="text-xl font-bold text-adaptive-900">
          {formatCurrency(calculations.avgLoadPrice)}
        </div>
        <div className="text-xs text-adaptive-500 mt-1">
          per BTC (EUR ÷ BTC netti)
        </div>
      </div>

      {/* Valore Attuale */}
      <div className="card-adaptive p-6 rounded-lg shadow-sm border-adaptive">
        <div className="text-sm text-adaptive-600 mb-1">Valore Attuale</div>
        {btcPrice ? (
          <>
            <div className="text-xl font-bold text-adaptive-900">
              {formatCurrency(calculations.currentValue)}
            </div>
            <div className="text-xs text-adaptive-500 mt-1">
              {formatBTC(stats.netBTC)} × {formatCurrency(btcPrice.btcEur)}
            </div>
          </>
        ) : (
          <div className="text-xl font-bold text-adaptive-600">
            Prezzo non disponibile
          </div>
        )}
      </div>

      {/* ROI */}
      <div className="card-adaptive p-6 rounded-lg shadow-sm border-adaptive">
        <div className="text-sm text-adaptive-600 mb-1">ROI</div>
        {btcPrice ? (
          <>
            <div className={`text-xl font-bold ${
              calculations.roi >= 0 ? 'text-green-600' : 'text-red-600'
            }`}>
              {formatPercentage(calculations.roi)}
            </div>
            <div className="text-xs text-adaptive-500 mt-1">
              {calculations.profit >= 0 ? '+' : ''}{formatCurrency(calculations.profit)}
            </div>
          </>
        ) : (
          <div className="text-xl font-bold text-adaptive-600">
            - %
          </div>
        )}
      </div>
    </div>
  )
}