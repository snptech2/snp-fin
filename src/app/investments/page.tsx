'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'

interface DCAPortfolio {
  id: number
  name: string
  type: string
  isActive: boolean
  createdAt: string
  stats: {
    totalBTC: number
    totalEUR: number
    netBTC: number
    avgPrice: number
    transactionCount: number
    feesCount: number
  }
}

interface BitcoinPrice {
  btcEur: number
  btcUsd: number
  timestamp: number
  cached?: boolean
}

export default function InvestmentsPage() {
  const [portfolios, setPortfolios] = useState<DCAPortfolio[]>([])
  const [btcPrice, setBtcPrice] = useState<BitcoinPrice | null>(null)
  const [loading, setLoading] = useState(true)
  const [priceLoading, setPriceLoading] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [newPortfolioName, setNewPortfolioName] = useState('')
  const [createLoading, setCreateLoading] = useState(false)

  const portfolioTypes = [
    {
      id: 'dca_bitcoin',
      name: '🟠 DCA Bitcoin',
      description: 'Piano di accumulo Bitcoin',
      available: true,
      bgColor: 'bg-orange-50',
      borderColor: 'border-orange-200',
      textColor: 'text-orange-800'
    },
    {
      id: 'crypto_wallet',
      name: '💰 Wallet Crypto',
      description: 'Portafoglio multi-cryptocurrency',
      available: false,
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      textColor: 'text-gray-500'
    },
    {
      id: 'stocks_etf',
      name: '📈 Stocks & ETF',
      description: 'Azioni e fondi negoziati',
      available: false,
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      textColor: 'text-gray-500'
    },
    {
      id: 'bonds',
      name: '🏛️ Bonds',
      description: 'Obbligazioni e titoli di stato',
      available: false,
      bgColor: 'bg-gray-50',
      borderColor: 'border-gray-200',
      textColor: 'text-gray-500'
    }
  ]

  useEffect(() => {
    fetchPortfolios()
    fetchBitcoinPrice()
  }, [])

  const fetchPortfolios = async () => {
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
    if (!newPortfolioName.trim()) return

    try {
      setCreateLoading(true)
      const response = await fetch('/api/dca-portfolios', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: newPortfolioName,
          type: 'dca_bitcoin'
        })
      })

      if (response.ok) {
        setNewPortfolioName('')
        setShowCreateModal(false)
        fetchPortfolios()
      } else {
        const error = await response.json()
        alert(error.error || 'Errore nella creazione del portafoglio')
      }
    } catch (error) {
      alert('Errore nella creazione del portafoglio')
    } finally {
      setCreateLoading(false)
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-adaptive-900">Investimenti</h1>
          <p className="text-adaptive-600">Gestione portafogli di investimento</p>
        </div>
        
        {/* Prezzo Bitcoin */}
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">₿</span>
            <div>
              {priceLoading ? (
                <div className="text-sm text-gray-500">Caricamento...</div>
              ) : btcPrice ? (
                <>
                  <div className="font-bold text-orange-800">
                    {formatCurrency(btcPrice.btcEur)}
                  </div>
                  <div className="text-xs text-orange-600">
                    ${btcPrice.btcUsd.toLocaleString()} USD
                    {btcPrice.cached && ' (cached)'}
                  </div>
                </>
              ) : (
                <div className="text-sm text-red-500">Errore prezzo</div>
              )}
              <button
                onClick={fetchBitcoinPrice}
                disabled={priceLoading}
                className="text-xs text-orange-600 hover:text-orange-800 mt-1"
              >
                🔄 Aggiorna
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Portafogli Esistenti */}
      {portfolios.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-adaptive-900">I Tuoi Portafogli</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {portfolios.map((portfolio) => {
              const currentValue = calculateCurrentValue(portfolio)
              const roi = calculateROI(portfolio)
              
              return (
                <Link key={portfolio.id} href={`/investments/${portfolio.id}`}>
                  <div className="card-adaptive p-6 rounded-lg shadow-sm border-adaptive hover:shadow-md transition-shadow cursor-pointer">
                    <div className="flex items-center space-x-3 mb-4">
                      <span className="text-2xl">🟠</span>
                      <div>
                        <h3 className="font-semibold text-adaptive-900">{portfolio.name}</h3>
                        <p className="text-xs text-adaptive-600">DCA Bitcoin</p>
                      </div>
                    </div>
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-adaptive-600">BTC Netti:</span>
                        <span className="font-mono">{formatBTC(portfolio.stats.netBTC)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-adaptive-600">Investiti:</span>
                        <span>{formatCurrency(portfolio.stats.totalEUR)}</span>
                      </div>
                      {btcPrice && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-adaptive-600">Valore Attuale:</span>
                            <span>{formatCurrency(currentValue)}</span>
                          </div>
                          <div className="flex justify-between">
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
      )}

      {/* Tipi di Portafoglio */}
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-adaptive-900">Crea Nuovo Portafoglio</h2>
        </div>
        
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
                <h3 className={`font-semibold ${type.textColor}`}>
                  {type.name.slice(2)}
                </h3>
                <p className={`text-sm ${type.textColor}`}>
                  {type.description}
                </p>
                {!type.available && (
                  <p className="text-xs text-gray-500 mt-2">
                    Coming Soon
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Modal Creazione DCA Bitcoin */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Crea DCA Bitcoin</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome Portafoglio
                </label>
                <input
                  type="text"
                  value={newPortfolioName}
                  onChange={(e) => setNewPortfolioName(e.target.value)}
                  placeholder="es. DCA Bitcoin 2024"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500"
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowCreateModal(false)
                  setNewPortfolioName('')
                }}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                disabled={createLoading}
              >
                Annulla
              </button>
              <button
                onClick={createPortfolio}
                disabled={!newPortfolioName.trim() || createLoading}
                className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
              >
                {createLoading ? 'Creazione...' : 'Crea'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}