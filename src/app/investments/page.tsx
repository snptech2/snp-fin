// src/app/investments/page.tsx - FASE 1 FIX
'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { PlusIcon } from '@heroicons/react/24/outline'

interface Portfolio {
  id: number
  name: string
  type?: string
  isActive: boolean
  account?: {
    id: number
    name: string
    balance: number
  }
  stats: {
    // 🎯 ENHANCED CASH FLOW FIELDS (source of truth)
    totalInvested: number
    capitalRecovered?: number
    effectiveInvestment?: number
    realizedProfit?: number
    isFullyRecovered?: boolean
    
    // Derived fields
    totalValueEur?: number
    unrealizedGains?: number
    totalROI: number
    
    // Legacy DCA fields (for backward compatibility)
    netBTC?: number
    avgPurchasePrice?: number
    
    // Counts
    transactionCount: number
    holdingsCount?: number
    buyCount?: number
    sellCount?: number
  }
}

interface Account {
  id: number
  name: string
  type: string
  balance: number
  isDefault: boolean
}

export default function InvestmentsPage() {
  const [dcaPortfolios, setDcaPortfolios] = useState<Portfolio[]>([])
  const [cryptoPortfolios, setCryptoPortfolios] = useState<Portfolio[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [btcPrice, setBtcPrice] = useState<any>(null)

  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showCreateCryptoModal, setShowCreateCryptoModal] = useState(false)
  
  // Forms
  const [formData, setFormData] = useState({
    name: '',
    type: 'dca_bitcoin',
    accountId: undefined as number | undefined
  })

  const [cryptoFormData, setCryptoFormData] = useState({
    name: '',
    description: '',
    accountId: undefined as number | undefined
  })

  useEffect(() => {
    fetchData()
    fetchBitcoinPrice()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [dcaRes, cryptoRes, accountsRes] = await Promise.all([
        fetch('/api/dca-portfolios'),
        fetch('/api/crypto-portfolios'),
        fetch('/api/accounts?type=investment')
      ])

      if (dcaRes.ok) {
        const dcaData = await dcaRes.json()
        setDcaPortfolios(Array.isArray(dcaData) ? dcaData : [])
      }

      if (cryptoRes.ok) {
        const cryptoData = await cryptoRes.json()
        setCryptoPortfolios(Array.isArray(cryptoData) ? cryptoData : [])
      }

      if (accountsRes.ok) {
        const accountsData = await accountsRes.json()
        setAccounts(Array.isArray(accountsData) ? accountsData : [])
      }
    } catch (error) {
      console.error('Errore nel caricamento dati:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchBitcoinPrice = async () => {
    try {
      const response = await fetch('/api/bitcoin-price')
      if (response.ok) {
        const data = await response.json()
        setBtcPrice(data)
      }
    } catch (error) {
      console.error('Errore nel recupero prezzo Bitcoin:', error)
    }
  }

  // Format functions
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

  // 🎯 FASE 1 FIX: Usa SOLO Enhanced stats dal backend, rimuovi calcoli duplicati

  // DCA Portfolio calculations - usa stats dal backend
  const calculateDCACurrentValue = (portfolio: Portfolio) => {
    if (!portfolio.stats.netBTC || !btcPrice?.btcEur) return 0
    return portfolio.stats.netBTC * btcPrice.btcEur
  }

  const calculateDCAROI = (portfolio: Portfolio) => {
    // 🔧 FIX: Se il backend già fornisce totalROI, usa quello
    if (portfolio.stats.totalROI !== undefined) {
      return portfolio.stats.totalROI
    }
    
    // Fallback calculation per DCA usando Enhanced logic
    const currentValue = calculateDCACurrentValue(portfolio)
    const effectiveInvestment = portfolio.stats.effectiveInvestment || portfolio.stats.totalInvested
    const realizedProfit = portfolio.stats.realizedProfit || 0
    const unrealizedGains = currentValue - effectiveInvestment
    
    return portfolio.stats.totalInvested > 0 ? 
      ((realizedProfit + unrealizedGains) / portfolio.stats.totalInvested) * 100 : 0
  }

  // Crypto Portfolio calculations - usa direttamente le stats dal backend
  const calculateCryptoROI = (portfolio: Portfolio) => {
    // 🔧 FIX: Usa direttamente totalROI dal backend (già calcolato con Enhanced logic)
    return portfolio.stats.totalROI || 0
  }

  // Overall calculations
  const calculateOverallStats = () => {
    const allPortfolios = [...dcaPortfolios, ...cryptoPortfolios]
    
    const totalInvested = allPortfolios.reduce((sum, p) => sum + (p.stats.totalInvested || 0), 0)
    const totalCapitalRecovered = allPortfolios.reduce((sum, p) => sum + (p.stats.capitalRecovered || 0), 0)
    const totalRealizedProfit = allPortfolios.reduce((sum, p) => sum + (p.stats.realizedProfit || 0), 0)
    
    // Current values
    const dcaCurrentValue = dcaPortfolios.reduce((sum, p) => sum + calculateDCACurrentValue(p), 0)
    const cryptoCurrentValue = cryptoPortfolios.reduce((sum, p) => sum + (p.stats.totalValueEur || 0), 0)
    const totalCurrentValue = dcaCurrentValue + cryptoCurrentValue
    
    // Effective investment (soldi ancora a rischio)
    const totalEffectiveInvestment = Math.max(0, totalInvested - totalCapitalRecovered)
    const totalUnrealizedGains = totalCurrentValue - totalEffectiveInvestment
    
    // Overall ROI usando Enhanced logic
    const overallROI = totalInvested > 0 ? 
      ((totalRealizedProfit + totalUnrealizedGains) / totalInvested) * 100 : 0

    return {
      totalInvested,
      totalCapitalRecovered,
      totalRealizedProfit,
      totalCurrentValue,
      totalEffectiveInvestment,
      totalUnrealizedGains,
      overallROI,
      dcaCurrentValue,
      cryptoCurrentValue
    }
  }

  const overallStats = calculateOverallStats()
  const investmentAccounts = accounts.filter(acc => acc.type === 'investment')

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-adaptive-600">Caricamento investimenti...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-adaptive-900">Investimenti</h1>
          <p className="text-adaptive-600">Gestisci i tuoi portfolio con Enhanced Cash Flow</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowCreateModal(true)}
            disabled={investmentAccounts.length === 0}
            className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
            title={investmentAccounts.length === 0 ? 'Crea prima un conto investimento' : ''}
          >
            🟠 DCA Bitcoin
          </button>
          
          <button
            onClick={() => setShowCreateCryptoModal(true)}
            disabled={investmentAccounts.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            title={investmentAccounts.length === 0 ? 'Crea prima un conto investimento' : ''}
          >
            🚀 Crypto Wallet
          </button>
        </div>
      </div>

      {/* Enhanced Overall Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="card-adaptive p-6 rounded-lg shadow-sm border-adaptive">
          <h3 className="text-sm font-medium text-adaptive-500">💰 Totale Investito</h3>
          <p className="text-2xl font-bold text-adaptive-900">
            {formatCurrency(overallStats.totalInvested)}
          </p>
          <p className="text-sm text-adaptive-600">Su tutti i portfolio</p>
        </div>

        <div className="card-adaptive p-6 rounded-lg shadow-sm border-adaptive">
          <h3 className="text-sm font-medium text-adaptive-500">🔄 Capitale Recuperato</h3>
          <p className="text-2xl font-bold text-blue-600">
            {formatCurrency(overallStats.totalCapitalRecovered)}
          </p>
          <p className="text-sm text-adaptive-600">
            {overallStats.totalInvested > 0 ? 
              ((overallStats.totalCapitalRecovered / overallStats.totalInvested) * 100).toFixed(1) : 0}%
          </p>
        </div>

        <div className="card-adaptive p-6 rounded-lg shadow-sm border-adaptive">
          <h3 className="text-sm font-medium text-adaptive-500">📈 Valore Attuale</h3>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency(overallStats.totalCurrentValue)}
          </p>
          <p className="text-sm text-adaptive-600">Holdings correnti</p>
        </div>

        <div className="card-adaptive p-6 rounded-lg shadow-sm border-adaptive">
          <h3 className="text-sm font-medium text-adaptive-500">🎯 ROI Totale</h3>
          <p className={`text-2xl font-bold ${overallStats.overallROI >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatPercentage(overallStats.overallROI)}
          </p>
          <p className="text-sm text-adaptive-600">Enhanced calculation</p>
        </div>
      </div>

      {/* P&L Breakdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="card-adaptive p-6 rounded-lg shadow-sm border-adaptive">
          <h3 className="text-sm font-medium text-adaptive-500">⚠️ Soldi a Rischio</h3>
          <p className="text-2xl font-bold text-orange-600">
            {formatCurrency(overallStats.totalEffectiveInvestment)}
          </p>
          <p className="text-sm text-adaptive-600">Non ancora recuperato</p>
        </div>

        <div className="card-adaptive p-6 rounded-lg shadow-sm border-adaptive">
          <h3 className="text-sm font-medium text-adaptive-500">💸 Profitti Realizzati</h3>
          <p className={`text-2xl font-bold ${overallStats.totalRealizedProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(overallStats.totalRealizedProfit)}
          </p>
          <p className="text-sm text-adaptive-600">Da vendite</p>
        </div>

        <div className="card-adaptive p-6 rounded-lg shadow-sm border-adaptive">
          <h3 className="text-sm font-medium text-adaptive-500">📊 Plus/Minus Non Real.</h3>
          <p className={`text-2xl font-bold ${overallStats.totalUnrealizedGains >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(overallStats.totalUnrealizedGains)}
          </p>
          <p className="text-sm text-adaptive-600">Su holdings correnti</p>
        </div>
      </div>

      {/* DCA Bitcoin Portfolios */}
      {dcaPortfolios.length > 0 && (
        <div className="card-adaptive rounded-lg shadow-sm border-adaptive">
          <div className="p-6 border-b border-adaptive">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-adaptive-900">🟠 DCA Bitcoin Portfolios</h2>
              <span className="text-sm text-adaptive-500">{dcaPortfolios.length} portfolio</span>
            </div>
          </div>
          
          <div className="divide-y divide-adaptive">
            {dcaPortfolios.map(portfolio => {
              const currentValue = calculateDCACurrentValue(portfolio)
              const totalROI = calculateDCAROI(portfolio)
              const unrealizedGains = currentValue - (portfolio.stats.effectiveInvestment || portfolio.stats.totalInvested)
              const totalGains = (portfolio.stats.realizedProfit || 0) + unrealizedGains

              return (
                <Link key={portfolio.id} href={`/investments/${portfolio.id}`}>
                  <div className="p-6 hover:bg-adaptive-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-adaptive-900 mb-1">{portfolio.name}</h3>
                        <div className="flex items-center gap-4 text-sm text-adaptive-600">
                          <span>🟠 DCA Bitcoin</span>
                          <span>{portfolio.stats.transactionCount} transazioni</span>
                          {portfolio.stats.netBTC && <span>{formatBTC(portfolio.stats.netBTC)}</span>}
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        {/* Invested */}
                        <div className="text-center min-w-[100px]">
                          <p className="text-xs text-adaptive-500">Investito</p>
                          <p className="font-semibold text-adaptive-900">
                            {formatCurrency(portfolio.stats.totalInvested)}
                          </p>
                        </div>

                        {/* Current Value */}
                        <div className="text-center min-w-[120px]">
                          <p className="text-xs text-adaptive-500">Valore Attuale</p>
                          <p className="font-semibold text-green-600">
                            {formatCurrency(currentValue)}
                          </p>
                        </div>

                        {/* Total Gains */}
                        <div className="text-center min-w-[100px]">
                          <p className="text-xs text-adaptive-500">P&L Totale</p>
                          <p className={`font-semibold ${totalGains >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(totalGains)}
                          </p>
                        </div>

                        {/* ROI */}
                        <div className="text-center min-w-[100px]">
                          <p className="text-xs text-adaptive-500">ROI</p>
                          <p className={`font-semibold ${totalROI >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatPercentage(totalROI)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Crypto Portfolios */}
      {cryptoPortfolios.length > 0 && (
        <div className="card-adaptive rounded-lg shadow-sm border-adaptive">
          <div className="p-6 border-b border-adaptive">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-adaptive-900">🚀 Crypto Wallet Portfolios</h2>
              <span className="text-sm text-adaptive-500">{cryptoPortfolios.length} portfolio</span>
            </div>
          </div>
          
          <div className="divide-y divide-adaptive">
            {cryptoPortfolios.map(portfolio => {
              const totalROI = calculateCryptoROI(portfolio)
              const totalGains = (portfolio.stats.realizedProfit || 0) + (portfolio.stats.unrealizedGains || 0)

              return (
                <Link key={portfolio.id} href={`/investments/crypto-portfolio/${portfolio.id}`}>
                  <div className="p-6 hover:bg-adaptive-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-adaptive-900 mb-1">{portfolio.name}</h3>
                        <div className="flex items-center gap-4 text-sm text-adaptive-600">
                          <span>🚀 Crypto Wallet</span>
                          <span>{portfolio.stats.holdingsCount || 0} asset</span>
                          <span>{portfolio.stats.transactionCount} transazioni</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        {/* Invested */}
                        <div className="text-center min-w-[100px]">
                          <p className="text-xs text-adaptive-500">Investito</p>
                          <p className="font-semibold text-adaptive-900">
                            {formatCurrency(portfolio.stats.totalInvested)}
                          </p>
                        </div>

                        {/* Current Value */}
                        <div className="text-center min-w-[120px]">
                          <p className="text-xs text-adaptive-500">Valore Attuale</p>
                          <p className="font-semibold text-green-600">
                            {formatCurrency(portfolio.stats.totalValueEur || 0)}
                          </p>
                        </div>

                        {/* Total Gains - USA DIRETTAMENTE LE STATS DAL BACKEND */}
                        <div className="text-center min-w-[100px]">
                          <p className="text-xs text-adaptive-500">P&L Totale</p>
                          <p className={`font-semibold ${totalGains >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(totalGains)}
                          </p>
                        </div>

                        {/* ROI - USA DIRETTAMENTE totalROI DAL BACKEND */}
                        <div className="text-center min-w-[100px]">
                          <p className="text-xs text-adaptive-500">ROI</p>
                          <p className={`font-semibold ${totalROI >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatPercentage(totalROI)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              )
            })}
          </div>
        </div>
      )}

      {/* Empty State */}
      {dcaPortfolios.length === 0 && cryptoPortfolios.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-xl font-medium text-adaptive-900 mb-2">Nessun Portfolio</h3>
          <p className="text-adaptive-600 mb-6">Crea il tuo primo portfolio per iniziare a investire</p>
          <div className="flex justify-center gap-4">
            <button
              onClick={() => setShowCreateModal(true)}
              disabled={investmentAccounts.length === 0}
              className="px-6 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
            >
              🟠 DCA Bitcoin
            </button>
            <button
              onClick={() => setShowCreateCryptoModal(true)}
              disabled={investmentAccounts.length === 0}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              🚀 Crypto Wallet
            </button>
          </div>
          {investmentAccounts.length === 0 && (
            <p className="text-sm text-adaptive-500 mt-4">
              Prima <Link href="/accounts" className="text-blue-600 hover:underline">crea un conto investimento</Link>
            </p>
          )}
        </div>
      )}

      {/* Modals per creazione portfolio - da implementare */}
    </div>
  )
}