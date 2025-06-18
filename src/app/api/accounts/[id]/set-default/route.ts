'use client'

import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface DCATransaction {
  id: number
  date: string
  broker: string
  info: string
  btcQuantity: number
  eurPaid: number
  notes: string | null
  portfolioId: number
}

interface NetworkFee {
  id: number
  sats: number
  date: string
  description: string | null
  portfolioId: number
}

interface DCAPortfolio {
  id: number
  name: string
  type: string
  isActive: boolean
  createdAt: string
  updatedAt: string
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
  timestamp: string
}

export default function InvestmentDetailPage() {
  const params = useParams()
  const router = useRouter()
  const portfolioId = params.id as string

  const [portfolio, setPortfolio] = useState<DCAPortfolio | null>(null)
  const [loading, setLoading] = useState(true)
  const [btcPrice, setBtcPrice] = useState<BitcoinPrice | null>(null)
  const [priceLoading, setPriceLoading] = useState(false)

  // Stati per modali
  const [showAddTransaction, setShowAddTransaction] = useState(false)
  const [showEditTransaction, setShowEditTransaction] = useState(false)
  const [showAddFee, setShowAddFee] = useState(false)
  const [showEditFee, setShowEditFee] = useState(false)
  const [showEditPortfolio, setShowEditPortfolio] = useState(false)

  // Stati per form
  const [portfolioName, setPortfolioName] = useState('')
  const [editingTransaction, setEditingTransaction] = useState<DCATransaction | null>(null)
  const [editingFee, setEditingFee] = useState<NetworkFee | null>(null)
  const [submitLoading, setSubmitLoading] = useState(false)

  // Form data
  const [transactionForm, setTransactionForm] = useState({
    date: new Date().toISOString().split('T')[0],
    broker: '',
    info: '',
    btcQuantity: '',
    eurPaid: '',
    notes: ''
  })

  const [feeForm, setFeeForm] = useState({
    date: new Date().toISOString().split('T')[0],
    sats: '',
    description: ''
  })

  // Stati per filtri e selezione multipla
  const [searchTerm, setSearchTerm] = useState('')
  const [brokerFilter, setBrokerFilter] = useState('')
  const [infoFilter, setInfoFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  
  // Selezione multipla transazioni
  const [selectedTransactions, setSelectedTransactions] = useState<number[]>([])
  const [selectAllTransactions, setSelectAllTransactions] = useState(false)
  
  // Selezione multipla fee
  const [selectedFees, setSelectedFees] = useState<number[]>([])
  const [selectAllFees, setSelectAllFees] = useState(false)

  // Funzioni di utilità
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const formatBTC = (amount: number) => {
    return amount.toFixed(8) + ' BTC'
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT')
  }

  const satsTobtc = (sats: number) => {
    return sats / 100000000
  }

  const calculateAvgLoadPrice = () => {
    if (!portfolio || portfolio.stats.netBTC <= 0) return 0
    return portfolio.stats.totalEUR / portfolio.stats.netBTC
  }

  // Filtri transazioni
  const filteredTransactions = useMemo(() => {
    if (!portfolio) return []
    
    return portfolio.transactions.filter(transaction => {
      const matchesSearch = searchTerm === '' || 
        transaction.broker.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.info.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (transaction.notes && transaction.notes.toLowerCase().includes(searchTerm.toLowerCase()))
      
      const matchesBroker = brokerFilter === '' || transaction.broker === brokerFilter
      const matchesInfo = infoFilter === '' || transaction.info === infoFilter
      
      const transactionDate = new Date(transaction.date)
      const matchesDateFrom = dateFrom === '' || transactionDate >= new Date(dateFrom)
      const matchesDateTo = dateTo === '' || transactionDate <= new Date(dateTo)
      
      return matchesSearch && matchesBroker && matchesInfo && matchesDateFrom && matchesDateTo
    })
  }, [portfolio, searchTerm, brokerFilter, infoFilter, dateFrom, dateTo])

  // Filtri fee
  const filteredFees = useMemo(() => {
    if (!portfolio) return []
    
    return portfolio.networkFees.filter(fee => {
      const matchesSearch = searchTerm === '' || 
        (fee.description && fee.description.toLowerCase().includes(searchTerm.toLowerCase()))
      
      const feeDate = new Date(fee.date)
      const matchesDateFrom = dateFrom === '' || feeDate >= new Date(dateFrom)
      const matchesDateTo = dateTo === '' || feeDate <= new Date(dateTo)
      
      return matchesSearch && matchesDateFrom && matchesDateTo
    })
  }, [portfolio, searchTerm, dateFrom, dateTo])

  // Opzioni per filtri
  const brokerOptions = useMemo(() => {
    if (!portfolio) return []
    const brokers = [...new Set(portfolio.transactions.map(t => t.broker))]
    return brokers.sort()
  }, [portfolio])

  const infoOptions = useMemo(() => {
    if (!portfolio) return []
    const infos = [...new Set(portfolio.transactions.map(t => t.info))]
    return infos.sort()
  }, [portfolio])

  // Selezione multipla transazioni
  const handleTransactionSelect = (transactionId: number) => {
    setSelectedTransactions(prev => 
      prev.includes(transactionId) 
        ? prev.filter(id => id !== transactionId)
        : [...prev, transactionId]
    )
  }

  const handleSelectAllTransactions = () => {
    if (selectAllTransactions) {
      setSelectedTransactions([])
    } else {
      setSelectedTransactions(filteredTransactions.map(t => t.id))
    }
    setSelectAllTransactions(!selectAllTransactions)
  }

  // Selezione multipla fee
  const handleFeeSelect = (feeId: number) => {
    setSelectedFees(prev => 
      prev.includes(feeId) 
        ? prev.filter(id => id !== feeId)
        : [...prev, feeId]
    )
  }

  const handleSelectAllFees = () => {
    if (selectAllFees) {
      setSelectedFees([])
    } else {
      setSelectedFees(filteredFees.map(f => f.id))
    }
    setSelectAllFees(!selectAllFees)
  }

  // Cancellazione multipla transazioni
  const handleBulkDeleteTransactions = async () => {
    if (!confirm(`Sei sicuro di voler cancellare ${selectedTransactions.length} transazioni selezionate?`)) return

    try {
      await Promise.all(
        selectedTransactions.map(id => 
          fetch(`/api/dca-transactions/${id}`, { method: 'DELETE' })
        )
      )
      
      setSelectedTransactions([])
      setSelectAllTransactions(false)
      fetchPortfolio()
    } catch (error) {
      console.error('Errore durante la cancellazione multipla transazioni:', error)
    }
  }

  // Cancellazione multipla fee
  const handleBulkDeleteFees = async () => {
    if (!confirm(`Sei sicuro di voler cancellare ${selectedFees.length} fee di rete selezionate?`)) return

    try {
      await Promise.all(
        selectedFees.map(id => 
          fetch(`/api/network-fees/${id}`, { method: 'DELETE' })
        )
      )
      
      setSelectedFees([])
      setSelectAllFees(false)
      fetchPortfolio()
    } catch (error) {
      console.error('Errore durante la cancellazione multipla fee:', error)
    }
  }

  // Effects
  useEffect(() => {
    if (filteredTransactions.length > 0) {
      const allSelected = filteredTransactions.every(t => selectedTransactions.includes(t.id))
      setSelectAllTransactions(allSelected)
    }
  }, [selectedTransactions, filteredTransactions])

  useEffect(() => {
    if (filteredFees.length > 0) {
      const allSelected = filteredFees.every(f => selectedFees.includes(f.id))
      setSelectAllFees(allSelected)
    }
  }, [selectedFees, filteredFees])

  useEffect(() => {
    fetchPortfolio()
    fetchBitcoinPrice()
    
    const interval = setInterval(fetchBitcoinPrice, 15 * 60 * 1000)
    return () => clearInterval(interval)
  }, [portfolioId])

  // Funzioni API
  const fetchPortfolio = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/dca-portfolios/${portfolioId}`)
      if (response.ok) {
        const data = await response.json()
        setPortfolio(data)
        setPortfolioName(data.name)
      } else if (response.status === 404) {
        router.push('/investments')
      }
    } catch (error) {
      console.error('Errore nel caricamento portafoglio:', error)
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
          broker: transactionForm.broker,
          info: transactionForm.info,
          btcQuantity: parseFloat(transactionForm.btcQuantity),
          eurPaid: parseFloat(transactionForm.eurPaid),
          notes: transactionForm.notes || undefined
        })
      })

      if (response.ok) {
        setShowAddTransaction(false)
        setTransactionForm({
          date: new Date().toISOString().split('T')[0],
          broker: '',
          info: '',
          btcQuantity: '',
          eurPaid: '',
          notes: ''
        })
        fetchPortfolio()
      }
    } catch (error) {
      console.error('Errore nell\'aggiunta transazione:', error)
    } finally {
      setSubmitLoading(false)
    }
  }

  const updateTransaction = async () => {
    if (!editingTransaction || !transactionForm.broker || !transactionForm.info || !transactionForm.btcQuantity || !transactionForm.eurPaid) {
      alert('Compila tutti i campi obbligatori')
      return
    }

    try {
      setSubmitLoading(true)
      const response = await fetch(`/api/dca-transactions/${editingTransaction.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: transactionForm.date,
          broker: transactionForm.broker,
          info: transactionForm.info,
          btcQuantity: parseFloat(transactionForm.btcQuantity),
          eurPaid: parseFloat(transactionForm.eurPaid),
          notes: transactionForm.notes || undefined
        })
      })

      if (response.ok) {
        setShowEditTransaction(false)
        setEditingTransaction(null)
        fetchPortfolio()
      }
    } catch (error) {
      console.error('Errore nell\'aggiornamento transazione:', error)
    } finally {
      setSubmitLoading(false)
    }
  }

  const deleteTransaction = async (id: number) => {
    if (!confirm('Sei sicuro di voler cancellare questa transazione?')) return

    try {
      const response = await fetch(`/api/dca-transactions/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchPortfolio()
      }
    } catch (error) {
      console.error('Errore nella cancellazione transazione:', error)
    }
  }

  const addFee = async () => {
    if (!feeForm.sats) {
      alert('Inserisci l\'importo in sats')
      return
    }

    try {
      setSubmitLoading(true)
      const response = await fetch('/api/network-fees', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          portfolioId: parseInt(portfolioId),
          date: feeForm.date,
          sats: parseInt(feeForm.sats),
          description: feeForm.description || undefined
        })
      })

      if (response.ok) {
        setShowAddFee(false)
        setFeeForm({
          date: new Date().toISOString().split('T')[0],
          sats: '',
          description: ''
        })
        fetchPortfolio()
      }
    } catch (error) {
      console.error('Errore nell\'aggiunta fee:', error)
    } finally {
      setSubmitLoading(false)
    }
  }

  const updateFee = async () => {
    if (!editingFee || !feeForm.sats) {
      alert('Inserisci l\'importo in sats')
      return
    }

    try {
      setSubmitLoading(true)
      const response = await fetch(`/api/network-fees/${editingFee.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          date: feeForm.date,
          sats: parseInt(feeForm.sats),
          description: feeForm.description || undefined
        })
      })

      if (response.ok) {
        setShowEditFee(false)
        setEditingFee(null)
        fetchPortfolio()
      }
    } catch (error) {
      console.error('Errore nell\'aggiornamento fee:', error)
    } finally {
      setSubmitLoading(false)
    }
  }

  const deleteFee = async (id: number) => {
    if (!confirm('Sei sicuro di voler cancellare questa fee?')) return

    try {
      const response = await fetch(`/api/network-fees/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchPortfolio()
      }
    } catch (error) {
      console.error('Errore nella cancellazione fee:', error)
    }
  }

  const editTransaction = (transaction: DCATransaction) => {
    setEditingTransaction(transaction)
    setTransactionForm({
      date: transaction.date.split('T')[0],
      broker: transaction.broker,
      info: transaction.info,
      btcQuantity: transaction.btcQuantity.toString(),
      eurPaid: transaction.eurPaid.toString(),
      notes: transaction.notes || ''
    })
    setShowEditTransaction(true)
  }

  const editFee = (fee: NetworkFee) => {
    setEditingFee(fee)
    setFeeForm({
      date: fee.date.split('T')[0],
      sats: fee.sats.toString(),
      description: fee.description || ''
    })
    setShowEditFee(true)
  }

  const updatePortfolio = async () => {
    if (!portfolioName.trim()) return

    try {
      setSubmitLoading(true)
      const response = await fetch(`/api/dca-portfolios/${portfolioId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: portfolioName.trim() })
      })

      if (response.ok) {
        setShowEditPortfolio(false)
        fetchPortfolio()
      }
    } catch (error) {
      console.error('Errore nell\'aggiornamento portafoglio:', error)
    } finally {
      setSubmitLoading(false)
    }
  }

  const deletePortfolio = async () => {
    if (!confirm('Sei sicuro di voler cancellare questo portafoglio? Questa azione non può essere annullata.')) return

    try {
      const response = await fetch(`/api/dca-portfolios/${portfolioId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        router.push('/investments')
      }
    } catch (error) {
      console.error('Errore nella cancellazione portafoglio:', error)
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-adaptive-900">Caricamento...</h1>
          <p className="text-adaptive-600">Caricamento portfolio in corso</p>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="text-adaptive-600">Caricamento...</div>
        </div>
      </div>
    )
  }

  if (!portfolio) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-adaptive-900">Portfolio non trovato</h1>
          <p className="text-adaptive-600">Il portfolio richiesto non esiste</p>
        </div>
        <Link href="/investments" className="text-blue-600 hover:text-blue-800">
          ← Torna agli investimenti
        </Link>
      </div>
    )
  }

  const currentValue = portfolio.stats.netBTC > 0 && btcPrice ? portfolio.stats.netBTC * btcPrice.btcEur : 0
  const roi = portfolio.stats.totalEUR > 0 ? ((currentValue - portfolio.stats.totalEUR) / portfolio.stats.totalEUR) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <div className="flex items-center space-x-3 mb-2">
            <Link href="/investments" className="text-blue-600 hover:text-blue-800">
              ← Investimenti
            </Link>
          </div>
          <h1 className="text-3xl font-bold text-adaptive-900">{portfolio.name}</h1>
          <p className="text-adaptive-600">DCA Bitcoin Portfolio</p>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={() => setShowEditPortfolio(true)}
            className="px-4 py-2 border border-adaptive rounded-md text-adaptive-700 hover:bg-gray-50"
          >
            ✏️ Modifica
          </button>
          <button
            onClick={deletePortfolio}
            className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
          >
            🗑️ Cancella
          </button>
        </div>
      </div>

      {/* Prezzo Bitcoin */}
      <div className="card-adaptive p-4 rounded-lg border-adaptive">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-2xl text-orange-600">₿</span>
            <div>
              {priceLoading ? (
                <div className="text-sm text-adaptive-600">Aggiornamento prezzo...</div>
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
                <div className="text-sm text-adaptive-600">Prezzo non disponibile</div>
              )}
            </div>
          </div>
          
          <div className="flex space-x-2">
            <button
              onClick={fetchBitcoinPrice}
              className="px-3 py-1 bg-orange-600 text-white rounded-md hover:bg-orange-700 text-sm"
              disabled={priceLoading}
            >
              🔄 Aggiorna Prezzo
            </button>
          </div>
        </div>
      </div>

      {/* Statistiche Principali */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="card-adaptive p-6 rounded-lg shadow-sm border-adaptive">
          <div className="text-sm text-adaptive-600 mb-1">Bitcoin Netti</div>
          <div className="text-xl font-bold text-adaptive-900">
            {formatBTC(portfolio.stats.netBTC)}
          </div>
          <div className="text-xs text-adaptive-500 mt-1">
            ({formatBTC(portfolio.stats.totalBTC)} - {formatBTC(portfolio.stats.totalFeesBTC)} fee)
          </div>
        </div>

        <div className="card-adaptive p-6 rounded-lg shadow-sm border-adaptive">
          <div className="text-sm text-adaptive-600 mb-1">Investimento Totale</div>
          <div className="text-xl font-bold text-adaptive-900">
            {formatCurrency(portfolio.stats.totalEUR)}
          </div>
          <div className="text-xs text-adaptive-500 mt-1">
            {portfolio.stats.transactionCount} transazioni
          </div>
        </div>

        <div className="card-adaptive p-6 rounded-lg shadow-sm border-adaptive">
          <div className="text-sm text-adaptive-600 mb-1">Prezzo Medio Carico</div>
          <div className="text-xl font-bold text-adaptive-900">
            {formatCurrency(calculateAvgLoadPrice())}
          </div>
          <div className="text-xs text-adaptive-500 mt-1">
            per BTC (EUR ÷ BTC netti)
          </div>
        </div>

        <div className="card-adaptive p-6 rounded-lg shadow-sm border-adaptive">
          <div className="text-sm text-adaptive-600 mb-1">Valore Attuale</div>
          {btcPrice ? (
            <>
              <div className="text-xl font-bold text-adaptive-900">
                {formatCurrency(currentValue)}
              </div>
              <div className="text-xs text-adaptive-500 mt-1">
                {formatBTC(portfolio.stats.netBTC)} × {formatCurrency(btcPrice.btcEur)}
              </div>
            </>
          ) : (
            <div className="text-xl font-bold text-adaptive-600">
              Prezzo non disponibile
            </div>
          )}
        </div>

        <div className="card-adaptive p-6 rounded-lg shadow-sm border-adaptive">
          <div className="text-sm text-adaptive-600 mb-1">ROI</div>
          {btcPrice ? (
            <>
              <div className={`text-xl font-bold ${roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {roi >= 0 ? '+' : ''}{roi.toFixed(2)}%
              </div>
              <div className="text-xs text-adaptive-500 mt-1">
                {roi >= 0 ? '+' : ''}{formatCurrency(currentValue - portfolio.stats.totalEUR)}
              </div>
            </>
          ) : (
            <div className="text-xl font-bold text-adaptive-600">
              - %
            </div>
          )}
        </div>
      </div>

      {/* Pulsanti Azione */}
      <div className="flex space-x-3">
        <button
          onClick={() => setShowAddTransaction(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          ➕ Aggiungi Transazione
        </button>
        <button
          onClick={() => setShowAddFee(true)}
          className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
        >
          ⚡ Aggiungi Fee Rete
        </button>
      </div>

      {/* Transazioni con Filtri Integrati */}
      <div className="card-adaptive rounded-lg shadow-sm border-adaptive">
        <div className="p-6 border-b border-adaptive">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-adaptive-900">
              Transazioni ({filteredTransactions.length})
            </h3>
            {selectedTransactions.length > 0 && (
              <button
                onClick={handleBulkDeleteTransactions}
                className="bg-red-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-red-700"
              >
                Cancella {selectedTransactions.length} selezionate
              </button>
            )}
          </div>

          {/* Filtri integrati */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-adaptive-700 mb-1">
                Ricerca
              </label>
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Broker, info, note..."
                className="w-full border border-adaptive rounded-lg px-3 py-2 text-adaptive-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-adaptive-700 mb-1">
                Broker
              </label>
              <select
                value={brokerFilter}
                onChange={(e) => setBrokerFilter(e.target.value)}
                className="w-full border border-adaptive rounded-lg px-3 py-2 text-adaptive-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tutti i broker</option>
                {brokerOptions.map(broker => (
                  <option key={broker} value={broker}>{broker}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-adaptive-700 mb-1">
                Info
              </label>
              <select
                value={infoFilter}
                onChange={(e) => setInfoFilter(e.target.value)}
                className="w-full border border-adaptive rounded-lg px-3 py-2 text-adaptive-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Tutte le info</option>
                {infoOptions.map(info => (
                  <option key={info} value={info}>{info}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-adaptive-700 mb-1">
                Data Da
              </label>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-full border border-adaptive rounded-lg px-3 py-2 text-adaptive-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-adaptive-700 mb-1">
                Data A
              </label>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-full border border-adaptive rounded-lg px-3 py-2 text-adaptive-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
          
          <div className="mt-4">
            <button
              onClick={() => {
                setSearchTerm('')
                setBrokerFilter('')
                setInfoFilter('')
                setDateFrom('')
                setDateTo('')
              }}
              className="px-4 py-2 border border-adaptive rounded-md text-adaptive-700 hover:bg-gray-50 text-sm"
            >
              Pulisci Filtri
            </button>
          </div>
        </div>
        
        <div className="p-6">
          {filteredTransactions.length > 0 ? (
            <div className="space-y-4">
              {/* Header con selezione multipla */}
              <div className="flex items-center gap-3 pb-2 border-b border-adaptive">
                <input
                  type="checkbox"
                  checked={selectAllTransactions}
                  onChange={handleSelectAllTransactions}
                  className="rounded"
                />
                <span className="text-sm text-adaptive-600">
                  Seleziona tutto ({filteredTransactions.length})
                </span>
              </div>

              {/* Lista transazioni */}
              {filteredTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedTransactions.includes(transaction.id)}
                      onChange={() => handleTransactionSelect(transaction.id)}
                      className="rounded"
                    />
                    <div className="flex items-center gap-4 flex-1">
                      <div className="text-sm text-adaptive-600 min-w-[80px]">
                        {formatDate(transaction.date)}
                      </div>
                      <div className="text-sm text-adaptive-900 min-w-[100px]">
                        {transaction.broker}
                      </div>
                      <div className="text-sm text-adaptive-900 min-w-[80px]">
                        {transaction.info}
                      </div>
                      <div className="text-sm text-adaptive-900 min-w-[120px]">
                        {formatBTC(transaction.btcQuantity)}
                      </div>
                      <div className="text-sm text-adaptive-900 min-w-[80px]">
                        {formatCurrency(transaction.eurPaid)}
                      </div>
                      <div className="text-sm text-adaptive-500 flex-1">
                        {transaction.notes || '-'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <div className="text-sm text-adaptive-900 text-right min-w-[80px]">
                      {btcPrice ? formatCurrency(transaction.btcQuantity * btcPrice.btcEur) : '-'}
                    </div>
                    <button
                      onClick={() => editTransaction(transaction)}
                      className="text-blue-600 hover:text-blue-800 p-1"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => deleteTransaction(transaction.id)}
                      className="text-red-600 hover:text-red-800 p-1"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-adaptive-600">Nessuna transazione trovata.</p>
            </div>
          )}
        </div>
      </div>

      {/* Fee di Rete con Filtri Integrati */}
      <div className="card-adaptive rounded-lg shadow-sm border-adaptive">
        <div className="p-6 border-b border-adaptive">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-adaptive-900">
              Fee di Rete ({filteredFees.length})
            </h3>
            {selectedFees.length > 0 && (
              <button
                onClick={handleBulkDeleteFees}
                className="bg-red-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-red-700"
              >
                Cancella {selectedFees.length} selezionate
              </button>
            )}
          </div>
        </div>
        
        <div className="p-6">
          {filteredFees.length > 0 ? (
            <div className="space-y-4">
              {/* Header con selezione multipla */}
              <div className="flex items-center gap-3 pb-2 border-b border-adaptive">
                <input
                  type="checkbox"
                  checked={selectAllFees}
                  onChange={handleSelectAllFees}
                  className="rounded"
                />
                <span className="text-sm text-adaptive-600">
                  Seleziona tutto ({filteredFees.length})
                </span>
              </div>

              {/* Lista fee */}
              {filteredFees.map((fee) => (
                <div key={fee.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedFees.includes(fee.id)}
                      onChange={() => handleFeeSelect(fee.id)}
                      className="rounded"
                    />
                    <div className="flex items-center gap-4 flex-1">
                      <div className="text-sm text-adaptive-600 min-w-[80px]">
                        {formatDate(fee.date)}
                      </div>
                      <div className="text-sm text-adaptive-900 min-w-[100px]">
                        {fee.sats.toLocaleString()} sats
                      </div>
                      <div className="text-sm text-adaptive-900 min-w-[120px]">
                        {formatBTC(satsTobtc(fee.sats))}
                      </div>
                      <div className="text-sm text-adaptive-500 flex-1">
                        {fee.description || '-'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => editFee(fee)}
                      className="text-blue-600 hover:text-blue-800 p-1"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => deleteFee(fee.id)}
                      className="text-red-600 hover:text-red-800 p-1"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-adaptive-600">Nessuna fee di rete trovata.</p>
            </div>
          )}
        </div>
      </div>

      {/* Modal Aggiungi/Modifica Transazione */}
      {(showAddTransaction || showEditTransaction) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="modal-content rounded-lg p-6 w-full max-w-md mx-4 max-h-screen overflow-y-auto">
            <h3 className="text-lg font-semibold text-adaptive-900 mb-4">
              {showEditTransaction ? 'Modifica Transazione' : 'Nuova Transazione'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">
                  Data
                </label>
                <input
                  type="date"
                  value={transactionForm.date}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full border border-adaptive rounded-lg px-3 py-2 text-adaptive-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">
                  Broker
                </label>
                <input
                  type="text"
                  value={transactionForm.broker}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, broker: e.target.value }))}
                  className="w-full border border-adaptive rounded-lg px-3 py-2 text-adaptive-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Binance, Kraken, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">
                  Info
                </label>
                <input
                  type="text"
                  value={transactionForm.info}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, info: e.target.value }))}
                  className="w-full border border-adaptive rounded-lg px-3 py-2 text-adaptive-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="DCA, Regalo, Acquisto, etc."
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">
                  Quantità BTC
                </label>
                <input
                  type="number"
                  step="0.00000001"
                  value={transactionForm.btcQuantity}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, btcQuantity: e.target.value }))}
                  className="w-full border border-adaptive rounded-lg px-3 py-2 text-adaptive-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.01234567"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">
                  EUR Pagati
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={transactionForm.eurPaid}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, eurPaid: e.target.value }))}
                  className="w-full border border-adaptive rounded-lg px-3 py-2 text-adaptive-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="500.00"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">
                  Note (opzionale)
                </label>
                <input
                  type="text"
                  value={transactionForm.notes}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full border border-adaptive rounded-lg px-3 py-2 text-adaptive-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Note aggiuntive..."
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAddTransaction(false)
                  setShowEditTransaction(false)
                  setEditingTransaction(null)
                }}
                className="px-4 py-2 border border-adaptive rounded-md text-adaptive-700 hover:bg-gray-50"
              >
                Annulla
              </button>
              <button
                onClick={showEditTransaction ? updateTransaction : addTransaction}
                disabled={submitLoading || !transactionForm.broker || !transactionForm.info || !transactionForm.btcQuantity || !transactionForm.eurPaid}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {submitLoading ? 'Salvataggio...' : showEditTransaction ? 'Aggiorna' : 'Crea'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Aggiungi/Modifica Fee */}
      {(showAddFee || showEditFee) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="modal-content rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-adaptive-900 mb-4">
              {showEditFee ? 'Modifica Fee di Rete' : 'Nuova Fee di Rete'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">
                  Data
                </label>
                <input
                  type="date"
                  value={feeForm.date}
                  onChange={(e) => setFeeForm(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full border border-adaptive rounded-lg px-3 py-2 text-adaptive-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">
                  Sats
                </label>
                <input
                  type="number"
                  value={feeForm.sats}
                  onChange={(e) => setFeeForm(prev => ({ ...prev, sats: e.target.value }))}
                  className="w-full border border-adaptive rounded-lg px-3 py-2 text-adaptive-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="2000"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">
                  Descrizione (opzionale)
                </label>
                <input
                  type="text"
                  value={feeForm.description}
                  onChange={(e) => setFeeForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full border border-adaptive rounded-lg px-3 py-2 text-adaptive-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Transfer to cold wallet"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAddFee(false)
                  setShowEditFee(false)
                  setEditingFee(null)
                }}
                className="px-4 py-2 border border-adaptive rounded-md text-adaptive-700 hover:bg-gray-50"
              >
                Annulla
              </button>
              <button
                onClick={showEditFee ? updateFee : addFee}
                disabled={submitLoading || !feeForm.sats}
                className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
              >
                {submitLoading ? 'Salvataggio...' : showEditFee ? 'Aggiorna' : 'Crea'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Modifica Portafoglio */}
      {showEditPortfolio && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="modal-content rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-adaptive-900 mb-4">Modifica Portafoglio</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">
                  Nome Portafoglio
                </label>
                <input
                  type="text"
                  value={portfolioName}
                  onChange={(e) => setPortfolioName(e.target.value)}
                  className="w-full border border-adaptive rounded-lg px-3 py-2 text-adaptive-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Nome del portafoglio"
                />
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={() => setShowEditPortfolio(false)}
                className="px-4 py-2 border border-adaptive rounded-md text-adaptive-700 hover:bg-gray-50"
              >
                Annulla
              </button>
              <button
                onClick={updatePortfolio}
                disabled={submitLoading || !portfolioName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {submitLoading ? 'Salvataggio...' : 'Aggiorna'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}