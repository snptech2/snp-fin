'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  PlusIcon, 
  ArrowPathIcon,
  PencilIcon,
  TrashIcon,
  Cog6ToothIcon,
  ArrowLeftIcon,
  XMarkIcon
} from '@heroicons/react/24/outline'

interface DCAPortfolio {
  id: number
  name: string
  isActive: boolean
  account: {
    id: number
    name: string
    balance: number
  }
  stats: {
    // 🎯 ENHANCED CASH FLOW FIELDS (source of truth dal backend)
    totalInvested: number
    capitalRecovered: number
    effectiveInvestment: number
    realizedProfit: number
    isFullyRecovered: boolean
    
    // BTC metrics
    totalBTC: number
    netBTC: number
    avgPurchasePrice: number
    
    // Counts
    transactionCount: number
    buyCount: number
    sellCount: number
    
    // Fees
    totalFeesBTC: number
    totalFeesSats: number
    feesCount: number
  }
  transactions: DCATransaction[]
  networkFees?: NetworkFee[]
}

interface DCATransaction {
  id: number
  date: string
  type: 'buy' | 'sell'
  btcQuantity: number
  eurPaid: number
  broker: string
  info: string
  notes?: string
  purchasePrice: number
}

interface NetworkFee {
  id: number
  sats: number
  description: string | null
  date: string
  btcAmount: number
}

interface BitcoinPrice {
  btcUsd: number
  btcEur: number
  cached: boolean
}

