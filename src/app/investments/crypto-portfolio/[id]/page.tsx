// src/app/investments/crypto-portfolio/[id]/page.tsx
'use client'

import { useParams } from 'next/navigation'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  PlusIcon, 
  ArrowsRightLeftIcon,
  ArrowPathIcon
} from '@heroicons/react/24/outline'

interface CryptoPortfolio {
  id: number
  name: string
  description?: string
  isActive: boolean
  account: {
    id: number
    name: string
    balance: number
  }
  stats: {
    totalValueEur: number
    totalInvested: number
    realizedGains: number
    unrealizedGains: number
    totalROI: number
    holdingsCount: number
    transactionCount: number
  }
  holdings: CryptoHolding[]
  transactions: CryptoTransaction[]
}

interface CryptoHolding {
  id: number
  quantity: number
  avgPrice: number
  totalInvested: number
  realizedGains: number
  asset: {
    symbol: string
    name: string
    decimals: number
  }
  currentPrice?: number
  valueEur?: number
}

interface CryptoTransaction {
  id: number
  date: string
  type: string
  quantity: number
  eurValue: number
  pricePerUnit: number
  broker?: string
  notes?: string
  asset: {
    symbol: string
    name: string
  }
}

interface CryptoAsset {
  id: number
  symbol: string
  name: string
  decimals: number
}

