'use client'

import { formatCurrency, formatBTC, formatDate, satsToBTC } from '@/utils/formatters'
import { useState, useEffect, useMemo } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface Account {
  id: number
  name: string
  type: string
  balance: number
}

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
  accountId?: number
  account?: Account
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

  // Form data - 🟠 AGGIUNTO SOLO: campo type
  const [transactionForm, setTransactionForm] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'buy' as 'buy' | 'sell', // 🟠 NUOVO CAMPO
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
  const calculateAvgLoadPrice = () => {
    if (!portfolio || portfolio.stats.netBTC <= 0) return 0
    return portfolio.stats.totalEUR / portfolio.stats.netBTC
  }

  // Calcoli con useMemo per performance e evitare errori
  const currentValue = useMemo(() => {
    if (!portfolio || !btcPrice || portfolio.stats.netBTC <= 0) return 0
    return portfolio.stats.netBTC * btcPrice.btcEur
  }, [portfolio, btcPrice])

  const roi = useMemo(() => {
    if (!portfolio || portfolio.stats.totalEUR <= 0 || !btcPrice) return 0
    const value = portfolio.stats.netBTC * btcPrice.btcEur
    return ((value - portfolio.stats.totalEUR) / portfolio.stats.totalEUR) * 100
  }, [portfolio, btcPrice])

  // Filtri transazioni con controlli completi
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

  // Selezione multipla transazioni
  const handleSelectTransaction = (transactionId: number) => {
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

  const handleBulkDeleteTransactions = async () => {
    if (selectedTransactions.length === 0) return
    
    if (!confirm(`Sei sicuro di voler cancellare ${selectedTransactions.length} transazioni selezionate?`)) {
      return
    }

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
      console.error('Errore nella cancellazione batch transazioni:', error)
      alert('Errore nella cancellazione delle transazioni')
    }
  }

  // Selezione multipla fee
  const handleSelectFee = (feeId: number) => {
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
      setSelectedFees(portfolio?.networkFees.map(f => f.id) || [])
    }
    setSelectAllFees(!selectAllFees)
  }

  const handleBulkDeleteFees = async () => {
    if (selectedFees.length === 0) return
    
    if (!confirm(`Sei sicuro di voler cancellare ${selectedFees.length} fee selezionate?`)) {
      return
    }

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
      console.error('Errore nella cancellazione batch fee:', error)
      alert('Errore nella cancellazione delle fee')
    }
  }

  // Fetch portfolio
  const fetchPortfolio = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/dca-portfolios/${portfolioId}`)
      if (response.ok) {
        const data = await response.json()
        setPortfolio(data)
        setPortfolioName(data.name)
      } else {
        router.push('/investments')
      }
    } catch (error) {
      console.error('Errore nel caricamento portfolio:', error)
      router.push('/investments')
    } finally {
      setLoading(false)
    }
  }

  // Fetch Bitcoin price - RIPRISTINATO ORIGINALE
  const fetchBitcoinPrice = async (forceRefresh: boolean = false) => {
    try {
      setPriceLoading(true)
      
      const url = forceRefresh 
        ? '/api/bitcoin-price?force=true' 
        : '/api/bitcoin-price'
      
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

  // Gestione transazioni - 🟠 AGGIORNATO SOLO: rileva tipo da btcQuantity
  const editTransaction = (transaction: DCATransaction) => {
    setEditingTransaction(transaction)
    setTransactionForm({
      date: transaction.date.split('T')[0],
      type: transaction.btcQuantity < 0 ? 'sell' : 'buy', // 🟠 NUOVO: rileva da segno
      broker: transaction.broker,
      info: transaction.info,
      btcQuantity: Math.abs(transaction.btcQuantity).toString(), // 🟠 SEMPRE POSITIVO IN UI
      eurPaid: transaction.eurPaid.toString(),
      notes: transaction.notes || ''
    })
    setShowEditTransaction(true)
  }

  // 🟠 AGGIORNATO SOLO: aggiungi campo type
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
          type: transactionForm.type, // 🟠 NUOVO CAMPO
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
          type: 'buy', // 🟠 RESET A BUY
          broker: '',
          info: '',
          btcQuantity: '',
          eurPaid: '',
          notes: ''
        })
        fetchPortfolio()
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Errore nella creazione della transazione')
      }
    } catch (error) {
      console.error('Errore nell\'aggiunta transazione:', error)
    } finally {
      setSubmitLoading(false)
    }
  }

  // 🟠 AGGIORNATO SOLO: aggiungi campo type
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
          type: transactionForm.type, // 🟠 NUOVO CAMPO
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
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Errore nell\'aggiornamento della transazione')
      }
    } catch (error) {
      console.error('Errore nell\'aggiornamento transazione:', error)
    } finally {
      setSubmitLoading(false)
    }
  }

  const deleteTransaction = async (id: number) => {
    if (!confirm('Sei sicuro di voler cancellare questa transazione?'))
      return

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

  // Gestione fee di rete - INVARIATO
  const editFee = (fee: NetworkFee) => {
    setEditingFee(fee)
    setFeeForm({
      date: fee.date.split('T')[0],
      sats: fee.sats.toString(),
      description: fee.description || ''
    })
    setShowEditFee(true)
  }

  const addFee = async () => {
    if (!feeForm.sats) {
      alert('Inserisci il numero di sats')
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
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Errore nella creazione della fee')
      }
    } catch (error) {
      console.error('Errore nell\'aggiunta fee:', error)
    } finally {
      setSubmitLoading(false)
    }
  }

  const updateFee = async () => {
    if (!editingFee || !feeForm.sats) {
      alert('Inserisci il numero di sats')
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
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Errore nell\'aggiornamento della fee')
      }
    } catch (error) {
      console.error('Errore nell\'aggiornamento fee:', error)
    } finally {
      setSubmitLoading(false)
    }
  }

  const deleteFee = async (id: number) => {
    if (!confirm('Sei sicuro di voler cancellare questa fee?'))
      return

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

  // Gestione portfolio - INVARIATO
  const updatePortfolioName = async () => {
    if (!portfolioName.trim()) {
      alert('Inserisci un nome per il portafoglio')
      return
    }

    try {
      setSubmitLoading(true)
      const response = await fetch(`/api/dca-portfolios/${portfolioId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: portfolioName.trim()
        })
      })

      if (response.ok) {
        setShowEditPortfolio(false)
        fetchPortfolio()
      }
    } catch (error) {
      console.error('Errore nell\'aggiornamento nome:', error)
    } finally {
      setSubmitLoading(false)
    }
  }

  const deletePortfolio = async () => {
    if (!confirm('Sei sicuro di voler cancellare questo portafoglio? Questa azione cancellerà anche tutte le transazioni e fee associate.')) {
      return
    }

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

  // Effects - INVARIATO
  useEffect(() => {
    if (portfolioId) {
      fetchPortfolio()
      fetchBitcoinPrice()
      
      // Auto-refresh prezzo ogni 15 minuti
      const interval = setInterval(fetchBitcoinPrice, 15 * 60 * 1000)
      return () => clearInterval(interval)
    }
  }, [portfolioId])

  useEffect(() => {
    setSelectAllTransactions(
      filteredTransactions.length > 0 && 
      selectedTransactions.length === filteredTransactions.length
    )
  }, [selectedTransactions, filteredTransactions])

  useEffect(() => {
    if (portfolio) {
      setSelectAllFees(
        portfolio.networkFees.length > 0 && 
        selectedFees.length === portfolio.networkFees.length
      )
    }
  }, [selectedFees, portfolio])

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-adaptive-900">Portfolio DCA</h1>
            <p className="text-adaptive-600">Caricamento...</p>
          </div>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="text-adaptive-600">Caricamento portfolio...</div>
        </div>
      </div>
    )
  }

  if (!portfolio) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-adaptive-900">Portfolio Non Trovato</h1>
            <p className="text-adaptive-600">Il portfolio richiesto non esiste.</p>
          </div>
        </div>
        <div className="text-center">
          <Link href="/investments" className="text-blue-600 hover:text-blue-800">
            ← Torna agli Investimenti
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header - RIPRISTINATO ORIGINALE */}
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/investments" className="text-blue-600 hover:text-blue-800">
              ← Investimenti
            </Link>
            <span className="text-adaptive-400">/</span>
            <h1 className="text-3xl font-bold text-adaptive-900">{portfolio.name}</h1>
            <button
              onClick={() => setShowEditPortfolio(true)}
              className="text-adaptive-600 hover:text-adaptive-800 p-1"
            >
              ✏️
            </button>
          </div>
          <p className="text-adaptive-600">Portfolio DCA Bitcoin</p>
        </div>
      </div>

      {/* Prezzo Bitcoin - RIPRISTINATO DESIGN ORIGINALE */}
      <div className="card-adaptive p-6 rounded-lg shadow-sm border-adaptive">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">₿</span>
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
              onClick={() => fetchBitcoinPrice(true)}
              className="px-3 py-1 bg-orange-600 text-white rounded-md hover:bg-orange-700 text-sm"
              disabled={priceLoading}
            >
              🔄 Aggiorna Prezzo
            </button>
          </div>
        </div>
      </div>

      {/* Statistiche Principali - RIPRISTINATO DESIGN ORIGINALE */}
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
              <div className="text-xl font-bold text-green-600">
                {formatCurrency(currentValue)}
              </div>
              <div className="text-xs text-adaptive-500 mt-1">
                {formatBTC(portfolio.stats.netBTC)} × {formatCurrency(btcPrice.btcEur)}
              </div>
            </>
          ) : (
            <div className="text-xl font-bold text-adaptive-500">
              Calcolo...
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
                {formatCurrency(Math.abs(currentValue - portfolio.stats.totalEUR))} {roi >= 0 ? 'profitto' : 'perdita'}
              </div>
            </>
          ) : (
            <div className="text-xl font-bold text-adaptive-500">
              Calcolo...
            </div>
          )}
        </div>
      </div>

      {/* Transazioni Section - RIPRISTINATO DESIGN ORIGINALE */}
      <div className="card-adaptive rounded-lg shadow-sm border-adaptive">
        <div className="p-6 border-b border-adaptive">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-adaptive-900">
              Transazioni Bitcoin ({portfolio.stats.transactionCount})
            </h3>
            <div className="flex items-center space-x-3">
              {selectedTransactions.length > 0 && (
                <button
                  onClick={handleBulkDeleteTransactions}
                  className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Elimina {selectedTransactions.length}
                </button>
              )}
              <button
                onClick={() => setShowAddTransaction(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                + Nuova Transazione
              </button>
            </div>
          </div>
        </div>

        {/* Filtri - INVARIATO */}
        <div className="p-6 bg-gray-50 border-b border-adaptive">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <input
              type="text"
              placeholder="Cerca..."
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
              {Array.from(new Set(portfolio.transactions.map(t => t.broker))).map(broker => (
                <option key={broker} value={broker}>{broker}</option>
              ))}
            </select>
            <select
              value={infoFilter}
              onChange={(e) => setInfoFilter(e.target.value)}
              className="px-3 py-2 border border-adaptive rounded-md"
            >
              <option value="">Tutte le info</option>
              {Array.from(new Set(portfolio.transactions.map(t => t.info))).map(info => (
                <option key={info} value={info}>{info}</option>
              ))}
            </select>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="px-3 py-2 border border-adaptive rounded-md"
            />
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="px-3 py-2 border border-adaptive rounded-md"
            />
          </div>
        </div>

        {/* Tabella - 🟠 AGGIUNTO SOLO: Badge tipo transazione */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectAllTransactions}
                    onChange={handleSelectAllTransactions}
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-adaptive-500 uppercase">Data</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-adaptive-500 uppercase">Tipo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-adaptive-500 uppercase">Broker</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-adaptive-500 uppercase">Info</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-adaptive-500 uppercase">BTC</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-adaptive-500 uppercase">EUR</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-adaptive-500 uppercase">Prezzo</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-adaptive-500 uppercase">Azioni</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredTransactions.map((transaction) => (
                <tr key={transaction.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedTransactions.includes(transaction.id)}
                      onChange={() => handleSelectTransaction(transaction.id)}
                    />
                  </td>
                  <td className="px-4 py-3 text-sm text-adaptive-900">
                    {formatDate(transaction.date)}
                  </td>
                  <td className="px-4 py-3">
                    {/* 🟠 NUOVO: Badge tipo basato su segno di btcQuantity */}
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                      transaction.btcQuantity < 0
                        ? 'bg-red-100 text-red-800'
                        : 'bg-green-100 text-green-800'
                    }`}>
                      {transaction.btcQuantity < 0 ? '💰 Sell' : '🛒 Buy'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-adaptive-900">{transaction.broker}</td>
                  <td className="px-4 py-3 text-sm text-adaptive-600">{transaction.info}</td>
                  <td className="px-4 py-3 text-sm text-adaptive-900 text-right font-mono">
                    {/* 🟠 AGGIORNATO: Mostra segno corretto */}
                    <span className={transaction.btcQuantity < 0 ? 'text-red-600' : 'text-green-600'}>
                      {transaction.btcQuantity < 0 ? '' : '+'}
                      {formatBTC(Math.abs(transaction.btcQuantity))}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-adaptive-900 text-right font-mono">
                    {formatCurrency(transaction.eurPaid)}
                  </td>
                  <td className="px-4 py-3 text-sm text-adaptive-600 text-right font-mono">
                    €{(transaction.eurPaid / Math.abs(transaction.btcQuantity)).toFixed(0)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center space-x-2">
                      <button
                        onClick={() => editTransaction(transaction)}
                        className="text-blue-600 hover:text-blue-900 text-sm"
                      >
                        Modifica
                      </button>
                      <button
                        onClick={() => deleteTransaction(transaction.id)}
                        className="text-red-600 hover:text-red-900 text-sm"
                      >
                        Elimina
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredTransactions.length === 0 && (
          <div className="p-6 text-center text-adaptive-500">
            {portfolio.transactions.length === 0 
              ? 'Nessuna transazione presente.'
              : 'Nessuna transazione corrisponde ai filtri.'
            }
          </div>
        )}
      </div>

      {/* Network Fees Section - INVARIATO */}
      <div className="card-adaptive rounded-lg shadow-sm border-adaptive">
        <div className="p-6 border-b border-adaptive">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-adaptive-900">
              Fee di Rete ({portfolio.stats.feesCount})
            </h3>
            <div className="flex items-center space-x-3">
              {selectedFees.length > 0 && (
                <button
                  onClick={handleBulkDeleteFees}
                  className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-md hover:bg-red-700"
                >
                  Elimina {selectedFees.length}
                </button>
              )}
              <button
                onClick={() => setShowAddFee(true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
              >
                + Nuova Fee
              </button>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left">
                  <input
                    type="checkbox"
                    checked={selectAllFees}
                    onChange={handleSelectAllFees}
                  />
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-adaptive-500 uppercase">Data</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-adaptive-500 uppercase">Sats</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-adaptive-500 uppercase">BTC</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-adaptive-500 uppercase">Descrizione</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-adaptive-500 uppercase">Azioni</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {portfolio.networkFees.map((fee) => (
                <tr key={fee.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedFees.includes(fee.id)}
                      onChange={() => handleSelectFee(fee.id)}
                    />
                  </td>
                  <td className="px-4 py-3 text-sm text-adaptive-900">
                    {formatDate(fee.date)}
                  </td>
                  <td className="px-4 py-3 text-sm text-adaptive-900 text-right font-mono">
                    {fee.sats.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-adaptive-600 text-right font-mono">
                    {formatBTC(satsToBTC(fee.sats))}
                  </td>
                  <td className="px-4 py-3 text-sm text-adaptive-600">
                    {fee.description || '-'}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex justify-center space-x-2">
                      <button
                        onClick={() => editFee(fee)}
                        className="text-blue-600 hover:text-blue-900 text-sm"
                      >
                        Modifica
                      </button>
                      <button
                        onClick={() => deleteFee(fee.id)}
                        className="text-red-600 hover:text-red-900 text-sm"
                      >
                        Elimina
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {portfolio.networkFees.length === 0 && (
          <div className="p-6 text-center text-adaptive-500">
            Nessuna fee di rete registrata.
          </div>
        )}
      </div>

      {/* 🟠 MODAL TRANSAZIONE - DESIGN ORIGINALE + SOLO Toggle Buy/Sell */}
      {(showAddTransaction || showEditTransaction) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4 modal-content">
            <h3 className="text-lg font-semibold text-adaptive-900 mb-4">
              {showEditTransaction ? 'Modifica Transazione' : 'Nuova Transazione Bitcoin'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">Data *</label>
                <input
                  type="date"
                  value={transactionForm.date}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-adaptive rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* 🟠 NUOVO: Toggle Buy/Sell semplice */}
              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-2">Tipo Operazione *</label>
                <div className="flex bg-gray-100 rounded-md p-1">
                  <button
                    type="button"
                    onClick={() => setTransactionForm(prev => ({ ...prev, type: 'buy' }))}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium ${
                      transactionForm.type === 'buy'
                        ? 'bg-green-600 text-white'
                        : 'text-gray-600'
                    }`}
                  >
                    🛒 Acquisto
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransactionForm(prev => ({ ...prev, type: 'sell' }))}
                    className={`flex-1 py-2 px-4 rounded-md text-sm font-medium ${
                      transactionForm.type === 'sell'
                        ? 'bg-red-600 text-white'
                        : 'text-gray-600'
                    }`}
                  >
                    💰 Vendita
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">Broker *</label>
                <input
                  type="text"
                  value={transactionForm.broker}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, broker: e.target.value }))}
                  placeholder="es. Binance, Kraken..."
                  className="w-full px-3 py-2 border border-adaptive rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">Info *</label>
                <input
                  type="text"
                  value={transactionForm.info}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, info: e.target.value }))}
                  placeholder={transactionForm.type === 'buy' ? "es. DCA, Regalo, Acquisto..." : "es. Vendita, Realizzo, Emergenza..."}
                  className="w-full px-3 py-2 border border-adaptive rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">
                  Quantità BTC {transactionForm.type === 'sell' ? 'Venduti' : 'Acquistati'} *
                </label>
                <input
                  type="number"
                  step="0.00000001"
                  value={transactionForm.btcQuantity}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, btcQuantity: e.target.value }))}
                  placeholder="0.01012503"
                  className="w-full px-3 py-2 border border-adaptive rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">
                  {transactionForm.type === 'buy' ? 'EUR Pagati' : 'EUR Ricevuti'} *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={transactionForm.eurPaid}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, eurPaid: e.target.value }))}
                  placeholder="275.00"
                  className="w-full px-3 py-2 border border-adaptive rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">Note</label>
                <input
                  type="text"
                  value={transactionForm.notes}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, notes: e.target.value }))}
                  placeholder="Verificato, etc..."
                  className="w-full px-3 py-2 border border-adaptive rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAddTransaction(false)
                  setShowEditTransaction(false)
                  setEditingTransaction(null)
                }}
                className="flex-1 px-4 py-2 text-adaptive-600 hover:text-adaptive-800"
              >
                Annulla
              </button>
              <button
                onClick={showEditTransaction ? updateTransaction : addTransaction}
                disabled={submitLoading}
                className={`flex-1 px-4 py-2 text-white rounded-md disabled:opacity-50 ${
                  transactionForm.type === 'buy' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {submitLoading ? 'Elaborazione...' : (
                  showEditTransaction ? 'Aggiorna' : (
                    transactionForm.type === 'buy' ? '🛒 Acquista' : '💰 Vendi'
                  )
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modali Fee e Portfolio - INVARIATI */}
      {(showAddFee || showEditFee) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4 modal-content">
            <h3 className="text-lg font-semibold text-adaptive-900 mb-4">
              {showEditFee ? 'Modifica Fee di Rete' : 'Nuova Fee di Rete'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">Data *</label>
                <input
                  type="date"
                  value={feeForm.date}
                  onChange={(e) => setFeeForm(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-adaptive rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">Sats *</label>
                <input
                  type="number"
                  value={feeForm.sats}
                  onChange={(e) => setFeeForm(prev => ({ ...prev, sats: e.target.value }))}
                  placeholder="2000"
                  className="w-full px-3 py-2 border border-adaptive rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                {feeForm.sats && (
                  <p className="text-xs text-adaptive-500 mt-1">
                    = {formatBTC(satsToBTC(parseInt(feeForm.sats)))}
                  </p>
                )}
              </div>
              
              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">Descrizione</label>
                <input
                  type="text"
                  value={feeForm.description}
                  onChange={(e) => setFeeForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Transfer to cold wallet"
                  className="w-full px-3 py-2 border border-adaptive rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => {
                  setShowAddFee(false)
                  setShowEditFee(false)
                  setEditingFee(null)
                }}
                className="flex-1 px-4 py-2 text-adaptive-600 hover:text-adaptive-800"
              >
                Annulla
              </button>
              <button
                onClick={showEditFee ? updateFee : addFee}
                disabled={submitLoading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {submitLoading ? 'Salvataggio...' : (showEditFee ? 'Aggiorna' : 'Aggiungi')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showEditPortfolio && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md mx-4 modal-content">
            <h3 className="text-lg font-semibold text-adaptive-900 mb-4">
              Modifica Nome Portfolio
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">Nome Portfolio *</label>
                <input
                  type="text"
                  value={portfolioName}
                  onChange={(e) => setPortfolioName(e.target.value)}
                  placeholder="es. DCA Bitcoin 2024"
                  className="w-full px-3 py-2 border border-adaptive rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowEditPortfolio(false)}
                className="flex-1 px-4 py-2 text-adaptive-600 hover:text-adaptive-800"
              >
                Annulla
              </button>
              <button
                onClick={updatePortfolioName}
                disabled={submitLoading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
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