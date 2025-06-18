'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface Account {
  id: number
  name: string
  type: string
  balance: number
}

interface DCAPortfolio {
  id: number
  name: string
  type: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  accountId?: number
  account?: Account
  stats: {
    totalBTC: number
    totalEUR: number
    totalFeesBTC: number
    netBTC: number
    transactionCount: number
    feesCount: number
  }
}

interface BitcoinPrice {
  btcUsd: number
  btcEur: number
  cached: boolean
}

export default function InvestmentsPage() {
  const [portfolios, setPortfolios] = useState<DCAPortfolio[]>([])
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
      name: '🏛️ Bonds',
      description: 'Obbligazioni governative e corporate per reddito fisso',
      available: false,
      bgColor: 'bg-blue-50',
      borderColor: 'border-blue-200',
      textColor: 'text-blue-800'
    }
  ]

  useEffect(() => {
    loadData()
    fetchBitcoinPrice()
    
    // Auto-refresh prezzo ogni 15 minuti
    const interval = setInterval(fetchBitcoinPrice, 15 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  const loadData = async () => {
    try {
      const [portfoliosRes, accountsRes] = await Promise.all([
        fetch('/api/dca-portfolios'),
        fetch('/api/accounts')
      ])
      
      if (portfoliosRes.ok) {
        const portfoliosData = await portfoliosRes.json()
        setPortfolios(portfoliosData)
      }
      
      if (accountsRes.ok) {
        const accountsData = await accountsRes.json()
        setInvestmentAccounts(accountsData.filter((acc: Account) => acc.type === 'investment'))
      }
    } catch (error) {
      console.error('Errore nel caricamento dati:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchBitcoinPrice = async () => {
    setPriceLoading(true)
    try {
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

  const createPortfolio = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!formData.name.trim()) return

    setCreating(true)
    try {
      const response = await fetch('/api/dca-portfolios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          type: formData.type,
          accountId: formData.accountId
        })
      })

      if (response.ok) {
        await loadData()
        setFormData({ name: '', type: 'dca_bitcoin', accountId: undefined })
        setShowCreateModal(false)
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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const formatBTC = (amount: number) => {
    return amount.toFixed(8) + ' BTC'
  }

  const calculateCurrentValue = (portfolio: DCAPortfolio) => {
    if (!btcPrice || portfolio.stats.netBTC <= 0) return 0
    return portfolio.stats.netBTC * btcPrice.btcEur
  }

  const calculateROI = (portfolio: DCAPortfolio) => {
    if (portfolio.stats.totalEUR <= 0) return 0
    const currentValue = calculateCurrentValue(portfolio)
    return ((currentValue - portfolio.stats.totalEUR) / portfolio.stats.totalEUR) * 100
  }

  const getTotalInvestment = () => {
    return portfolios.reduce((sum, p) => sum + p.stats.totalEUR, 0)
  }

  const getTotalCurrentValue = () => {
    return portfolios.reduce((sum, p) => sum + calculateCurrentValue(p), 0)
  }

  const getTotalROI = () => {
    const totalInvested = getTotalInvestment()
    if (totalInvested <= 0) return 0
    const totalCurrent = getTotalCurrentValue()
    return ((totalCurrent - totalInvested) / totalInvested) * 100
  }

  const getAccountName = (accountId?: number) => {
    if (!accountId) return 'Non collegato'
    const account = investmentAccounts.find(acc => acc.id === accountId)
    return account ? account.name : 'Account non trovato'
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
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded"></div>
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
          <h1 className="text-3xl font-bold text-adaptive-900">Investimenti</h1>
          <p className="text-adaptive-600">Gestisci i tuoi portafogli di investimento</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={fetchBitcoinPrice}
            disabled={priceLoading}
            className="px-4 py-2 border border-adaptive rounded-md text-adaptive-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {priceLoading ? '🔄' : '📡'} Aggiorna Prezzo
          </button>
          <button
            onClick={() => setShowCreateModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            ➕ Nuovo Portfolio
          </button>
        </div>
      </div>

      {/* Statistiche Generali */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card-adaptive p-4 rounded-lg border-adaptive">
          <h3 className="text-sm font-medium text-adaptive-500">💰 Investimento Totale</h3>
          <p className="text-2xl font-bold text-adaptive-900">{formatCurrency(getTotalInvestment())}</p>
          <p className="text-sm text-adaptive-600">{portfolios.length} portfolio</p>
        </div>
        <div className="card-adaptive p-4 rounded-lg border-adaptive">
          <h3 className="text-sm font-medium text-adaptive-500">📈 Valore Attuale</h3>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(getTotalCurrentValue())}</p>
          <p className="text-sm text-adaptive-600">
            {btcPrice ? `BTC: ${formatCurrency(btcPrice.btcEur)}` : 'Prezzo non disponibile'}
          </p>
        </div>
        <div className="card-adaptive p-4 rounded-lg border-adaptive">
          <h3 className="text-sm font-medium text-adaptive-500">🎯 ROI Totale</h3>
          <p className={`text-2xl font-bold ${getTotalROI() >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {getTotalROI().toFixed(2)}%
          </p>
          <p className="text-sm text-adaptive-600">
            {getTotalROI() >= 0 ? '📈 Profitto' : '📉 Perdita'}
          </p>
        </div>
        <div className="card-adaptive p-4 rounded-lg border-adaptive">
          <h3 className="text-sm font-medium text-adaptive-500">₿ Bitcoin</h3>
          <p className="text-2xl font-bold text-orange-600">
            {portfolios.reduce((sum, p) => sum + p.stats.netBTC, 0).toFixed(8)}
          </p>
          <p className="text-sm text-adaptive-600">BTC netti totali</p>
        </div>
      </div>

      {/* Portafogli Attivi */}
      <div className="card-adaptive rounded-lg shadow-sm border-adaptive">
        <div className="p-6 border-b border-adaptive">
          <h3 className="text-lg font-medium text-adaptive-900">📊 Portafogli Attivi</h3>
        </div>
        <div className="p-6">
          {portfolios.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-adaptive-600 mb-4">Nessun portafoglio di investimento trovato</p>
              <button
                onClick={() => setShowCreateModal(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Crea il tuo primo portfolio
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {portfolios.map((portfolio) => {
                const currentValue = calculateCurrentValue(portfolio)
                const roi = calculateROI(portfolio)
                
                return (
                  <div key={portfolio.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="text-2xl">
                        {portfolio.type === 'dca_bitcoin' ? '🟠' : '💰'}
                      </div>
                      <div className="flex-1">
                        <h4 className="font-medium text-adaptive-900">{portfolio.name}</h4>
                        <p className="text-sm text-adaptive-500">
                          {portfolio.stats.transactionCount} transazioni • 
                          {portfolio.stats.feesCount} fee di rete • 
                          Conto: {getAccountName(portfolio.accountId)}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="text-center min-w-[100px]">
                        <p className="text-sm text-adaptive-500">Investito</p>
                        <p className="font-semibold text-adaptive-900">
                          {formatCurrency(portfolio.stats.totalEUR)}
                        </p>
                      </div>
                      
                      <div className="text-center min-w-[100px]">
                        <p className="text-sm text-adaptive-500">Valore Attuale</p>
                        <p className="font-semibold text-green-600">
                          {formatCurrency(currentValue)}
                        </p>
                      </div>
                      
                      <div className="text-center min-w-[80px]">
                        <p className="text-sm text-adaptive-500">ROI</p>
                        <p className={`font-semibold ${roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {roi.toFixed(2)}%
                        </p>
                      </div>
                      
                      <div className="text-center min-w-[120px]">
                        <p className="text-sm text-adaptive-500">BTC Netti</p>
                        <p className="font-semibold text-orange-600">
                          {portfolio.stats.netBTC.toFixed(8)}
                        </p>
                      </div>
                      
                      <Link
                        href={`/investments/${portfolio.id}`}
                        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                      >
                        Gestisci →
                      </Link>
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
                className={`p-4 rounded-lg border-2 ${type.bgColor} ${type.borderColor}`}
              >
                <div className="flex items-center justify-between mb-2">
                  <h4 className={`font-semibold ${type.textColor}`}>{type.name}</h4>
                  {type.available ? (
                    <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                      Disponibile
                    </span>
                  ) : (
                    <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                      Prossimamente
                    </span>
                  )}
                </div>
                <p className={`text-sm ${type.textColor} opacity-80`}>
                  {type.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal Creazione Portfolio */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="modal-content rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-adaptive-900 mb-4">Nuovo Portfolio</h3>
            <form onSubmit={createPortfolio}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-adaptive-700 mb-2">
                    Nome Portfolio *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-adaptive rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="es. DCA Bitcoin 2025"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-adaptive-700 mb-2">
                    Tipo Portfolio *
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({...formData, type: e.target.value})}
                    className="w-full px-3 py-2 border border-adaptive rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    {portfolioTypes.filter(type => type.available).map(type => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-adaptive-700 mb-2">
                    Conto Collegato (opzionale)
                  </label>
                  <select
                    value={formData.accountId || ''}
                    onChange={(e) => setFormData({...formData, accountId: e.target.value ? parseInt(e.target.value) : undefined})}
                    className="w-full px-3 py-2 border border-adaptive rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Nessun conto collegato</option>
                    {investmentAccounts.map(account => (
                      <option key={account.id} value={account.id}>
                        {account.name} (€{account.balance.toFixed(2)})
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-adaptive-500 mt-1">
                    Le transazioni scalano automaticamente dal conto collegato
                  </p>
                </div>

                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowCreateModal(false)
                      setFormData({ name: '', type: 'dca_bitcoin', accountId: undefined })
                    }}
                    className="px-4 py-2 text-adaptive-600 hover:text-adaptive-800"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    disabled={creating}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {creating ? 'Creazione...' : 'Crea Portfolio'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}