export default function DCAPortfolioPage() {
  const params = useParams()
  const router = useRouter()
  const portfolioId = params.id as string

  const [portfolio, setPortfolio] = useState<DCAPortfolio | null>(null)
  const [btcPrice, setBtcPrice] = useState<BitcoinPrice | null>(null)
  const [networkFees, setNetworkFees] = useState<NetworkFee[]>([])
  const [loading, setLoading] = useState(true)
  const [priceLoading, setPriceLoading] = useState(false)
  const [submitLoading, setSubmitLoading] = useState(false)

  // Modals
  const [showAddTransaction, setShowAddTransaction] = useState(false)
  const [showEditTransaction, setShowEditTransaction] = useState(false)
  const [showEditPortfolio, setShowEditPortfolio] = useState(false)
  const [showDeletePortfolio, setShowDeletePortfolio] = useState(false)
  const [showAddFee, setShowAddFee] = useState(false)
  const [showEditFee, setShowEditFee] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<DCATransaction | null>(null)
  const [editingFee, setEditingFee] = useState<NetworkFee | null>(null)

  // Forms
  const [transactionForm, setTransactionForm] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'buy' as 'buy' | 'sell',
    broker: '',
    info: '',
    btcQuantity: '',
    eurPaid: '',
    notes: ''
  })

  const [portfolioForm, setPortfolioForm] = useState({
    name: '',
    isActive: true
  })

  const [feeForm, setFeeForm] = useState({
    sats: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    fetchPortfolio()
    fetchNetworkFees()
    fetchBitcoinPrice()
  }, [portfolioId])

  useEffect(() => {
    if (portfolio) {
      setPortfolioForm({
        name: portfolio.name,
        isActive: portfolio.isActive
      })
    }
  }, [portfolio])

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

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
  }

  // Fetch functions
  const fetchPortfolio = async () => {
    try {
      const response = await fetch(`/api/dca-portfolios/${portfolioId}`)
      if (response.ok) {
        const data = await response.json()
        setPortfolio(data)
      } else {
        console.error('Portfolio non trovato')
        router.push('/investments')
      }
    } catch (error) {
      console.error('Errore nel caricamento portfolio:', error)
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
      console.error('Errore nel recupero prezzo Bitcoin:', error)
    } finally {
      setPriceLoading(false)
    }
  }

  const fetchNetworkFees = async () => {
    try {
      const response = await fetch(`/api/network-fees?portfolioId=${portfolioId}`)
      if (response.ok) {
        const fees = await response.json()
        setNetworkFees(fees)
      }
    } catch (error) {
      console.error('Errore nel caricamento fee di rete:', error)
    }
  }

  // Transaction functions
  const addTransaction = async () => {
    if (!transactionForm.btcQuantity.trim() || !transactionForm.eurPaid.trim()) {
      alert('BTC e EUR sono obbligatori')
      return
    }

    try {
      setSubmitLoading(true)
      const response = await fetch('/api/dca-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portfolioId: parseInt(portfolioId),
          type: transactionForm.type,
          btcQuantity: parseFloat(transactionForm.btcQuantity) * (transactionForm.type === 'sell' ? -1 : 1),
          eurPaid: parseFloat(transactionForm.eurPaid),
          broker: transactionForm.broker.trim(),
          info: transactionForm.info.trim(),
          notes: transactionForm.notes.trim() || null,
          date: transactionForm.date
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
        alert(error.error || 'Errore nella creazione transazione')
      }
    } catch (error) {
      console.error('Errore:', error)
      alert('Errore nella creazione transazione')
    } finally {
      setSubmitLoading(false)
    }
  }

  const updateTransaction = async () => {
    if (!editingTransaction || !transactionForm.btcQuantity.trim() || !transactionForm.eurPaid.trim()) {
      alert('BTC e EUR sono obbligatori')
      return
    }

    try {
      setSubmitLoading(true)
      const response = await fetch(`/api/dca-transactions/${editingTransaction.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: transactionForm.type,
          btcQuantity: parseFloat(transactionForm.btcQuantity) * (transactionForm.type === 'sell' ? -1 : 1),
          eurPaid: parseFloat(transactionForm.eurPaid),
          broker: transactionForm.broker.trim(),
          info: transactionForm.info.trim(),
          notes: transactionForm.notes.trim() || null,
          date: transactionForm.date
        })
      })

      if (response.ok) {
        await fetchPortfolio()
        setShowEditTransaction(false)
        setEditingTransaction(null)
      } else {
        const error = await response.json()
        alert(error.error || 'Errore nell\'aggiornamento transazione')
      }
    } catch (error) {
      console.error('Errore:', error)
      alert('Errore nell\'aggiornamento transazione')
    } finally {
      setSubmitLoading(false)
    }
  }

  const deleteTransaction = async (transactionId: number) => {
    if (!confirm('Sei sicuro di voler eliminare questa transazione?')) return

    try {
      const response = await fetch(`/api/dca-transactions/${transactionId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchPortfolio()
      } else {
        const error = await response.json()
        alert(error.error || 'Errore nell\'eliminazione transazione')
      }
    } catch (error) {
      console.error('Errore:', error)
      alert('Errore nell\'eliminazione transazione')
    }
  }

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

  // Network Fee functions
  const addNetworkFee = async () => {
    if (!feeForm.sats.trim()) {
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
          description: feeForm.description.trim() || null,
          date: feeForm.date
        })
      })

      if (response.ok) {
        await fetchNetworkFees()
        await fetchPortfolio() // Refresh portfolio per aggiornare netBTC
        setShowAddFee(false)
        setFeeForm({ sats: '', description: '', date: new Date().toISOString().split('T')[0] })
      } else {
        const error = await response.json()
        alert(error.error || 'Errore nella creazione fee di rete')
      }
    } catch (error) {
      console.error('Errore:', error)
      alert('Errore nella creazione fee di rete')
    } finally {
      setSubmitLoading(false)
    }
  }

  const updateNetworkFee = async () => {
    if (!editingFee || !feeForm.sats.trim()) {
      alert('Il campo sats è obbligatorio')
      return
    }

    try {
      setSubmitLoading(true)
      const response = await fetch(`/api/network-fees/${editingFee.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sats: parseInt(feeForm.sats),
          description: feeForm.description.trim() || null,
          date: feeForm.date
        })
      })

      if (response.ok) {
        await fetchNetworkFees()
        await fetchPortfolio() // Refresh portfolio per aggiornare netBTC
        setShowEditFee(false)
        setEditingFee(null)
        setFeeForm({ sats: '', description: '', date: new Date().toISOString().split('T')[0] })
      } else {
        const error = await response.json()
        alert(error.error || 'Errore nell\'aggiornamento fee di rete')
      }
    } catch (error) {
      console.error('Errore:', error)
      alert('Errore nell\'aggiornamento fee di rete')
    } finally {
      setSubmitLoading(false)
    }
  }

  const deleteNetworkFee = async (feeId: number) => {
    if (!confirm('Sei sicuro di voler eliminare questa fee di rete?')) return

    try {
      const response = await fetch(`/api/network-fees/${feeId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchNetworkFees()
        await fetchPortfolio() // Refresh portfolio per aggiornare netBTC
      } else {
        const error = await response.json()
        alert(error.error || 'Errore nell\'eliminazione fee di rete')
      }
    } catch (error) {
      console.error('Errore:', error)
      alert('Errore nell\'eliminazione fee di rete')
    }
  }

  const editFee = (fee: NetworkFee) => {
    setEditingFee(fee)
    setFeeForm({
      sats: fee.sats.toString(),
      description: fee.description || '',
      date: fee.date.split('T')[0]
    })
    setShowEditFee(true)
  }

  // Portfolio actions
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
        body: JSON.stringify(portfolioForm)
      })

      if (response.ok) {
        await fetchPortfolio()
        setShowEditPortfolio(false)
      } else {
        const error = await response.json()
        alert(error.error || 'Errore nell\'aggiornamento portfolio')
      }
    } catch (error) {
      console.error('Errore:', error)
      alert('Errore nell\'aggiornamento portfolio')
    } finally {
      setSubmitLoading(false)
    }
  }

  const deletePortfolio = async () => {
    if (!confirm('Sei sicuro di voler eliminare questo portfolio? Tutte le transazioni e fee associate verranno eliminate. Questa azione non può essere annullata.')) return

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

  // 🎯 FASE 1 FIX: Usa SOLO Enhanced stats dal backend, rimuovi calcoli duplicati
  const currentValue = portfolio && btcPrice ? portfolio.stats.netBTC * btcPrice.btcEur : 0
  const unrealizedGains = currentValue - (portfolio?.stats.effectiveInvestment || 0)
  const totalGains = (portfolio?.stats.realizedProfit || 0) + unrealizedGains
  const totalROI = portfolio?.stats.totalInvested && portfolio.stats.totalInvested > 0 ?
    (totalGains / portfolio.stats.totalInvested) * 100 : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-orange-600"></div>
      </div>
    )
  }

  if (!portfolio) {
    return (
      <div className="container mx-auto px-6 py-8">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-adaptive-900">Portfolio non trovato</h1>
          <Link href="/investments" className="text-blue-600 hover:underline">
            Torna agli investimenti
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <Link href="/investments">
            <button className="p-2 text-adaptive-600 hover:bg-adaptive-100 rounded">
              <ArrowLeftIcon className="w-5 h-5" />
            </button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-adaptive-900">{portfolio.name}</h1>
            <p className="text-adaptive-600">Portfolio DCA Bitcoin</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddTransaction(true)}
            className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 flex items-center gap-2"
          >
            <PlusIcon className="w-4 h-4" />
            Nuova Transazione
          </button>
          <button
            onClick={fetchBitcoinPrice}
            disabled={priceLoading}
            className="p-2 text-adaptive-600 hover:bg-adaptive-100 rounded"
          >
            <ArrowPathIcon className={`w-5 h-5 ${priceLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowEditPortfolio(true)}
            className="p-2 text-adaptive-600 hover:bg-adaptive-100 rounded"
          >
            <Cog6ToothIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Enhanced Cash Flow Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {/* Total Invested */}
        <div className="card-adaptive rounded-lg shadow-sm border-adaptive p-4">
          <h3 className="text-sm font-medium text-adaptive-500">💰 Totale Investito</h3>
          <p className="text-2xl font-bold text-adaptive-900">
            {formatCurrency(portfolio.stats.totalInvested)}
          </p>
          <p className="text-sm text-adaptive-600">{portfolio.stats.buyCount} acquisti</p>
        </div>

        {/* Capital Recovered */}
        <div className="card-adaptive rounded-lg shadow-sm border-adaptive p-4">
          <h3 className="text-sm font-medium text-adaptive-500">🔄 Capitale Recuperato</h3>
          <p className="text-2xl font-bold text-blue-600">
            {formatCurrency(portfolio.stats.capitalRecovered)}
          </p>
          <div className="flex items-center gap-2 text-sm text-adaptive-600">
            <span>
              {portfolio.stats.totalInvested > 0 ? 
                ((portfolio.stats.capitalRecovered / portfolio.stats.totalInvested) * 100).toFixed(1) : 0}%
            </span>
            {portfolio.stats.isFullyRecovered && <span className="text-green-600">✅</span>}
          </div>
        </div>

        {/* Effective Investment */}
        <div className="card-adaptive rounded-lg shadow-sm border-adaptive p-4">
          <h3 className="text-sm font-medium text-adaptive-500">⚠️ Soldi a Rischio</h3>
          <p className="text-2xl font-bold text-orange-600">
            {formatCurrency(portfolio.stats.effectiveInvestment)}
          </p>
          <p className="text-sm text-adaptive-600">
            {portfolio.stats.isFullyRecovered ? '🎉 Investimento gratis!' : 'Non ancora recuperato'}
          </p>
        </div>

        {/* Total ROI */}
        <div className="card-adaptive rounded-lg shadow-sm border-adaptive p-4">
          <h3 className="text-sm font-medium text-adaptive-500">🎯 ROI Totale</h3>
          <p className={`text-2xl font-bold ${totalROI >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatPercentage(totalROI)}
          </p>
          <p className="text-sm text-adaptive-600">
            {totalROI >= 0 ? 'Profitto' : 'Perdita'}
          </p>
        </div>
      </div>

      {/* Holdings Bitcoin */}
      <div className="card-adaptive rounded-lg shadow-sm border-adaptive mb-8">
        <div className="p-6 border-b border-adaptive">
          <h2 className="text-lg font-semibold text-adaptive-900">₿ Holdings Bitcoin</h2>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-adaptive-600">BTC Netti:</span>
                <span className="font-mono font-bold">{formatBTC(portfolio.stats.netBTC)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-adaptive-600">Prezzo Medio:</span>
                <span className="font-bold">{formatCurrency(portfolio.stats.avgPurchasePrice)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-adaptive-600">Valore Attuale:</span>
                <span className="font-bold text-green-600">{formatCurrency(currentValue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-adaptive-600">Plus/Minus Non Real.:</span>
                <span className={`font-bold ${unrealizedGains >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(unrealizedGains)}
                </span>
              </div>
            </div>

            {/* Bitcoin Price */}
            <div className="card-adaptive rounded-lg p-4">
              <h3 className="text-sm font-medium text-adaptive-500 mb-2">₿ Prezzo Bitcoin</h3>
              {btcPrice ? (
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">USD</span>
                    <span className="font-mono">${btcPrice.btcUsd.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm">EUR</span>
                    <span className="font-mono text-lg font-bold text-orange-600">
                      {formatCurrency(btcPrice.btcEur)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`text-xs px-2 py-1 rounded ${btcPrice.cached ? 'bg-gray-100 text-gray-600' : 'bg-green-100 text-green-600'}`}>
                      {btcPrice.cached ? '💾 Cache' : '🔄 Live'}
                    </span>
                    <button
                      onClick={fetchBitcoinPrice}
                      className="text-xs px-2 py-1 bg-orange-600 text-white rounded hover:bg-orange-700"
                    >
                      🔄 Aggiorna
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-adaptive-600">Caricamento prezzo...</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Riepilogo P&L */}
      <div className="card-adaptive rounded-lg shadow-sm border-adaptive mb-8">
        <div className="p-6 border-b border-adaptive">
          <h2 className="text-lg font-semibold text-adaptive-900">📊 Riepilogo P&L</h2>
        </div>
        
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-sm text-adaptive-500 mb-1">Profitti Realizzati</div>
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(portfolio.stats.realizedProfit)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-adaptive-500 mb-1">Plus/Minus Non Realizzati</div>
              <div className={`text-2xl font-bold ${unrealizedGains >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(unrealizedGains)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-sm text-adaptive-500 mb-1">Totale P&L</div>
              <div className={`text-2xl font-bold ${totalGains >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrency(totalGains)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Transazioni */}
      <div className="card-adaptive rounded-lg shadow-sm border-adaptive mb-8">
        <div className="p-6 border-b border-adaptive">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-adaptive-900">📋 Transazioni ({portfolio.transactions.length})</h2>
            <button
              onClick={() => setShowAddTransaction(true)}
              className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 flex items-center gap-2"
            >
              <PlusIcon className="w-4 h-4" />
              Aggiungi
            </button>
          </div>
        </div>

        <div className="p-6">
          {portfolio.transactions.length === 0 ? (
            <div className="text-center py-8 text-adaptive-600">
              <div className="text-4xl mb-2">📋</div>
              <p>Nessuna transazione ancora</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-adaptive">
                    <th className="text-left py-3 px-4 font-medium text-adaptive-700">Data</th>
                    <th className="text-left py-3 px-4 font-medium text-adaptive-700">Tipo</th>
                    <th className="text-right py-3 px-4 font-medium text-adaptive-700">BTC</th>
                    <th className="text-right py-3 px-4 font-medium text-adaptive-700">EUR</th>
                    <th className="text-right py-3 px-4 font-medium text-adaptive-700">Prezzo</th>
                    <th className="text-left py-3 px-4 font-medium text-adaptive-700">Broker</th>
                    <th className="text-center py-3 px-4 font-medium text-adaptive-700">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolio.transactions.map(transaction => (
                    <tr key={transaction.id} className="border-b border-adaptive hover:bg-adaptive-50">
                      <td className="py-3 px-4">
                        {new Date(transaction.date).toLocaleDateString('it-IT')}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                          transaction.type === 'buy' 
                            ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                        }`}>
                          {transaction.type === 'buy' ? '📈 Buy' : '📉 Sell'}
                        </span>
                      </td>
                      <td className="text-right py-3 px-4 font-mono">
                        {formatBTC(Math.abs(transaction.btcQuantity))}
                      </td>
                      <td className="text-right py-3 px-4 font-semibold">
                        {formatCurrency(transaction.eurPaid)}
                      </td>
                      <td className="text-right py-3 px-4">
                        {formatCurrency(transaction.purchasePrice)}
                      </td>
                      <td className="py-3 px-4 text-adaptive-600">
                        {transaction.broker}
                      </td>
                      <td className="text-center py-3 px-4">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => editTransaction(transaction)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteTransaction(transaction.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
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

      {/* Network Fees Section */}
      <div className="card-adaptive rounded-lg shadow-sm border-adaptive mb-8">
        <div className="p-6 border-b border-adaptive">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-adaptive-900">⚡ Fee di Rete ({networkFees.length})</h2>
            <button
              onClick={() => setShowAddFee(true)}
              className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 flex items-center gap-2"
            >
              <PlusIcon className="w-4 h-4" />
              Aggiungi Fee
            </button>
          </div>
        </div>

        <div className="p-6">
          {networkFees.length === 0 ? (
            <div className="text-center py-8 text-adaptive-600">
              <div className="text-4xl mb-2">⚡</div>
              <p>Nessuna fee di rete registrata</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-adaptive">
                    <th className="text-left py-3 px-4 font-medium text-adaptive-700">Data</th>
                    <th className="text-right py-3 px-4 font-medium text-adaptive-700">Sats</th>
                    <th className="text-right py-3 px-4 font-medium text-adaptive-700">BTC</th>
                    <th className="text-left py-3 px-4 font-medium text-adaptive-700">Descrizione</th>
                    <th className="text-center py-3 px-4 font-medium text-adaptive-700">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {networkFees.map(fee => (
                    <tr key={fee.id} className="border-b border-adaptive hover:bg-adaptive-50">
                      <td className="py-3 px-4">
                        {new Date(fee.date).toLocaleDateString('it-IT')}
                      </td>
                      <td className="text-right py-3 px-4 font-mono">
                        {fee.sats.toLocaleString()} sats
                      </td>
                      <td className="text-right py-3 px-4 font-mono">
                        {formatBTC(fee.btcAmount)}
                      </td>
                      <td className="py-3 px-4 text-adaptive-600">
                        {fee.description || 'N/A'}
                      </td>
                      <td className="text-center py-3 px-4">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => editFee(fee)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteNetworkFee(fee.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
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

      {/* Modal: Add Transaction */}
      {showAddTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="card-adaptive rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-adaptive-900">Nuova Transazione</h3>
              <button
                onClick={() => setShowAddTransaction(false)}
                className="text-adaptive-500 hover:text-adaptive-700"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">Data</label>
                <input
                  type="date"
                  value={transactionForm.date}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, date: e.target.value }))}
                  className="input-adaptive w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">Tipo</label>
                <select
                  value={transactionForm.type}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, type: e.target.value as 'buy' | 'sell' }))}
                  className="input-adaptive w-full"
                >
                  <option value="buy">Buy</option>
                  <option value="sell">Sell</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">Quantità BTC</label>
                <input
                  type="number"
                  step="0.00000001"
                  value={transactionForm.btcQuantity}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, btcQuantity: e.target.value }))}
                  className="input-adaptive w-full"
                  placeholder="0.00100000"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">Importo EUR</label>
                <input
                  type="number"
                  step="0.01"
                  value={transactionForm.eurPaid}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, eurPaid: e.target.value }))}
                  className="input-adaptive w-full"
                  placeholder="100.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">Broker</label>
                <input
                  type="text"
                  value={transactionForm.broker}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, broker: e.target.value }))}
                  className="input-adaptive w-full"
                  placeholder="es. Binance"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">Info/Descrizione</label>
                <input
                  type="text"
                  value={transactionForm.info}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, info: e.target.value }))}
                  className="input-adaptive w-full"
                  placeholder="es. DCA mensile"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">Note (opzionale)</label>
                <input
                  type="text"
                  value={transactionForm.notes}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="input-adaptive w-full"
                  placeholder="Note aggiuntive..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowAddTransaction(false)}
                  className="flex-1 px-4 py-2 text-adaptive-600 border border-adaptive-300 rounded-md hover:bg-adaptive-50"
                >
                  Annulla
                </button>
                <button
                  onClick={addTransaction}
                  disabled={!transactionForm.btcQuantity.trim() || !transactionForm.eurPaid.trim() || submitLoading}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
                >
                  {submitLoading ? 'Creazione...' : 'Crea Transazione'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Transaction */}
      {showEditTransaction && editingTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="card-adaptive rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-adaptive-900">Modifica Transazione</h3>
              <button
                onClick={() => setShowEditTransaction(false)}
                className="text-adaptive-500 hover:text-adaptive-700"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">Data</label>
                <input
                  type="date"
                  value={transactionForm.date}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, date: e.target.value }))}
                  className="input-adaptive w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">Tipo</label>
                <select
                  value={transactionForm.type}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, type: e.target.value as 'buy' | 'sell' }))}
                  className="input-adaptive w-full"
                >
                  <option value="buy">Buy</option>
                  <option value="sell">Sell</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">Quantità BTC</label>
                <input
                  type="number"
                  step="0.00000001"
                  value={transactionForm.btcQuantity}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, btcQuantity: e.target.value }))}
                  className="input-adaptive w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">Importo EUR</label>
                <input
                  type="number"
                  step="0.01"
                  value={transactionForm.eurPaid}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, eurPaid: e.target.value }))}
                  className="input-adaptive w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">Broker</label>
                <input
                  type="text"
                  value={transactionForm.broker}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, broker: e.target.value }))}
                  className="input-adaptive w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">Info/Descrizione</label>
                <input
                  type="text"
                  value={transactionForm.info}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, info: e.target.value }))}
                  className="input-adaptive w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">Note (opzionale)</label>
                <input
                  type="text"
                  value={transactionForm.notes}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="input-adaptive w-full"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowEditTransaction(false)}
                  className="flex-1 px-4 py-2 text-adaptive-600 border border-adaptive-300 rounded-md hover:bg-adaptive-50"
                >
                  Annulla
                </button>
                <button
                  onClick={updateTransaction}
                  disabled={!transactionForm.btcQuantity.trim() || !transactionForm.eurPaid.trim() || submitLoading}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
                >
                  {submitLoading ? 'Aggiornamento...' : 'Aggiorna'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Add Network Fee */}
      {showAddFee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="card-adaptive rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-adaptive-900">Nuova Fee di Rete</h3>
              <button
                onClick={() => setShowAddFee(false)}
                className="text-adaptive-500 hover:text-adaptive-700"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">Data</label>
                <input
                  type="date"
                  value={feeForm.date}
                  onChange={(e) => setFeeForm(prev => ({ ...prev, date: e.target.value }))}
                  className="input-adaptive w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">Sats</label>
                <input
                  type="number"
                  value={feeForm.sats}
                  onChange={(e) => setFeeForm(prev => ({ ...prev, sats: e.target.value }))}
                  className="input-adaptive w-full"
                  placeholder="es. 1000"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">Descrizione (opzionale)</label>
                <input
                  type="text"
                  value={feeForm.description}
                  onChange={(e) => setFeeForm(prev => ({ ...prev, description: e.target.value }))}
                  className="input-adaptive w-full"
                  placeholder="es. Fee trasferimento wallet"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowAddFee(false)}
                  className="flex-1 px-4 py-2 text-adaptive-600 border border-adaptive-300 rounded-md hover:bg-adaptive-50"
                >
                  Annulla
                </button>
                <button
                  onClick={addNetworkFee}
                  disabled={!feeForm.sats.trim() || submitLoading}
                  className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50"
                >
                  {submitLoading ? 'Creazione...' : 'Crea Fee'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Network Fee */}
      {showEditFee && editingFee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="card-adaptive rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-adaptive-900">Modifica Fee di Rete</h3>
              <button
                onClick={() => setShowEditFee(false)}
                className="text-adaptive-500 hover:text-adaptive-700"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">Data</label>
                <input
                  type="date"
                  value={feeForm.date}
                  onChange={(e) => setFeeForm(prev => ({ ...prev, date: e.target.value }))}
                  className="input-adaptive w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">Sats</label>
                <input
                  type="number"
                  value={feeForm.sats}
                  onChange={(e) => setFeeForm(prev => ({ ...prev, sats: e.target.value }))}
                  className="input-adaptive w-full"
                  placeholder="es. 1000"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">Descrizione (opzionale)</label>
                <input
                  type="text"
                  value={feeForm.description}
                  onChange={(e) => setFeeForm(prev => ({ ...prev, description: e.target.value }))}
                  className="input-adaptive w-full"
                  placeholder="es. Fee trasferimento wallet"
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowEditFee(false)}
                  className="flex-1 px-4 py-2 text-adaptive-600 border border-adaptive-300 rounded-md hover:bg-adaptive-50"
                >
                  Annulla
                </button>
                <button
                  onClick={updateNetworkFee}
                  disabled={!feeForm.sats.trim() || submitLoading}
                  className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50"
                >
                  {submitLoading ? 'Aggiornamento...' : 'Aggiorna Fee'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Edit Portfolio */}
      {showEditPortfolio && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="card-adaptive rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-semibold text-adaptive-900">Modifica Portfolio</h3>
              <button
                onClick={() => setShowEditPortfolio(false)}
                className="text-adaptive-500 hover:text-adaptive-700"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">Nome Portfolio</label>
                <input
                  type="text"
                  value={portfolioForm.name}
                  onChange={(e) => setPortfolioForm(prev => ({ ...prev, name: e.target.value }))}
                  className="input-adaptive w-full"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={portfolioForm.isActive}
                  onChange={(e) => setPortfolioForm(prev => ({ ...prev, isActive: e.target.checked }))}
                  className="mr-2"
                />
                <label htmlFor="isActive" className="text-sm text-adaptive-700">Portfolio attivo</label>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowEditPortfolio(false)}
                  className="flex-1 px-4 py-2 text-adaptive-600 border border-adaptive-300 rounded-md hover:bg-adaptive-50"
                >
                  Annulla
                </button>
                <button
                  onClick={updatePortfolio}
                  disabled={!portfolioForm.name.trim() || submitLoading}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
                >
                  {submitLoading ? 'Aggiornamento...' : 'Aggiorna'}
                </button>
              </div>

              <div className="pt-4 border-t border-adaptive">
                <button
                  onClick={() => setShowDeletePortfolio(true)}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  🗑️ Elimina Portfolio
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Confirm Delete Portfolio */}
      {showDeletePortfolio && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="card-adaptive rounded-lg p-6 w-full max-w-md mx-4">
            <div className="text-center">
              <div className="text-4xl mb-4">⚠️</div>
              <h3 className="text-lg font-semibold text-adaptive-900 mb-2">Conferma Eliminazione</h3>
              <p className="text-adaptive-600 mb-6">
                Sei sicuro di voler eliminare questo portfolio? 
                Tutte le transazioni e fee associate verranno eliminate permanentemente.
              </p>
              
              <div className="flex gap-3">
                <button
                  onClick={() => setShowDeletePortfolio(false)}
                  className="flex-1 px-4 py-2 text-adaptive-600 border border-adaptive-300 rounded-md hover:bg-adaptive-50"
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
        </div>
      )}
    </div>
  )
}