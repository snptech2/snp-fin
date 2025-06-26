'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeftIcon, PlusIcon, PencilIcon, TrashIcon, 
  Cog6ToothIcon, XMarkIcon, ChevronDownIcon 
} from '@heroicons/react/24/outline'

interface Asset {
  id: number
  name: string
  symbol: string
  decimals: number
}

interface Transaction {
  id: number
  type: 'buy' | 'sell'
  assetId: number
  quantity: number
  eurValue: number
  pricePerUnit: number
  date: string
  notes?: string
  asset: Asset
}

interface Holding {
  id: number
  assetId: number
  quantity: number
  avgPrice: number
  totalInvested: number
  realizedGains: number
  currentPrice?: number
  valueEur?: number
  lastUpdated: string
  asset: Asset
}

interface CryptoPortfolio {
  id: number
  name: string
  description?: string
  accountId: number
  userId: number
  createdAt: string
  updatedAt: string
  account: {
    id: number
    name: string
    balance: number
  }
  stats: {
    totalInvested: number
    capitalRecovered: number
    effectiveInvestment: number
    realizedProfit: number
    isFullyRecovered: boolean
    totalValueEur: number
    totalROI: number
    unrealizedGains: number
    transactionCount: number
    buyCount: number
    sellCount: number
    holdingsCount: number
  }
  holdings: Holding[]
  transactions: Transaction[]
}

