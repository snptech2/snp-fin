// src/app/investments/[id]/page.tsx - VERSIONE COMPLETA CORRETTA CON TUTTI I FIX
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

  // Format functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const formatBTC = (amount: number) => {
    return `${amount.toFixed(8)} BTC`
  }

  const formatSats = (sats: number) => {
    return `${sats.toLocaleString('it-IT')} sats`
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT')
  }

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

  // 🔧 FIX: Add transaction - VALORI SEMPRE POSITIVI
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
          // ✅ FIX: VALORI SEMPRE POSITIVI - L'API gestisce già la logica interna
          btcQuantity: Math.abs(parseFloat(transactionForm.btcQuantity)),
          eurPaid: Math.abs(parseFloat(transactionForm.eurPaid)),
          notes: transactionForm.notes || null
        })
      })

      if (response.ok) {
        await fetchPortfolio()
        setShowAddTransaction(false)
        setTransactionForm({
          date: new Date().toISOString().split('T')[0],
          type: 'buy',
          broker: '',
          info: '',
          btcQuantity: '',
          eurPaid: '',
          notes: ''
        })
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

  // 🔧 FIX: Update transaction - VALORI SEMPRE POSITIVI
  const updateTransaction = async () => {
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
          // ✅ FIX: VALORI SEMPRE POSITIVI
          btcQuantity: Math.abs(parseFloat(transactionForm.btcQuantity)),
          eurPaid: Math.abs(parseFloat(transactionForm.eurPaid)),
          notes: transactionForm.notes || null
        })
      })

      if (response.ok) {
        await fetchPortfolio()
        setShowEditTransaction(false)
        setEditingTransaction(null)
      } else {
        const error = await response.json()
        alert(error.error || 'Errore nell\'aggiornamento della transazione')
      }
    } catch (error) {
      console.error('Errore:', error)
      alert('Errore nell\'aggiornamento della transazione')
    } finally {
      setSubmitLoading(false)
    }
  }

  // Delete transaction
  const deleteTransaction = async (transactionId: number) => {
    if (!confirm('Sei sicuro di voler eliminare questa transazione? Questa azione non può essere annullata.')) return

    try {
      const response = await fetch(`/api/dca-transactions/${transactionId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchPortfolio()
      } else {
        const error = await response.json()
        alert(error.error || 'Errore nell\'eliminazione della transazione')
      }
    } catch (error) {
      console.error('Errore:', error)
      alert('Errore nell\'eliminazione della transazione')
    }
  }

  // Add network fee
  const addNetworkFee = async () => {
    if (!feeForm.sats) {
      alert('Satoshi sono obbligatori')
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
          description: feeForm.description || null
        })
      })

      if (response.ok) {
        await fetchPortfolio()
        setShowAddFee(false)
        setFeeForm({
          sats: '',
          date: new Date().toISOString().split('T')[0],
          description: ''
        })
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
      alert('Nome portfolio obbligatorio')
      return
    }

    try {
      setSubmitLoading(true)
      const response = await fetch(`/api/dca-portfolios/${portfolioId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(portfolioForm)
      })

      if (response.ok) {
        await fetchPortfolio()
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
    if (!confirm('Sei sicuro di voler eliminare questo portfolio? Tutte le transazioni associate verranno eliminate. Questa azione non può essere annullata.')) return

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

  // Edit transaction
  const editTransaction = (transaction: DCATransaction) => {
    setEditingTransaction(transaction)
    setTransactionForm({
      date: transaction.date.split('T')[0],
      type: transaction.type,
      broker: transaction.broker,
      info: transaction.info,
      btcQuantity: Math.abs(transaction.btcQuantity).toString(),
      eurPaid: transaction.eurPaid.toString(),
      notes: transaction.notes || ''
    })
    setShowEditTransaction(true)
  }

  // Calculate additional stats
  const currentValue = portfolio && btcPrice ? portfolio.stats.netBTC * btcPrice.btcEur : 0
  const unrealizedGains = currentValue - (portfolio?.stats.effectiveInvestment || 0)
  const totalGains = (portfolio?.stats.realizedGains || 0) + unrealizedGains
  const totalROI = portfolio?.stats.totalInvested && portfolio.stats.totalInvested > 0 ? 
    (totalGains / portfolio.stats.totalInvested) * 100 : 0

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

  // Get unique values for filters
  const uniqueBrokers = [...new Set(portfolio?.transactions.map(tx => tx.broker) || [])]
  const uniqueTypes = [...new Set(portfolio?.transactions.map(tx => tx.type) || [])]

  useEffect(() => {
    fetchPortfolio()
    fetchBitcoinPrice()
  }, [portfolioId])

  if (loading) {
    return (
      <div className="min-h-screen bg-adaptive flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto mb-4"></div>
          <p className="text-adaptive-600">Caricamento portfolio...</p>
        </div>
      </div>
    )
  }

  if (!portfolio) {
    return (
      <div className="min-h-screen bg-adaptive flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-adaptive-900 mb-4">Portfolio non trovato</h1>
          <Link href="/investments" className="text-orange-600 hover:text-orange-700">
            ← Torna agli investimenti
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-adaptive">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link href="/investments" className="text-orange-600 hover:text-orange-700">
              ← Investimenti
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-adaptive-900">₿ {portfolio.name}</h1>
              <p className="text-adaptive-600">Portfolio DCA Bitcoin</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchBitcoinPrice(true)}
              disabled={priceLoading}
              className={`px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 flex items-center gap-2`}
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
            
            {/* 🔧 AGGIUNTO: Pulsante per le fee sempre visibile */}
            <button
              onClick={() => setShowAddFee(true)}
              className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700 flex items-center gap-2"
            >
              <span className="text-sm">⚡</span>
              Aggiungi Fee
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
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Total Investment */}
          <div className="card-adaptive rounded-lg shadow-sm border-adaptive p-4">
            <h3 className="text-sm font-medium text-adaptive-500">💰 Investimento Totale</h3>
            <p className="text-2xl font-bold text-adaptive-900">{formatCurrency(portfolio.stats.totalInvested)}</p>
            <p className="text-sm text-adaptive-600">{portfolio.stats.buyCount} acquisti</p>
          </div>

          {/* Capital Recovered */}
          <div className="card-adaptive rounded-lg shadow-sm border-adaptive p-4">
            <h3 className="text-sm font-medium text-adaptive-500">🔄 Capitale Recuperato</h3>
            <p className="text-2xl font-bold text-green-600">{formatCurrency(portfolio.stats.capitalRecovered)}</p>
            <div className="flex items-center gap-2">
              <p className="text-sm text-adaptive-600">
                {portfolio.stats.totalInvested > 0 ? 
                  ((portfolio.stats.capitalRecovered / portfolio.stats.totalInvested) * 100).toFixed(1) : 0}%
              </p>
              {portfolio.stats.isFullyRecovered && <span className="text-green-600">✅</span>}
            </div>
          </div>

          {/* Realized Gains */}
          <div className="card-adaptive rounded-lg shadow-sm border-adaptive p-4">
            <h3 className="text-sm font-medium text-adaptive-500">📈 Profitti Realizzati</h3>
            <p className={`text-2xl font-bold ${portfolio.stats.realizedGains >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(portfolio.stats.realizedGains)}
            </p>
            <p className="text-sm text-adaptive-600">{portfolio.stats.sellCount} vendite</p>
          </div>

          {/* Total ROI */}
          <div className="card-adaptive rounded-lg shadow-sm border-adaptive p-4">
            <h3 className="text-sm font-medium text-adaptive-500">🎯 ROI Totale</h3>
            <p className={`text-2xl font-bold ${totalROI >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {totalROI.toFixed(2)}%
            </p>
            <p className="text-sm text-adaptive-600">
              {totalROI >= 0 ? '📈 Profitto' : '📉 Perdita'}
            </p>
          </div>
        </div>

        {/* Bitcoin Price */}
        {btcPrice && (
          <div className="card-adaptive rounded-lg shadow-sm border-adaptive mb-8">
            <div className="p-4 border-b border-adaptive">
              <h3 className="text-lg font-medium text-adaptive-900">₿ Prezzo Bitcoin</h3>
            </div>
            <div className="p-4">
              <div className="flex items-center justify-between">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
                  <div>
                    <p className="text-sm text-adaptive-500">USD</p>
                    <p className="text-xl font-bold text-adaptive-900">${btcPrice.btcUsd.toLocaleString()}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div>
                      <p className="text-sm text-adaptive-500">EUR</p>
                      <p className="text-xl font-bold text-orange-600">{formatCurrency(btcPrice.btcEur)}</p>
                    </div>
                    <span className={`px-2 py-1 rounded-full text-xs ${btcPrice.cached ? 
                      'bg-adaptive-100 text-adaptive-600' : 'bg-green-100 text-green-600'}`}>
                      {btcPrice.cached ? '📋 Cache' : '🔄 Live'}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => fetchBitcoinPrice(true)}
                  disabled={priceLoading}
                  className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
                >
                  {priceLoading ? 'Aggiornando...' : 'Aggiorna'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 🔧 MODIFICATO: Network Fees Summary - SEMPRE VISIBILE */}
        <div className="card-adaptive rounded-lg shadow-sm border-adaptive mb-8">
          <div className="p-4 border-b border-adaptive">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium text-adaptive-900">⚡ Commissioni di Rete</h3>
              <button
                onClick={() => setShowAddFee(true)}
                className="px-3 py-1 bg-yellow-600 text-white rounded text-sm hover:bg-yellow-700"
              >
                ➕ Aggiungi Fee
              </button>
            </div>
          </div>
          <div className="p-4">
            {portfolio.networkFees.length > 0 ? (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                  <div className="text-center">
                    <p className="text-sm text-adaptive-500">Totale Commissioni</p>
                    <p className="text-xl font-bold text-red-600">
                      {formatSats(portfolio.networkFees.reduce((sum, fee) => sum + fee.sats, 0))}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-adaptive-500">Numero di Fee</p>
                    <p className="text-xl font-bold text-adaptive-900">{portfolio.networkFees.length}</p>
                  </div>
                </div>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {portfolio.networkFees.map(fee => (
                    <div key={fee.id} className="flex justify-between items-center p-2 bg-adaptive-50 rounded">
                      <div>
                        <span className="font-medium text-adaptive-900">{formatSats(fee.sats)}</span>
                        {fee.description && <span className="text-adaptive-600 ml-2">- {fee.description}</span>}
                      </div>
                      <span className="text-sm text-adaptive-500">{formatDate(fee.date)}</span>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">⚡</div>
                <h4 className="text-lg font-medium text-adaptive-900 mb-2">Nessuna Fee di Rete</h4>
                <p className="text-adaptive-600 mb-4">Le commissioni di rete per trasferimenti e operazioni on-chain appariranno qui</p>
                <button
                  onClick={() => setShowAddFee(true)}
                  className="px-4 py-2 bg-yellow-600 text-white rounded-lg hover:bg-yellow-700"
                >
                  ⚡ Aggiungi Prima Fee
                </button>
              </div>
            )}
          </div>
        </div>

        {/* 🔄 ENHANCED DETAILED BREAKDOWN */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          {/* Bitcoin Holdings */}
          <div className="card-adaptive rounded-lg shadow-sm border-adaptive p-4">
            <h3 className="text-lg font-medium text-adaptive-900 mb-3">₿ Bitcoin Holdings</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-adaptive-600">BTC Totali:</span>
                <span className="font-semibold text-orange-600">{formatBTC(portfolio.stats.netBTC)}</span>
              </div>
              {portfolio.stats.freeBTCAmount > 0 && (
                <div className="flex justify-between">
                  <span className="text-green-600">🎉 BTC Gratuiti:</span>
                  <span className="font-semibold text-green-600">{formatBTC(portfolio.stats.freeBTCAmount)}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-adaptive-600">Valore Attuale:</span>
                <span className="font-semibold text-adaptive-900">{formatCurrency(currentValue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-adaptive-600">Costo Base Rimasto:</span>
                <span className="font-semibold text-adaptive-700">{formatCurrency(portfolio.stats.remainingCostBasis)}</span>
              </div>
            </div>
          </div>

          {/* Performance Breakdown */}
          <div className="card-adaptive rounded-lg shadow-sm border-adaptive p-4">
            <h3 className="text-lg font-medium text-adaptive-900 mb-3">📊 Performance</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-adaptive-600">Profitti Realizzati:</span>
                <span className={`font-semibold ${portfolio.stats.realizedGains >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(portfolio.stats.realizedGains)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-adaptive-600">Plus/Minus Non Real.:</span>
                <span className={`font-semibold ${unrealizedGains >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(unrealizedGains)}
                </span>
              </div>
              <div className="border-t border-adaptive pt-2 mt-2">
                <div className="flex justify-between">
                  <span className="text-adaptive-900">Totale P&L:</span>
                  <span className={`font-bold ${totalGains >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatCurrency(totalGains)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Investment Status */}
          <div className="card-adaptive rounded-lg shadow-sm border-adaptive p-4">
            <h3 className="text-lg font-medium text-adaptive-900 mb-3">💼 Status Investimento</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-adaptive-600">Soldi a Rischio:</span>
                <span className="font-semibold text-adaptive-900">{formatCurrency(portfolio.stats.effectiveInvestment)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-adaptive-600">ROI Realizzato:</span>
                <span className={`font-semibold ${portfolio.stats.realizedROI >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {portfolio.stats.realizedROI.toFixed(2)}%
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-adaptive-600">Status:</span>
                <span className={`px-2 py-1 rounded-full text-xs ${portfolio.stats.isFullyRecovered ? 
                  'bg-green-100 text-green-600' : 'bg-yellow-100 text-yellow-600'}`}>
                  {portfolio.stats.isFullyRecovered ? '🎉 Recuperato' : '⏳ Attivo'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Transactions List */}
        <div className="card-adaptive rounded-lg shadow-sm border-adaptive">
          <div className="p-4 border-b border-adaptive">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-adaptive-900">📋 Transazioni ({portfolio.transactions.length})</h3>
              <button
                onClick={() => setShowAddTransaction(true)}
                className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-2"
              >
                <PlusIcon className="w-4 h-4" />
                Nuova Transazione
              </button>
            </div>

            {/* Enhanced Filters */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <input
                type="text"
                placeholder="Cerca broker, info, note..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="px-3 py-2 border border-adaptive rounded-md"
              />
              <select
                value={brokerFilter}
                onChange={(e) => setBrokerFilter(e.target.value)}
                className="px-3 py-2 border border-adaptive rounded-md"
              >
                <option value="">Tutti i broker</option>
                {uniqueBrokers.map(broker => (
                  <option key={broker} value={broker}>{broker}</option>
                ))}
              </select>
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="px-3 py-2 border border-adaptive rounded-md"
              >
                <option value="">Tutti i tipi</option>
                {uniqueTypes.map(type => (
                  <option key={type} value={type}>{type === 'buy' ? '🟢 Acquisto' : '🔴 Vendita'}</option>
                ))}
              </select>
              <button
                onClick={() => {
                  setSearchTerm('')
                  setBrokerFilter('')
                  setTypeFilter('')
                }}
                className="px-3 py-2 bg-adaptive-200 text-adaptive-700 rounded-md hover:bg-adaptive-300"
              >
                Rimuovi Filtri
              </button>
            </div>
          </div>

          <div className="overflow-x-auto">
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">📋</div>
                <h3 className="text-lg font-medium text-adaptive-900 mb-2">Nessuna transazione</h3>
                <p className="text-adaptive-600 mb-4">
                  {portfolio.transactions.length === 0 
                    ? 'Inizia aggiungendo la tua prima transazione Bitcoin'
                    : 'Nessuna transazione corrisponde ai filtri applicati'
                  }
                </p>
                {portfolio.transactions.length === 0 && (
                  <button
                    onClick={() => setShowAddTransaction(true)}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                  >
                    ➕ Aggiungi Prima Transazione
                  </button>
                )}
              </div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b border-adaptive bg-adaptive-50">
                    <th className="text-left py-3 px-4 font-medium text-adaptive-700">Data</th>
                    <th className="text-left py-3 px-4 font-medium text-adaptive-700">Tipo</th>
                    <th className="text-left py-3 px-4 font-medium text-adaptive-700">Broker</th>
                    <th className="text-left py-3 px-4 font-medium text-adaptive-700">Info</th>
                    <th className="text-right py-3 px-4 font-medium text-adaptive-700">Quantità BTC</th>
                    <th className="text-right py-3 px-4 font-medium text-adaptive-700">EUR</th>
                    <th className="text-right py-3 px-4 font-medium text-adaptive-700">Prezzo</th>
                    <th className="text-center py-3 px-4 font-medium text-adaptive-700">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map(transaction => (
                    <tr key={transaction.id} className="border-b border-adaptive hover:bg-adaptive-50">
                      <td className="py-3 px-4 text-adaptive-900">
                        {formatDate(transaction.date)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          transaction.type === 'buy' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                        }`}>
                          {transaction.type === 'buy' ? '🟢 Buy' : '🔴 Sell'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-adaptive-900">{transaction.broker}</td>
                      <td className="py-3 px-4 text-adaptive-600">{transaction.info}</td>
                      <td className="py-3 px-4 text-right font-mono text-orange-600">
                        {formatBTC(Math.abs(transaction.btcQuantity))}
                      </td>
                      <td className="py-3 px-4 text-right font-bold text-adaptive-900">
                        {formatCurrency(transaction.eurPaid)}
                      </td>
                      <td className="py-3 px-4 text-right text-adaptive-600">
                        {formatCurrency(transaction.purchasePrice)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center gap-2 justify-center">
                          <button
                            onClick={() => editTransaction(transaction)}
                            className="text-blue-600 hover:text-blue-700"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteTransaction(transaction.id)}
                            className="text-red-600 hover:text-red-700"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Modal Aggiungi Transazione */}
        {showAddTransaction && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="card-adaptive max-w-md w-full mx-4 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-adaptive-900 mb-4">Nuova Transazione</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-adaptive-700 mb-1">Data</label>
                  <input
                    type="date"
                    value={transactionForm.date}
                    onChange={(e) => setTransactionForm(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full p-2 border border-adaptive rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-adaptive-700 mb-1">Tipo</label>
                  <select
                    value={transactionForm.type}
                    onChange={(e) => setTransactionForm(prev => ({ ...prev, type: e.target.value as 'buy' | 'sell' }))}
                    className="w-full p-2 border border-adaptive rounded-md"
                  >
                    <option value="buy">🟢 Acquisto</option>
                    <option value="sell">🔴 Vendita</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-adaptive-700 mb-1">Broker/Exchange</label>
                  <input
                    type="text"
                    value={transactionForm.broker}
                    onChange={(e) => setTransactionForm(prev => ({ ...prev, broker: e.target.value }))}
                    className="w-full p-2 border border-adaptive rounded-md"
                    placeholder="es. Binance, Coinbase, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-adaptive-700 mb-1">Info/Descrizione</label>
                  <input
                    type="text"
                    value={transactionForm.info}
                    onChange={(e) => setTransactionForm(prev => ({ ...prev, info: e.target.value }))}
                    className="w-full p-2 border border-adaptive rounded-md"
                    placeholder="es. DCA settimanale, Regalo, etc."
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-adaptive-700 mb-1">Quantità BTC</label>
                  <input
                    type="number"
                    step="0.00000001"
                    value={transactionForm.btcQuantity}
                    onChange={(e) => setTransactionForm(prev => ({ ...prev, btcQuantity: e.target.value }))}
                    className="w-full p-2 border border-adaptive rounded-md"
                    placeholder="es. 0.01"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-adaptive-700 mb-1">EUR {transactionForm.type === 'buy' ? 'Pagati' : 'Ricevuti'}</label>
                  <input
                    type="number"
                    step="0.01"
                    value={transactionForm.eurPaid}
                    onChange={(e) => setTransactionForm(prev => ({ ...prev, eurPaid: e.target.value }))}
                    className="w-full p-2 border border-adaptive rounded-md"
                    placeholder="es. 500.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-adaptive-700 mb-1">Note (opzionale)</label>
                  <input
                    type="text"
                    value={transactionForm.notes}
                    onChange={(e) => setTransactionForm(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full p-2 border border-adaptive rounded-md"
                    placeholder="es. Verificato, Prelievo cold wallet, etc."
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
                  onClick={addTransaction}
                  disabled={submitLoading}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                >
                  {submitLoading ? 'Salvando...' : 'Salva'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Modifica Transazione */}
        {showEditTransaction && editingTransaction && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="card-adaptive max-w-md w-full mx-4 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-adaptive-900 mb-4">Modifica Transazione</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-adaptive-700 mb-1">Data</label>
                  <input
                    type="date"
                    value={transactionForm.date}
                    onChange={(e) => setTransactionForm(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full p-2 border border-adaptive rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-adaptive-700 mb-1">Tipo</label>
                  <select
                    value={transactionForm.type}
                    onChange={(e) => setTransactionForm(prev => ({ ...prev, type: e.target.value as 'buy' | 'sell' }))}
                    className="w-full p-2 border border-adaptive rounded-md"
                  >
                    <option value="buy">🟢 Acquisto</option>
                    <option value="sell">🔴 Vendita</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-adaptive-700 mb-1">Broker/Exchange</label>
                  <input
                    type="text"
                    value={transactionForm.broker}
                    onChange={(e) => setTransactionForm(prev => ({ ...prev, broker: e.target.value }))}
                    className="w-full p-2 border border-adaptive rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-adaptive-700 mb-1">Info/Descrizione</label>
                  <input
                    type="text"
                    value={transactionForm.info}
                    onChange={(e) => setTransactionForm(prev => ({ ...prev, info: e.target.value }))}
                    className="w-full p-2 border border-adaptive rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-adaptive-700 mb-1">Quantità BTC</label>
                  <input
                    type="number"
                    step="0.00000001"
                    value={transactionForm.btcQuantity}
                    onChange={(e) => setTransactionForm(prev => ({ ...prev, btcQuantity: e.target.value }))}
                    className="w-full p-2 border border-adaptive rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-adaptive-700 mb-1">EUR {transactionForm.type === 'buy' ? 'Pagati' : 'Ricevuti'}</label>
                  <input
                    type="number"
                    step="0.01"
                    value={transactionForm.eurPaid}
                    onChange={(e) => setTransactionForm(prev => ({ ...prev, eurPaid: e.target.value }))}
                    className="w-full p-2 border border-adaptive rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-adaptive-700 mb-1">Note</label>
                  <input
                    type="text"
                    value={transactionForm.notes}
                    onChange={(e) => setTransactionForm(prev => ({ ...prev, notes: e.target.value }))}
                    className="w-full p-2 border border-adaptive rounded-md"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowEditTransaction(false)}
                  className="flex-1 px-4 py-2 border border-adaptive rounded-md text-adaptive-700 hover:bg-adaptive-50"
                >
                  Annulla
                </button>
                <button
                  onClick={updateTransaction}
                  disabled={submitLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitLoading ? 'Salvando...' : 'Salva'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Aggiungi Fee di Rete */}
        {showAddFee && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="card-adaptive max-w-md w-full mx-4 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-adaptive-900 mb-4">⚡ Aggiungi Fee di Rete</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-adaptive-700 mb-1">Satoshi</label>
                  <input
                    type="number"
                    value={feeForm.sats}
                    onChange={(e) => setFeeForm(prev => ({ ...prev, sats: e.target.value }))}
                    className="w-full p-2 border border-adaptive rounded-md"
                    placeholder="es. 2500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-adaptive-700 mb-1">Data</label>
                  <input
                    type="date"
                    value={feeForm.date}
                    onChange={(e) => setFeeForm(prev => ({ ...prev, date: e.target.value }))}
                    className="w-full p-2 border border-adaptive rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-adaptive-700 mb-1">Descrizione (opzionale)</label>
                  <input
                    type="text"
                    value={feeForm.description}
                    onChange={(e) => setFeeForm(prev => ({ ...prev, description: e.target.value }))}
                    className="w-full p-2 border border-adaptive rounded-md"
                    placeholder="es. Prelievo da exchange"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAddFee(false)}
                  className="flex-1 px-4 py-2 border border-adaptive rounded-md text-adaptive-700 hover:bg-adaptive-50"
                >
                  Annulla
                </button>
                <button
                  onClick={addNetworkFee}
                  disabled={submitLoading}
                  className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50"
                >
                  {submitLoading ? 'Salvando...' : 'Salva'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Modifica Portfolio */}
        {showEditPortfolio && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="card-adaptive max-w-md w-full mx-4 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-adaptive-900 mb-4">Modifica Portfolio</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-adaptive-700 mb-1">Nome Portfolio</label>
                  <input
                    type="text"
                    value={portfolioForm.name}
                    onChange={(e) => setPortfolioForm(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full p-2 border border-adaptive rounded-md"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={portfolioForm.isActive}
                    onChange={(e) => setPortfolioForm(prev => ({ ...prev, isActive: e.target.checked }))}
                    className="rounded"
                  />
                  <label htmlFor="isActive" className="text-sm text-adaptive-700">Portfolio attivo</label>
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowEditPortfolio(false)}
                  className="flex-1 px-4 py-2 border border-adaptive rounded-md text-adaptive-700 hover:bg-adaptive-50"
                >
                  Annulla
                </button>
                <button
                  onClick={updatePortfolio}
                  disabled={submitLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitLoading ? 'Salvando...' : 'Salva'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal Conferma Eliminazione */}
        {showDeletePortfolio && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="card-adaptive max-w-md w-full mx-4 rounded-lg p-6">
              <h3 className="text-lg font-semibold text-red-600 mb-4">⚠️ Elimina Portfolio</h3>
              
              <div className="space-y-4">
                <p className="text-adaptive-600">
                  Sei sicuro di voler eliminare il portfolio <strong>{portfolio.name}</strong>?
                </p>
                <p className="text-sm text-red-600">
                  Questa azione eliminerà definitivamente:
                </p>
                <ul className="text-sm text-adaptive-600 ml-4 space-y-1">
                  <li>• Tutte le {portfolio.transactions.length} transazioni</li>
                  <li>• Tutte le {portfolio.networkFees.length} fee di rete</li>
                  <li>• Tutti i dati statistici</li>
                </ul>
                <p className="text-sm font-medium text-red-600">
                  Questa azione NON può essere annullata!
                </p>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowDeletePortfolio(false)}
                  className="flex-1 px-4 py-2 border border-adaptive rounded-md text-adaptive-700 hover:bg-adaptive-50"
                >
                  Annulla
                </button>
                <button
                  onClick={deletePortfolio}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Elimina Definitivamente
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}