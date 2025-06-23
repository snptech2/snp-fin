'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Account {
  id: number
  name: string
  type: string
  balance: number
}

interface EnhancedDCAPortfolio {
  id: number
  name: string
  type: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  accountId?: number
  account?: Account
  stats: {
    // Enhanced fields
    totalInvested: number
    capitalRecovered: number
    realizedGains: number
    realizedLoss: number
    remainingCostBasis: number
    effectiveInvestment: number
    isFullyRecovered: boolean
    freeBTCAmount: number
    hasRealizedGains: boolean
    hasRealizedLoss: boolean
    realizedROI: number
    
    // Original fields (for compatibility)
    totalBTC: number
    totalEUR: number
    totalFeesBTC: number
    netBTC: number
    transactionCount: number
    feesCount: number
    
    // Legacy
    actualInvestment: number
    isFreeBTC: boolean
  }
}

interface BitcoinPrice {
  btcUsd: number
  btcEur: number
  cached: boolean
}

export default function EnhancedInvestmentsPage() {
  const [portfolios, setPortfolios] = useState<EnhancedDCAPortfolio[]>([])
  const [investmentAccounts, setInvestmentAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [btcPrice, setBtcPrice] = useState<BitcoinPrice | null>(null)
  const [priceLoading, setPriceLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'dca_bitcoin',
    accountId: undefined as number | undefined
  })

  // Tipi di portafoglio disponibili
  const portfolioTypes = [
    {
      id: 'dca_bitcoin',
      name: '🟠 DCA Bitcoin',
      description: 'Piano di accumulo Bitcoin con DCA (Dollar Cost Averaging)',
      available: true,
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      textColor: 'text-orange-800'
    },
    {
      id: 'crypto_wallet',
      name: '💰 Wallet Crypto',
      description: 'Portafoglio multi-cryptocurrency per gestire diversi asset',
      available: false,
      bgColor: 'bg-purple-50',
      borderColor: 'border-purple-200',
      textColor: 'text-purple-800'
    },
    {
      id: 'stocks',
      name: '📈 Stocks & ETF',
      description: 'Azioni e fondi negoziati in borsa per diversificazione',
      available: false,
      bgColor: 'bg-green-50',
      borderColor: 'border-green-200',
      textColor: 'text-green-800'
    },
    {
      id: 'bonds',
      name: '🏛️ Bonds & Obbligazioni',
      description: 'Titoli di stato e obbligazioni corporate per stabilità',
      available: false,
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-800'
    }
  ]

  // Load portfolios
  const fetchPortfolios = async () => {
    try {
      setLoading(true)
      const response = await fetch('/api/dca-portfolios')
      if (response.ok) {
        const data = await response.json()
        setPortfolios(data)
      }
    } catch (error) {
      console.error('Errore nel caricamento portfolios:', error)
    } finally {
      setLoading(false)
    }
  }

  // Load investment accounts
  const fetchInvestmentAccounts = async () => {
    try {
      const response = await fetch('/api/accounts?type=investment')
      if (response.ok) {
        const data = await response.json()
        setInvestmentAccounts(data)
      }
    } catch (error) {
      console.error('Errore nel caricamento conti investimento:', error)
    }
  }

  // Load Bitcoin price
  const fetchBitcoinPrice = async () => {
    try {
      setPriceLoading(true)
      const response = await fetch('/api/bitcoin-price')
      if (response.ok) {
        const data = await response.json()
        setBtcPrice(data)
      }
    } catch (error) {
      console.error('Errore nel caricamento prezzo Bitcoin:', error)
    } finally {
      setPriceLoading(false)
    }
  }

  useEffect(() => {
    fetchPortfolios()
    fetchInvestmentAccounts()
    fetchBitcoinPrice()
  }, [])

  // Create portfolio function
  const createPortfolio = async () => {
    if (!formData.name.trim()) {
      alert('Il nome del portfolio è obbligatorio')
      return
    }

    if (!formData.accountId) {
      alert('Devi selezionare un conto di investimento')
      return
    }

    try {
      setCreating(true)
      const response = await fetch('/api/dca-portfolios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name.trim(),
          type: formData.type,
          accountId: parseInt(formData.accountId.toString())
        })
      })

      if (response.ok) {
        await fetchPortfolios()
        setShowCreateModal(false)
        setFormData({
          name: '',
          type: 'dca_bitcoin',
          accountId: undefined
        })
      } else {
        const error = await response.json()
        alert(error.error || 'Errore nella creazione del portfolio')
      }
    } catch (error) {
      console.error('Errore:', error)
      alert('Errore nella creazione del portfolio')
    } finally {
      setCreating(false)
    }
  }

  // Enhanced calculations
  const getTotalInvested = () => {
    return portfolios.reduce((sum, p) => sum + p.stats.totalInvested, 0)
  }

  const getTotalCapitalRecovered = () => {
    return portfolios.reduce((sum, p) => sum + p.stats.capitalRecovered, 0)
  }

  const getTotalRealizedGains = () => {
    return portfolios.reduce((sum, p) => sum + p.stats.realizedGains, 0)
  }

  const getTotalEffectiveInvestment = () => {
    return portfolios.reduce((sum, p) => sum + p.stats.effectiveInvestment, 0)
  }

  const getTotalCurrentValue = () => {
    if (!btcPrice) return 0
    return portfolios.reduce((sum, p) => sum + (p.stats.netBTC * btcPrice.btcEur), 0)
  }

  const getTotalUnrealizedGains = () => {
    const currentValue = getTotalCurrentValue()
    const effectiveInvestment = getTotalEffectiveInvestment()
    return currentValue - effectiveInvestment
  }

  const getTotalBTC = () => {
    return portfolios.reduce((sum, p) => sum + p.stats.netBTC, 0)
  }

  const getFreeBTC = () => {
    return portfolios.reduce((sum, p) => sum + p.stats.freeBTCAmount, 0)
  }

  const getTotalROI = () => {
    const totalInvested = getTotalInvested()
    if (totalInvested === 0) return 0
    
    const totalCurrentValue = getTotalCurrentValue()
    const totalRealizedGains = getTotalRealizedGains()
    const totalGains = totalRealizedGains + getTotalUnrealizedGains()
    
    return (totalGains / totalInvested) * 100
  }

  // Enhanced portfolio calculations
  const calculateCurrentValue = (portfolio: EnhancedDCAPortfolio) => {
    return btcPrice ? portfolio.stats.netBTC * btcPrice.btcEur : 0
  }

  const calculateUnrealizedGains = (portfolio: EnhancedDCAPortfolio) => {
    const currentValue = calculateCurrentValue(portfolio)
    return currentValue - portfolio.stats.remainingCostBasis
  }

  const calculateTotalROI = (portfolio: EnhancedDCAPortfolio) => {
    if (portfolio.stats.totalInvested === 0) return 0
    const currentValue = calculateCurrentValue(portfolio)
    const totalGains = portfolio.stats.realizedGains + calculateUnrealizedGains(portfolio)
    return (totalGains / portfolio.stats.totalInvested) * 100
  }

  // Format functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const formatBTC = (amount: number) => {
    return amount.toFixed(8) + ' BTC'
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-adaptive-900">💼 Investimenti</h1>
          <p className="text-adaptive-600">Dashboard avanzata con Enhanced Cash Flow</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => {
              // Reset form quando apri il modal
              setFormData({
                name: '',
                type: 'dca_bitcoin',
                accountId: undefined
              })
              setShowCreateModal(true)
            }}
            disabled={investmentAccounts.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            title={investmentAccounts.length === 0 ? "Crea prima un conto di investimento nella sezione Conti" : undefined}
          >
            ➕ Nuovo Portfolio
          </button>
        </div>
      </div>

      {/* Enhanced Statistics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Invested */}
        <div className="card-adaptive p-4 rounded-lg border-adaptive">
          <h3 className="text-sm font-medium text-adaptive-500">💰 Investimento Totale</h3>
          <p className="text-2xl font-bold text-adaptive-900">{formatCurrency(getTotalInvested())}</p>
          <p className="text-sm text-adaptive-600">{portfolios.length} portfolio</p>
        </div>

        {/* Capital Recovered */}
        <div className="card-adaptive p-4 rounded-lg border-adaptive">
          <h3 className="text-sm font-medium text-adaptive-500">🔄 Capitale Recuperato</h3>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(getTotalCapitalRecovered())}</p>
          <p className="text-sm text-adaptive-600">
            {getTotalInvested() > 0 ? ((getTotalCapitalRecovered() / getTotalInvested()) * 100).toFixed(1) : 0}% recuperato
          </p>
        </div>

        {/* Realized Gains */}
        <div className="card-adaptive p-4 rounded-lg border-adaptive">
          <h3 className="text-sm font-medium text-adaptive-500">📈 Profitti Realizzati</h3>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(getTotalRealizedGains())}</p>
          <p className="text-sm text-adaptive-600">
            {getTotalInvested() > 0 ? ((getTotalRealizedGains() / getTotalInvested()) * 100).toFixed(1) : 0}% ROI realizzato
          </p>
        </div>

        {/* Total ROI */}
        <div className="card-adaptive p-4 rounded-lg border-adaptive">
          <h3 className="text-sm font-medium text-adaptive-500">🎯 ROI Totale</h3>
          <p className={`text-2xl font-bold ${getTotalROI() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {getTotalROI().toFixed(2)}%
          </p>
          <p className="text-sm text-adaptive-600">
            {getTotalROI() >= 0 ? '📈 Profitto' : '📉 Perdita'}
          </p>
        </div>
      </div>

      {/* Enhanced Additional Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Bitcoin Holdings */}
        <div className="card-adaptive p-4 rounded-lg border-adaptive">
          <h3 className="text-sm font-medium text-adaptive-500">₿ Bitcoin Totali</h3>
          <p className="text-xl font-bold text-orange-600">{formatBTC(getTotalBTC())}</p>
          <div className="mt-2 space-y-1">
            <p className="text-sm text-green-600">🎉 BTC Gratuiti: {formatBTC(getFreeBTC())}</p>
            <p className="text-sm text-adaptive-600">
              Valore: {btcPrice ? formatCurrency(getTotalCurrentValue()) : 'N/A'}
            </p>
          </div>
        </div>

        {/* Effective Investment */}
        <div className="card-adaptive p-4 rounded-lg border-adaptive">
          <h3 className="text-sm font-medium text-adaptive-500">💸 Soldi a Rischio</h3>
          <p className="text-xl font-bold text-adaptive-900">{formatCurrency(getTotalEffectiveInvestment())}</p>
          <p className="text-sm text-adaptive-600">
            {getTotalEffectiveInvestment() === 0 ? '🎉 Nessun rischio!' : 'Ancora da recuperare'}
          </p>
        </div>

        {/* Unrealized Gains */}
        <div className="card-adaptive p-4 rounded-lg border-adaptive">
          <h3 className="text-sm font-medium text-adaptive-500">💎 Plus/Minus Non Realizzate</h3>
          <p className={`text-xl font-bold ${getTotalUnrealizedGains() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(getTotalUnrealizedGains())}
          </p>
          <p className="text-sm text-adaptive-600">
            {btcPrice ? `BTC: ${formatCurrency(btcPrice.btcEur)}` : 'Prezzo non disponibile'}
          </p>
        </div>
      </div>

      {/* Enhanced Portfolio List */}
      <div className="card-adaptive rounded-lg shadow-sm border-adaptive">
        <div className="p-6 border-b border-adaptive">
          <h3 className="text-lg font-medium text-adaptive-900">📊 Portafogli Dettagliati</h3>
        </div>
        <div className="p-6">
          {portfolios.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-adaptive-600 mb-4">Nessun portafoglio di investimento trovato</p>
              <button
                onClick={() => {
                  setFormData({
                    name: '',
                    type: 'dca_bitcoin',
                    accountId: undefined
                  })
                  setShowCreateModal(true)
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Crea il tuo primo portfolio
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {portfolios.map((portfolio) => {
                const currentValue = calculateCurrentValue(portfolio)
                const unrealizedGains = calculateUnrealizedGains(portfolio)
                const totalROI = calculateTotalROI(portfolio)
                
                return (
                  <div key={portfolio.id} className="border border-adaptive rounded-lg p-4 hover:bg-gray-50 transition-colors">
                    <div className="flex items-center justify-between">
                      {/* Portfolio Info */}
                      <div className="flex items-center gap-4">
                        <div className="text-2xl">🟠</div>
                        <div>
                          <h4 className="font-semibold text-adaptive-900">{portfolio.name}</h4>
                          <p className="text-sm text-adaptive-600">
                            {portfolio.account?.name || 'Nessun conto collegato'}
                          </p>
                        </div>
                      </div>

                      {/* Enhanced Stats Grid */}
                      <div className="flex items-center gap-6">
                        {/* Investment Overview */}
                        <div className="text-center min-w-[100px]">
                          <p className="text-xs text-adaptive-500">Investito</p>
                          <p className="font-semibold text-adaptive-900">
                            {formatCurrency(portfolio.stats.totalInvested)}
                          </p>
                        </div>

                        {/* Recovery Status */}
                        <div className="text-center min-w-[100px]">
                          <p className="text-xs text-adaptive-500">Recuperato</p>
                          <p className="font-semibold text-green-600">
                            {formatCurrency(portfolio.stats.capitalRecovered)}
                          </p>
                          {portfolio.stats.isFullyRecovered && (
                            <p className="text-xs text-green-600">✅ Completo</p>
                          )}
                        </div>

                        {/* Realized Gains */}
                        <div className="text-center min-w-[100px]">
                          <p className="text-xs text-adaptive-500">Profitti Real.</p>
                          <p className={`font-semibold ${portfolio.stats.realizedGains >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(portfolio.stats.realizedGains)}
                          </p>
                        </div>

                        {/* Current Value & Unrealized */}
                        <div className="text-center min-w-[120px]">
                          <p className="text-xs text-adaptive-500">Valore Attuale</p>
                          <p className="font-semibold text-adaptive-900">
                            {formatCurrency(currentValue)}
                          </p>
                          <p className={`text-xs ${unrealizedGains >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {unrealizedGains >= 0 ? '+' : ''}{formatCurrency(unrealizedGains)}
                          </p>
                        </div>

                        {/* Total ROI */}
                        <div className="text-center min-w-[80px]">
                          <p className="text-xs text-adaptive-500">ROI Tot.</p>
                          <p className={`font-semibold ${totalROI >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {totalROI.toFixed(1)}%
                          </p>
                        </div>

                        {/* BTC Amount */}
                        <div className="text-center min-w-[100px]">
                          <p className="text-xs text-adaptive-500">BTC</p>
                          <p className="font-semibold text-orange-600">
                            {portfolio.stats.netBTC.toFixed(6)}
                          </p>
                          {portfolio.stats.freeBTCAmount > 0 && (
                            <p className="text-xs text-green-600">🎉 Gratuiti!</p>
                          )}
                        </div>

                        {/* Action Button */}
                        <Link
                          href={`/investments/${portfolio.id}`}
                          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                        >
                          Gestisci →
                        </Link>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Tipi di Portfolio Disponibili */}
      <div className="card-adaptive rounded-lg shadow-sm border-adaptive">
        <div className="p-6 border-b border-adaptive">
          <h3 className="text-lg font-medium text-adaptive-900">🎯 Tipi di Portfolio Disponibili</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {portfolioTypes.map((type) => (
              <div
                key={type.id}
                className={`p-4 rounded-lg border-2 ${type.bgColor} ${type.borderColor} ${
                  type.available ? 'cursor-pointer hover:shadow-md' : 'opacity-75'
                }`}
                onClick={() => {
                  if (type.available) {
                    setFormData(prev => ({ ...prev, type: type.id }))
                    setShowCreateModal(true)
                  }
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className={`font-semibold ${type.textColor}`}>{type.name}</h4>
                  {type.available ? (
                    <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                      Disponibile
                    </span>
                  ) : (
                    <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded">
                      Prossimamente
                    </span>
                  )}
                </div>
                <p className={`text-sm ${type.textColor} opacity-80`}>
                  {type.description}
                </p>
                {type.available && (
                  <div className="mt-3">
                    <span className="text-xs text-blue-600 font-medium">
                      👆 Clicca per creare →
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Create Modal - Complete Version */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {portfolioTypes.find(t => t.id === formData.type)?.name || 'Nuovo Portfolio'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome Portfolio *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Es: DCA Bitcoin 2024"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo Portfolio
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                >
                  {portfolioTypes.filter(type => type.available).map(type => (
                    <option key={type.id} value={type.id}>
                      {type.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Conto di Investimento *
                </label>
                <select
                  value={formData.accountId || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    accountId: e.target.value ? parseInt(e.target.value) : undefined 
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                  required
                >
                  <option value="">Seleziona un conto di investimento</option>
                  {investmentAccounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.name} (€{account.balance.toFixed(2)})
                    </option>
                  ))}
                </select>
              </div>

              {investmentAccounts.length === 0 && (
                <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
                  <p className="text-sm text-yellow-800">
                    ⚠️ Non hai conti di investimento. 
                    <a href="/accounts" className="text-blue-600 hover:text-blue-800 ml-1">
                      Creane uno prima →
                    </a>
                  </p>
                </div>
              )}

              <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                <p className="text-sm text-blue-800">
                  💡 <strong>Enhanced Cash Flow:</strong> Il sistema traccia automaticamente 
                  investimenti, recuperi e profitti per una gestione trasparente.
                </p>
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setFormData({
                    name: '',
                    type: 'dca_bitcoin',
                    accountId: undefined
                  })
                }}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={creating}
              >
                Annulla
              </button>
              <button
                onClick={createPortfolio}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                disabled={creating || !formData.name.trim() || !formData.accountId}
              >
                {creating ? 'Creando...' : 'Crea Portfolio'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}