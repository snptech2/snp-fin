'use client'

import { useState, useEffect, useMemo } from 'react'
import Link from 'next/link'
import { XMarkIcon } from '@heroicons/react/24/outline'
import ProtectedRoute from '@/components/ProtectedRoute'

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
    // Enhanced Cash Flow Fields
    totalInvested: number
    capitalRecovered: number
    effectiveInvestment: number
    realizedProfit: number
    stakeRewards?: number
    isFullyRecovered: boolean
    
    // Portfolio-specific fields
    totalValueEur?: number // Per crypto portfolios
    netBTC?: number // Per DCA portfolios (PRIORITÀ ASSOLUTA)
    totalBTC?: number // Fallback per DCA portfolios
    totalROI?: number // Calcolato dal backend quando disponibile
    unrealizedGains?: number // Calcolato dal backend per crypto portfolios
    
    // Counts
    transactionCount: number
    buyCount: number
    sellCount?: number
    stakeRewardCount?: number // Per crypto portfolios
    holdingsCount?: number // Per crypto portfolios
    
    // Legacy fields (backwards compatibility)
    realizedGains?: number
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
    
    // Check URL params for quick create actions
    const urlParams = new URLSearchParams(window.location.search)
    const createDCA = urlParams.get('createDCA')
    const createCrypto = urlParams.get('createCrypto')
    const accountId = urlParams.get('accountId')
    
    if (createDCA === 'true' && accountId) {
      setFormData({ name: '', accountId: parseInt(accountId) })
      setShowCreateDCAModal(true)
    } else if (createCrypto === 'true' && accountId) {
      setCryptoFormData({ name: '', description: '', accountId: parseInt(accountId) })
      setShowCreateCryptoModal(true)
    }
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
      console.error('Error fetching data:', error)
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
      console.error('Error fetching Bitcoin price:', error)
    }
  }

  // Format functions
  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount)

  const formatPercentage = (value: number) => 
    new Intl.NumberFormat('it-IT', { style: 'percent', minimumFractionDigits: 1 }).format(value / 100)

  // DCA Current Value Calculator
  const getDCACurrentValue = (portfolio: Portfolio) => {
    if (portfolio.type !== 'dca_bitcoin' && !portfolio.stats?.totalBTC && !portfolio.stats?.netBTC) {
      return 0
    }
    
    if (!btcPrice?.btcEur) {
      return 0
    }
    
    // Priority: netBTC (includes network fees)
    if (portfolio.stats?.netBTC !== undefined && portfolio.stats?.netBTC !== null) {
      return portfolio.stats.netBTC * btcPrice.btcEur
    }
    
    // Fallback: totalBTC
    if (portfolio.stats?.totalBTC !== undefined && portfolio.stats?.totalBTC !== null) {
      return portfolio.stats.totalBTC * btcPrice.btcEur
    }
    
    return 0
  }

  // Enhanced Overall Stats
  const overallStats = useMemo(() => {
    const allPortfolios = [...dcaPortfolios, ...cryptoPortfolios]
    
    // Enhanced Cash Flow: Somma tutte le stats dai portfolio backend
    const totalInvested = allPortfolios.reduce((sum, p) => sum + (p.stats.totalInvested || 0), 0)
    const totalCapitalRecovered = allPortfolios.reduce((sum, p) => sum + (p.stats.capitalRecovered || 0), 0)
    const totalEffectiveInvestment = allPortfolios.reduce((sum, p) => sum + (p.stats.effectiveInvestment || 0), 0)
    const totalRealizedProfit = allPortfolios.reduce((sum, p) => sum + (p.stats.realizedProfit || 0), 0)
    
    // Calcola current value usando helper functions Enhanced
    let totalCurrentValue = 0
    allPortfolios.forEach(portfolio => {
      const portfolioType = dcaPortfolios.includes(portfolio) ? 'dca_bitcoin' : 'crypto_wallet'
      
      if (portfolioType === 'crypto_wallet') {
        // Crypto portfolios: usa totalValueEur dal backend
        totalCurrentValue += portfolio.stats.totalValueEur || 0
      } else {
        // DCA portfolios: usa Enhanced current value calculation
        totalCurrentValue += getDCACurrentValue(portfolio)
      }
    })
    
    // Enhanced calculation per overall metrics
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
      <ProtectedRoute>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-adaptive-900">Investimenti</h1>
            <p className="text-adaptive-600">Gestisci i tuoi portfolio di investimento</p>
          </div>
          <div className="flex justify-center items-center h-64">
            <div className="text-adaptive-600">Caricamento portfolio...</div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-adaptive-900">📈 Investimenti</h1>
            <p className="text-adaptive-600">Gestisci i tuoi portfolio di investimento con Enhanced Cash Flow</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowCreateDCAModal(true)}
              className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 font-medium"
            >
              🟠 Nuovo DCA Bitcoin
            </button>
            <button
              onClick={() => setShowCreateCryptoModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
            >
              🚀 Nuovo Crypto Wallet
            </button>
          </div>
        </div>

        {/* Enhanced Overall Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="card-adaptive rounded-lg p-6 shadow-sm border-adaptive">
            <h3 className="text-sm font-medium text-adaptive-500">💰 Totale Investito</h3>
            <p className="text-2xl font-bold text-adaptive-900">
              {formatCurrency(overallStats.totalInvested)}
            </p>
            <p className="text-sm text-adaptive-600">{overallStats.totalPortfolios} portfolio</p>
          </div>
          
          <div className="card-adaptive rounded-lg p-6 shadow-sm border-adaptive">
            <h3 className="text-sm font-medium text-adaptive-500">🔄 Capitale Recuperato</h3>
            <p className="text-2xl font-bold text-blue-600">
              {formatCurrency(overallStats.totalCapitalRecovered)}
            </p>
            <div className="flex items-center gap-2 text-sm text-adaptive-600">
              <span>
                {overallStats.totalInvested > 0 ? 
                  `${((overallStats.totalCapitalRecovered / overallStats.totalInvested) * 100).toFixed(1)}%` : '0%'}
              </span>
              {overallStats.isFullyRecovered && <span className="text-green-600">✅</span>}
            </div>
          </div>
          
          <div className="card-adaptive rounded-lg p-6 shadow-sm border-adaptive">
            <h3 className="text-sm font-medium text-adaptive-500">⚠️ Soldi a Rischio</h3>
            <p className="text-2xl font-bold text-orange-600">
              {formatCurrency(overallStats.totalEffectiveInvestment)}
            </p>
            <p className="text-sm text-adaptive-600">
              {overallStats.isFullyRecovered ? '🎉 Investimento gratis!' : 'Non ancora recuperato'}
            </p>
          </div>
          
          <div className="card-adaptive rounded-lg p-6 shadow-sm border-adaptive">
            <h3 className="text-sm font-medium text-adaptive-500">📈 Valore Attuale</h3>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrency(overallStats.totalCurrentValue)}
            </p>
            <p className={`text-sm ${overallStats.overallROI >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ROI: {formatPercentage(overallStats.overallROI)}
            </p>
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
                const currentValue = getDCACurrentValue(portfolio)
                const totalInvested = portfolio.stats.totalInvested || 0
                const effectiveInvestment = portfolio.stats.effectiveInvestment || 0
                const realizedProfit = portfolio.stats.realizedProfit || 0
                const unrealizedGains = currentValue - effectiveInvestment
                const totalGains = realizedProfit + unrealizedGains
                const totalROI = totalInvested > 0 ? ((totalGains / totalInvested) * 100) : 0

                return (
                  <div key={portfolio.id} className="p-6 hover:bg-adaptive-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-3">
                          <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                            <span className="text-2xl">🟠</span>
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-adaptive-900">{portfolio.name}</h3>
                            <p className="text-sm text-adaptive-600">
                              {portfolio.stats.transactionCount} transazioni • Account: {accounts.find(a => a.id === portfolio.accountId)?.name}
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-adaptive-500">Profitto Realizzato</p>
                            <p className={`font-semibold ${realizedProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(realizedProfit)}
                            </p>
                          </div>
                          <div>
                            <p className="text-adaptive-500">Plus/Minus Non Realizzati</p>
                            <p className={`font-semibold ${unrealizedGains >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(unrealizedGains)}
                            </p>
                          </div>
                          <div>
                            <p className="text-adaptive-500">Totale P&L</p>
                            <p className={`font-semibold ${totalGains >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(totalGains)}
                            </p>
                          </div>
                          <div>
                            <p className="text-adaptive-500">ROI</p>
                            <p className={`font-semibold ${totalROI >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatPercentage(totalROI)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 ml-6">
                        {/* Investito */}
                        <div className="text-center min-w-[100px]">
                          <p className="text-xs text-adaptive-500">Investito</p>
                          <p className="font-semibold text-adaptive-900">
                            {formatCurrency(totalInvested)}
                          </p>
                        </div>

                        {/* Valore Attuale */}
                        <div className="text-center min-w-[100px]">
                          <p className="text-xs text-adaptive-500">Valore Attuale</p>
                          <p className="font-semibold text-green-600">
                            {formatCurrency(currentValue)}
                          </p>
                        </div>

                        {/* Pulsante Apri Wallet */}
                        <Link href={`/investments/${portfolio.id}`}>
                          <button className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors text-sm font-medium">
                            🟠 Apri Wallet
                          </button>
                        </Link>
                      </div>
                    </div>
                  </div>
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
                // Usa le Enhanced stats dal backend
                const totalInvested = portfolio.stats.totalInvested || 0
                const currentValue = portfolio.stats.totalValueEur || 0
                const totalROI = portfolio.stats.totalROI || 0
                const realizedProfit = portfolio.stats.realizedProfit || 0
                const unrealizedGains = portfolio.stats.unrealizedGains || 0
                const totalGains = realizedProfit + unrealizedGains

                return (
                  <div key={portfolio.id} className="p-6 hover:bg-adaptive-50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-4 mb-3">
                          <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                            <span className="text-2xl">🚀</span>
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold text-adaptive-900">{portfolio.name}</h3>
                            <p className="text-sm text-adaptive-600">
                              {portfolio.stats.holdingsCount} asset • {portfolio.stats.transactionCount} transazioni
                            </p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-adaptive-500">Profitto Realizzato</p>
                            <p className={`font-semibold ${realizedProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(realizedProfit)}
                            </p>
                          </div>
                          <div>
                            <p className="text-adaptive-500">Plus/Minus Non Realizzati</p>
                            <p className={`font-semibold ${unrealizedGains >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(unrealizedGains)}
                            </p>
                          </div>
                          <div>
                            <p className="text-adaptive-500">Totale P&L</p>
                            <p className={`font-semibold ${totalGains >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrency(totalGains)}
                            </p>
                          </div>
                          <div>
                            <p className="text-adaptive-500">ROI</p>
                            <p className={`font-semibold ${totalROI >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatPercentage(totalROI)}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 ml-6">
                        {/* Investito */}
                        <div className="text-center min-w-[100px]">
                          <p className="text-xs text-adaptive-500">Investito</p>
                          <p className="font-semibold text-adaptive-900">
                            {formatCurrency(totalInvested)}
                          </p>
                        </div>

                        {/* Valore Attuale */}
                        <div className="text-center min-w-[100px]">
                          <p className="text-xs text-adaptive-500">Valore Attuale</p>
                          <p className="font-semibold text-green-600">
                            {formatCurrency(currentValue)}
                          </p>
                        </div>

                        {/* Pulsante Apri Wallet */}
                        <Link href={`/investments/crypto-portfolio/${portfolio.id}`}>
                          <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium">
                            🚀 Apri Wallet
                          </button>
                        </Link>
                      </div>
                    </div>
                  </div>
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
            <div className="modal-content rounded-lg p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-adaptive-900">🟠 Nuovo Portfolio DCA Bitcoin</h3>
                
                <button
                  onClick={() => setShowCreateDCAModal(false)}
                  className="text-adaptive-600 hover:text-adaptive-900"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
<h4>Questo portfolio supporta esclusivamente l'acquisto e la vendita di btc con valute FIAT. Se hai bisogno di swap con stablecoins o shitcoins utilizza il Crypto Wallet.</h4><br></br>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-adaptive-900 mb-1">
                    Nome Portfolio
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-adaptive rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="es. DCA Bitcoin Principale"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-adaptive-900 mb-1">
                    Account di Investimento
                  </label>
                  <select
                    value={formData.accountId || ''}
                    onChange={(e) => setFormData({ ...formData, accountId: Number(e.target.value) || undefined })}
                    className="w-full px-3 py-2 border border-adaptive rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Seleziona account</option>
                    {investmentAccounts.map(account => (
                      <option key={account.id} value={account.id}>
                        {account.name} ({formatCurrency(account.balance)})
                      </option>
                    ))}
                  </select>
                  
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowCreateDCAModal(false)}
                    className="flex-1 px-4 py-2 border border-adaptive rounded-md text-adaptive-700 hover:bg-adaptive-50"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={createDCAPortfolio}
                    disabled={submitLoading}
                    className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
                  >
                    {submitLoading ? 'Creazione...' : 'Crea Portfolio'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create Crypto Portfolio Modal */}
        {showCreateCryptoModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="modal-content rounded-lg p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-adaptive-900">🚀 Nuovo Portfolio Crypto</h3>
                <button
                  onClick={() => setShowCreateCryptoModal(false)}
                  className="text-adaptive-600 hover:text-adaptive-900"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-adaptive-900 mb-1">
                    Nome Portfolio
                  </label>
                  <input
                    type="text"
                    value={cryptoFormData.name}
                    onChange={(e) => setCryptoFormData({ ...cryptoFormData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-adaptive rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="es. Portfolio Altcoin"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-adaptive-900 mb-1">
                    Descrizione (opzionale)
                  </label>
                  <input
                    type="text"
                    value={cryptoFormData.description}
                    onChange={(e) => setCryptoFormData({ ...cryptoFormData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-adaptive rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Portfolio per diversificazione crypto"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-adaptive-900 mb-1">
                    Account di Investimento
                  </label>
                  <select
                    value={cryptoFormData.accountId || ''}
                    onChange={(e) => setCryptoFormData({ ...cryptoFormData, accountId: Number(e.target.value) || undefined })}
                    className="w-full px-3 py-2 border border-adaptive rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Seleziona account</option>
                    {investmentAccounts.map(account => (
                      <option key={account.id} value={account.id}>
                        {account.name} ({formatCurrency(account.balance)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowCreateCryptoModal(false)}
                    className="flex-1 px-4 py-2 border border-adaptive rounded-md text-adaptive-700 hover:bg-adaptive-50"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={createCryptoPortfolio}
                    disabled={submitLoading}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submitLoading ? 'Creazione...' : 'Crea Portfolio'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}