'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { XMarkIcon } from '@heroicons/react/24/outline'

interface Account {
  id: number
  name: string
  type: string
  balance: number
}

interface Portfolio {
  id: number
  name: string
  accountId: number
  type: 'dca_bitcoin' | 'crypto_wallet'
  stats: {
    // 🎯 ENHANCED CASH FLOW FIELDS (source of truth dal backend)
    totalInvested: number
    capitalRecovered: number
    effectiveInvestment: number
    realizedProfit: number
    isFullyRecovered: boolean
    
    // Portfolio-specific fields
    totalValueEur?: number // Per crypto portfolios
    netBTC?: number // Per DCA portfolios
    totalBTC?: number // Fallback per DCA portfolios
    totalROI?: number // Calcolato dal backend quando disponibile
    
    // Counts
    transactionCount: number
    buyCount: number
    sellCount?: number
    
    // Legacy fields (backwards compatibility)
    realizedGains?: number
    unrealizedGains?: number
    totalGains?: number
  }
}

interface BitcoinPrice {
  btcUsd: number
  btcEur: number
  cached: boolean
}

export default function InvestmentsPage() {
  const [dcaPortfolios, setDcaPortfolios] = useState<Portfolio[]>([])
  const [cryptoPortfolios, setCryptoPortfolios] = useState<Portfolio[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [btcPrice, setBtcPrice] = useState<BitcoinPrice | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCreateDCAModal, setShowCreateDCAModal] = useState(false)
  const [showCreateCryptoModal, setShowCreateCryptoModal] = useState(false)
  const [submitLoading, setSubmitLoading] = useState(false)

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    accountId: undefined as number | undefined
  })

  const [cryptoFormData, setCryptoFormData] = useState({
    name: '',
    description: '',
    accountId: undefined as number | undefined
  })

  const investmentAccounts = accounts.filter(acc => acc.type === 'investment')

  useEffect(() => {
    fetchData()
    fetchBitcoinPrice()
  }, [])

  const fetchData = async () => {
    try {
      const [dcaRes, cryptoRes, accountsRes] = await Promise.all([
        fetch('/api/dca-portfolios'),
        fetch('/api/crypto-portfolios'),
        fetch('/api/accounts')
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

  // 🎯 FASE 1 FIX COMPLETO: Funzione getDCACurrentValue - RIMUOVI FALLBACK HARDCODED
  const getDCACurrentValue = (portfolio: Portfolio) => {
    if (!btcPrice?.btcEur) return 0
    
    // 🎯 PRIORITÀ 1: USA SEMPRE netBTC dal backend (include fee di rete)
    if (portfolio.stats.netBTC !== undefined && portfolio.stats.netBTC !== null) {
      return portfolio.stats.netBTC * btcPrice.btcEur
    }
    
    // 🔧 FALLBACK SICURO: Se netBTC non disponibile, usa totalBTC
    // NOTA: Questo potrebbe sovrastimare leggermente se ci sono fee non considerate
    if (portfolio.stats.totalBTC !== undefined && portfolio.stats.totalBTC !== null && portfolio.stats.totalBTC > 0) {
      return portfolio.stats.totalBTC * btcPrice.btcEur
    }
    
    // Se nessun dato BTC disponibile, ritorna 0
    return 0
  }

  // 🎯 FASE 1 FIX: Enhanced ROI Calculation - SEMPRE dalla logica Enhanced
  const getPortfolioROI = (portfolio: Portfolio) => {
    // 🎯 PRIORITÀ 1: Se il backend fornisce totalROI, usa sempre quello
    if (portfolio.stats.totalROI !== undefined && portfolio.stats.totalROI !== null) {
      return portfolio.stats.totalROI
    }
    
    // 🔧 FALLBACK: Calcola usando Enhanced logic se totalROI non disponibile
    const currentValue = portfolio.type === 'crypto_wallet' 
      ? (portfolio.stats.totalValueEur || 0)
      : getDCACurrentValue(portfolio)
    
    const effectiveInvestment = portfolio.stats.effectiveInvestment || 0
    const realizedProfit = portfolio.stats.realizedProfit || 0
    const totalInvested = portfolio.stats.totalInvested || 0
    
    if (totalInvested <= 0) return 0
    
    const unrealizedGains = currentValue - effectiveInvestment
    const totalGains = realizedProfit + unrealizedGains
    
    return (totalGains / totalInvested) * 100
  }

  // 🎯 FASE 1 FIX: Enhanced Total Gains Calculation
  const getPortfolioTotalGains = (portfolio: Portfolio) => {
    const currentValue = portfolio.type === 'crypto_wallet' 
      ? (portfolio.stats.totalValueEur || 0)
      : getDCACurrentValue(portfolio)
    
    const effectiveInvestment = portfolio.stats.effectiveInvestment || 0
    const realizedProfit = portfolio.stats.realizedProfit || 0
    
    const unrealizedGains = currentValue - effectiveInvestment
    return realizedProfit + unrealizedGains
  }

  // 🎯 FASE 1 FIX: Enhanced Overall Stats - SOLO Backend Stats + Consistent Calculations
  const overallStats = useMemo(() => {
    const allPortfolios = [...dcaPortfolios, ...cryptoPortfolios]
    
    // 🎯 ENHANCED CASH FLOW: Somma tutte le stats dai portfolio backend
    const totalInvested = allPortfolios.reduce((sum, p) => sum + (p.stats.totalInvested || 0), 0)
    const totalCapitalRecovered = allPortfolios.reduce((sum, p) => sum + (p.stats.capitalRecovered || 0), 0)
    const totalEffectiveInvestment = allPortfolios.reduce((sum, p) => sum + (p.stats.effectiveInvestment || 0), 0)
    const totalRealizedProfit = allPortfolios.reduce((sum, p) => sum + (p.stats.realizedProfit || 0), 0)
    
    // Calcola current value usando helper functions Enhanced
    let totalCurrentValue = 0
    allPortfolios.forEach(portfolio => {
      if (portfolio.type === 'crypto_wallet') {
        // Crypto portfolios: usa totalValueEur dal backend
        totalCurrentValue += portfolio.stats.totalValueEur || 0
      } else {
        // DCA portfolios: usa Enhanced current value calculation
        totalCurrentValue += getDCACurrentValue(portfolio)
      }
    })
    
    // 🎯 Enhanced calculation per overall metrics
    const totalUnrealizedGains = totalCurrentValue - totalEffectiveInvestment
    const overallROI = totalInvested > 0 ? 
      ((totalRealizedProfit + totalUnrealizedGains) / totalInvested) * 100 : 0

    return {
      // Enhanced Cash Flow Metrics
      totalInvested,
      totalCapitalRecovered,
      totalEffectiveInvestment,
      totalRealizedProfit,
      isFullyRecovered: totalCapitalRecovered >= totalInvested,
      
      // Current Performance
      totalCurrentValue,
      totalUnrealizedGains,
      overallROI,
      
      // Counts
      totalPortfolios: allPortfolios.length,
      dcaCount: dcaPortfolios.length,
      cryptoCount: cryptoPortfolios.length
    }
  }, [dcaPortfolios, cryptoPortfolios, btcPrice])

  // Create DCA Portfolio
  const createDCAPortfolio = async () => {
    if (!formData.name.trim() || !formData.accountId) {
      alert('Nome e account sono obbligatori')
      return
    }

    try {
      setSubmitLoading(true)
      const response = await fetch('/api/dca-portfolios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        await fetchData()
        setShowCreateDCAModal(false)
        setFormData({ name: '', accountId: undefined })
      } else {
        const error = await response.json()
        alert(error.error || 'Errore nella creazione portfolio')
      }
    } catch (error) {
      console.error('Errore:', error)
      alert('Errore nella creazione portfolio')
    } finally {
      setSubmitLoading(false)
    }
  }

  // Create Crypto Portfolio
  const createCryptoPortfolio = async () => {
    if (!cryptoFormData.name.trim() || !cryptoFormData.accountId) {
      alert('Nome e account sono obbligatori')
      return
    }

    try {
      setSubmitLoading(true)
      const response = await fetch('/api/crypto-portfolios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cryptoFormData)
      })

      if (response.ok) {
        await fetchData()
        setShowCreateCryptoModal(false)
        setCryptoFormData({ name: '', description: '', accountId: undefined })
      } else {
        const error = await response.json()
        alert(error.error || 'Errore nella creazione portfolio')
      }
    } catch (error) {
      console.error('Errore:', error)
      alert('Errore nella creazione portfolio')
    } finally {
      setSubmitLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-adaptive-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-adaptive-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-adaptive-900">Investimenti</h1>
          <p className="text-adaptive-600 mt-2">Gestisci i tuoi portfolio con Enhanced Cash Flow</p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={() => setShowCreateDCAModal(true)}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 text-sm font-medium"
          >
            🟠 DCA Bitcoin
          </button>
          <button
            onClick={() => setShowCreateCryptoModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            🚀 Crypto Wallet
          </button>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="card-adaptive p-6 rounded-lg shadow-sm border-adaptive">
          <h3 className="text-sm font-medium text-adaptive-500">💰 Totale Investito</h3>
          <p className="text-2xl font-bold text-adaptive-900">
            {formatCurrency(overallStats.totalInvested)}
          </p>
          <p className="text-sm text-adaptive-600">
            {overallStats.totalPortfolios} portfolio
          </p>
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
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
        <div className="card-adaptive rounded-lg shadow-sm border-adaptive mb-8">
          <div className="p-6 border-b border-adaptive">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-adaptive-900">🟠 DCA Bitcoin Portfolios</h2>
              <span className="text-sm text-adaptive-500">{dcaPortfolios.length} portfolio</span>
            </div>
          </div>
          
          <div className="divide-y divide-adaptive">
            {dcaPortfolios.map(portfolio => {
              // 🎯 USA SOLO Enhanced stats e helper functions - NO MORE HARDCODED VALUES
              const currentValue = getDCACurrentValue(portfolio)
              const totalROI = getPortfolioROI(portfolio)
              const totalGains = getPortfolioTotalGains(portfolio)

              return (
                <Link key={portfolio.id} href={`/investments/${portfolio.id}`}>
                  <div className="p-6 hover:bg-adaptive-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-adaptive-900 mb-1">{portfolio.name}</h3>
                        <div className="flex items-center gap-4 text-sm text-adaptive-600">
                          <span>🟠 DCA Bitcoin</span>
                          <span>{portfolio.stats.transactionCount} transazioni</span>
                          {/* 🎯 PRIORITÀ: Mostra netBTC se disponibile (include fee), altrimenti totalBTC */}
                          {(portfolio.stats.netBTC !== undefined && portfolio.stats.netBTC !== null) ? (
                            <span>{formatBTC(portfolio.stats.netBTC)} (netto)</span>
                          ) : (portfolio.stats.totalBTC !== undefined && portfolio.stats.totalBTC !== null && portfolio.stats.totalBTC > 0) ? (
                            <span>{formatBTC(portfolio.stats.totalBTC)} (lordo)</span>
                          ) : null}
                        </div>
                      </div>

                      <div className="flex items-center gap-6">
                        {/* Enhanced Cash Flow: Total Invested */}
                        <div className="text-center min-w-[100px]">
                          <p className="text-xs text-adaptive-500">Investito</p>
                          <p className="font-semibold text-adaptive-900">
                            {formatCurrency(portfolio.stats.totalInvested)}
                          </p>
                        </div>

                        {/* Current Value usando Enhanced calculation */}
                        <div className="text-center min-w-[120px]">
                          <p className="text-xs text-adaptive-500">Valore Attuale</p>
                          <p className="font-semibold text-green-600">
                            {formatCurrency(currentValue)}
                          </p>
                        </div>

                        {/* Total P&L usando Enhanced calculation */}
                        <div className="text-center min-w-[100px]">
                          <p className="text-xs text-adaptive-500">P&L Totale</p>
                          <p className={`font-semibold ${totalGains >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(totalGains)}
                          </p>
                        </div>

                        {/* ROI usando Enhanced calculation */}
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
        <div className="card-adaptive rounded-lg shadow-sm border-adaptive mb-8">
          <div className="p-6 border-b border-adaptive">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-adaptive-900">🚀 Crypto Wallet Portfolios</h2>
              <span className="text-sm text-adaptive-500">{cryptoPortfolios.length} portfolio</span>
            </div>
          </div>
          
          <div className="divide-y divide-adaptive">
            {cryptoPortfolios.map(portfolio => {
              // 🎯 FASE 1 FIX: Usa Enhanced stats dal backend
              const currentValue = portfolio.stats.totalValueEur || 0
              const totalROI = getPortfolioROI(portfolio)
              const totalGains = getPortfolioTotalGains(portfolio)

              return (
                <Link key={portfolio.id} href={`/investments/crypto-portfolio/${portfolio.id}`}>
                  <div className="p-6 hover:bg-adaptive-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-adaptive-900 mb-1">{portfolio.name}</h3>
                        <div className="flex items-center gap-4 text-sm text-adaptive-600">
                          <span>🚀 Crypto Wallet</span>
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

      {/* Empty State */}
      {dcaPortfolios.length === 0 && cryptoPortfolios.length === 0 && (
        <div className="text-center py-12">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-xl font-semibold text-adaptive-900 mb-2">Nessun portfolio ancora</h3>
          <p className="text-adaptive-600 mb-6">Inizia creando il tuo primo portfolio di investimenti</p>
          <div className="flex gap-4 justify-center">
            <button
              onClick={() => setShowCreateDCAModal(true)}
              className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium"
            >
              🟠 Crea DCA Bitcoin
            </button>
            <button
              onClick={() => setShowCreateCryptoModal(true)}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
            >
              🚀 Crea Crypto Wallet
            </button>
          </div>
        </div>
      )}

      {/* Create DCA Portfolio Modal */}
      {showCreateDCAModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">🟠 Nuovo Portfolio DCA Bitcoin</h3>
              <button
                onClick={() => setShowCreateDCAModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome Portfolio
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                  placeholder="es. Bitcoin DCA Principale"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account di Riferimento
                </label>
                <select
                  value={formData.accountId || ''}
                  onChange={(e) => setFormData(prev => ({ ...prev, accountId: parseInt(e.target.value) || undefined }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <option value="">Seleziona account...</option>
                  {investmentAccounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.name} ({formatCurrency(account.balance)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={createDCAPortfolio}
                disabled={submitLoading}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 font-medium"
              >
                {submitLoading ? 'Creazione...' : 'Crea Portfolio'}
              </button>
              <button
                onClick={() => setShowCreateDCAModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Create Crypto Portfolio Modal */}
      {showCreateCryptoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">🚀 Nuovo Portfolio Crypto Wallet</h3>
              <button
                onClick={() => setShowCreateCryptoModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome Portfolio
                </label>
                <input
                  type="text"
                  value={cryptoFormData.name}
                  onChange={(e) => setCryptoFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="es. Wallet Principale"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrizione (opzionale)
                </label>
                <input
                  type="text"
                  value={cryptoFormData.description}
                  onChange={(e) => setCryptoFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="es. Wallet per altcoin trading"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Account di Riferimento
                </label>
                <select
                  value={cryptoFormData.accountId || ''}
                  onChange={(e) => setCryptoFormData(prev => ({ ...prev, accountId: parseInt(e.target.value) || undefined }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleziona account...</option>
                  {investmentAccounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.name} ({formatCurrency(account.balance)})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={createCryptoPortfolio}
                disabled={submitLoading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
              >
                {submitLoading ? 'Creazione...' : 'Crea Portfolio'}
              </button>
              <button
                onClick={() => setShowCreateCryptoModal(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Annulla
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}