export default function CryptoPortfolioDetailPage() {
  const params = useParams()
  const router = useRouter()
  const portfolioId = params.id as string

  // 🔧 STATI PRINCIPALI
  const [portfolio, setPortfolio] = useState<CryptoPortfolio | null>(null)
  const [loading, setLoading] = useState(true)
  const [priceLoading, setPriceLoading] = useState(false)
  const [livePrices, setLivePrices] = useState<Record<string, number>>({})

  // 🔧 STATI MODAL E FORM
  const [showAddTransaction, setShowAddTransaction] = useState(false)
  const [showEditTransaction, setShowEditTransaction] = useState(false)
  const [showEditPortfolio, setShowEditPortfolio] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [submitLoading, setSubmitLoading] = useState(false)

  // 🔧 FORM TRANSAZIONE
  const [transactionForm, setTransactionForm] = useState({
    type: 'buy' as 'buy' | 'sell',
    ticker: '',
    quantity: '',
    eurValue: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  })

  // 🔧 STATO PER PREZZO CORRENTE
  const [currentPrice, setCurrentPrice] = useState<number | null>(null)
  const [fetchingPrice, setFetchingPrice] = useState(false)
  const [priceTimeout, setPriceTimeout] = useState<NodeJS.Timeout | null>(null)

  // 🔧 FORM PORTFOLIO SETTINGS
  const [portfolioForm, setPortfolioForm] = useState({
    name: '',
    description: ''
  })

  // Format functions
  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount)

  const formatPercentage = (value: number) =>
    `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`

  const formatCrypto = (amount: number, decimals = 8) =>
    new Intl.NumberFormat('it-IT', { 
      minimumFractionDigits: Math.min(decimals, 8),
      maximumFractionDigits: Math.min(decimals, 8)
    }).format(amount)

  // 🔧 CARICAMENTO DATI
  const fetchPortfolio = async () => {
    setLoading(true)
    try {
      const portfolioRes = await fetch(`/api/crypto-portfolios/${portfolioId}`)

      if (portfolioRes.ok) {
        const portfolioData = await portfolioRes.json()
        setPortfolio(portfolioData)
        setPortfolioForm({
          name: portfolioData.name,
          description: portfolioData.description || ''
        })
      }
    } catch (error) {
      console.error('Error fetching portfolio:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPortfolio()
  }, [portfolioId])

  // 🔧 FETCH PREZZI LIVE per tutti gli holding
  const fetchLivePrices = async () => {
    if (!portfolio || portfolio.holdings.length === 0) return
    
    try {
      const symbols = portfolio.holdings.map(h => h.asset.symbol).join(',')
      console.log('🔄 Fetching live prices for:', symbols)
      
      const response = await fetch(`/api/crypto-prices?symbols=${symbols}&force=true`)
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ Live prices received:', data.prices)
        setLivePrices(data.prices || {})
      } else {
        console.error('❌ Errore fetch prezzi live:', response.status)
      }
    } catch (error) {
      console.error('💥 Errore fetch prezzi live:', error)
    }
  }

  // 🔧 CARICA PREZZI LIVE quando il portfolio si carica
  useEffect(() => {
    if (portfolio && portfolio.holdings.length > 0) {
      fetchLivePrices()
    }
  }, [portfolio])

  // 🔧 CLEANUP DEL TIMEOUT AL DISMOUNT
  useEffect(() => {
    return () => {
      if (priceTimeout) {
        clearTimeout(priceTimeout)
      }
    }
  }, [priceTimeout])

  // 🔧 AGGIORNA PREZZI LIVE (non database)
  const updatePrices = async () => {
    if (!portfolio || portfolio.holdings.length === 0) return
    
    setPriceLoading(true)
    try {
      const symbols = portfolio.holdings.map(h => h.asset.symbol).join(',')
      
      console.log('🔄 Aggiornando prezzi live per:', symbols)
      
      const response = await fetch(`/api/crypto-prices?symbols=${symbols}&force=true`)
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ Prezzi live aggiornati:', data.prices)
        setLivePrices(data.prices || {})
        
        // Mostra messaggio di successo
        alert('Prezzi aggiornati con successo!')
      } else {
        console.error('❌ Errore aggiornamento prezzi:', response.status)
        alert('Errore durante l\'aggiornamento dei prezzi')
      }
    } catch (error) {
      console.error('💥 Errore aggiornamento prezzi:', error)
      alert('Errore durante l\'aggiornamento dei prezzi')
    } finally {
      setPriceLoading(false)
    }
  }

  // 🔧 FETCH PREZZO DA CRYPTOPRICES.CC con debounce
  const debouncedFetchPrice = (ticker: string) => {
    if (priceTimeout) {
      clearTimeout(priceTimeout)
    }
    
    const newTimeout = setTimeout(() => {
      fetchCryptoPrice(ticker)
    }, 500)
    
    setPriceTimeout(newTimeout)
  }

  // 🔧 FETCH PREZZO DA CRYPTOPRICES.CC
  const fetchCryptoPrice = async (ticker: string) => {
    const cleanTicker = ticker.trim().toUpperCase()
    
    if (!cleanTicker || cleanTicker.length < 2) {
      setCurrentPrice(null)
      return
    }

    console.log(`🔍 Fetching price for: ${cleanTicker}`)
    setFetchingPrice(true)
    
    try {
      const response = await fetch(`/api/crypto-prices?symbols=${cleanTicker}`)
      
      if (response.ok) {
        const data = await response.json()
        const price = data.prices?.[cleanTicker]
        
        if (price && price > 0) {
          console.log(`✅ Price found for ${cleanTicker}: €${price}`)
          setCurrentPrice(price)
          
          if (transactionForm.quantity && !isNaN(parseFloat(transactionForm.quantity))) {
            const quantity = parseFloat(transactionForm.quantity)
            const calculatedValue = Math.round(quantity * price * 100) / 100
            setTransactionForm(prev => ({ ...prev, eurValue: calculatedValue.toString() }))
          }
        } else {
          console.warn(`⚠️ Prezzo non disponibile per ${cleanTicker}`)
          setCurrentPrice(null)
        }
      } else {
        console.error(`❌ Errore API (${response.status}) per ${cleanTicker}`)
        setCurrentPrice(null)
      }
    } catch (error) {
      console.error(`💥 Errore fetch prezzo per ${cleanTicker}:`, error)
      setCurrentPrice(null)
    } finally {
      setFetchingPrice(false)
    }
  }

  // Handle delete portfolio
  const handleDeletePortfolio = async () => {
    if (!confirm('Sei sicuro di voler eliminare questo portfolio? Questa azione non può essere annullata.')) {
      return
    }

    try {
      const response = await fetch(`/api/crypto-portfolios/${portfolioId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        router.push('/investments')
      } else {
        const error = await response.json()
        alert(`Errore: ${error.error || 'Eliminazione portfolio fallita'}`)
      }
    } catch (error) {
      console.error('Error deleting portfolio:', error)
      alert('Errore durante l\'eliminazione del portfolio')
    }
  }

  // Utility functions
  const resetTransactionForm = () => {
    setTransactionForm({
      type: 'buy',
      ticker: '',
      quantity: '',
      eurValue: '',
      date: new Date().toISOString().split('T')[0],
      notes: ''
    })
    setCurrentPrice(null)
    if (priceTimeout) {
      clearTimeout(priceTimeout)
      setPriceTimeout(null)
    }
  }

  const openEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction)
    setTransactionForm({
      type: transaction.type,
      ticker: transaction.asset.symbol,
      quantity: transaction.quantity.toString(),
      eurValue: transaction.eurValue.toString(),
      date: transaction.date.split('T')[0],
      notes: transaction.notes || ''
    })
    
    if (transaction.asset.symbol && transaction.asset.symbol.length >= 3) {
      fetchCryptoPrice(transaction.asset.symbol)
    }
    
    setShowEditTransaction(true)
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-adaptive-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-adaptive-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!portfolio) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-adaptive-900 mb-4">Portfolio non trovato</h1>
          <Link href="/investments" className="text-blue-600 hover:text-blue-800">
            ← Torna agli investimenti
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link
            href="/investments"
            className="p-2 text-adaptive-600 hover:text-adaptive-900 hover:bg-adaptive-100 rounded-lg"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-adaptive-900 flex items-center gap-3">
              🚀 {portfolio.name}
            </h1>
            {portfolio.description && (
              <p className="text-adaptive-600 mt-1">{portfolio.description}</p>
            )}
            <p className="text-sm text-adaptive-500 mt-1">
              Collegato a: {portfolio.account.name} ({formatCurrency(portfolio.account.balance)})
            </p>
          </div>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowEditPortfolio(true)}
            className="flex items-center gap-2 px-4 py-2 text-adaptive-600 border border-adaptive-300 rounded-md hover:bg-adaptive-50"
            title="Impostazioni Portfolio"
          >
            <Cog6ToothIcon className="w-5 h-5" />
            Impostazioni
          </button>
          
          <button
            onClick={handleDeletePortfolio}
            className="flex items-center gap-2 px-4 py-2 text-red-600 border border-red-300 rounded-md hover:bg-red-50"
            title="Elimina Portfolio"
          >
            <TrashIcon className="w-5 h-5" />
            Elimina
          </button>
          
          <button
            onClick={() => setShowAddTransaction(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
          >
            <PlusIcon className="w-5 h-5" />
            Nuova Transazione
          </button>
        </div>
      </div>

      {/* 🚀 Enhanced Statistics Overview - Sostituisce le 4 card esistenti */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-adaptive-50 border border-adaptive rounded-lg p-6">
          <h3 className="text-sm font-medium text-adaptive-500 mb-2">💰 Investimento Totale</h3>
          <p className="text-2xl font-bold text-adaptive-900">{formatCurrency(portfolio.stats.totalInvested)}</p>
          <p className="text-xs text-adaptive-600 mt-1">{portfolio.stats.buyCount} acquisti</p>
        </div>
        
        <div className="bg-adaptive-50 border border-adaptive rounded-lg p-6">
          <h3 className="text-sm font-medium text-adaptive-500 mb-2">💸 Capitale Recuperato</h3>
          <p className="text-2xl font-bold text-adaptive-900">{formatCurrency(portfolio.stats.capitalRecovered)}</p>
          <p className="text-xs text-adaptive-600 mt-1">{portfolio.stats.sellCount} vendite</p>
        </div>
        
        <div className="bg-adaptive-50 border border-adaptive rounded-lg p-6">
          <h3 className="text-sm font-medium text-adaptive-500 mb-2">📈 Valore Attuale</h3>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(portfolio.stats.totalValueEur)}</p>
          <p className="text-xs text-adaptive-600 mt-1">{portfolio.stats.holdingsCount} asset</p>
        </div>
        
        <div className="bg-adaptive-50 border border-adaptive rounded-lg p-6">
          <h3 className="text-sm font-medium text-adaptive-500 mb-2">🎯 ROI Totale</h3>
          <p className={`text-2xl font-bold ${portfolio.stats.totalROI >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatPercentage(portfolio.stats.totalROI)}
          </p>
          <p className="text-xs text-adaptive-600 mt-1">
            {portfolio.stats.isFullyRecovered ? 'Recuperato' : 'A rischio'}
          </p>
        </div>
      </div>

      {/* 🆕 Riepilogo P&L Multi-Asset */}
      <div className="card-adaptive rounded-lg shadow-sm border-adaptive mb-8">
        <div className="p-6 border-b border-adaptive">
          <h2 className="text-lg font-semibold text-adaptive-900">📊 Riepilogo P&L Multi-Asset</h2>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div className="text-center">
              <div className="text-sm text-adaptive-500 mb-1">Profitti Realizzati</div>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(portfolio.stats.realizedProfit)}
              </div>
              <div className="text-xs text-adaptive-600 mt-1">Da vendite</div>
            </div>
            
            <div className="text-center">
              <div className="text-sm text-adaptive-500 mb-1">Plus/Minus Non Realizzati</div>
              <div className={`text-2xl font-bold ${portfolio.stats.unrealizedGains >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(portfolio.stats.unrealizedGains)}
              </div>
              <div className="text-xs text-adaptive-600 mt-1">Su holdings correnti</div>
            </div>
            
            <div className="text-center">
              <div className="text-sm text-adaptive-500 mb-1">Totale P&L</div>
              <div className={`text-2xl font-bold ${(portfolio.stats.realizedProfit + portfolio.stats.unrealizedGains) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(portfolio.stats.realizedProfit + portfolio.stats.unrealizedGains)}
              </div>
              <div className="text-xs text-adaptive-600 mt-1">Performance totale</div>
            </div>
          </div>

          {/* 🆕 Performance per Asset */}
          <div className="mt-6">
            <h3 className="text-sm font-medium text-adaptive-500 mb-4">📈 Performance per Asset</h3>
            <div className="space-y-3">
              {portfolio.holdings.map(holding => {
                const livePrice = livePrices[holding.asset.symbol]
                const currentPrice = livePrice || holding.currentPrice || holding.avgPrice
                const currentValue = livePrice 
                  ? holding.quantity * livePrice 
                  : holding.quantity * (holding.currentPrice || holding.avgPrice)
                const investedValue = holding.quantity * holding.avgPrice
                const assetPnL = currentValue - investedValue
                const assetROI = investedValue > 0 ? ((assetPnL / investedValue) * 100) : 0
                const portfolioWeight = portfolio.stats.totalValueEur > 0 ? ((currentValue / portfolio.stats.totalValueEur) * 100) : 0

                return (
                  <div key={holding.asset.symbol} className="flex items-center justify-between p-3 bg-adaptive-50 rounded">
                    <div className="flex items-center gap-3">
                      <div className="text-lg font-bold">{holding.asset.symbol}</div>
                      <div className="text-sm text-adaptive-600">{holding.asset.name}</div>
                    </div>
                    
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <div className="text-xs text-adaptive-500">Valore</div>
                        <div className="font-semibold">{formatCurrency(currentValue)}</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-xs text-adaptive-500">P&L</div>
                        <div className={`font-semibold ${assetPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrency(assetPnL)}
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-xs text-adaptive-500">ROI</div>
                        <div className={`font-semibold ${assetROI >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatPercentage(assetROI)}
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-xs text-adaptive-500">% Portfolio</div>
                        <div className="font-semibold text-adaptive-900">
                          {portfolioWeight.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Holdings Table */}
      <div className="bg-adaptive-50 border border-adaptive rounded-lg mb-8">
        <div className="flex items-center justify-between p-6 border-b border-adaptive">
          <h2 className="text-xl font-bold text-adaptive-900">🪙 Holdings</h2>
          <div className="flex gap-3">
            <button
              onClick={updatePrices}
              disabled={priceLoading}
              className="flex items-center gap-2 px-3 py-1 text-sm bg-adaptive-100 text-adaptive-700 rounded-md hover:bg-adaptive-200 disabled:opacity-50"
            >
              {priceLoading ? '⏳ Aggiornamento...' : '🔄 Aggiorna Prezzi'}
            </button>
          </div>
        </div>
        
        <div className="p-6">
          {portfolio.holdings.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">🪙</div>
              <h3 className="text-lg font-medium text-adaptive-900 mb-2">Nessun Asset</h3>
              <p className="text-adaptive-600">I tuoi asset appariranno qui dopo la prima transazione</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-adaptive bg-adaptive-50">
                    <th className="text-left py-3 px-4 font-medium text-adaptive-700">Asset</th>
                    <th className="text-right py-3 px-4 font-medium text-adaptive-700">Quantità</th>
                    <th className="text-right py-3 px-4 font-medium text-adaptive-700">Prezzo Medio</th>
                    <th className="text-right py-3 px-4 font-medium text-adaptive-700">Prezzo Corrente</th>
                    <th className="text-right py-3 px-4 font-medium text-adaptive-700">Valore</th>
                    <th className="text-right py-3 px-4 font-medium text-adaptive-700">P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolio.holdings.map(holding => {
                    const livePrice = livePrices[holding.asset.symbol]
                    const currentPrice = livePrice || holding.currentPrice || holding.avgPrice
                    const currentValue = livePrice 
                      ? holding.quantity * livePrice 
                      : holding.quantity * (holding.currentPrice || holding.avgPrice)
                    const investedValue = holding.quantity * holding.avgPrice
                    const unrealizedPnL = currentValue - investedValue

                    return (
                      <tr key={holding.id} className="border-b border-adaptive hover:bg-adaptive-50">
                        <td className="py-4 px-4">
                          <div className="flex items-center gap-3">
                            <div>
                              <div className="font-semibold text-adaptive-900">{holding.asset.symbol}</div>
                              <div className="text-sm text-adaptive-600">{holding.asset.name}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right font-mono">
                          {formatCrypto(holding.quantity, holding.asset.decimals)}
                        </td>
                        <td className="py-4 px-4 text-right">
                          {formatCurrency(holding.avgPrice)}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {formatCurrency(currentPrice)}
                            {livePrice && (
                              <span className="text-xs bg-green-100 text-green-600 px-1 rounded">LIVE</span>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-right font-semibold">
                          {formatCurrency(currentValue)}
                        </td>
                        <td className="py-4 px-4 text-right">
                          <div className={`font-semibold ${unrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(unrealizedPnL)}
                          </div>
                          <div className={`text-xs ${unrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatPercentage(investedValue > 0 ? (unrealizedPnL / investedValue) * 100 : 0)}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Transactions Table */}
      <div className="bg-adaptive-50 border border-adaptive rounded-lg">
        <div className="flex items-center justify-between p-6 border-b border-adaptive">
          <h2 className="text-xl font-bold text-adaptive-900">📊 Transazioni ({portfolio.transactions.length})</h2>
          <button
            onClick={() => setShowAddTransaction(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
          >
            <PlusIcon className="w-4 h-4" />
            Aggiungi
          </button>
        </div>
        
        <div className="p-6">
          {portfolio.transactions.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-lg font-medium text-adaptive-900 mb-2">Nessuna Transazione</h3>
              <p className="text-adaptive-600">Le tue transazioni appariranno qui</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-adaptive bg-adaptive-50">
                    <th className="text-left py-3 px-4 font-medium text-adaptive-700">Data</th>
                    <th className="text-left py-3 px-4 font-medium text-adaptive-700">Asset</th>
                    <th className="text-center py-3 px-4 font-medium text-adaptive-700">Tipo</th>
                    <th className="text-right py-3 px-4 font-medium text-adaptive-700">Quantità</th>
                    <th className="text-right py-3 px-4 font-medium text-adaptive-700">Valore EUR</th>
                    <th className="text-right py-3 px-4 font-medium text-adaptive-700">Prezzo/Unità</th>
                    <th className="text-center py-3 px-4 font-medium text-adaptive-700">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolio.transactions.map(transaction => (
                    <tr key={transaction.id} className="border-b border-adaptive hover:bg-adaptive-50">
                      <td className="py-4 px-4 text-sm">
                        {new Date(transaction.date).toLocaleDateString('it-IT')}
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-semibold">{transaction.asset.symbol}</div>
                        <div className="text-xs text-adaptive-600">{transaction.asset.name}</div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          transaction.type === 'buy' 
                            ? 'bg-green-100 text-green-600' 
                            : 'bg-red-100 text-red-600'
                        }`}>
                          {transaction.type === 'buy' ? 'Buy' : 'Sell'}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right font-mono">
                        {formatCrypto(transaction.quantity, transaction.asset.decimals)}
                      </td>
                      <td className="py-4 px-4 text-right font-semibold">
                        {formatCurrency(transaction.eurValue)}
                      </td>
                      <td className="py-4 px-4 text-right">
                        {formatCurrency(transaction.pricePerUnit)}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => openEditTransaction(transaction)}
                            className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                            title="Modifica"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTransaction(transaction.id)}
                            className="p-1 text-red-600 hover:bg-red-100 rounded"
                            title="Elimina"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* 🔧 MODAL AGGIUNGI TRANSAZIONE */}
      {showAddTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">➕ Nuova Transazione</h3>
              <button
                onClick={() => {
                  setShowAddTransaction(false)
                  resetTransactionForm()
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setTransactionForm(prev => ({ ...prev, type: 'buy' }))}
                    className={`flex-1 px-3 py-2 border rounded-md text-sm font-medium ${
                      transactionForm.type === 'buy'
                        ? 'bg-green-100 border-green-500 text-green-700'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    💰 Buy
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransactionForm(prev => ({ ...prev, type: 'sell' }))}
                    className={`flex-1 px-3 py-2 border rounded-md text-sm font-medium ${
                      transactionForm.type === 'sell'
                        ? 'bg-red-100 border-red-500 text-red-700'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    💸 Sell
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Asset (Ticker)
                  {fetchingPrice && <span className="text-blue-500 ml-2">🔍 Cercando prezzo...</span>}
                </label>
                <input
                  type="text"
                  value={transactionForm.ticker}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase()
                    setTransactionForm(prev => ({ ...prev, ticker: value }))
                    
                    if (value.length >= 3) {
                      debouncedFetchPrice(value)
                    } else {
                      setCurrentPrice(null)
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="es. BTC, ETH, SOL"
                  required
                />
                {currentPrice && (
                  <div className="text-xs text-green-600 mt-1">
                    💹 Prezzo corrente: {formatCurrency(currentPrice)}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantità</label>
                <input
                  type="number"
                  step="any"
                  value={transactionForm.quantity}
                  onChange={(e) => {
                    setTransactionForm(prev => ({ ...prev, quantity: e.target.value }))
                    
                    if (currentPrice && e.target.value && !isNaN(parseFloat(e.target.value))) {
                      const quantity = parseFloat(e.target.value)
                      const calculatedValue = Math.round(quantity * currentPrice * 100) / 100
                      setTransactionForm(prev => ({ ...prev, eurValue: calculatedValue.toString() }))
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="es. 1.5"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valore EUR</label>
                <input
                  type="number"
                  step="0.01"
                  value={transactionForm.eurValue}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, eurValue: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="es. 100.00"
                  required
                />
                {currentPrice && transactionForm.quantity && !isNaN(parseFloat(transactionForm.quantity)) && (
                  <div className="text-xs text-gray-500 mt-1">
                    💡 {transactionForm.quantity} × {formatCurrency(currentPrice)} = {formatCurrency(parseFloat(transactionForm.quantity) * currentPrice)}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                <input
                  type="date"
                  value={transactionForm.date}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note (opzionale)</label>
                <input
                  type="text"
                  value={transactionForm.notes}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="es. Acquisto su Binance"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
                >
                  {submitLoading ? 'Aggiunta...' : 'Aggiungi Transazione'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddTransaction(false)
                    resetTransactionForm()
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Annulla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🔧 MODAL MODIFICA TRANSAZIONE */}
      {showEditTransaction && editingTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">✏️ Modifica Transazione</h3>
              <button
                onClick={() => {
                  setShowEditTransaction(false)
                  setEditingTransaction(null)
                  resetTransactionForm()
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditTransaction} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setTransactionForm(prev => ({ ...prev, type: 'buy' }))}
                    className={`flex-1 px-3 py-2 border rounded-md text-sm font-medium ${
                      transactionForm.type === 'buy'
                        ? 'bg-green-100 border-green-500 text-green-700'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    💰 Buy
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransactionForm(prev => ({ ...prev, type: 'sell' }))}
                    className={`flex-1 px-3 py-2 border rounded-md text-sm font-medium ${
                      transactionForm.type === 'sell'
                        ? 'bg-red-100 border-red-500 text-red-700'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    💸 Sell
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Asset (Ticker)
                  {fetchingPrice && <span className="text-blue-500 ml-2">🔍 Cercando prezzo...</span>}
                </label>
                <input
                  type="text"
                  value={transactionForm.ticker}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase()
                    setTransactionForm(prev => ({ ...prev, ticker: value }))
                    
                    if (value.length >= 3) {
                      debouncedFetchPrice(value)
                    } else {
                      setCurrentPrice(null)
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="es. BTC, ETH, SOL"
                  required
                />
                {currentPrice && (
                  <div className="text-xs text-green-600 mt-1">
                    💹 Prezzo corrente: {formatCurrency(currentPrice)}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantità</label>
                <input
                  type="number"
                  step="any"
                  value={transactionForm.quantity}
                  onChange={(e) => {
                    setTransactionForm(prev => ({ ...prev, quantity: e.target.value }))
                    
                    if (currentPrice && e.target.value && !isNaN(parseFloat(e.target.value))) {
                      const quantity = parseFloat(e.target.value)
                      const calculatedValue = Math.round(quantity * currentPrice * 100) / 100
                      setTransactionForm(prev => ({ ...prev, eurValue: calculatedValue.toString() }))
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="es. 1.5"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valore EUR</label>
                <input
                  type="number"
                  step="0.01"
                  value={transactionForm.eurValue}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, eurValue: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="es. 100.00"
                  required
                />
                {currentPrice && transactionForm.quantity && !isNaN(parseFloat(transactionForm.quantity)) && (
                  <div className="text-xs text-gray-500 mt-1">
                    💡 {transactionForm.quantity} × {formatCurrency(currentPrice)} = {formatCurrency(parseFloat(transactionForm.quantity) * currentPrice)}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                <input
                  type="date"
                  value={transactionForm.date}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note (opzionale)</label>
                <input
                  type="text"
                  value={transactionForm.notes}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="es. Acquisto su Binance"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
                >
                  {submitLoading ? 'Modifica...' : 'Salva Modifiche'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditTransaction(false)
                    setEditingTransaction(null)
                    resetTransactionForm()
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Annulla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🔧 MODAL IMPOSTAZIONI PORTFOLIO */}
      {showEditPortfolio && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">⚙️ Impostazioni Portfolio</h3>
              <button
                onClick={() => setShowEditPortfolio(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditPortfolio} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome Portfolio</label>
                <input
                  type="text"
                  value={portfolioForm.name}
                  onChange={(e) => setPortfolioForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="es. Main Crypto Wallet"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione (opzionale)</label>
                <textarea
                  value={portfolioForm.description}
                  onChange={(e) => setPortfolioForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="es. Portfolio principale per trading crypto"
                  rows={3}
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
                >
                  {submitLoading ? 'Salvataggio...' : 'Salva Modifiche'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditPortfolio(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Annulla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )

  // 🔧 FORM HANDLERS
  async function handleAddTransaction(e: React.FormEvent) {
    e.preventDefault()

    if (!transactionForm.ticker || !transactionForm.quantity || !transactionForm.eurValue) {
      alert('Compila tutti i campi obbligatori')
      return
    }

    setSubmitLoading(true)
    try {
      const response = await fetch(`/api/crypto-portfolios/${portfolioId}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: transactionForm.type,
          assetSymbol: transactionForm.ticker,
          quantity: parseFloat(transactionForm.quantity),
          eurValue: parseFloat(transactionForm.eurValue),
          date: transactionForm.date,
          notes: transactionForm.notes || null
        })
      })

      if (response.ok) {
        await fetchPortfolio()
        setShowAddTransaction(false)
        resetTransactionForm()
        alert('Transazione aggiunta con successo!')
      } else {
        const error = await response.json()
        alert(`Errore: ${error.error || 'Aggiunta transazione fallita'}`)
      }
    } catch (error) {
      console.error('Error adding transaction:', error)
      alert('Errore durante l\'aggiunta della transazione')
    } finally {
      setSubmitLoading(false)
    }
  }

  async function handleEditTransaction(e: React.FormEvent) {
    e.preventDefault()

    if (!editingTransaction || !transactionForm.ticker || !transactionForm.quantity || !transactionForm.eurValue) {
      alert('Compila tutti i campi obbligatori')
      return
    }

    setSubmitLoading(true)
    try {
      const response = await fetch(`/api/crypto-portfolios/${portfolioId}/transactions/${editingTransaction.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: transactionForm.type,
          assetSymbol: transactionForm.ticker,
          quantity: parseFloat(transactionForm.quantity),
          eurValue: parseFloat(transactionForm.eurValue),
          date: transactionForm.date,
          notes: transactionForm.notes || null
        })
      })

      if (response.ok) {
        await fetchPortfolio()
        setShowEditTransaction(false)
        setEditingTransaction(null)
        resetTransactionForm()
        alert('Transazione modificata con successo!')
      } else {
        const error = await response.json()
        alert(`Errore: ${error.error || 'Modifica transazione fallita'}`)
      }
    } catch (error) {
      console.error('Error editing transaction:', error)
      alert('Errore durante la modifica della transazione')
    } finally {
      setSubmitLoading(false)
    }
  }

  async function handleEditPortfolio(e: React.FormEvent) {
    e.preventDefault()

    if (!portfolioForm.name.trim()) {
      alert('Nome portfolio è obbligatorio')
      return
    }

    setSubmitLoading(true)
    try {
      const response = await fetch(`/api/crypto-portfolios/${portfolioId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: portfolioForm.name.trim(),
          description: portfolioForm.description.trim() || null
        })
      })

      if (response.ok) {
        await fetchPortfolio()
        setShowEditPortfolio(false)
        alert('Portfolio modificato con successo!')
      } else {
        const error = await response.json()
        alert(`Errore: ${error.error || 'Modifica portfolio fallita'}`)
      }
    } catch (error) {
      console.error('Error editing portfolio:', error)
      alert('Errore durante la modifica del portfolio')
    } finally {
      setSubmitLoading(false)
    }
  }

  async function handleDeleteTransaction(transactionId: number) {
    if (!confirm('Sei sicuro di voler eliminare questa transazione?')) {
      return
    }

    try {
      const response = await fetch(`/api/crypto-portfolios/${portfolioId}/transactions/${transactionId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchPortfolio()
        alert('Transazione eliminata con successo!')
      } else {
        const error = await response.json()
        alert(`Errore: ${error.error || 'Eliminazione transazione fallita'}`)
      }
    } catch (error) {
      console.error('Error deleting transaction:', error)
      alert('Errore durante l\'eliminazione della transazione')
    }
  }
}