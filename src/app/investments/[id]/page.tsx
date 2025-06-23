'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowPathIcon, 
  PlusIcon, 
  PencilIcon, 
  TrashIcon, 
  CurrencyEuroIcon 
} from '@heroicons/react/24/outline'

interface DCATransaction {
  id: number
  date: string
  type: 'buy' | 'sell'
  broker: string
  info: string
  btcQuantity: number
  eurPaid: number
  notes?: string
  purchasePrice: number
}

interface NetworkFee {
  id: number
  sats: number
  date: string
  description?: string
}

interface EnhancedDCAPortfolio {
  id: number
  name: string
  type: string
  isActive: boolean
  createdAt: string
  updatedAt: string
  accountId?: number
  account?: {
    id: number
    name: string
    balance: number
  }
  transactions: DCATransaction[]
  networkFees: NetworkFee[]
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
    
    // Original fields
    totalBTC: number
    totalEUR: number
    totalFeesBTC: number
    netBTC: number
    transactionCount: number
    feesCount: number
    buyCount: number
    sellCount: number
  }
}

interface BitcoinPrice {
  btcUsd: number
  btcEur: number
  cached: boolean
}

export default function EnhancedDCAPortfolioPage() {
  const params = useParams()
  const router = useRouter()
  const portfolioId = params.id as string

  // State
  const [portfolio, setPortfolio] = useState<EnhancedDCAPortfolio | null>(null)
  const [loading, setLoading] = useState(true)
  const [btcPrice, setBtcPrice] = useState<BitcoinPrice | null>(null)
  const [priceLoading, setPriceLoading] = useState(false)

  // Modali
  const [showAddTransaction, setShowAddTransaction] = useState(false)
  const [showEditTransaction, setShowEditTransaction] = useState(false)
  const [showAddFee, setShowAddFee] = useState(false)
  const [showEditPortfolio, setShowEditPortfolio] = useState(false)
  const [showDeletePortfolio, setShowDeletePortfolio] = useState(false)
  
  // Form states
  const [editingTransaction, setEditingTransaction] = useState<DCATransaction | null>(null)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [transactionForm, setTransactionForm] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'buy' as 'buy' | 'sell',
    broker: '',
    info: '',
    btcQuantity: '',
    eurPaid: '',
    notes: ''
  })

  const [feeForm, setFeeForm] = useState({
    sats: '',
    date: new Date().toISOString().split('T')[0],
    description: ''
  })

  const [portfolioForm, setPortfolioForm] = useState({
    name: '',
    isActive: true
  })

  // Filters
  const [filteredTransactions, setFilteredTransactions] = useState<DCATransaction[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [brokerFilter, setBrokerFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  // Load portfolio
  const fetchPortfolio = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/dca-portfolios/${portfolioId}`)
      if (response.ok) {
        const data = await response.json()
        setPortfolio(data)
        setPortfolioForm({
          name: data.name,
          isActive: data.isActive
        })
      } else {
        console.error('Errore nel caricamento del portfolio')
      }
    } catch (error) {
      console.error('Errore nel caricamento del portfolio:', error)
    } finally {
      setLoading(false)
    }
  }

  // Load Bitcoin price
  const fetchBitcoinPrice = async (forceRefresh = false) => {
    try {
      setPriceLoading(true)
      const url = forceRefresh ? 
        '/api/bitcoin-price?forceRefresh=true' : 
        '/api/bitcoin-price'
      const response = await fetch(url)
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

  // Add transaction
  const addTransaction = async () => {
    if (!transactionForm.broker || !transactionForm.info || !transactionForm.btcQuantity || !transactionForm.eurPaid) {
      alert('Tutti i campi sono obbligatori')
      return
    }

    try {
      setSubmitLoading(true)
      const response = await fetch('/api/dca-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portfolioId: parseInt(portfolioId),
          date: transactionForm.date,
          type: transactionForm.type,
          broker: transactionForm.broker,
          info: transactionForm.info,
          btcQuantity: transactionForm.type === 'sell' ? -Math.abs(parseFloat(transactionForm.btcQuantity)) : Math.abs(parseFloat(transactionForm.btcQuantity)),
          eurPaid: parseFloat(transactionForm.eurPaid),
          notes: transactionForm.notes || undefined
        })
      })

      if (response.ok) {
        fetchPortfolio()
        setTransactionForm({
          date: new Date().toISOString().split('T')[0],
          type: 'buy',
          broker: '',
          info: '',
          btcQuantity: '',
          eurPaid: '',
          notes: ''
        })
        setShowAddTransaction(false)
      } else {
        const error = await response.json()
        alert(error.error || 'Errore nell\'aggiunta della transazione')
      }
    } catch (error) {
      console.error('Errore:', error)
      alert('Errore nell\'aggiunta della transazione')
    } finally {
      setSubmitLoading(false)
    }
  }

  // Edit transaction
  const editTransaction = async () => {
    if (!editingTransaction || !transactionForm.broker || !transactionForm.info || !transactionForm.btcQuantity || !transactionForm.eurPaid) {
      alert('Tutti i campi sono obbligatori')
      return
    }

    try {
      setSubmitLoading(true)
      const response = await fetch(`/api/dca-transactions/${editingTransaction.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: transactionForm.date,
          type: transactionForm.type,
          broker: transactionForm.broker,
          info: transactionForm.info,
          btcQuantity: transactionForm.type === 'sell' ? -Math.abs(parseFloat(transactionForm.btcQuantity)) : Math.abs(parseFloat(transactionForm.btcQuantity)),
          eurPaid: parseFloat(transactionForm.eurPaid),
          notes: transactionForm.notes || undefined
        })
      })

      if (response.ok) {
        fetchPortfolio()
        setEditingTransaction(null)
        setShowEditTransaction(false)
      } else {
        const error = await response.json()
        alert(error.error || 'Errore nella modifica della transazione')
      }
    } catch (error) {
      console.error('Errore:', error)
      alert('Errore nella modifica della transazione')
    } finally {
      setSubmitLoading(false)
    }
  }

  // Delete transaction
  const deleteTransaction = async (id: number) => {
    if (!confirm('Sei sicuro di voler eliminare questa transazione?')) return

    try {
      const response = await fetch(`/api/dca-transactions/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchPortfolio()
      } else {
        alert('Errore nell\'eliminazione della transazione')
      }
    } catch (error) {
      console.error('Errore nell\'eliminazione transazione:', error)
    }
  }

  // Add network fee
  const addNetworkFee = async () => {
    if (!feeForm.sats) {
      alert('Il campo sats è obbligatorio')
      return
    }

    try {
      setSubmitLoading(true)
      const response = await fetch('/api/network-fees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portfolioId: parseInt(portfolioId),
          sats: parseInt(feeForm.sats),
          date: feeForm.date,
          description: feeForm.description || undefined
        })
      })

      if (response.ok) {
        fetchPortfolio()
        setFeeForm({
          sats: '',
          date: new Date().toISOString().split('T')[0],
          description: ''
        })
        setShowAddFee(false)
      } else {
        const error = await response.json()
        alert(error.error || 'Errore nell\'aggiunta della fee')
      }
    } catch (error) {
      console.error('Errore:', error)
      alert('Errore nell\'aggiunta della fee')
    } finally {
      setSubmitLoading(false)
    }
  }

  // Update portfolio
  const updatePortfolio = async () => {
    if (!portfolioForm.name.trim()) {
      alert('Il nome del portfolio è obbligatorio')
      return
    }

    try {
      setSubmitLoading(true)
      const response = await fetch(`/api/dca-portfolios/${portfolioId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: portfolioForm.name.trim()
        })
      })

      if (response.ok) {
        fetchPortfolio()
        setShowEditPortfolio(false)
      } else {
        const error = await response.json()
        alert(error.error || 'Errore nell\'aggiornamento del portfolio')
      }
    } catch (error) {
      console.error('Errore:', error)
      alert('Errore nell\'aggiornamento del portfolio')
    } finally {
      setSubmitLoading(false)
    }
  }

  // Delete portfolio
  const deletePortfolio = async () => {
    if (!confirm('Sei sicuro di voler eliminare questo portfolio? Questa azione non può essere annullata.')) return

    try {
      const response = await fetch(`/api/dca-portfolios/${portfolioId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        router.push('/investments')
      } else {
        const error = await response.json()
        alert(error.error || 'Errore nell\'eliminazione del portfolio')
      }
    } catch (error) {
      console.error('Errore:', error)
      alert('Errore nell\'eliminazione del portfolio')
    }
  }

  // Filter transactions
  useEffect(() => {
    if (!portfolio) return

    let filtered = portfolio.transactions

    if (searchTerm) {
      filtered = filtered.filter(tx => 
        tx.broker.toLowerCase().includes(searchTerm.toLowerCase()) ||
        tx.info.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (tx.notes && tx.notes.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    if (brokerFilter) {
      filtered = filtered.filter(tx => tx.broker === brokerFilter)
    }

    if (typeFilter) {
      filtered = filtered.filter(tx => tx.type === typeFilter)
    }

    setFilteredTransactions(filtered)
  }, [portfolio, searchTerm, brokerFilter, typeFilter])

  useEffect(() => {
    fetchPortfolio()
    fetchBitcoinPrice()
  }, [portfolioId])

  // 🔄 ENHANCED CALCULATIONS
  const currentValue = portfolio && btcPrice ? portfolio.stats.netBTC * btcPrice.btcEur : 0
  const unrealizedGains = currentValue - (portfolio?.stats.remainingCostBasis || 0)
  const totalGains = (portfolio?.stats.realizedGains || 0) + unrealizedGains
  const totalROI = portfolio && portfolio.stats.totalInvested > 0 ? 
    (totalGains / portfolio.stats.totalInvested) * 100 : 0

  // Account balance breakdown
  const accountBalance = portfolio?.account?.balance || 0
  const canCalculateBreakdown = portfolio?.stats.capitalRecovered && portfolio?.stats.realizedGains
  
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

  const formatSats = (sats: number) => {
    return new Intl.NumberFormat('it-IT').format(sats) + ' sats'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT')
  }

  // Get unique values for filters
  const uniqueBrokers = portfolio ? [...new Set(portfolio.transactions.map(t => t.broker))] : []
  const uniqueTypes = portfolio ? [...new Set(portfolio.transactions.map(t => t.type))] : []

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Portfolio DCA</h1>
            <p className="text-white opacity-80">Caricamento...</p>
          </div>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="text-white opacity-80">Caricamento portfolio...</div>
        </div>
      </div>
    )
  }

  if (!portfolio) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white">Portfolio Non Trovato</h1>
            <p className="text-white opacity-80">Il portfolio richiesto non esiste.</p>
          </div>
        </div>
        <div className="text-center">
          <Link href="/investments" className="text-blue-400 hover:text-blue-300">
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
            <Link href="/investments" className="text-blue-400 hover:text-blue-300">
              ← Investimenti
            </Link>
            <span className="text-white opacity-60">/</span>
            <h1 className="text-3xl font-bold text-white">{portfolio.name}</h1>
          </div>
          <p className="text-white opacity-80">Enhanced Cash Flow Portfolio</p>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => fetchBitcoinPrice(true)}
            className="btn-primary px-4 py-2 rounded-lg flex items-center gap-2"
            disabled={priceLoading}
          >
            <ArrowPathIcon className={`w-4 h-4 ${priceLoading ? 'animate-spin' : ''}`} />
            {priceLoading ? 'Aggiornando...' : 'Aggiorna Prezzo'}
          </button>
          <button
            onClick={() => setShowAddTransaction(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
          >
            <PlusIcon className="w-4 h-4" />
            Nuova Transazione
          </button>
          <button
            onClick={() => setShowEditPortfolio(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-2"
          >
            <PencilIcon className="w-4 h-4" />
            Modifica Portfolio
          </button>
          <button
            onClick={() => setShowDeletePortfolio(true)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
          >
            <TrashIcon className="w-4 h-4" />
            Elimina Portfolio
          </button>
        </div>
      </div>

      {/* 🔄 ENHANCED STATISTICS OVERVIEW */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Investment */}
        <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-4">
          <h3 className="text-sm font-medium text-gray-300">💰 Investimento Totale</h3>
          <p className="text-2xl font-bold text-white">{formatCurrency(portfolio.stats.totalInvested)}</p>
          <p className="text-sm text-gray-400">{portfolio.stats.buyCount} acquisti</p>
        </div>

        {/* Capital Recovered */}
        <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-4">
          <h3 className="text-sm font-medium text-gray-300">🔄 Capitale Recuperato</h3>
          <p className="text-2xl font-bold text-green-400">{formatCurrency(portfolio.stats.capitalRecovered)}</p>
          <div className="flex items-center gap-2">
            <p className="text-sm text-gray-400">
              {portfolio.stats.totalInvested > 0 ? 
                ((portfolio.stats.capitalRecovered / portfolio.stats.totalInvested) * 100).toFixed(1) : 0}%
            </p>
            {portfolio.stats.isFullyRecovered && <span className="text-green-400">✅</span>}
          </div>
        </div>

        {/* Realized Gains */}
        <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-4">
          <h3 className="text-sm font-medium text-gray-300">📈 Profitti Realizzati</h3>
          <p className={`text-2xl font-bold ${portfolio.stats.realizedGains >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatCurrency(portfolio.stats.realizedGains)}
          </p>
          <p className="text-sm text-gray-400">
            ROI: {portfolio.stats.realizedROI.toFixed(1)}%
          </p>
        </div>

        {/* Total ROI */}
        <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-4">
          <h3 className="text-sm font-medium text-gray-300">🎯 ROI Totale</h3>
          <p className={`text-2xl font-bold ${totalROI >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {totalROI.toFixed(2)}%
          </p>
          <p className="text-sm text-gray-400">
            {totalROI >= 0 ? '📈 Profitto' : '📉 Perdita'}
          </p>
        </div>
      </div>

      {/* 🔄 ENHANCED DETAILED BREAKDOWN */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Bitcoin Holdings */}
        <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-4">
          <h3 className="text-lg font-medium text-gray-100 mb-3">₿ Bitcoin Holdings</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-300">BTC Totali:</span>
              <span className="font-semibold text-orange-400">{formatBTC(portfolio.stats.netBTC)}</span>
            </div>
            {portfolio.stats.freeBTCAmount > 0 && (
              <div className="flex justify-between">
                <span className="text-green-400">🎉 BTC Gratuiti:</span>
                <span className="font-semibold text-green-400">{formatBTC(portfolio.stats.freeBTCAmount)}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-gray-300">Valore Attuale:</span>
              <span className="font-semibold text-white">{formatCurrency(currentValue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Costo Base Rimasto:</span>
              <span className="font-semibold text-gray-200">{formatCurrency(portfolio.stats.remainingCostBasis)}</span>
            </div>
          </div>
        </div>

        {/* Performance Breakdown */}
        <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-4">
          <h3 className="text-lg font-medium text-gray-100 mb-3">📊 Performance</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-300">Profitti Realizzati:</span>
              <span className={`font-semibold ${portfolio.stats.realizedGains >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatCurrency(portfolio.stats.realizedGains)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Plus/Minus Non Real.:</span>
              <span className={`font-semibold ${unrealizedGains >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatCurrency(unrealizedGains)}
              </span>
            </div>
            <div className="border-t border-gray-700 pt-2 mt-2">
              <div className="flex justify-between">
                <span className="text-gray-100">Totale P&L:</span>
                <span className={`font-bold ${totalGains >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatCurrency(totalGains)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Account Status */}
        <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-4">
          <h3 className="text-lg font-medium text-gray-100 mb-3">🏦 Conto Collegato</h3>
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-300">Conto:</span>
              <span className="font-semibold text-gray-100">{portfolio.account?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Saldo Attuale:</span>
              <span className="font-semibold text-white">{formatCurrency(accountBalance)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Soldi a Rischio:</span>
              <span className={`font-semibold ${portfolio.stats.effectiveInvestment > 0 ? 'text-orange-400' : 'text-green-400'}`}>
                {formatCurrency(portfolio.stats.effectiveInvestment)}
              </span>
            </div>
            {portfolio.stats.effectiveInvestment === 0 && (
              <p className="text-sm text-green-400">🎉 Investimento completamente recuperato!</p>
            )}
          </div>
        </div>
      </div>

      {/* Price Info */}
      {btcPrice && (
        <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700 p-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-100">📡 Prezzo Bitcoin</h3>
            <span className="text-sm text-gray-400">
              {btcPrice.cached ? '💾 Cache' : '🌐 Live'}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-4 mt-3">
            <div>
              <p className="text-sm text-gray-300">EUR</p>
              <p className="text-xl font-bold text-orange-400">{formatCurrency(btcPrice.btcEur)}</p>
            </div>
            <div>
              <p className="text-sm text-gray-300">USD</p>
              <p className="text-xl font-bold text-orange-400">${btcPrice.btcUsd.toLocaleString()}</p>
            </div>
          </div>
        </div>
      )}

      {/* Transactions List */}
      <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700">
        <div className="p-6 border-b border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-gray-100">📋 Transazioni</h3>
            <span className="text-sm text-gray-400">
              {filteredTransactions.length} di {portfolio.transactions.length}
            </span>
          </div>

          {/* Filters */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <input
              type="text"
              placeholder="Cerca per broker, info, note..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white"
            />
            <select
              value={brokerFilter}
              onChange={(e) => setBrokerFilter(e.target.value)}
              className="px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white"
            >
              <option value="">Tutti i broker</option>
              {uniqueBrokers.map(broker => (
                <option key={broker} value={broker}>{broker}</option>
              ))}
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-gray-600 rounded-md bg-gray-700 text-white"
            >
              <option value="">Tutti i tipi</option>
              {uniqueTypes.map(type => (
                <option key={type} value={type}>
                  {type === 'buy' ? '🟢 Acquisto' : '🔴 Vendita'}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="p-6">
          {filteredTransactions.length > 0 ? (
            <div className="space-y-3">
              {filteredTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">
                      {transaction.type === 'buy' ? '🟢' : '🔴'}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-gray-100">
                          {transaction.type === 'buy' ? '+' : '-'}{Math.abs(transaction.btcQuantity).toFixed(8)} BTC
                        </span>
                        <span className="text-gray-400">•</span>
                        <span className="text-gray-300">{formatCurrency(transaction.eurPaid)}</span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-gray-400">
                        <span>{formatDate(transaction.date)}</span>
                        <span>{transaction.broker}</span>
                        <span>{transaction.info}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm text-gray-300">Prezzo</p>
                      <p className="font-semibold text-gray-100">
                        {formatCurrency(transaction.purchasePrice)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingTransaction(transaction)
                          setTransactionForm({
                            date: transaction.date.split('T')[0],
                            type: transaction.type || 'buy',
                            broker: transaction.broker,
                            info: transaction.info,
                            btcQuantity: Math.abs(transaction.btcQuantity).toString(),
                            eurPaid: transaction.eurPaid.toString(),
                            notes: transaction.notes || ''
                          })
                          setShowEditTransaction(true)
                        }}
                        className="text-blue-400 hover:text-blue-300 p-1"
                        title="Modifica"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteTransaction(transaction.id)}
                        className="text-red-400 hover:text-red-300 p-1"
                        title="Elimina"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <CurrencyEuroIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-300">
                {searchTerm || brokerFilter || typeFilter ? 'Nessuna transazione trovata per i filtri applicati.' : 'Non hai ancora transazioni.'}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Network Fees */}
      {portfolio.networkFees.length > 0 && (
        <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700">
          <div className="p-6 border-b border-gray-700">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-100">⚡ Fee di Rete</h3>
              <button
                onClick={() => setShowAddFee(true)}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2"
              >
                <PlusIcon className="w-4 h-4" />
                Nuova Fee
              </button>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-3">
              {portfolio.networkFees.map((fee) => (
                <div key={fee.id} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                  <div>
                    <p className="font-semibold text-orange-400">{formatSats(fee.sats)}</p>
                    <p className="text-sm text-gray-400">{formatDate(fee.date)}</p>
                  </div>
                  {fee.description && (
                    <p className="text-gray-300">{fee.description}</p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add Fee Button for empty state */}
      {portfolio.networkFees.length === 0 && (
        <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700">
          <div className="p-6 border-b border-gray-700">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-100">⚡ Fee di Rete</h3>
              <button
                onClick={() => setShowAddFee(true)}
                className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 flex items-center gap-2"
              >
                <PlusIcon className="w-4 h-4" />
                Nuova Fee
              </button>
            </div>
          </div>
          <div className="p-6">
            <div className="text-center py-4">
              <p className="text-gray-400">Nessuna fee di rete registrata</p>
            </div>
          </div>
        </div>
      )}
      
      {/* Add Transaction Modal */}
      {showAddTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Nuova Transazione DCA</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                <input
                  type="date"
                  value={transactionForm.date}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select
                  value={transactionForm.type}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, type: e.target.value as 'buy' | 'sell' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="buy">🟢 Acquisto</option>
                  <option value="sell">🔴 Vendita</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Broker</label>
                <input
                  type="text"
                  value={transactionForm.broker}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, broker: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Binance, Kraken, etc."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Info</label>
                <input
                  type="text"
                  value={transactionForm.info}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, info: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="DCA, Regalo, etc."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantità BTC</label>
                <input
                  type="number"
                  step="0.00000001"
                  value={transactionForm.btcQuantity}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, btcQuantity: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="0.00123456"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Euro Pagati</label>
                <input
                  type="number"
                  step="0.01"
                  value={transactionForm.eurPaid}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, eurPaid: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="1000.00"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note (opzionale)</label>
                <input
                  type="text"
                  value={transactionForm.notes}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Note aggiuntive"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddTransaction(false)}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={submitLoading}
              >
                Annulla
              </button>
              <button
                onClick={addTransaction}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                disabled={submitLoading}
              >
                {submitLoading ? 'Aggiungendo...' : 'Aggiungi Transazione'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Transaction Modal */}
      {showEditTransaction && editingTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Modifica Transazione</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                <input
                  type="date"
                  value={transactionForm.date}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <select
                  value={transactionForm.type}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, type: e.target.value as 'buy' | 'sell' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                >
                  <option value="buy">🟢 Acquisto</option>
                  <option value="sell">🔴 Vendita</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Broker</label>
                <input
                  type="text"
                  value={transactionForm.broker}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, broker: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Info</label>
                <input
                  type="text"
                  value={transactionForm.info}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, info: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantità BTC</label>
                <input
                  type="number"
                  step="0.00000001"
                  value={transactionForm.btcQuantity}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, btcQuantity: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Euro Pagati</label>
                <input
                  type="number"
                  step="0.01"
                  value={transactionForm.eurPaid}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, eurPaid: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note</label>
                <input
                  type="text"
                  value={transactionForm.notes}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => {
                  setShowEditTransaction(false)
                  setEditingTransaction(null)
                }}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={submitLoading}
              >
                Annulla
              </button>
              <button
                onClick={editTransaction}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                disabled={submitLoading}
              >
                {submitLoading ? 'Salvando...' : 'Salva Modifiche'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Fee Modal */}
      {showAddFee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Nuova Fee di Rete</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sats</label>
                <input
                  type="number"
                  value={feeForm.sats}
                  onChange={(e) => setFeeForm(prev => ({ ...prev, sats: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="2000"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                <input
                  type="date"
                  value={feeForm.date}
                  onChange={(e) => setFeeForm(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione (opzionale)</label>
                <input
                  type="text"
                  value={feeForm.description}
                  onChange={(e) => setFeeForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="Transfer to cold wallet"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowAddFee(false)}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={submitLoading}
              >
                Annulla
              </button>
              <button
                onClick={addNetworkFee}
                className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
                disabled={submitLoading}
              >
                {submitLoading ? 'Aggiungendo...' : 'Aggiungi Fee'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Portfolio Modal */}
      {showEditPortfolio && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Modifica Portfolio</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome Portfolio</label>
                <input
                  type="text"
                  value={portfolioForm.name}
                  onChange={(e) => setPortfolioForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md"
                  placeholder="DCA Bitcoin 2024"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowEditPortfolio(false)}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
                disabled={submitLoading}
              >
                Annulla
              </button>
              <button
                onClick={updatePortfolio}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                disabled={submitLoading}
              >
                {submitLoading ? 'Salvando...' : 'Salva Modifiche'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Portfolio Modal */}
      {showDeletePortfolio && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4 text-red-600">⚠️ Elimina Portfolio</h3>
            
            <div className="mb-6">
              <p className="text-gray-700 mb-4">
                Sei sicuro di voler eliminare il portfolio <strong>"{portfolio?.name}"</strong>?
              </p>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <p className="text-red-800 text-sm">
                  <strong>Attenzione:</strong> Questa azione eliminerà permanentemente:
                </p>
                <ul className="text-red-700 text-sm mt-2 list-disc list-inside">
                  <li>Tutte le transazioni ({portfolio?.stats.transactionCount || 0})</li>
                  <li>Tutte le fee di rete ({portfolio?.stats.feesCount || 0})</li>
                  <li>Tutti i dati storici del portfolio</li>
                </ul>
                <p className="text-red-800 text-sm mt-2 font-semibold">
                  Questa azione NON può essere annullata.
                </p>
              </div>
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setShowDeletePortfolio(false)}
                className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Annulla
              </button>
              <button
                onClick={deletePortfolio}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
              >
                Elimina Definitivamente
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}