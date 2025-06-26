// src/app/investments/crypto-portfolio/[id]/page.tsx - COMPLETE VERSION with all missing functionality
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
    transactionCount: number
    buyCount: number
    sellCount: number
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

  // 🔧 FORM TRANSAZIONE con auto-fetch prezzo
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

  // 🔧 FETCH PREZZO DA CRYPTOPRICES.CC con debounce
  const debouncedFetchPrice = (ticker: string) => {
    // Cancella il timeout precedente
    if (priceTimeout) {
      clearTimeout(priceTimeout)
    }
    
    // Imposta un nuovo timeout
    const newTimeout = setTimeout(() => {
      fetchCryptoPrice(ticker)
    }, 500) // Attende 500ms dopo l'ultimo input
    
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
          
          // Se abbiamo quantità, calcola automaticamente il valore EUR
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

  const formatCurrency = (amount: number) =>
    new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount)

  const formatPercentage = (value: number) =>
    new Intl.NumberFormat('it-IT', { style: 'percent', minimumFractionDigits: 2 }).format(value / 100)

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
        alert('Errore nell\'aggiornamento dei prezzi')
      }
    } catch (error) {
      console.error('💥 Errore aggiornamento prezzi:', error)
      alert('Errore nell\'aggiornamento dei prezzi')
    } finally {
      setPriceLoading(false)
    }
  }

  // 🔧 GESTIONE TRANSAZIONI - AGGIUNTA (LOGICA COME DCA BTC)
  const handleAddTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitLoading) return

    // Validazioni
    if (!transactionForm.ticker || !transactionForm.quantity || !transactionForm.eurValue) {
      alert('Compila tutti i campi obbligatori')
      return
    }

    const quantity = parseFloat(transactionForm.quantity)
    const eurValue = parseFloat(transactionForm.eurValue)

    if (isNaN(quantity) || quantity <= 0 || isNaN(eurValue) || eurValue <= 0) {
      alert('Quantità e valore EUR devono essere positivi')
      return
    }

    // 🔧 USA PREZZO DA CRYPTOPRICES.CC se disponibile, altrimenti calcola manualmente
    const pricePerUnit = currentPrice || (eurValue / quantity)

    // Controllo saldo per acquisti
    if (transactionForm.type === 'buy' && portfolio?.account && portfolio.account.balance < eurValue) {
      alert('Saldo insufficiente nel conto collegato')
      return
    }

    setSubmitLoading(true)
    try {
      const response = await fetch(`/api/crypto-portfolios/${portfolioId}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: transactionForm.type,
          assetSymbol: transactionForm.ticker.toUpperCase(), // 🔧 CORRETTO: assetSymbol invece di ticker
          quantity: quantity,
          eurValue: eurValue,
          pricePerUnit: pricePerUnit, // 🔧 USA PREZZO DA CRYPTOPRICES.CC se disponibile
          broker: 'Manual Entry', // 🔧 AGGIUNTO: campo richiesto dall'API
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

  // 🔧 GESTIONE TRANSAZIONI - MODIFICA (LOGICA COME DCA BTC)
  const handleEditTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitLoading || !editingTransaction) return

    const quantity = parseFloat(transactionForm.quantity)
    const eurValue = parseFloat(transactionForm.eurValue)

    if (isNaN(quantity) || quantity <= 0 || isNaN(eurValue) || eurValue <= 0) {
      alert('Quantità e valore EUR devono essere positivi')
      return
    }

    // 🔧 USA PREZZO DA CRYPTOPRICES.CC se disponibile, altrimenti calcola manualmente
    const pricePerUnit = currentPrice || (eurValue / quantity)

    setSubmitLoading(true)
    try {
      const response = await fetch(`/api/crypto-portfolios/${portfolioId}/transactions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transactionId: editingTransaction.id,
          type: transactionForm.type,
          assetSymbol: transactionForm.ticker.toUpperCase(), // 🔧 CORRETTO: assetSymbol invece di ticker
          quantity: quantity,
          eurValue: eurValue,
          pricePerUnit: pricePerUnit, // 🔧 USA PREZZO DA CRYPTOPRICES.CC se disponibile
          broker: 'Manual Entry', // 🔧 AGGIUNTO: campo richiesto dall'API
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

  // 🔧 GESTIONE TRANSAZIONI - CANCELLAZIONE
  const handleDeleteTransaction = async (transactionId: number) => {
    if (!confirm('Sei sicuro di voler eliminare questa transazione?')) return

    try {
      const response = await fetch(`/api/crypto-portfolios/${portfolioId}/transactions?transactionId=${transactionId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchPortfolio()
        alert('Transazione eliminata con successo!')
      } else {
        const error = await response.json()
        alert(`Errore: ${error.error || 'Eliminazione fallita'}`)
      }
    } catch (error) {
      console.error('Error deleting transaction:', error)
      alert('Errore durante l\'eliminazione della transazione')
    }
  }

  // 🔧 GESTIONE PORTFOLIO - MODIFICA IMPOSTAZIONI
  const handleEditPortfolio = async (e: React.FormEvent) => {
    e.preventDefault()
    if (submitLoading) return

    if (!portfolioForm.name.trim()) {
      alert('Il nome del portfolio è obbligatorio')
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

  // 🔧 GESTIONE PORTFOLIO - CANCELLAZIONE
  const handleDeletePortfolio = async () => {
    if (!confirm(`Sei sicuro di voler eliminare il portfolio "${portfolio?.name}"?\n\nTutte le transazioni collegate verranno eliminate e i saldi dei conti ripristinati.`)) return

    try {
      const response = await fetch(`/api/crypto-portfolios/${portfolioId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        alert('Portfolio eliminato con successo!')
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

  // 🔧 UTILITY FUNCTIONS
  const resetTransactionForm = () => {
    setTransactionForm({
      type: 'buy',
      ticker: '',
      quantity: '',
      eurValue: '',
      date: new Date().toISOString().split('T')[0],
      notes: ''
    })
    // 🔧 PULISCI ANCHE PREZZO CORRENTE E TIMEOUT
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
      ticker: transaction.asset.symbol, // Usa il symbol dell'asset
      quantity: transaction.quantity.toString(),
      eurValue: transaction.eurValue.toString(),
      date: transaction.date.split('T')[0],
      notes: transaction.notes || ''
    })
    
    // 🔧 FETCH PREZZO CORRENTE per il ticker esistente (immediato, non debounced)
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
          {/* 🔧 TASTO IMPOSTAZIONI */}
          <button
            onClick={() => setShowEditPortfolio(true)}
            className="flex items-center gap-2 px-4 py-2 text-adaptive-600 border border-adaptive-300 rounded-md hover:bg-adaptive-50"
            title="Impostazioni Portfolio"
          >
            <Cog6ToothIcon className="w-5 h-5" />
            Impostazioni
          </button>
          
          {/* 🔧 TASTO CANCELLA PORTFOLIO */}
          <button
            onClick={handleDeletePortfolio}
            className="flex items-center gap-2 px-4 py-2 text-red-600 border border-red-300 rounded-md hover:bg-red-50"
            title="Elimina Portfolio"
          >
            <TrashIcon className="w-5 h-5" />
            Elimina
          </button>
          
          {/* 🔧 TASTO AGGIUNGI TRANSAZIONE */}
          <button
            onClick={() => setShowAddTransaction(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
          >
            <PlusIcon className="w-5 h-5" />
            Nuova Transazione
          </button>
        </div>
      </div>

      {/* Enhanced Stats Overview */}
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
          <h3 className="text-sm font-medium text-adaptive-500 mb-2">⚠️ Investimento Effettivo</h3>
          <p className="text-2xl font-bold text-orange-600">{formatCurrency(portfolio.stats.effectiveInvestment)}</p>
          <p className="text-xs text-adaptive-600 mt-1">
            {portfolio.stats.isFullyRecovered ? 'Tutto recuperato' : 'Ancora a rischio'}
          </p>
        </div>
        
        <div className="bg-adaptive-50 border border-adaptive rounded-lg p-6">
          <h3 className="text-sm font-medium text-adaptive-500 mb-2">💹 Profitti Realizzati</h3>
          <p className={`text-2xl font-bold ${portfolio.stats.realizedProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(portfolio.stats.realizedProfit)}
          </p>
          <p className="text-xs text-adaptive-600 mt-1">
            ROI: {formatPercentage(portfolio.stats.totalROI)}
          </p>
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
                    // 🔧 USA PREZZI LIVE invece di quelli nel database
                    const livePrice = livePrices[holding.asset.symbol]
                    const currentPrice = livePrice || holding.currentPrice || holding.avgPrice
                    const currentValue = livePrice 
                      ? holding.quantity * livePrice 
                      : (holding.valueEur || (holding.quantity * currentPrice))
                    const unrealizedPL = currentValue - holding.totalInvested

                    return (
                      <tr key={holding.id} className="border-b border-adaptive hover:bg-adaptive-50">
                        <td className="py-3 px-4">
                          <div className="font-medium text-adaptive-900">{holding.asset.symbol}</div>
                          <div className="text-sm text-adaptive-600">{holding.asset.name}</div>
                        </td>
                        <td className="text-right py-3 px-4">
                          {formatCrypto(holding.quantity, holding.asset.decimals)}
                        </td>
                        <td className="text-right py-3 px-4">
                          {formatCurrency(holding.avgPrice)}
                        </td>
                        <td className="text-right py-3 px-4">
                          <span className={
                            livePrice ? 'text-green-600 font-semibold' : 
                            (holding.currentPrice ? 
                            (currentPrice > holding.avgPrice ? 'text-green-600' : 'text-red-600') : 
                            'text-adaptive-600')
                          }>
                            {formatCurrency(currentPrice)}
                            {livePrice && <span className="text-xs ml-1">🔴 LIVE</span>}
                          </span>
                        </td>
                        <td className="text-right py-3 px-4 font-semibold">
                          {formatCurrency(currentValue)}
                        </td>
                        <td className="text-right py-3 px-4">
                          <span className={`font-semibold ${unrealizedPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(unrealizedPL)}
                          </span>
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
          <h2 className="text-xl font-bold text-adaptive-900">📊 Transazioni</h2>
          <span className="text-sm text-adaptive-600">{portfolio.transactions.length} transazioni</span>
        </div>
        
        <div className="p-6">
          {portfolio.transactions.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">💳</div>
              <h3 className="text-lg font-medium text-adaptive-900 mb-2">Nessuna Transazione</h3>
              <p className="text-adaptive-600 mb-4">Le tue transazioni appariranno qui</p>
              <button
                onClick={() => setShowAddTransaction(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                Aggiungi Prima Transazione
              </button>
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
                      <td className="py-3 px-4 text-adaptive-900">
                        {new Date(transaction.date).toLocaleDateString('it-IT')}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-adaptive-900">{transaction.asset.symbol}</div>
                        <div className="text-sm text-adaptive-600">{transaction.asset.name}</div>
                      </td>
                      <td className="text-center py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          transaction.type === 'buy' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                        }`}>
                          {transaction.type === 'buy' ? '📈 Buy' : '📉 Sell'}
                        </span>
                      </td>
                      <td className="text-right py-3 px-4 font-mono">
                        {formatCrypto(transaction.quantity, transaction.asset.decimals)}
                      </td>
                      <td className="text-right py-3 px-4 font-semibold">
                        {formatCurrency(transaction.eurValue)}
                      </td>
                      <td className="text-right py-3 px-4">
                        {formatCurrency(transaction.pricePerUnit)}
                      </td>
                      <td className="text-center py-3 px-4">
                        {/* 🔧 TASTI AZIONI SINGOLA TRANSAZIONE */}
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEditTransaction(transaction)}
                            className="p-1 text-adaptive-600 hover:text-blue-600"
                            title="Modifica transazione"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTransaction(transaction.id)}
                            className="p-1 text-adaptive-600 hover:text-red-600"
                            title="Elimina transazione"
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
              <h3 className="text-lg font-semibold">💳 Nuova Transazione</h3>
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
                <select
                  value={transactionForm.type}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, type: e.target.value as 'buy' | 'sell' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="buy">📈 Acquisto (Buy)</option>
                  <option value="sell">📉 Vendita (Sell)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ticker Crypto
                </label>
                <input
                  type="text"
                  value={transactionForm.ticker}
                  onChange={(e) => {
                    const ticker = e.target.value.toUpperCase()
                    setTransactionForm(prev => ({ ...prev, ticker }))
                    
                    // 🔧 FETCH PREZZO CON DEBOUNCE quando cambia ticker
                    if (ticker.length >= 3) {
                      debouncedFetchPrice(ticker)
                    } else {
                      setCurrentPrice(null)
                      // Cancella timeout se ticker troppo corto
                      if (priceTimeout) {
                        clearTimeout(priceTimeout)
                        setPriceTimeout(null)
                      }
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="es. SOL, ETH, BTC"
                  required
                />
                {/* 🔧 INDICATORE PREZZO CORRENTE */}
                {fetchingPrice && (
                  <div className="text-sm text-blue-600 mt-1">
                    🔄 Recupero prezzo...
                  </div>
                )}
                {currentPrice && !fetchingPrice && (
                  <div className="text-sm text-green-600 mt-1">
                    💰 Prezzo corrente: {formatCurrency(currentPrice)}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantità
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={transactionForm.quantity}
                  onChange={(e) => {
                    setTransactionForm(prev => ({ ...prev, quantity: e.target.value }))
                    
                    // 🔧 RICALCOLA VALORE EUR quando cambia quantità
                    if (currentPrice && e.target.value && !isNaN(parseFloat(e.target.value))) {
                      const quantity = parseFloat(e.target.value)
                      const calculatedValue = Math.round(quantity * currentPrice * 100) / 100
                      setTransactionForm(prev => ({ ...prev, eurValue: calculatedValue.toString() }))
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valore EUR {currentPrice && '(calcolato automaticamente)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={transactionForm.eurValue}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, eurValue: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                  required
                />
                {currentPrice && transactionForm.quantity && (
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
                <select
                  value={transactionForm.type}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, type: e.target.value as 'buy' | 'sell' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="buy">📈 Acquisto (Buy)</option>
                  <option value="sell">📉 Vendita (Sell)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ticker Crypto
                </label>
                <input
                  type="text"
                  value={transactionForm.ticker}
                  onChange={(e) => {
                    const ticker = e.target.value.toUpperCase()
                    setTransactionForm(prev => ({ ...prev, ticker }))
                    
                    // 🔧 FETCH PREZZO CON DEBOUNCE quando cambia ticker
                    if (ticker.length >= 3) {
                      debouncedFetchPrice(ticker)
                    } else {
                      setCurrentPrice(null)
                      // Cancella timeout se ticker troppo corto
                      if (priceTimeout) {
                        clearTimeout(priceTimeout)
                        setPriceTimeout(null)
                      }
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="es. SOL, ETH, BTC"
                  required
                />
                {/* 🔧 INDICATORE PREZZO CORRENTE */}
                {fetchingPrice && (
                  <div className="text-sm text-blue-600 mt-1">
                    🔄 Recupero prezzo...
                  </div>
                )}
                {currentPrice && !fetchingPrice && (
                  <div className="text-sm text-green-600 mt-1">
                    💰 Prezzo corrente: {formatCurrency(currentPrice)}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Quantità
                </label>
                <input
                  type="number"
                  step="any"
                  min="0"
                  value={transactionForm.quantity}
                  onChange={(e) => {
                    setTransactionForm(prev => ({ ...prev, quantity: e.target.value }))
                    
                    // 🔧 RICALCOLA VALORE EUR quando cambia quantità
                    if (currentPrice && e.target.value && !isNaN(parseFloat(e.target.value))) {
                      const quantity = parseFloat(e.target.value)
                      const calculatedValue = Math.round(quantity * currentPrice * 100) / 100
                      setTransactionForm(prev => ({ ...prev, eurValue: calculatedValue.toString() }))
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Valore EUR {currentPrice && '(calcolato automaticamente)'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={transactionForm.eurValue}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, eurValue: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                  required
                />
                {currentPrice && transactionForm.quantity && (
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
                  placeholder="es. Portfolio principale per crypto diversificate"
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
}