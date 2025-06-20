'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  PlusIcon, PencilIcon, TrashIcon, FunnelIcon, MagnifyingGlassIcon,
  ChevronLeftIcon, ChevronRightIcon, CheckIcon, CalendarIcon,
  CurrencyEuroIcon, ArrowPathIcon, ExclamationTriangleIcon
} from '@heroicons/react/24/outline'

interface DCATransaction {
  id: number
  date: string
  type: string
  broker: string
  info: string
  btcQuantity: number
  eurPaid: number
  notes?: string
}

interface NetworkFee {
  id: number
  sats: number
  date: string
  description?: string
}

interface DCAPortfolio {
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

export default function DCAPortfolioPage() {
  const params = useParams()
  const router = useRouter()
  const portfolioId = params.id as string

  // Stato principale
  const [portfolio, setPortfolio] = useState<DCAPortfolio | null>(null)
  const [loading, setLoading] = useState(true)
  const [btcPrice, setBtcPrice] = useState<BitcoinPrice | null>(null)
  const [priceLoading, setPriceLoading] = useState(false)

  // Transazioni e filtri
  const [filteredTransactions, setFilteredTransactions] = useState<DCATransaction[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [brokerFilter, setBrokerFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')
  const [selectedTransactions, setSelectedTransactions] = useState<number[]>([])

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

  // Carica portfolio
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

  // Carica prezzo Bitcoin
  const fetchBitcoinPrice = async (forceRefresh = false) => {
    try {
      setPriceLoading(true)
      const url = forceRefresh ? '/api/bitcoin-price?refresh=true' : '/api/bitcoin-price'
      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setBtcPrice(data)
      }
    } catch (error) {
      console.error('Errore nel caricamento del prezzo Bitcoin:', error)
    } finally {
      setPriceLoading(false)
    }
  }

  // Cancella portfolio
  const deletePortfolio = async () => {
    try {
      const response = await fetch(`/api/dca-portfolios/${portfolioId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        router.push('/investments')
      } else {
        const error = await response.json()
        alert(error.error || 'Errore nella cancellazione del portfolio')
      }
    } catch (error) {
      console.error('Errore:', error)
      alert('Errore nella cancellazione del portfolio')
    }
  }

  // Aggiorna portfolio
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
          name: portfolioForm.name,
          isActive: portfolioForm.isActive
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

  // Aggiungi transazione
  const addTransaction = async () => {
    if (!transactionForm.broker || !transactionForm.info || !transactionForm.btcQuantity || !transactionForm.eurPaid) {
      alert('Compila tutti i campi obbligatori')
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
          btcQuantity: transactionForm.type === 'sell' ? 
            -Math.abs(parseFloat(transactionForm.btcQuantity)) : 
            Math.abs(parseFloat(transactionForm.btcQuantity)),
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

  // Modifica transazione
  const updateTransaction = async () => {
    if (!editingTransaction) return

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
          btcQuantity: transactionForm.type === 'sell' ? 
            -Math.abs(parseFloat(transactionForm.btcQuantity)) : 
            Math.abs(parseFloat(transactionForm.btcQuantity)),
          eurPaid: parseFloat(transactionForm.eurPaid),
          notes: transactionForm.notes || undefined
        })
      })

      if (response.ok) {
        fetchPortfolio()
        setShowEditTransaction(false)
        setEditingTransaction(null)
      } else {
        const error = await response.json()
        alert(error.error || 'Errore nell\'aggiornamento della transazione')
      }
    } catch (error) {
      console.error('Errore:', error)
    } finally {
      setSubmitLoading(false)
    }
  }

  // Cancella transazione
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

  // Aggiungi fee di rete
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

  // Gestione selezione multipla
  const handleBulkDeleteTransactions = async () => {
    if (selectedTransactions.length === 0) return
    if (!confirm(`Sei sicuro di voler eliminare ${selectedTransactions.length} transazioni?`)) return

    try {
      for (const id of selectedTransactions) {
        await fetch(`/api/dca-transactions/${id}`, { method: 'DELETE' })
      }
      setSelectedTransactions([])
      fetchPortfolio()
    } catch (error) {
      console.error('Errore nell\'eliminazione multipla:', error)
    }
  }

  // Formattazione
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

  // Calcoli
  const currentValue = portfolio && btcPrice ? portfolio.stats.netBTC * btcPrice.btcEur : 0
  const roi = portfolio && currentValue ? ((currentValue - portfolio.stats.totalEUR) / portfolio.stats.totalEUR) * 100 : 0
  const avgLoadPrice = portfolio && portfolio.stats.netBTC > 0 ? portfolio.stats.totalEUR / portfolio.stats.netBTC : 0

  // Filtri transazioni
  useEffect(() => {
    if (!portfolio) return

    let filtered = [...portfolio.transactions]

    if (searchTerm) {
      filtered = filtered.filter(t => 
        t.broker.toLowerCase().includes(searchTerm.toLowerCase()) ||
        t.info.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (t.notes && t.notes.toLowerCase().includes(searchTerm.toLowerCase()))
      )
    }

    if (brokerFilter) {
      filtered = filtered.filter(t => t.broker === brokerFilter)
    }

    if (typeFilter) {
      filtered = filtered.filter(t => t.type === typeFilter)
    }

    setFilteredTransactions(filtered)
  }, [portfolio, searchTerm, brokerFilter, typeFilter])

  // Unique values per filtri
  const uniqueBrokers = portfolio ? [...new Set(portfolio.transactions.map(t => t.broker))] : []
  const uniqueTypes = portfolio ? [...new Set(portfolio.transactions.map(t => t.type))] : []

  // Carica dati iniziali
  useEffect(() => {
    fetchPortfolio()
    fetchBitcoinPrice()
  }, [portfolioId])

  // Loading state
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
            <button
              onClick={() => setShowEditPortfolio(true)}
              className="text-white opacity-80 hover:opacity-100 p-1"
              title="Modifica portfolio"
            >
              <PencilIcon className="w-5 h-5" />
            </button>
          </div>
          <p className="text-white opacity-80">Portfolio DCA Bitcoin</p>
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
            onClick={() => setShowDeletePortfolio(true)}
            className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 flex items-center gap-2"
            title="Elimina portfolio"
          >
            <TrashIcon className="w-4 h-4" />
            Elimina Portfolio
          </button>
        </div>
      </div>

      {/* Prezzo Bitcoin */}
      {btcPrice && (
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-400">Prezzo Bitcoin</h3>
              <p className="text-2xl font-bold text-orange-400">{formatCurrency(btcPrice.btcEur)}</p>
              <p className="text-sm text-gray-300">
                ${btcPrice.btcUsd.toLocaleString()} USD
                {btcPrice.cached && <span className="ml-2 text-orange-500">(Cache)</span>}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-400">Ultimo aggiornamento</p>
              <p className="text-sm text-gray-300">
                {new Date().toLocaleTimeString('it-IT')}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Statistiche Portfolio */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <h3 className="text-sm font-medium text-gray-400">BTC Totali</h3>
          <p className="text-2xl font-bold text-orange-400">{formatBTC(portfolio.stats.totalBTC)}</p>
          <p className="text-sm text-gray-300">{portfolio.stats.transactionCount} transazioni</p>
        </div>
        
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <h3 className="text-sm font-medium text-gray-400">Investimento Totale</h3>
          <p className="text-2xl font-bold text-blue-400">{formatCurrency(portfolio.stats.totalEUR)}</p>
          <p className="text-sm text-gray-300">Costo medio: {formatCurrency(avgLoadPrice)}/BTC</p>
        </div>
        
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <h3 className="text-sm font-medium text-gray-400">Valore Attuale</h3>
          <p className="text-2xl font-bold text-green-400">{formatCurrency(currentValue)}</p>
          <p className="text-sm text-gray-300">BTC netti: {formatBTC(portfolio.stats.netBTC)}</p>
        </div>
        
        <div className="bg-gray-800 p-4 rounded-lg border border-gray-700">
          <h3 className="text-sm font-medium text-gray-400">P&L (ROI)</h3>
          <p className={`text-2xl font-bold ${roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {roi >= 0 ? '+' : ''}{roi.toFixed(2)}%
          </p>
          <p className={`text-sm ${roi >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {roi >= 0 ? '+' : ''}{formatCurrency(currentValue - portfolio.stats.totalEUR)}
          </p>
        </div>
      </div>

      {/* Transazioni */}
      <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700">
        <div className="p-6 border-b border-gray-700">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <h3 className="text-lg font-medium text-gray-100">Transazioni DCA</h3>
            
            <div className="flex flex-col md:flex-row gap-3">
              {/* Ricerca */}
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Cerca transazioni..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-sm text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
                />
              </div>
              
              {/* Filtri */}
              <select
                value={brokerFilter}
                onChange={(e) => setBrokerFilter(e.target.value)}
                className="px-3 py-2 bg-gray-700 border border-gray-600 rounded-md text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tutti i broker</option>
                {uniqueBrokers.map(broker => (
                  <option key={broker} value={broker}>{broker}</option>
                ))}
              </select>
              
              <button
                onClick={() => setShowAddTransaction(true)}
                className="btn-primary px-4 py-2 rounded-lg flex items-center gap-2"
              >
                <PlusIcon className="w-4 h-4" />
                Nuova Transazione
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {filteredTransactions.length > 0 ? (
            <>
              {/* Header colonne */}
              <div className="flex items-center gap-4 p-3 bg-gray-800 rounded-lg mb-3 text-sm font-medium text-gray-300">
                <div className="w-4"></div> {/* Spazio per checkbox */}
                <div className="min-w-[80px]">Data</div>
                <div className="min-w-[100px]">Broker</div>
                <div className="min-w-[100px]">Info</div>
                <div className="min-w-[120px]">BTC</div>
                <div className="min-w-[100px]">€ Pagati</div>
                <div className="min-w-[120px]">Valore Attuale</div>
                <div className="min-w-[120px]">Prezzo Carico</div>
                <div className="flex-1">Note</div>
                <div className="w-20">Azioni</div>
              </div>

              {/* Lista transazioni */}
              <div className="space-y-3">
                {filteredTransactions.map((transaction) => {
                  const loadPrice = Math.abs(transaction.btcQuantity) > 0 ? transaction.eurPaid / Math.abs(transaction.btcQuantity) : 0
                  const currentTransactionValue = btcPrice ? Math.abs(transaction.btcQuantity) * btcPrice.btcEur : 0
                  const transactionPnL = currentTransactionValue - transaction.eurPaid
                  const transactionROI = transaction.eurPaid > 0 ? (transactionPnL / transaction.eurPaid) * 100 : 0
                  
                  return (
                    <div key={transaction.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center gap-4 flex-1">
                        <input
                          type="checkbox"
                          checked={selectedTransactions.includes(transaction.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedTransactions([...selectedTransactions, transaction.id])
                            } else {
                              setSelectedTransactions(selectedTransactions.filter(id => id !== transaction.id))
                            }
                          }}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        
                        {/* Data */}
                        <div className="text-sm text-adaptive-600 min-w-[80px]">
                          {new Date(transaction.date).toLocaleDateString('it-IT')}
                        </div>
                        
                        {/* Broker */}
                        <div className="text-sm text-adaptive-900 min-w-[100px] font-medium">
                          {transaction.broker}
                        </div>
                        
                        {/* Info */}
                        <div className="text-sm text-adaptive-700 min-w-[100px]">
                          {transaction.info}
                        </div>
                        
                        {/* Quantità BTC */}
                        <div className="text-sm min-w-[120px]">
                          <span className={`font-medium ${transaction.btcQuantity < 0 ? 'text-red-600' : 'text-orange-600'}`}>
                            {transaction.btcQuantity < 0 ? '-' : '+'}{formatBTC(Math.abs(transaction.btcQuantity))}
                          </span>
                        </div>
                        
                        {/* EUR Pagati */}
                        <div className="text-sm min-w-[100px]">
                          <span className="font-medium text-blue-600">
                            {formatCurrency(transaction.eurPaid)}
                          </span>
                        </div>
                        
                        {/* Valore Attuale */}
                        <div className="text-sm min-w-[120px]">
                          <span className="font-medium text-green-600">
                            {formatCurrency(currentTransactionValue)}
                          </span>
                          <div className={`text-xs ${transactionPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {transactionPnL >= 0 ? '+' : ''}{formatCurrency(transactionPnL)} ({transactionROI >= 0 ? '+' : ''}{transactionROI.toFixed(1)}%)
                          </div>
                        </div>
                        
                        {/* Prezzo di Carico */}
                        <div className="text-sm min-w-[120px]">
                          <span className="text-adaptive-700 font-medium">
                            {formatCurrency(loadPrice)}/BTC
                          </span>
                        </div>
                        
                        {/* Note */}
                        <div className="text-sm text-adaptive-500 italic flex-1">
                          {transaction.notes || '-'}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4 w-20">
                        <button
                          onClick={() => {
                            setEditingTransaction(transaction)
                            setTransactionForm({
                              date: transaction.date.split('T')[0],
                              type: transaction.btcQuantity < 0 ? 'sell' : 'buy',
                              broker: transaction.broker,
                              info: transaction.info,
                              btcQuantity: Math.abs(transaction.btcQuantity).toString(),
                              eurPaid: transaction.eurPaid.toString(),
                              notes: transaction.notes || ''
                            })
                            setShowEditTransaction(true)
                          }}
                          className="text-blue-600 hover:text-blue-800 p-1"
                          title="Modifica"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => deleteTransaction(transaction.id)}
                          className="text-red-600 hover:text-red-800 p-1"
                          title="Elimina"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <CurrencyEuroIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-300">
                {searchTerm || brokerFilter ? 'Nessuna transazione trovata per i filtri applicati.' : 'Non hai ancora transazioni.'}
              </p>
              <p className="text-sm text-gray-500 mt-2">
                Inizia aggiungendo la tua prima transazione DCA!
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Fee di Rete */}
      {portfolio.networkFees.length > 0 && (
        <div className="bg-gray-800 rounded-lg shadow-sm border border-gray-700">
          <div className="p-6 border-b border-gray-700">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-100">Fee di Rete</h3>
              <button
                onClick={() => setShowAddFee(true)}
                className="btn-primary px-4 py-2 rounded-lg flex items-center gap-2"
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
                  <div className="flex items-center gap-4">
                    <span className="text-sm text-gray-300">
                      {new Date(fee.date).toLocaleDateString('it-IT')}
                    </span>
                    <span className="text-sm font-medium text-red-400">
                      -{formatSats(fee.sats)}
                    </span>
                    {fee.description && (
                      <span className="text-sm text-gray-200">{fee.description}</span>
                    )}
                  </div>
                  <div className="text-sm text-gray-400">
                    -{(fee.sats / 100000000).toFixed(8)} BTC
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Selezione multipla azioni */}
      {selectedTransactions.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-gray-800 rounded-lg shadow-lg border border-gray-600 p-4 flex items-center gap-4">
          <span className="text-sm text-gray-300">
            {selectedTransactions.length} transazioni selezionate
          </span>
          <button 
            onClick={handleBulkDeleteTransactions}
            className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
          >
            Elimina selezionate
          </button>
          <button 
            onClick={() => setSelectedTransactions([])}
            className="px-3 py-1 border border-gray-600 rounded text-sm text-gray-300 hover:bg-gray-700"
          >
            Deseleziona
          </button>
        </div>
      )}

      {/* Modal Elimina Portfolio */}
      {showDeletePortfolio && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="modal-content rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center gap-3 mb-4">
              <ExclamationTriangleIcon className="w-6 h-6 text-red-600" />
              <h3 className="text-lg font-semibold text-adaptive-900">
                Elimina Portfolio
              </h3>
            </div>
            
            <div className="space-y-4">
              <p className="text-adaptive-700">
                Sei sicuro di voler eliminare il portfolio <strong>"{portfolio.name}"</strong>?
              </p>
              <p className="text-sm text-red-600">
                ⚠️ Questa azione eliminerà anche tutte le transazioni e fee associate. 
                L'operazione non può essere annullata.
              </p>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button 
                  onClick={() => setShowDeletePortfolio(false)}
                  className="px-4 py-2 text-adaptive-600 hover:text-adaptive-800"
                >
                  Annulla
                </button>
                <button 
                  onClick={() => {
                    deletePortfolio()
                    setShowDeletePortfolio(false)
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Elimina Portfolio
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Modifica Portfolio */}
      {showEditPortfolio && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="modal-content rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-adaptive-900 mb-4">
              Modifica Portfolio
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-2">
                  Nome Portfolio *
                </label>
                <input
                  type="text"
                  value={portfolioForm.name}
                  onChange={(e) => setPortfolioForm({...portfolioForm, name: e.target.value})}
                  className="w-full px-3 py-2 border border-adaptive rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="isActive"
                  checked={portfolioForm.isActive}
                  onChange={(e) => setPortfolioForm({...portfolioForm, isActive: e.target.checked})}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <label htmlFor="isActive" className="ml-2 text-sm text-adaptive-700">
                  Portfolio attivo
                </label>
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button 
                  onClick={() => setShowEditPortfolio(false)}
                  className="px-4 py-2 text-adaptive-600 hover:text-adaptive-800"
                >
                  Annulla
                </button>
                <button 
                  onClick={updatePortfolio}
                  disabled={submitLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitLoading ? 'Salvando...' : 'Salva Modifiche'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Aggiungi Transazione */}
      {showAddTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="modal-content rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-adaptive-900 mb-4">
              Nuova Transazione DCA
            </h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-adaptive-700 mb-2">
                    Data *
                  </label>
                  <input
                    type="date"
                    value={transactionForm.date}
                    onChange={(e) => setTransactionForm({...transactionForm, date: e.target.value})}
                    className="w-full px-3 py-2 border border-adaptive rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-adaptive-700 mb-2">
                    Tipo *
                  </label>
                  <select
                    value={transactionForm.type}
                    onChange={(e) => setTransactionForm({...transactionForm, type: e.target.value as 'buy' | 'sell'})}
                    className="w-full px-3 py-2 border border-adaptive rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="buy">Acquisto</option>
                    <option value="sell">Vendita</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-2">
                  Broker *
                </label>
                <input
                  type="text"
                  placeholder="es. Binance, Kraken, etc."
                  value={transactionForm.broker}
                  onChange={(e) => setTransactionForm({...transactionForm, broker: e.target.value})}
                  className="w-full px-3 py-2 border border-adaptive rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-2">
                  Info *
                </label>
                <input
                  type="text"
                  placeholder="es. DCA, Regalo, Acquisto, etc."
                  value={transactionForm.info}
                  onChange={(e) => setTransactionForm({...transactionForm, info: e.target.value})}
                  className="w-full px-3 py-2 border border-adaptive rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-adaptive-700 mb-2">
                    Quantità BTC *
                  </label>
                  <input
                    type="number"
                    step="0.00000001"
                    placeholder="0.00000000"
                    value={transactionForm.btcQuantity}
                    onChange={(e) => setTransactionForm({...transactionForm, btcQuantity: e.target.value})}
                    className="w-full px-3 py-2 border border-adaptive rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-adaptive-700 mb-2">
                    € Pagati *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    value={transactionForm.eurPaid}
                    onChange={(e) => setTransactionForm({...transactionForm, eurPaid: e.target.value})}
                    className="w-full px-3 py-2 border border-adaptive rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-2">
                  Note
                </label>
                <input
                  type="text"
                  placeholder="Note opzionali..."
                  value={transactionForm.notes}
                  onChange={(e) => setTransactionForm({...transactionForm, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-adaptive rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button 
                  onClick={() => setShowAddTransaction(false)}
                  className="px-4 py-2 text-adaptive-600 hover:text-adaptive-800"
                >
                  Annulla
                </button>
                <button 
                  onClick={addTransaction}
                  disabled={submitLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitLoading ? 'Aggiungendo...' : 'Aggiungi Transazione'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Modifica Transazione */}
      {showEditTransaction && editingTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="modal-content rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-adaptive-900 mb-4">
              Modifica Transazione
            </h3>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-adaptive-700 mb-2">
                    Data *
                  </label>
                  <input
                    type="date"
                    value={transactionForm.date}
                    onChange={(e) => setTransactionForm({...transactionForm, date: e.target.value})}
                    className="w-full px-3 py-2 border border-adaptive rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-adaptive-700 mb-2">
                    Tipo *
                  </label>
                  <select
                    value={transactionForm.type}
                    onChange={(e) => setTransactionForm({...transactionForm, type: e.target.value as 'buy' | 'sell'})}
                    className="w-full px-3 py-2 border border-adaptive rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="buy">Acquisto</option>
                    <option value="sell">Vendita</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-2">
                  Broker *
                </label>
                <input
                  type="text"
                  value={transactionForm.broker}
                  onChange={(e) => setTransactionForm({...transactionForm, broker: e.target.value})}
                  className="w-full px-3 py-2 border border-adaptive rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-2">
                  Info *
                </label>
                <input
                  type="text"
                  value={transactionForm.info}
                  onChange={(e) => setTransactionForm({...transactionForm, info: e.target.value})}
                  className="w-full px-3 py-2 border border-adaptive rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-adaptive-700 mb-2">
                    Quantità BTC *
                  </label>
                  <input
                    type="number"
                    step="0.00000001"
                    value={transactionForm.btcQuantity}
                    onChange={(e) => setTransactionForm({...transactionForm, btcQuantity: e.target.value})}
                    className="w-full px-3 py-2 border border-adaptive rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-adaptive-700 mb-2">
                    € Pagati *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={transactionForm.eurPaid}
                    onChange={(e) => setTransactionForm({...transactionForm, eurPaid: e.target.value})}
                    className="w-full px-3 py-2 border border-adaptive rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-2">
                  Note
                </label>
                <input
                  type="text"
                  value={transactionForm.notes}
                  onChange={(e) => setTransactionForm({...transactionForm, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-adaptive rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button 
                  onClick={() => {
                    setShowEditTransaction(false)
                    setEditingTransaction(null)
                  }}
                  className="px-4 py-2 text-adaptive-600 hover:text-adaptive-800"
                >
                  Annulla
                </button>
                <button 
                  onClick={updateTransaction}
                  disabled={submitLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitLoading ? 'Salvando...' : 'Salva Modifiche'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Aggiungi Fee */}
      {showAddFee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="modal-content rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-adaptive-900 mb-4">
              Nuova Fee di Rete
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-2">
                  Sats *
                </label>
                <input
                  type="number"
                  placeholder="2000"
                  value={feeForm.sats}
                  onChange={(e) => setFeeForm({...feeForm, sats: e.target.value})}
                  className="w-full px-3 py-2 border border-adaptive rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-2">
                  Data
                </label>
                <input
                  type="date"
                  value={feeForm.date}
                  onChange={(e) => setFeeForm({...feeForm, date: e.target.value})}
                  className="w-full px-3 py-2 border border-adaptive rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-2">
                  Descrizione
                </label>
                <input
                  type="text"
                  placeholder="es. Transfer to cold wallet"
                  value={feeForm.description}
                  onChange={(e) => setFeeForm({...feeForm, description: e.target.value})}
                  className="w-full px-3 py-2 border border-adaptive rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button 
                  onClick={() => setShowAddFee(false)}
                  className="px-4 py-2 text-adaptive-600 hover:text-adaptive-800"
                >
                  Annulla
                </button>
                <button 
                  onClick={addNetworkFee}
                  disabled={submitLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitLoading ? 'Aggiungendo...' : 'Aggiungi Fee'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}