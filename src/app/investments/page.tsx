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
      id: 'swing_trading',
      name: '📊 Swing Trading',
      description: 'Trading a breve-medio termine su crypto e asset',
      available: false,
      bgColor: 'bg-gray-100',
      borderColor: 'border-gray-300',
      textColor: 'text-gray-600'
    }
  ]

  // Caricamento dati iniziale
  useEffect(() => {
    fetchData()
    fetchBitcoinPrice()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [portfoliosRes, accountsRes] = await Promise.all([
        fetch('/api/dca-portfolios'),
        fetch('/api/accounts?type=investment')
      ])

      if (portfoliosRes.ok) {
        const data = await portfoliosRes.json()
        setPortfolios(data)
      }
      
      if (accountsRes.ok) {
        const accounts = await accountsRes.json()
        setInvestmentAccounts(accounts)
      }
    } catch (error) {
      console.error('Errore nel caricamento dati:', error)
    } finally {
      setLoading(false)
    }
  }

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

  const createPortfolio = async () => {
    if (!formData.name.trim()) {
      alert('Nome portfolio obbligatorio')
      return
    }

    setCreating(true)
    try {
      const response = await fetch('/api/dca-portfolios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        await fetchData()
        setShowCreateModal(false)
        setFormData({ name: '', type: 'dca_bitcoin', accountId: undefined })
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

  // Calcoli per le statistiche globali
  const getTotalInvested = () => {
    return portfolios.reduce((sum, portfolio) => sum + portfolio.stats.totalInvested, 0)
  }

  const getTotalCapitalRecovered = () => {
    return portfolios.reduce((sum, portfolio) => sum + portfolio.stats.capitalRecovered, 0)
  }

  const getTotalRealizedGains = () => {
    return portfolios.reduce((sum, portfolio) => sum + portfolio.stats.realizedGains, 0)
  }

  const getTotalBTC = () => {
    return portfolios.reduce((sum, portfolio) => sum + portfolio.stats.netBTC, 0)
  }

  const getFreeBTC = () => {
    return portfolios.reduce((sum, portfolio) => sum + portfolio.stats.freeBTCAmount, 0)
  }

  const getTotalROI = () => {
    const totalInvested = getTotalInvested()
    if (totalInvested === 0) return 0
    
    const totalCurrent = portfolios.reduce((sum, portfolio) => {
      const currentValue = btcPrice ? portfolio.stats.netBTC * btcPrice.btcEur : 0
      const unrealizedGains = currentValue - portfolio.stats.remainingCostBasis
      return sum + portfolio.stats.realizedGains + unrealizedGains
    }, 0)
    
    return (totalCurrent / totalInvested) * 100
  }

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
          <div className="h-8 bg-adaptive-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-adaptive-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Standardizzato */}
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
            title={investmentAccounts.length === 0 ?
              "Crea prima un conto di investimento nella sezione Conti" : undefined}
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
              Valore: {btcPrice ? formatCurrency(getTotalBTC() * btcPrice.btcEur) : 'N/A'}
            </p>
          </div>
        </div>

        {/* Price Info */}
        <div className="card-adaptive p-4 rounded-lg border-adaptive">
          <h3 className="text-sm font-medium text-adaptive-500">₿ Prezzo Bitcoin</h3>
          <p className="text-xl font-bold text-orange-600">
            {btcPrice ? formatCurrency(btcPrice.btcEur) : 'Caricamento...'}
          </p>
          <div className="mt-2 space-y-1">
            <p className="text-sm text-adaptive-600">
              USD: {btcPrice ? '$' + btcPrice.btcUsd.toLocaleString() : 'N/A'}
            </p>
            <p className={`text-xs ${btcPrice?.cached ? 'text-adaptive-500' : 'text-green-600'}`}>
              {btcPrice?.cached ? '📋 Dato in cache' : '🔄 Aggiornato'}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="card-adaptive p-4 rounded-lg border-adaptive">
          <h3 className="text-sm font-medium text-adaptive-500">🔄 Azioni</h3>
          <div className="mt-2 space-y-2">
            <button
              onClick={() => fetchBitcoinPrice()}
              disabled={priceLoading}
              className="w-full px-3 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 text-sm"
            >
              {priceLoading ? 'Aggiornando...' : 'Aggiorna Prezzo BTC'}
            </button>
            <button
              onClick={fetchData}
              className="w-full px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
            >
              🔄 Ricarica Portfolio
            </button>
          </div>
        </div>
      </div>

      {/* Portfolio List */}
      <div className="card-adaptive rounded-lg shadow-sm border-adaptive">
        <div className="p-6 border-b border-adaptive">
          <h3 className="text-lg font-medium text-adaptive-900">📊 I Tuoi Portfolio</h3>
        </div>
        <div className="p-6">
          {portfolios.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-lg font-medium text-adaptive-900 mb-2">Nessun Portfolio</h3>
              <p className="text-adaptive-600 mb-4">Crea il tuo primo portfolio DCA per iniziare ad investire</p>
              <button
                onClick={() => setShowCreateModal(true)}
                disabled={investmentAccounts.length === 0}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                ➕ Crea Portfolio
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {portfolios.map(portfolio => {
                const currentValue = calculateCurrentValue(portfolio)
                const unrealizedGains = calculateUnrealizedGains(portfolio)
                const totalROI = calculateTotalROI(portfolio)

                return (
                  <div key={portfolio.id} className="card-adaptive rounded-lg p-4 hover:bg-adaptive-50 transition-colors">
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
                    <span className="text-green-600 text-sm">✅ Disponibile</span>
                  ) : (
                    <span className="text-gray-500 text-sm">🚧 Prossimamente</span>
                  )}
                </div>
                <p className={`text-sm ${type.textColor} opacity-75`}>{type.description}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal Creazione Portfolio */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="card-adaptive max-w-md w-full mx-4 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-adaptive-900 mb-4">➕ Nuovo Portfolio</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">
                  Nome Portfolio
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full p-2 border border-adaptive rounded-md"
                  placeholder="es. Bitcoin DCA 2025"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">
                  Conto di Investimento
                </label>
                <select
                  value={formData.accountId || ''}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    accountId: e.target.value ? parseInt(e.target.value) : undefined 
                  }))}
                  className="w-full p-2 border border-adaptive rounded-md"
                >
                  <option value="">Seleziona conto...</option>
                  {investmentAccounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.name} - {formatCurrency(account.balance)}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">
                  Tipo Portfolio
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ ...prev, type: e.target.value }))}
                  className="w-full p-2 border border-adaptive rounded-md"
                >
                  <option value="dca_bitcoin">🟠 DCA Bitcoin</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="flex-1 px-4 py-2 border border-adaptive rounded-md text-adaptive-700 hover:bg-adaptive-50"
              >
                Annulla
              </button>
              <button
                onClick={createPortfolio}
                disabled={creating || !formData.name.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
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