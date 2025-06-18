'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface DCAPortfolio {
  id: number
  name: string
  type: string
  isActive: boolean
  createdAt: string
  updatedAt: string
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
  const [loading, setLoading] = useState(true)
  const [btcPrice, setBtcPrice] = useState<BitcoinPrice | null>(null)
  const [priceLoading, setPriceLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newPortfolioName, setNewPortfolioName] = useState('')
  const [creating, setCreating] = useState(false)

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

  const loadPortfolios = async () => {
    try {
      const response = await fetch('/api/dca-portfolios')
      if (response.ok) {
        const data = await response.json()
        setPortfolios(data)
      }
    } catch (error) {
      console.error('Errore nel caricamento portafogli:', error)
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

  const createPortfolio = async () => {
    if (!newPortfolioName.trim()) return

    setCreating(true)
    try {
      const response = await fetch('/api/dca-portfolios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newPortfolioName,
          type: 'dca_bitcoin'
        })
      })

      if (response.ok) {
        await loadPortfolios()
        setNewPortfolioName('')
        setShowCreateModal(false)
      } else {
        const error = await response.json()
        alert(`Errore: ${error.error}`)
      }
    } catch (error) {
      console.error('Errore nella creazione:', error)
      alert('Errore nella creazione del portafoglio')
    } finally {
      setCreating(false)
    }
  }

  useEffect(() => {
    loadPortfolios()
    fetchBitcoinPrice()
    
    // Auto-refresh prezzo ogni 15 minuti
    const interval = setInterval(fetchBitcoinPrice, 15 * 60 * 1000)
    return () => clearInterval(interval)
  }, [])

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-adaptive-900">Investimenti</h1>
          <p className="text-adaptive-600">Gestione portafogli di investimento</p>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="text-adaptive-600">Caricamento...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Standard */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-adaptive-900">Investimenti</h1>
          <p className="text-adaptive-600">Gestione portafogli di investimento</p>
        </div>
        
        {/* Prezzo Bitcoin con styling standard */}
        <div className="card-adaptive p-4 rounded-lg border-adaptive">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">₿</span>
            <div>
              {priceLoading ? (
                <div className="text-sm text-adaptive-600">Caricamento...</div>
              ) : btcPrice ? (
                <>
                  <div className="text-lg font-bold text-adaptive-900">
                    {formatCurrency(btcPrice.btcEur)}
                  </div>
                  <div className="text-xs text-adaptive-500">
                    ${btcPrice.btcUsd.toLocaleString('en-US')} • {btcPrice.cached ? 'Cache' : 'Live'}
                  </div>
                </>
              ) : (
                <div className="text-sm text-adaptive-600">Non disponibile</div>
              )}
            </div>
            <button
              onClick={fetchBitcoinPrice}
              className="text-adaptive-600 hover:text-adaptive-800 p-1"
              disabled={priceLoading}
            >
              🔄
            </button>
          </div>
        </div>
      </div>

      {/* Lista Portafogli Esistenti */}
      {portfolios.length > 0 && (
        <div className="card-adaptive rounded-lg shadow-sm border-adaptive">
          <div className="p-6 border-b border-adaptive">
            <h3 className="text-lg font-medium text-adaptive-900">
              I Tuoi Portafogli ({portfolios.length})
            </h3>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {portfolios.map((portfolio) => {
                const currentValue = calculateCurrentValue(portfolio)
                const roi = calculateROI(portfolio)
                
                return (
                  <Link key={portfolio.id} href={`/investments/${portfolio.id}`}>
                    <div className="p-4 rounded-lg border border-adaptive hover:shadow-md transition-all cursor-pointer bg-gray-50 hover:bg-gray-100">
                      <div className="space-y-3">
                        <div className="flex justify-between items-start">
                          <h4 className="font-semibold text-adaptive-900">{portfolio.name}</h4>
                          <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded">
                            🟠 DCA BTC
                          </span>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span className="text-adaptive-600">BTC Netti:</span>
                            <span className="text-adaptive-900">
                              {formatBTC(portfolio.stats.netBTC)}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-adaptive-600">Investiti:</span>
                            <span className="text-adaptive-900">
                              {formatCurrency(portfolio.stats.totalEUR)}
                            </span>
                          </div>
                        </div>

                        {btcPrice && (
                          <>
                            <div className="flex justify-between text-sm">
                              <span className="text-adaptive-600">Valore:</span>
                              <span className="text-adaptive-900">
                                {formatCurrency(currentValue)}
                              </span>
                            </div>
                            <div className="flex justify-between text-sm">
                              <span className="text-adaptive-600">ROI:</span>
                              <span className={roi >= 0 ? 'text-green-600' : 'text-red-600'}>
                                {roi >= 0 ? '+' : ''}{roi.toFixed(2)}%
                              </span>
                            </div>
                          </>
                        )}
                        <div className="flex justify-between text-xs text-adaptive-500">
                          <span>{portfolio.stats.transactionCount} transazioni</span>
                          <span>{portfolio.stats.feesCount} fee</span>
                        </div>
                      </div>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* Tipi di Portafoglio Standard */}
      <div className="card-adaptive rounded-lg shadow-sm border-adaptive">
        <div className="p-6 border-b border-adaptive">
          <h3 className="text-lg font-medium text-adaptive-900">Crea Nuovo Portafoglio</h3>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {portfolioTypes.map((type) => (
              <div
                key={type.id}
                className={`p-6 rounded-lg border-2 transition-all ${type.bgColor} ${type.borderColor} ${
                  type.available 
                    ? 'hover:shadow-md cursor-pointer hover:border-orange-300' 
                    : 'opacity-60 cursor-not-allowed'
                }`}
                onClick={() => {
                  if (type.available) {
                    setShowCreateModal(true)
                  }
                }}
              >
                <div className="text-center space-y-3">
                  <div className="text-3xl">{type.name.charAt(0)}</div>
                  <h4 className={`font-semibold ${type.textColor}`}>
                    {type.name.slice(2)}
                  </h4>
                  <p className={`text-sm ${type.textColor}`}>
                    {type.description}
                  </p>
                  {!type.available && (
                    <p className="text-xs text-adaptive-500 mt-2">
                      Coming Soon
                    </p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Modal Standard */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="modal-content rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-adaptive-900 mb-4">Crea DCA Bitcoin</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-2">
                  Nome Portafoglio
                </label>
                <input
                  type="text"
                  value={newPortfolioName}
                  onChange={(e) => setNewPortfolioName(e.target.value)}
                  placeholder="es. DCA Bitcoin 2024"
                  className="w-full border border-adaptive rounded-lg px-3 py-2 text-adaptive-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setNewPortfolioName('')
                }}
                className="px-4 py-2 border border-adaptive rounded-md text-adaptive-700 hover:bg-gray-50"
              >
                Annulla
              </button>
              <button
                onClick={createPortfolio}
                disabled={creating || !newPortfolioName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {creating ? 'Creazione...' : 'Crea Portafoglio'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}