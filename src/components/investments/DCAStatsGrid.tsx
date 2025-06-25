// src/components/investments/DCAStatsGrid.tsx - FASE 1 FIX
import { useMemo } from 'react'

interface EnhancedDCAStats {
  // 🎯 ENHANCED CASH FLOW FIELDS (source of truth)
  totalInvested: number
  capitalRecovered: number
  effectiveInvestment: number
  realizedProfit: number
  isFullyRecovered: boolean
  
  // BTC metrics
  totalBTC: number
  netBTC: number
  avgPurchasePrice: number
  
  // Counts
  transactionCount: number
  buyCount: number
  sellCount: number
  
  // Legacy fields (mantenute per compatibilità)
  totalFeesBTC?: number
  totalEUR?: number
}

interface BitcoinPrice {
  btcUsd: number
  btcEur: number
  cached: boolean
}

interface DCAStatsGridProps {
  stats: EnhancedDCAStats
  btcPrice?: BitcoinPrice | null
  className?: string
}

export const DCAStatsGrid = ({ stats, btcPrice, className = '' }: DCAStatsGridProps) => {
  // 🎯 FASE 1 FIX: Usa SOLO Enhanced stats dal backend, rimuovi calcoli duplicati
  const calculations = useMemo(() => {
    const currentValue = btcPrice && stats.netBTC > 0 ? stats.netBTC * btcPrice.btcEur : 0
    const unrealizedGains = currentValue - stats.effectiveInvestment
    const totalGains = stats.realizedProfit + unrealizedGains
    const totalROI = stats.totalInvested > 0 ? 
      ((stats.realizedProfit + unrealizedGains) / stats.totalInvested) * 100 : 0

    return {
      currentValue,
      unrealizedGains,
      totalGains,
      totalROI
    }
  }, [stats, btcPrice])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const formatBTC = (amount: number) => {
    return `${amount.toFixed(8)} BTC`
  }

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
  }

  return (
    <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 ${className}`}>
      {/* Total Invested - Enhanced Field */}
      <div className="card-adaptive p-6 rounded-lg shadow-sm border-adaptive">
        <div className="text-sm text-adaptive-600 mb-1">💰 Totale Investito</div>
        <div className="text-xl font-bold text-adaptive-900">
          {formatCurrency(stats.totalInvested)}
        </div>
        <div className="text-xs text-adaptive-500 mt-1">
          {stats.buyCount} acquisti storici
        </div>
      </div>

      {/* Capital Recovered - Enhanced Field */}
      <div className="card-adaptive p-6 rounded-lg shadow-sm border-adaptive">
        <div className="text-sm text-adaptive-600 mb-1">🔄 Capitale Recuperato</div>
        <div className="text-xl font-bold text-blue-600">
          {formatCurrency(stats.capitalRecovered)}
        </div>
        <div className="text-xs text-adaptive-500 mt-1 flex items-center gap-1">
          <span>
            {stats.totalInvested > 0 ? 
              ((stats.capitalRecovered / stats.totalInvested) * 100).toFixed(1) : 0}%
          </span>
          {stats.isFullyRecovered && <span className="text-green-600">✅</span>}
        </div>
      </div>

      {/* Effective Investment - Enhanced Field */}
      <div className="card-adaptive p-6 rounded-lg shadow-sm border-adaptive">
        <div className="text-sm text-adaptive-600 mb-1">⚠️ Soldi a Rischio</div>
        <div className="text-xl font-bold text-orange-600">
          {formatCurrency(stats.effectiveInvestment)}
        </div>
        <div className="text-xs text-adaptive-500 mt-1">
          {stats.isFullyRecovered ? '🎉 Gratis!' : 'Non recuperato'}
        </div>
      </div>

      {/* Bitcoin Holdings */}
      <div className="card-adaptive p-6 rounded-lg shadow-sm border-adaptive">
        <div className="text-sm text-adaptive-600 mb-1">₿ Bitcoin Netti</div>
        <div className="text-xl font-bold text-adaptive-900">
          {formatBTC(stats.netBTC)}
        </div>
        <div className="text-xs text-adaptive-500 mt-1">
          Prezzo medio: {formatCurrency(stats.avgPurchasePrice)}
        </div>
      </div>

      {/* Current Value & ROI */}
      <div className="card-adaptive p-6 rounded-lg shadow-sm border-adaptive">
        <div className="text-sm text-adaptive-600 mb-1">🎯 Valore & ROI</div>
        {btcPrice ? (
          <>
            <div className="text-xl font-bold text-green-600">
              {formatCurrency(calculations.currentValue)}
            </div>
            <div className="text-xs text-adaptive-500 mt-1">
              <span className={`font-semibold ${calculations.totalROI >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatPercentage(calculations.totalROI)}
              </span>
            </div>
          </>
        ) : (
          <div className="text-xl font-bold text-adaptive-600">
            Prezzo non disponibile
          </div>
        )}
      </div>
    </div>
  )
}

// Enhanced P&L Breakdown Component
export const DCAEnhancedBreakdown = ({ stats, btcPrice }: DCAStatsGridProps) => {
  const calculations = useMemo(() => {
    const currentValue = btcPrice && stats.netBTC > 0 ? stats.netBTC * btcPrice.btcEur : 0
    const unrealizedGains = currentValue - stats.effectiveInvestment
    const totalGains = stats.realizedProfit + unrealizedGains

    return {
      currentValue,
      unrealizedGains,
      totalGains
    }
  }, [stats, btcPrice])

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  return (
    <div className="card-adaptive p-6 rounded-lg shadow-sm border-adaptive">
      <h3 className="text-lg font-medium text-adaptive-900 mb-4">💼 Enhanced P&L Breakdown</h3>
      
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-adaptive-600">Profitti Realizzati:</span>
          <span className={`font-semibold ${stats.realizedProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(stats.realizedProfit)}
          </span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-adaptive-600">Plus/Minus Non Realizzati:</span>
          <span className={`font-semibold ${calculations.unrealizedGains >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(calculations.unrealizedGains)}
          </span>
        </div>
        
        <div className="border-t border-adaptive pt-2 mt-2">
          <div className="flex justify-between items-center">
            <span className="text-adaptive-900 font-medium">Totale P&L:</span>
            <span className={`font-bold text-lg ${calculations.totalGains >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(calculations.totalGains)}
            </span>
          </div>
        </div>

        {/* Status Investimento */}
        <div className="bg-adaptive-50 p-3 rounded-lg mt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-adaptive-600">Status:</span>
            <span className={`px-2 py-1 rounded-full text-xs ${stats.isFullyRecovered ? 
              'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
              {stats.isFullyRecovered ? '✅ Investimento Recuperato' : '⏳ In Recupero'}
            </span>
          </div>
          
          {stats.isFullyRecovered && (
            <div className="text-xs text-green-600 mt-1">
              🎉 I tuoi {formatCurrency(calculations.currentValue)} di BTC sono ora "gratuiti"!
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default DCAStatsGrid