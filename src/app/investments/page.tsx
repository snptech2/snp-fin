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

// 🚀 NUOVO CRYPTO PORTFOLIO INTERFACES
interface SimpleCryptoPortfolio {
  id: number
  name: string
  description?: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  accountId: number
  account?: Account
  stats: {
    totalValueEur: number
    totalInvested: number
    realizedGains: number
    unrealizedGains: number
    totalROI: number
    holdingsCount: number
    transactionCount: number
  }
}

interface BitcoinPrice {
  btcUsd: number
  btcEur: number
  cached: boolean
}

export default function EnhancedInvestmentsPage() {
  // EXISTING DCA STATES
  const [portfolios, setPortfolios] = useState<EnhancedDCAPortfolio[]>([])
  const [investmentAccounts, setInvestmentAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)
  const [btcPrice, setBtcPrice] = useState<BitcoinPrice | null>(null)
  const [priceLoading, setPriceLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [creating, setCreating] = useState(false)
  
  // 🚀 NEW CRYPTO PORTFOLIO STATES
  const [newCryptoPortfolios, setNewCryptoPortfolios] = useState<SimpleCryptoPortfolio[]>([])
  const [newCryptoLoading, setNewCryptoLoading] = useState(true)
  const [showCreateNewCryptoModal, setShowCreateNewCryptoModal] = useState(false)
  const [creatingNewCrypto, setCreatingNewCrypto] = useState(false)
  
  const [formData, setFormData] = useState({
    name: '',
    type: 'dca_bitcoin',
    accountId: undefined as number | undefined
  })

  // 🚀 NEW CRYPTO PORTFOLIO FORM
  const [newCryptoForm, setNewCryptoForm] = useState({
    name: '',
    description: '',
    accountId: undefined as number | undefined
  })

  // Format functions (defined once at the top)
  const formatCurrency = (amount: number) => {
    if (typeof amount !== 'number' || isNaN(amount)) return '€ 0,00'
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const formatBTC = (amount: number) => {
    if (typeof amount !== 'number' || isNaN(amount)) return '0.00000000 BTC'
    return amount.toFixed(8) + ' BTC'
  }

  const formatCrypto = (amount: number, decimals = 6) => {
    if (typeof amount !== 'number' || isNaN(amount)) return '0.000000'
    return amount.toFixed(decimals)
  }

  const formatPercentage = (value: number) => {
    if (typeof value !== 'number' || isNaN(value)) return '0.00%'
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
  }

  // Caricamento dati iniziale
  useEffect(() => {
    fetchData()
    fetchBitcoinPrice()
    fetchNewCryptoPortfolios() // 🚀 SOLO IL NUOVO SISTEMA!
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

  // 🚀 NEW CRYPTO PORTFOLIOS
  const fetchNewCryptoPortfolios = async () => {
    setNewCryptoLoading(true)
    try {
      const response = await fetch('/api/crypto-portfolios')
      if (response.ok) {
        const data = await response.json()
        setNewCryptoPortfolios(data)
      } else {
        console.log('Nessun crypto portfolio trovato (normale se è la prima volta)')
        setNewCryptoPortfolios([])
      }
    } catch (error) {
      console.error('Errore nel caricamento nuovi crypto portfolios:', error)
      setNewCryptoPortfolios([])
    } finally {
      setNewCryptoLoading(false)
    }
  }

  const createNewCryptoPortfolio = async () => {
    if (!newCryptoForm.name.trim() || !newCryptoForm.accountId) return

    setCreatingNewCrypto(true)
    try {
      const response = await fetch('/api/crypto-portfolios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newCryptoForm)
      })

      if (response.ok) {
        await fetchNewCryptoPortfolios()
        setShowCreateNewCryptoModal(false)
        setNewCryptoForm({ name: '', description: '', accountId: undefined })
      } else {
        const error = await response.json()
        console.error('Errore creazione:', error)
        alert(`Errore: ${error.error || 'Errore sconosciuto'}`)
      }
    } catch (error) {
      console.error('Errore nella creazione nuovo crypto portfolio:', error)
      alert('Errore nella creazione del crypto portfolio')
    } finally {
      setCreatingNewCrypto(false)
    }
  }

  const fetchBitcoinPrice = async (forceRefresh = false) => {
    if (priceLoading && !forceRefresh) return
    
    setPriceLoading(true)
    try {
      const url = forceRefresh ? '/api/bitcoin-price?refresh=true' : '/api/bitcoin-price'
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setBtcPrice(data)
      }
    } catch (error) {
      console.error('Errore nel recupero prezzo Bitcoin:', error)
    } finally {
      setPriceLoading(false)
    }
  }

  const createPortfolio = async () => {
    if (!formData.name.trim() || !formData.accountId) return

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
        setFormData({
          name: '',
          type: 'dca_bitcoin',
          accountId: undefined
        })
      } else {
        const error = await response.json()
        console.error('Errore creazione:', error)
      }
    } catch (error) {
      console.error('Errore nella creazione portfolio:', error)
    } finally {
      setCreating(false)
    }
  }

  // Calculation functions
  const calculateOverallCurrentValue = () => {
    if (!portfolios.length || !btcPrice) return 0
    return portfolios.reduce((total, portfolio) => {
      const currentValue = (portfolio.stats?.netBTC || 0) * btcPrice.btcEur
      return total + currentValue
    }, 0)
  }

  const calculateOverallInvestment = () => {
    return portfolios.reduce((total, portfolio) => 
      total + (portfolio.stats?.effectiveInvestment || portfolio.stats?.totalInvested || 0), 0
    )
  }

  const calculateOverallRealizedGains = () => {
    return portfolios.reduce((total, portfolio) => 
      total + (portfolio.stats?.realizedGains || 0), 0
    )
  }

  // NEW CRYPTO PORTFOLIO CALCULATIONS
  const calculateNewCryptoPortfolioOverallValue = () => {
    return newCryptoPortfolios.reduce((total, portfolio) => 
      total + (portfolio.stats?.totalValueEur || 0), 0
    )
  }

  const calculateNewCryptoPortfolioOverallInvested = () => {
    return newCryptoPortfolios.reduce((total, portfolio) => 
      total + (portfolio.stats?.totalInvested || 0), 0
    )
  }

  const calculateNewCryptoPortfolioOverallGains = () => {
    return newCryptoPortfolios.reduce((total, portfolio) => 
      total + (portfolio.stats?.realizedGains || 0) + (portfolio.stats?.unrealizedGains || 0), 0
    )
  }

  const calculateCurrentValue = (portfolio: EnhancedDCAPortfolio) => {
    if (!btcPrice) return 0
    return (portfolio.stats?.netBTC || 0) * btcPrice.btcEur
  }

  const calculateUnrealizedGains = (portfolio: EnhancedDCAPortfolio) => {
    const currentValue = calculateCurrentValue(portfolio)
    const effectiveInvestment = portfolio.stats?.effectiveInvestment || portfolio.stats?.totalInvested || 0
    return currentValue - effectiveInvestment
  }

  const calculateTotalROI = (portfolio: EnhancedDCAPortfolio) => {
    const currentValue = calculateCurrentValue(portfolio)
    const totalInvested = portfolio.stats?.totalInvested || 0
    if (totalInvested === 0) return 0
    return ((currentValue - totalInvested) / totalInvested) * 100
  }

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
          <p className="text-adaptive-600">Gestisci i tuoi portfolio e investimenti</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              setFormData({
                name: '',
                type: 'dca_bitcoin',
                accountId: undefined
              })
              setShowCreateModal(true)
            }}
            disabled={investmentAccounts.length === 0}
            className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed"
            title={investmentAccounts.length === 0 ? 'Crea prima un conto investimento' : ''}
          >
            ➕ DCA Bitcoin
          </button>
          
          {/* 🚀 NUOVO BOTTONE CRYPTO WALLET */}
          <button
            onClick={() => {
              setNewCryptoForm({ name: '', description: '', accountId: undefined })
              setShowCreateNewCryptoModal(true)
            }}
            disabled={investmentAccounts.length === 0}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            title={investmentAccounts.length === 0 ? 'Crea prima un conto investimento' : ''}
          >
            🚀 Crypto Wallet
          </button>
        </div>
      </div>

      {/* ================== STATISTICHE OVERVIEW ================== */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* DCA Overview */}
        <div className="card-adaptive p-6 rounded-lg shadow-sm border-adaptive">
          <h3 className="text-sm font-medium text-orange-600 mb-1">🟠 DCA Bitcoin</h3>
          <p className="text-2xl font-bold text-adaptive-900">
            {formatCurrency(calculateOverallCurrentValue())}
          </p>
          <p className="text-sm text-adaptive-600">
            {portfolios.length} portfolio{portfolios.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* NEW Crypto Portfolio Overview */}
        <div className="card-adaptive p-6 rounded-lg shadow-sm border-adaptive">
          <h3 className="text-sm font-medium text-blue-600 mb-1">🚀 Crypto Wallet</h3>
          <p className="text-2xl font-bold text-adaptive-900">
            {formatCurrency(calculateNewCryptoPortfolioOverallValue())}
          </p>
          <p className="text-sm text-adaptive-600">
            {newCryptoPortfolios.length} wallet{newCryptoPortfolios.length !== 1 ? 's' : ''}
          </p>
        </div>

        {/* Total */}
        <div className="card-adaptive p-6 rounded-lg shadow-sm border-adaptive">
          <h3 className="text-sm font-medium text-adaptive-600 mb-1">💰 Totale</h3>
          <p className="text-2xl font-bold text-adaptive-900">
            {formatCurrency(
              calculateOverallCurrentValue() + 
              calculateNewCryptoPortfolioOverallValue()
            )}
          </p>
          <p className="text-sm text-adaptive-600">
            Tutti i portfolio
          </p>
        </div>
      </div>

      {/* ================== DCA BITCOIN SECTION (EXISTING) ================== */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-adaptive-900 flex items-center gap-2">
            🟠 DCA Bitcoin Portfolios
          </h2>
          {btcPrice && (
            <div className="text-sm text-adaptive-600">
              BTC: {formatCurrency(btcPrice.btcEur)} {btcPrice.cached && '(cached)'}
            </div>
          )}
        </div>

        <div className="card-adaptive rounded-lg shadow-sm border-adaptive">
          {portfolios.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">🟠</div>
              <h3 className="text-lg font-medium text-adaptive-900 mb-2">Nessun Portfolio DCA</h3>
              <p className="text-adaptive-600 mb-4">Crea il tuo primo portfolio DCA per iniziare ad investire in Bitcoin</p>
              <button
                onClick={() => setShowCreateModal(true)}
                disabled={investmentAccounts.length === 0}
                className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
              >
                ➕ Crea Portfolio DCA
              </button>
            </div>
          ) : (
            <div className="space-y-4 p-4">
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
                          <p className="font-semibold text-adaptive-900">{formatCurrency(portfolio.stats?.totalInvested || 0)}</p>
                        </div>

                        {/* Current Value */}
                        <div className="text-center min-w-[100px]">
                          <p className="text-xs text-adaptive-500">Valore Attuale</p>
                          <p className="font-semibold text-adaptive-900">{formatCurrency(currentValue || 0)}</p>
                        </div>

                        {/* Realized Gains */}
                        <div className="text-center min-w-[100px]">
                          <p className="text-xs text-adaptive-500">Profitti Realizzati</p>
                          <p className={`font-semibold ${(portfolio.stats?.realizedGains || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(portfolio.stats?.realizedGains || 0)}
                          </p>
                        </div>

                        {/* Total ROI */}
                        <div className="text-center min-w-[100px]">
                          <p className="text-xs text-adaptive-500">ROI Totale</p>
                          <p className={`font-semibold ${(totalROI || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatPercentage(totalROI || 0)}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <Link href={`/investments/${portfolio.id}`}>
                            <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
                              Gestisci
                            </button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ==================== 🚀 NUOVO CRYPTO WALLET SECTION ==================== */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold text-adaptive-900 flex items-center gap-2">
            🚀 Crypto Wallet Portfolios
          </h2>
          <div className="text-sm text-adaptive-600">
            Multi-asset con swap e ticker manuali
          </div>
        </div>

        <div className="card-adaptive rounded-lg shadow-sm border-adaptive">
          {newCryptoLoading ? (
            <div className="flex justify-center items-center py-8">
              <div className="text-adaptive-600">Caricamento crypto portfolios...</div>
            </div>
          ) : newCryptoPortfolios.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">🚀</div>
              <h3 className="text-lg font-medium text-adaptive-900 mb-2">Nessun Crypto Wallet</h3>
              <p className="text-adaptive-600 mb-4">
                Crea il tuo primo crypto wallet per operare su BTC, ETH, USDT, SOL e qualsiasi altro asset!
              </p>
              <button
                onClick={() => setShowCreateNewCryptoModal(true)}
                disabled={investmentAccounts.length === 0}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                ➕ Crea Crypto Wallet
              </button>
            </div>
          ) : (
            <div className="space-y-4 p-4">
              {newCryptoPortfolios.map(portfolio => {
                const totalROI = portfolio.stats?.totalROI || 0
                const totalGains = (portfolio.stats?.realizedGains || 0) + (portfolio.stats?.unrealizedGains || 0)

                return (
                  <div key={portfolio.id} className="card-adaptive rounded-lg p-4 hover:bg-adaptive-50 transition-colors">
                    <div className="flex items-center justify-between">
                      {/* Portfolio Info */}
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          <h3 className="text-lg font-semibold text-adaptive-900">{portfolio.name}</h3>
                          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                            🚀 Multi-Asset
                          </span>
                        </div>
                        {portfolio.description && (
                          <p className="text-sm text-adaptive-600 mb-2">{portfolio.description}</p>
                        )}
                        <p className="text-xs text-adaptive-500">
                          📊 {portfolio.account?.name} • 
                          🪙 {portfolio.stats?.holdingsCount || 0} asset • 
                          📝 {portfolio.stats?.transactionCount || 0} transazioni
                        </p>
                      </div>

                      {/* Portfolio Stats */}
                      <div className="flex items-center gap-6 mr-4">
                        {/* Current Value */}
                        <div className="text-center min-w-[120px]">
                          <p className="text-xs text-adaptive-500">Valore Attuale</p>
                          <p className="font-semibold text-adaptive-900">
                            {formatCurrency(portfolio.stats?.totalValueEur || 0)}
                          </p>
                        </div>

                        {/* Total Invested */}
                        <div className="text-center min-w-[100px]">
                          <p className="text-xs text-adaptive-500">Investito</p>
                          <p className="font-semibold text-adaptive-900">
                            {formatCurrency(portfolio.stats?.totalInvested || 0)}
                          </p>
                        </div>

                        {/* Total Gains */}
                        <div className="text-center min-w-[100px]">
                          <p className="text-xs text-adaptive-500">Profitti</p>
                          <p className={`font-semibold ${totalGains >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(totalGains)}
                          </p>
                        </div>

                        {/* Total ROI */}
                        <div className="text-center min-w-[100px]">
                          <p className="text-xs text-adaptive-500">ROI</p>
                          <p className={`font-semibold ${totalROI >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatPercentage(totalROI)}
                          </p>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2">
                          <Link href={`/investments/crypto-portfolio/${portfolio.id}`}>
                            <button className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">
                              Gestisci
                            </button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* ==================== DCA MODAL ==================== */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-adaptive p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold text-adaptive-900 mb-4">Crea Nuovo Portfolio DCA</h2>
            
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
                  placeholder="es. DCA Bitcoin 2025"
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
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
              >
                {creating ? 'Creando...' : 'Crea Portfolio'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ==================== 🚀 NUOVO CRYPTO WALLET MODAL ==================== */}
      {showCreateNewCryptoModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-adaptive p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold text-adaptive-900 mb-4">🚀 Crea Crypto Wallet</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">
                  Nome Wallet
                </label>
                <input
                  type="text"
                  value={newCryptoForm.name}
                  onChange={(e) => setNewCryptoForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full p-2 border border-adaptive rounded-md"
                  placeholder="es. My Crypto Portfolio"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">
                  Descrizione (opzionale)
                </label>
                <input
                  type="text"
                  value={newCryptoForm.description}
                  onChange={(e) => setNewCryptoForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full p-2 border border-adaptive rounded-md"
                  placeholder="es. Portfolio per trading"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">
                  Conto di Investimento
                </label>
                <select
                  value={newCryptoForm.accountId || ''}
                  onChange={(e) => setNewCryptoForm(prev => ({ 
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
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowCreateNewCryptoModal(false)}
                className="flex-1 px-4 py-2 border border-adaptive rounded-md text-adaptive-700 hover:bg-adaptive-50"
              >
                Annulla
              </button>
              <button
                onClick={createNewCryptoPortfolio}
                disabled={creatingNewCrypto || !newCryptoForm.name.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {creatingNewCrypto ? 'Creando...' : 'Crea Wallet'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Messaggio se non ci sono conti di investimento */}
      {investmentAccounts.length === 0 && (
        <div className="card-adaptive rounded-lg p-6 border-orange-200 bg-orange-50">
          <h3 className="text-lg font-medium text-orange-800 mb-2">⚠️ Nessun Conto di Investimento</h3>
          <p className="text-orange-700 mb-4">
            Prima di creare portfolio, devi creare almeno un conto di tipo "Investimento" nella sezione Conti.
          </p>
          <Link href="/accounts">
            <button className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700">
              Crea Conto Investimento
            </button>
          </Link>
        </div>
      )}
    </div>
  )
}