export default function CryptoPortfolioPage() {
  const params = useParams()
  const portfolioId = params.id as string

  // State
  const [portfolio, setPortfolio] = useState<CryptoPortfolio | null>(null)
  const [loading, setLoading] = useState(true)
  const [availableAssets, setAvailableAssets] = useState<CryptoAsset[]>([])
  const [priceLoading, setPriceLoading] = useState(false)
  
  // Modals
  const [showAddTransaction, setShowAddTransaction] = useState(false)
  const [showAddAsset, setShowAddAsset] = useState(false)
  const [showSwap, setShowSwap] = useState(false)
  
  // Forms
  const [transactionForm, setTransactionForm] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'buy' as 'buy' | 'sell',
    assetSymbol: '',
    quantity: '',
    eurValue: '',
    pricePerUnit: '',
    broker: '',
    notes: ''
  })

  const [assetForm, setAssetForm] = useState({
    symbol: '',
    name: '',
    decimals: '6'
  })

  const [swapForm, setSwapForm] = useState({
    fromAsset: '',
    toAsset: '',
    fromQuantity: '',
    toQuantity: '',
    notes: ''
  })

  // Format functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const formatCrypto = (amount: number, decimals = 6) => {
    return amount.toFixed(decimals)
  }

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
  }

  // Data fetching
  const fetchPortfolio = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/crypto-portfolios/${portfolioId}`)
      if (response.ok) {
        const data = await response.json()
        setPortfolio(data)
      } else {
        console.error('Errore nel caricamento portfolio')
      }
    } catch (error) {
      console.error('Errore nel caricamento portfolio:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchAvailableAssets = async () => {
    try {
      const response = await fetch('/api/crypto-portfolio-assets')
      if (response.ok) {
        const data = await response.json()
        setAvailableAssets(data)
      }
    } catch (error) {
      console.error('Errore nel caricamento asset:', error)
    }
  }

  const fetchPrices = async () => {
    if (!portfolio || portfolio.holdings.length === 0) return

    try {
      setPriceLoading(true)
      const symbols = portfolio.holdings.map(h => h.asset.symbol).join(',')
      const response = await fetch(`/api/crypto-prices?symbols=${symbols}`)
      
      if (response.ok) {
        const priceData = await response.json()
        
        // Aggiorna holdings con prezzi correnti
        const updatedHoldings = portfolio.holdings.map(holding => {
          const currentPrice = priceData.prices[holding.asset.symbol] || holding.avgPrice
          const valueEur = holding.quantity * currentPrice
          
          return {
            ...holding,
            currentPrice,
            valueEur
          }
        })

        setPortfolio(prev => prev ? { ...prev, holdings: updatedHoldings } : null)
      }
    } catch (error) {
      console.error('Errore nel recupero prezzi:', error)
    } finally {
      setPriceLoading(false)
    }
  }

  // Actions
  const addAsset = async () => {
    if (!assetForm.symbol.trim()) return

    try {
      const response = await fetch('/api/crypto-portfolio-assets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: assetForm.symbol.toUpperCase(),
          name: assetForm.name || assetForm.symbol.toUpperCase(),
          decimals: parseInt(assetForm.decimals)
        })
      })

      if (response.ok) {
        await fetchAvailableAssets()
        setShowAddAsset(false)
        setAssetForm({ symbol: '', name: '', decimals: '6' })
      } else {
        const error = await response.json()
        alert(error.error || 'Errore nell\'aggiunta asset')
      }
    } catch (error) {
      console.error('Errore nell\'aggiunta asset:', error)
      alert('Errore nell\'aggiunta asset')
    }
  }

  const createTransaction = async () => {
    if (!transactionForm.assetSymbol || !transactionForm.quantity) return

    try {
      const response = await fetch(`/api/crypto-portfolios/${portfolioId}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...transactionForm,
          quantity: parseFloat(transactionForm.quantity),
          eurValue: transactionForm.eurValue ? parseFloat(transactionForm.eurValue) : undefined,
          pricePerUnit: transactionForm.pricePerUnit ? parseFloat(transactionForm.pricePerUnit) : undefined
        })
      })

      if (response.ok) {
        await fetchPortfolio()
        setShowAddTransaction(false)
        setTransactionForm({
          date: new Date().toISOString().split('T')[0],
          type: 'buy',
          assetSymbol: '',
          quantity: '',
          eurValue: '',
          pricePerUnit: '',
          broker: '',
          notes: ''
        })
      } else {
        const error = await response.json()
        alert(error.error || 'Errore nella creazione transazione')
      }
    } catch (error) {
      console.error('Errore nella creazione transazione:', error)
      alert('Errore nella creazione transazione')
    }
  }

  // Auto-calculate prices
  const handleQuantityChange = (value: string) => {
    setTransactionForm(prev => ({ ...prev, quantity: value }))
    
    if (prev.pricePerUnit && value) {
      const eurValue = parseFloat(value) * parseFloat(prev.pricePerUnit)
      setTransactionForm(prev => ({ ...prev, eurValue: eurValue.toFixed(2) }))
    }
  }

  const handleEurValueChange = (value: string) => {
    setTransactionForm(prev => ({ ...prev, eurValue: value }))
    
    if (prev.quantity && value) {
      const pricePerUnit = parseFloat(value) / parseFloat(prev.quantity)
      setTransactionForm(prev => ({ ...prev, pricePerUnit: pricePerUnit.toFixed(6) }))
    }
  }

  const handlePriceChange = (value: string) => {
    setTransactionForm(prev => ({ ...prev, pricePerUnit: value }))
    
    if (prev.quantity && value) {
      const eurValue = parseFloat(prev.quantity) * parseFloat(value)
      setTransactionForm(prev => ({ ...prev, eurValue: eurValue.toFixed(2) }))
    }
  }

  // Load data
  useEffect(() => {
    fetchPortfolio()
    fetchAvailableAssets()
  }, [portfolioId])

  useEffect(() => {
    if (portfolio && portfolio.holdings.length > 0) {
      fetchPrices()
    }
  }, [portfolio?.holdings?.length])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-adaptive-600">Caricamento portfolio...</div>
        </div>
      </div>
    )
  }

  if (!portfolio) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-adaptive-900 mb-4">Portfolio Non Trovato</h1>
          <Link href="/investments" className="text-blue-600 hover:text-blue-500">
            ← Torna agli Investimenti
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/investments" className="text-blue-600 hover:text-blue-500">
              ← Investimenti
            </Link>
            <span className="text-adaptive-500">/</span>
            <h1 className="text-3xl font-bold text-adaptive-900">🚀 {portfolio.name}</h1>
          </div>
          <p className="text-adaptive-600">Crypto Wallet Multi-Asset</p>
          {portfolio.description && (
            <p className="text-sm text-adaptive-500">{portfolio.description}</p>
          )}
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={fetchPrices}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
            disabled={priceLoading}
          >
            <ArrowPathIcon className={`w-4 h-4 ${priceLoading ? 'animate-spin' : ''}`} />
            Aggiorna Prezzi
          </button>
          <button
            onClick={() => setShowAddTransaction(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <PlusIcon className="w-4 h-4" />
            Buy/Sell
          </button>
          <button
            onClick={() => setShowAddAsset(true)}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 flex items-center gap-2"
          >
            <PlusIcon className="w-4 h-4" />
            Aggiungi Asset
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card-adaptive rounded-lg shadow-sm border-adaptive p-4">
          <h3 className="text-sm font-medium text-adaptive-500">💰 Valore Totale</h3>
          <p className="text-2xl font-bold text-adaptive-900">
            {formatCurrency(portfolio.holdings.reduce((sum, h) => sum + (h.valueEur || h.quantity * h.avgPrice), 0))}
          </p>
          <p className="text-sm text-adaptive-600">{portfolio.stats.holdingsCount} asset</p>
        </div>

        <div className="card-adaptive rounded-lg shadow-sm border-adaptive p-4">
          <h3 className="text-sm font-medium text-adaptive-500">📊 Investito</h3>
          <p className="text-2xl font-bold text-adaptive-900">{formatCurrency(portfolio.stats.totalInvested)}</p>
          <p className="text-sm text-adaptive-600">{portfolio.stats.transactionCount} transazioni</p>
        </div>

        <div className="card-adaptive rounded-lg shadow-sm border-adaptive p-4">
          <h3 className="text-sm font-medium text-adaptive-500">📈 Profitti</h3>
          <p className={`text-2xl font-bold ${portfolio.stats.realizedGains >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(portfolio.stats.realizedGains)}
          </p>
          <p className="text-sm text-adaptive-600">Realizzati</p>
        </div>

        <div className="card-adaptive rounded-lg shadow-sm border-adaptive p-4">
          <h3 className="text-sm font-medium text-adaptive-500">📊 ROI</h3>
          <p className={`text-2xl font-bold ${portfolio.stats.totalROI >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatPercentage(portfolio.stats.totalROI)}
          </p>
        </div>
      </div>

      {/* Holdings */}
      <div className="card-adaptive rounded-lg shadow-sm border-adaptive">
        <div className="p-4 border-b border-adaptive">
          <h2 className="text-lg font-semibold text-adaptive-900">🪙 Holdings</h2>
        </div>
        
        {portfolio.holdings.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">🪙</div>
            <h3 className="text-lg font-medium text-adaptive-900 mb-2">Nessun Asset</h3>
            <p className="text-adaptive-600">Inizia comprando il tuo primo asset</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-adaptive bg-adaptive-50">
                  <th className="text-left py-3 px-4 font-medium text-adaptive-700">Asset</th>
                  <th className="text-right py-3 px-4 font-medium text-adaptive-700">Quantità</th>
                  <th className="text-right py-3 px-4 font-medium text-adaptive-700">Prezzo Medio</th>
                  <th className="text-right py-3 px-4 font-medium text-adaptive-700">Prezzo Attuale</th>
                  <th className="text-right py-3 px-4 font-medium text-adaptive-700">Valore</th>
                  <th className="text-right py-3 px-4 font-medium text-adaptive-700">P&L</th>
                </tr>
              </thead>
              <tbody>
                {portfolio.holdings.map(holding => {
                  const currentPrice = holding.currentPrice || holding.avgPrice
                  const currentValue = holding.valueEur || (holding.quantity * holding.avgPrice)
                  const unrealizedPL = currentValue - holding.totalInvested
                  
                  return (
                    <tr key={holding.id} className="border-b border-adaptive hover:bg-adaptive-50">
                      <td className="py-3 px-4">
                        <div>
                          <div className="font-medium text-adaptive-900">{holding.asset.symbol}</div>
                          <div className="text-sm text-adaptive-600">{holding.asset.name}</div>
                        </div>
                      </td>
                      <td className="text-right py-3 px-4">
                        {formatCrypto(holding.quantity, holding.asset.decimals)}
                      </td>
                      <td className="text-right py-3 px-4">
                        {formatCurrency(holding.avgPrice)}
                      </td>
                      <td className="text-right py-3 px-4">
                        <span className={currentPrice !== holding.avgPrice ? 
                          (currentPrice > holding.avgPrice ? 'text-green-600' : 'text-red-600') : 
                          'text-adaptive-900'
                        }>
                          {formatCurrency(currentPrice)}
                        </span>
                      </td>
                      <td className="text-right py-3 px-4 font-medium">
                        {formatCurrency(currentValue)}
                      </td>
                      <td className={`text-right py-3 px-4 ${unrealizedPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(unrealizedPL)}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transactions */}
      <div className="card-adaptive rounded-lg shadow-sm border-adaptive">
        <div className="p-4 border-b border-adaptive">
          <h2 className="text-lg font-semibold text-adaptive-900">📝 Transazioni</h2>
        </div>
        
        {portfolio.transactions.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-4xl mb-4">📝</div>
            <h3 className="text-lg font-medium text-adaptive-900 mb-2">Nessuna Transazione</h3>
            <p className="text-adaptive-600">Le tue transazioni appariranno qui</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-adaptive bg-adaptive-50">
                  <th className="text-left py-3 px-4 font-medium text-adaptive-700">Data</th>
                  <th className="text-left py-3 px-4 font-medium text-adaptive-700">Tipo</th>
                  <th className="text-left py-3 px-4 font-medium text-adaptive-700">Asset</th>
                  <th className="text-right py-3 px-4 font-medium text-adaptive-700">Quantità</th>
                  <th className="text-right py-3 px-4 font-medium text-adaptive-700">Prezzo</th>
                  <th className="text-right py-3 px-4 font-medium text-adaptive-700">Valore EUR</th>
                  <th className="text-left py-3 px-4 font-medium text-adaptive-700">Broker</th>
                </tr>
              </thead>
              <tbody>
                {portfolio.transactions.map(transaction => (
                  <tr key={transaction.id} className="border-b border-adaptive hover:bg-adaptive-50">
                    <td className="py-3 px-4 text-sm">
                      {new Date(transaction.date).toLocaleDateString('it-IT')}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-1 rounded text-xs font-medium ${
                        transaction.type === 'buy' ? 'bg-green-100 text-green-800' :
                        transaction.type === 'sell' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {transaction.type.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-medium text-adaptive-900">{transaction.asset.symbol}</div>
                    </td>
                    <td className="text-right py-3 px-4">
                      {formatCrypto(transaction.quantity)}
                    </td>
                    <td className="text-right py-3 px-4">
                      {formatCurrency(transaction.pricePerUnit)}
                    </td>
                    <td className="text-right py-3 px-4 font-medium">
                      {formatCurrency(transaction.eurValue)}
                    </td>
                    <td className="py-3 px-4 text-sm">
                      {transaction.broker || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add Transaction Modal */}
      {showAddTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-adaptive p-6 rounded-lg shadow-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl font-semibold text-adaptive-900 mb-4">
              {transactionForm.type === 'buy' ? '💰 Compra Asset' : '💸 Vendi Asset'}
            </h2>
            
            <div className="space-y-4">
              {/* Type Toggle */}
              <div className="flex gap-2">
                <button
                  onClick={() => setTransactionForm(prev => ({ ...prev, type: 'buy' }))}
                  className={`flex-1 py-2 px-4 rounded-md ${
                    transactionForm.type === 'buy' 
                      ? 'bg-green-600 text-white' 
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  Compra
                </button>
                <button
                  onClick={() => setTransactionForm(prev => ({ ...prev, type: 'sell' }))}
                  className={`flex-1 py-2 px-4 rounded-md ${
                    transactionForm.type === 'sell' 
                      ? 'bg-red-600 text-white' 
                      : 'bg-gray-200 text-gray-700'
                  }`}
                >
                  Vendi
                </button>
              </div>

              {/* Asset Selection */}
              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">Asset</label>
                <select
                  value={transactionForm.assetSymbol}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, assetSymbol: e.target.value }))}
                  className="w-full p-2 border border-adaptive rounded-md"
                >
                  <option value="">Seleziona asset...</option>
                  {availableAssets.map(asset => (
                    <option key={asset.id} value={asset.symbol}>
                      {asset.symbol} - {asset.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity */}
              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">Quantità</label>
                <input
                  type="number"
                  step="any"
                  value={transactionForm.quantity}
                  onChange={(e) => handleQuantityChange(e.target.value)}
                  className="w-full p-2 border border-adaptive rounded-md"
                  placeholder="0.000000"
                />
              </div>

              {/* EUR Value */}
              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">Valore EUR</label>
                <input
                  type="number"
                  step="0.01"
                  value={transactionForm.eurValue}
                  onChange={(e) => handleEurValueChange(e.target.value)}
                  className="w-full p-2 border border-adaptive rounded-md"
                  placeholder="0.00"
                />
              </div>

              {/* Price Per Unit */}
              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">Prezzo Unitario</label>
                <input
                  type="number"
                  step="any"
                  value={transactionForm.pricePerUnit}
                  onChange={(e) => handlePriceChange(e.target.value)}
                  className="w-full p-2 border border-adaptive rounded-md"
                  placeholder="0.00000"
                />
              </div>

              {/* Broker */}
              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">Broker (opzionale)</label>
                <input
                  type="text"
                  value={transactionForm.broker}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, broker: e.target.value }))}
                  className="w-full p-2 border border-adaptive rounded-md"
                  placeholder="es. Binance, Kraken..."
                />
              </div>

              {/* Notes */}
              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">Note (opzionale)</label>
                <textarea
                  value={transactionForm.notes}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full p-2 border border-adaptive rounded-md"
                  rows={2}
                  placeholder="Note aggiuntive..."
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddTransaction(false)}
                className="flex-1 px-4 py-2 border border-adaptive rounded-md text-adaptive-700 hover:bg-adaptive-50"
              >
                Annulla
              </button>
              <button
                onClick={createTransaction}
                disabled={!transactionForm.assetSymbol || !transactionForm.quantity}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                Crea Transazione
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Asset Modal */}
      {showAddAsset && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-adaptive p-6 rounded-lg shadow-lg max-w-md w-full mx-4">
            <h2 className="text-xl font-semibold text-adaptive-900 mb-4">➕ Aggiungi Nuovo Asset</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">
                  Ticker / Simbolo
                </label>
                <input
                  type="text"
                  value={assetForm.symbol}
                  onChange={(e) => setAssetForm(prev => ({ ...prev, symbol: e.target.value.toUpperCase() }))}
                  className="w-full p-2 border border-adaptive rounded-md"
                  placeholder="es. SOL, ADA, DOT..."
                  maxLength={10}
                />
                <p className="text-xs text-adaptive-500 mt-1">
                  Scrivi il ticker in MAIUSCOLO (es. SOL per Solana)
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">
                  Nome (opzionale)
                </label>
                <input
                  type="text"
                  value={assetForm.name}
                  onChange={(e) => setAssetForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full p-2 border border-adaptive rounded-md"
                  placeholder="es. Solana, Cardano..."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">
                  Decimali (per visualizzazione)
                </label>
                <select
                  value={assetForm.decimals}
                  onChange={(e) => setAssetForm(prev => ({ ...prev, decimals: e.target.value }))}
                  className="w-full p-2 border border-adaptive rounded-md"
                >
                  <option value="2">2 decimali</option>
                  <option value="4">4 decimali</option>
                  <option value="6">6 decimali</option>
                  <option value="8">8 decimali</option>
                </select>
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowAddAsset(false)}
                className="flex-1 px-4 py-2 border border-adaptive rounded-md text-adaptive-700 hover:bg-adaptive-50"
              >
                Annulla
              </button>
              <button
                onClick={addAsset}
                disabled={!assetForm.symbol.trim()}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
              >
                Aggiungi Asset
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}