// src/app/investments/[id]/page.tsx - VERSIONE DEFINITIVA CORRETTA
'use client'
import { formatCurrency } from '@/utils/formatters'
import { useState, useEffect, useRef, use } from 'react'
import Link from 'next/link'

// Types
interface DCAPortfolio {
  id: number
  name: string
  type: string
  isActive: boolean
  accountId: number
  stats: {
    totalBTC: number
    netBTC: number
    totalFeesBTC: number
    totalEUR: number
    transactionCount: number
    feesCount: number
  }
  transactions: DCATransaction[]
  networkFees: NetworkFee[]
}

interface DCATransaction {
  id: number
  date: string
  type: string
  broker: string
  info: string
  btcQuantity: number
  eurPaid: number
  notes?: string | null
  purchasePrice: number
}

interface NetworkFee {
  id: number
  sats: number
  date: string
  description?: string | null
}

interface BitcoinPrice {
  btcUsd: number
  btcEur: number
  usdEur: number
  cached: boolean
  timestamp: string
}

const formatBTC = (amount: number) => {
  return `₿ ${amount.toFixed(8)}`
}

const formatSats = (sats: number) => {
  return `${sats.toLocaleString()} sats`
}

export default function PortfolioDashboard({ params }: { params: Promise<{ id: string }> }) {
  // FIX Next.js 15: Unwrap params Promise con React.use()
  const resolvedParams = use(params)
  const portfolioId = resolvedParams.id

  // Stati principali
  const [portfolio, setPortfolio] = useState<DCAPortfolio | null>(null)
  const [btcPrice, setBtcPrice] = useState<BitcoinPrice | null>(null)
  const [loading, setLoading] = useState(true)
  const [priceLoading, setPriceLoading] = useState(false)

  // Ref per gestire l'auto-refresh senza loop
  const intervalRef = useRef<NodeJS.Timeout | null>(null)

  // Stati per transazioni
  const [selectedTransactions, setSelectedTransactions] = useState<number[]>([])
  const [filteredTransactions, setFilteredTransactions] = useState<DCATransaction[]>([])
  const [searchTerm, setSearchTerm] = useState('')
  const [brokerFilter, setBrokerFilter] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  // Stati form e modal
  const [showAddTransaction, setShowAddTransaction] = useState(false)
  const [showEditTransaction, setShowEditTransaction] = useState(false)
  const [showAddFee, setShowAddFee] = useState(false)
  const [showEditPortfolio, setShowEditPortfolio] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<DCATransaction | null>(null)
  const [submitLoading, setSubmitLoading] = useState(false)

  // Form states
  const [transactionForm, setTransactionForm] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'buy',
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
    name: ''
  })

  // Fetch portfolio
  const fetchPortfolio = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/dca-portfolios/${portfolioId}`)
      if (response.ok) {
        const data = await response.json()
        setPortfolio(data)
        setPortfolioForm({ name: data.name })
      }
    } catch (error) {
      console.error('Errore nel caricamento portfolio:', error)
    } finally {
      setLoading(false)
    }
  }

  // FIX DEFINITIVO per Bitcoin price
  const fetchBitcoinPrice = async (force = false) => {
    try {
      setPriceLoading(true)
      
      // Aggiungi timestamp unico per evitare cache browser
      const timestamp = Date.now()
      let url = `/api/bitcoin-price?t=${timestamp}`
      if (force) {
        url += '&force=true'
      }
      
      console.log('🔍 Fetching price with URL:', url)
      
      const response = await fetch(url, {
        method: 'GET',
        cache: 'no-store',
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ Price fetched:', data)
        setBtcPrice(data)
      } else {
        console.error('❌ Price fetch failed:', response.status)
      }
    } catch (error) {
      console.error('💥 Error fetching price:', error)
    } finally {
      setPriceLoading(false)
    }
  }

  // Setup auto-refresh ogni 5 minuti - FIX: Nessun loop infinito
  useEffect(() => {
    // Clear existing interval
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
    }

    // Setup new interval per auto-refresh
    intervalRef.current = setInterval(() => {
      console.log('⏰ Auto-refreshing Bitcoin price...')
      fetchBitcoinPrice(false) // Auto-refresh senza force
    }, 5 * 60 * 1000) // 5 minuti

    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
      }
    }
  }, []) // Dipendenze vuote = solo al mount

  // Calcoli derivati
  const currentValue = btcPrice && portfolio ? portfolio.stats.netBTC * btcPrice.btcEur : 0
  const roi = portfolio && currentValue ? ((currentValue - portfolio.stats.totalEUR) / portfolio.stats.totalEUR) * 100 : 0

  const calculateAvgLoadPrice = () => {
    if (!portfolio || portfolio.stats.netBTC === 0) return 0
    return portfolio.stats.totalEUR / portfolio.stats.netBTC
  }

  // Filter transactions
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

  // Get unique brokers for filter
  const uniqueBrokers = portfolio ? [...new Set(portfolio.transactions.map(t => t.broker))] : []
  const uniqueTypes = portfolio ? [...new Set(portfolio.transactions.map(t => t.type))] : []

  // Load data on mount
  useEffect(() => {
    fetchPortfolio()
    fetchBitcoinPrice() // Initial load
  }, [portfolioId])

  // Transaction management functions
  const editTransaction = (transaction: DCATransaction) => {
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
          type: transactionForm.type,
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
          type: 'buy',
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
          type: transactionForm.type,
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
        setTransactionForm({
          date: new Date().toISOString().split('T')[0],
          type: 'buy',
          broker: '',
          info: '',
          btcQuantity: '',
          eurPaid: '',
          notes: ''
        })
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

  // Loading state
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
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <div className="flex items-center gap-3">
            <Link href="/investments" className="text-blue-600 hover:text-blue-800">
              ← Investimenti
            </Link>
            <span className="text-adaptive-600">/</span>
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
        <button
          onClick={() => fetchBitcoinPrice(true)}
          className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
          disabled={priceLoading}
        >
          {priceLoading ? '🔄' : '📡'} Aggiorna Prezzo
        </button>
      </div>

      {/* Prezzo Bitcoin */}
      <div className="card-adaptive p-4 rounded-lg border-adaptive">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">₿</span>
            <div>
              <h3 className="text-sm font-medium text-adaptive-500">Bitcoin</h3>
              {priceLoading ? (
                <div className="text-lg text-adaptive-600">Aggiornamento...</div>
              ) : btcPrice ? (
                <>
                  <div className="text-2xl font-bold text-adaptive-900">
                    {formatCurrency(btcPrice.btcEur)}
                  </div>
                  <div className="text-sm text-adaptive-500">
                    ${btcPrice.btcUsd.toLocaleString('en-US')} • {btcPrice.cached ? 'Cache' : 'Live'}
                  </div>
                </>
              ) : (
                <div className="text-lg text-adaptive-600">Prezzo non disponibile</div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Statistiche Principali */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card-adaptive p-4 rounded-lg border-adaptive">
          <h3 className="text-sm font-medium text-adaptive-500">Bitcoin Netti</h3>
          <p className="text-2xl font-bold text-adaptive-900">
            {formatBTC(portfolio.stats.netBTC)}
          </p>
          <p className="text-sm text-adaptive-600">
            ({formatBTC(portfolio.stats.totalBTC)} - {formatBTC(portfolio.stats.totalFeesBTC)} fee)
          </p>
        </div>

        <div className="card-adaptive p-4 rounded-lg border-adaptive">
          <h3 className="text-sm font-medium text-adaptive-500">Investimento Totale</h3>
          <p className="text-2xl font-bold text-adaptive-900">
            {formatCurrency(portfolio.stats.totalEUR)}
          </p>
          <p className="text-sm text-adaptive-600">
            {portfolio.stats.transactionCount} transazioni
          </p>
        </div>

        <div className="card-adaptive p-4 rounded-lg border-adaptive">
          <h3 className="text-sm font-medium text-adaptive-500">Prezzo Medio Carico</h3>
          <p className="text-2xl font-bold text-adaptive-900">
            {formatCurrency(calculateAvgLoadPrice())}
          </p>
          <p className="text-sm text-adaptive-600">
            per BTC (EUR ÷ BTC netti)
          </p>
        </div>

        <div className="card-adaptive p-4 rounded-lg border-adaptive">
          <h3 className="text-sm font-medium text-adaptive-500">
            {btcPrice && currentValue ? 'Valore Attuale' : 'ROI'}
          </h3>
          {btcPrice && currentValue ? (
            <>
              <p className="text-2xl font-bold text-green-600">
                {formatCurrency(currentValue)}
              </p>
              <p className="text-sm text-adaptive-600">
                {formatBTC(portfolio.stats.netBTC)} × {formatCurrency(btcPrice.btcEur)}
              </p>
            </>
          ) : (
            <p className="text-2xl font-bold text-adaptive-500">
              Calcolo...
            </p>
          )}
        </div>
      </div>

      {/* ROI Card - SE DISPONIBILE */}
      {btcPrice && currentValue && (
        <div className="card-adaptive p-4 rounded-lg border-adaptive">
          <h3 className="text-sm font-medium text-adaptive-500">Rendimento (ROI)</h3>
          <div className={`text-2xl font-bold ${roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {roi >= 0 ? '+' : ''}{roi.toFixed(2)}%
          </div>
          <p className="text-sm text-adaptive-600">
            {formatCurrency(Math.abs(currentValue - portfolio.stats.totalEUR))} {roi >= 0 ? 'profitto' : 'perdita'}
          </p>
        </div>
      )}

      {/* Transazioni Section */}
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

        {/* Filtri - SFONDO SCURO CORRETTO */}
        <div className="p-6 border-b border-adaptive">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
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
              <option value="">Tutti i Broker</option>
              {uniqueBrokers.map(broker => (
                <option key={broker} value={broker}>{broker}</option>
              ))}
            </select>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className="px-3 py-2 border border-adaptive rounded-md"
            >
              <option value="">Tutti i Tipi</option>
              {uniqueTypes.map(type => (
                <option key={type} value={type}>
                  {type === 'buy' ? 'Acquisto' : 'Vendita'}
                </option>
              ))}
            </select>
            <div className="text-sm text-adaptive-600 self-center">
              {filteredTransactions.length} di {portfolio.transactions.length} transazioni
            </div>
          </div>
        </div>

        {/* Lista Transazioni - LAYOUT TABELLARE DETTAGLIATO */}
        <div className="divide-y divide-adaptive">
          {filteredTransactions.length === 0 ? (
            <div className="p-8 text-center text-adaptive-600">
              {portfolio.transactions.length === 0 
                ? 'Nessuna transazione nel portfolio. Aggiungi la prima!'
                : 'Nessuna transazione trovata con i filtri attuali.'
              }
            </div>
          ) : (
            filteredTransactions.map((transaction) => {
              // Calcola valore attuale della transazione
              const currentTransactionValue = btcPrice ? 
                Math.abs(transaction.btcQuantity) * btcPrice.btcEur : 0
              
              return (
                <div key={transaction.id} className="p-4 bg-gray-50 hover:bg-gray-100">
                  <div className="flex items-center justify-between">
                    {/* Checkbox e Badge Tipo */}
                    <div className="flex items-center space-x-4 w-20">
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
                        className="w-4 h-4"
                      />
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        transaction.type === 'buy' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {transaction.type === 'buy' ? 'ACQUISTO' : 'VENDITA'}
                      </span>
                    </div>
                    
                    {/* Dettagli Transazione - Layout Strutturato */}
                    <div className="flex-1 grid grid-cols-1 lg:grid-cols-7 gap-4 items-center">
                      {/* Data */}
                      <div className="text-center">
                        <p className="text-sm font-medium text-adaptive-900">
                          {new Date(transaction.date).toLocaleDateString('it-IT')}
                        </p>
                        <p className="text-xs text-adaptive-500">Data</p>
                      </div>
                      
                      {/* Broker */}
                      <div className="text-center">
                        <p className="text-sm font-medium text-adaptive-900">
                          {transaction.broker}
                        </p>
                        <p className="text-xs text-adaptive-500">Broker</p>
                      </div>
                      
                      {/* Info */}
                      <div className="text-center">
                        <p className="text-sm font-medium text-adaptive-900">
                          {transaction.info}
                        </p>
                        <p className="text-xs text-adaptive-500">Info</p>
                      </div>
                      
                      {/* Unità BTC */}
                      <div className="text-center">
                        <p className="text-sm font-medium text-orange-600">
                          {formatBTC(Math.abs(transaction.btcQuantity))}
                        </p>
                        <p className="text-xs text-adaptive-500">Unità</p>
                      </div>
                      
                      {/* Pagato */}
                      <div className="text-center">
                        <p className={`text-sm font-medium ${
                          transaction.type === 'buy' ? 'text-red-600' : 'text-green-600'
                        }`}>
                          {transaction.type === 'buy' ? '-' : '+'}{formatCurrency(transaction.eurPaid)}
                        </p>
                        <p className="text-xs text-adaptive-500">
                          {transaction.type === 'buy' ? 'Pagato' : 'Ricevuto'}
                        </p>
                      </div>
                      
                      {/* Valore Attuale */}
                      <div className="text-center">
                        {btcPrice ? (
                          <>
                            <p className="text-sm font-medium text-green-600">
                              {formatCurrency(currentTransactionValue)}
                            </p>
                            <p className="text-xs text-adaptive-500">Valore Attuale</p>
                          </>
                        ) : (
                          <>
                            <p className="text-sm text-adaptive-500">Calcolo...</p>
                            <p className="text-xs text-adaptive-500">Valore Attuale</p>
                          </>
                        )}
                      </div>
                      
                      {/* Prezzo di Acquisto */}
                      <div className="text-center">
                        <p className="text-sm font-medium text-adaptive-900">
                          {formatCurrency(transaction.purchasePrice)}
                        </p>
                        <p className="text-xs text-adaptive-500">Prezzo/BTC</p>
                      </div>
                    </div>
                    
                    {/* Azioni */}
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => editTransaction(transaction)}
                        className="text-blue-600 hover:text-blue-800 p-1"
                        title="Modifica"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => deleteTransaction(transaction.id)}
                        className="text-red-600 hover:text-red-800 p-1"
                        title="Cancella"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                  
                  {/* Note (se presenti) */}
                  {transaction.notes && (
                    <div className="mt-2 pt-2 border-t border-adaptive">
                      <p className="text-xs text-adaptive-600">
                        <span className="font-medium">Note:</span> {transaction.notes}
                      </p>
                    </div>
                  )}
                </div>
              )
            })
          )}
        </div>
      </div>

      {/* Network Fees Section */}
      <div className="card-adaptive rounded-lg shadow-sm border-adaptive">
        <div className="p-6 border-b border-adaptive">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-adaptive-900">
              Fee di Rete ({portfolio.stats.feesCount})
            </h3>
            <button
              onClick={() => setShowAddFee(true)}
              className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
            >
              + Nuova Fee
            </button>
          </div>
        </div>

        <div className="divide-y divide-adaptive">
          {portfolio.networkFees.length === 0 ? (
            <div className="p-8 text-center text-adaptive-600">
              Nessuna fee di rete registrata.
            </div>
          ) : (
            portfolio.networkFees.map((fee) => (
              <div key={fee.id} className="p-4 bg-gray-50 hover:bg-gray-100">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-adaptive-900">
                      {formatSats(fee.sats)} • {formatBTC(fee.sats / 100000000)}
                    </p>
                    <p className="text-sm text-adaptive-600">
                      {new Date(fee.date).toLocaleDateString('it-IT')}
                      {fee.description && ` • ${fee.description}`}
                    </p>
                  </div>
                  <button
                    onClick={async () => {
                      if (confirm('Elimina questa fee di rete?')) {
                        try {
                          await fetch(`/api/network-fees/${fee.id}`, { method: 'DELETE' })
                          fetchPortfolio()
                        } catch (error) {
                          console.error('Errore eliminazione fee:', error)
                        }
                      }
                    }}
                    className="text-red-600 hover:text-red-800 p-1"
                  >
                    🗑️
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal per nuova/modifica transazione */}
      {(showAddTransaction || showEditTransaction) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="modal-content rounded-lg max-w-md w-full max-h-screen overflow-y-auto">
            <div className="p-6">
              <h3 className="text-lg font-medium text-adaptive-900 mb-4">
                {showAddTransaction ? 'Nuova Transazione' : 'Modifica Transazione'}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-adaptive-700 mb-1">
                    Data
                  </label>
                  <input
                    type="date"
                    value={transactionForm.date}
                    onChange={(e) => setTransactionForm({...transactionForm, date: e.target.value})}
                    className="w-full px-3 py-2 border border-adaptive rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-adaptive-700 mb-1">
                    Tipo
                  </label>
                  <select
                    value={transactionForm.type}
                    onChange={(e) => setTransactionForm({...transactionForm, type: e.target.value})}
                    className="w-full px-3 py-2 border border-adaptive rounded-md"
                  >
                    <option value="buy">Acquisto</option>
                    <option value="sell">Vendita</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-adaptive-700 mb-1">
                    Broker *
                  </label>
                  <input
                    type="text"
                    value={transactionForm.broker}
                    onChange={(e) => setTransactionForm({...transactionForm, broker: e.target.value})}
                    placeholder="es. Binance, Kraken"
                    className="w-full px-3 py-2 border border-adaptive rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-adaptive-700 mb-1">
                    Info *
                  </label>
                  <input
                    type="text"
                    value={transactionForm.info}
                    onChange={(e) => setTransactionForm({...transactionForm, info: e.target.value})}
                    placeholder="es. DCA, Regalo, Vendita parziale"
                    className="w-full px-3 py-2 border border-adaptive rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-adaptive-700 mb-1">
                    Quantità BTC *
                  </label>
                  <input
                    type="number"
                    step="0.00000001"
                    value={transactionForm.btcQuantity}
                    onChange={(e) => setTransactionForm({...transactionForm, btcQuantity: e.target.value})}
                    placeholder="0.01234567"
                    className="w-full px-3 py-2 border border-adaptive rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-adaptive-700 mb-1">
                    € Pagati/Ricevuti *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={transactionForm.eurPaid}
                    onChange={(e) => setTransactionForm({...transactionForm, eurPaid: e.target.value})}
                    placeholder="275.00"
                    className="w-full px-3 py-2 border border-adaptive rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-adaptive-700 mb-1">
                    Note
                  </label>
                  <input
                    type="text"
                    value={transactionForm.notes}
                    onChange={(e) => setTransactionForm({...transactionForm, notes: e.target.value})}
                    placeholder="Note aggiuntive"
                    className="w-full px-3 py-2 border border-adaptive rounded-md"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => {
                    setShowAddTransaction(false)
                    setShowEditTransaction(false)
                    setEditingTransaction(null)
                  }}
                  className="flex-1 px-4 py-2 border border-adaptive rounded-md text-adaptive-700 hover:bg-gray-50"
                >
                  Annulla
                </button>
                <button
                  onClick={showAddTransaction ? addTransaction : updateTransaction}
                  disabled={submitLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitLoading ? 'Salvataggio...' : (showAddTransaction ? 'Aggiungi' : 'Aggiorna')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal per nuova fee */}
      {showAddFee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="modal-content rounded-lg max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-medium text-adaptive-900 mb-4">
                Nuova Fee di Rete
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-adaptive-700 mb-1">
                    Sats *
                  </label>
                  <input
                    type="number"
                    value={feeForm.sats}
                    onChange={(e) => setFeeForm({...feeForm, sats: e.target.value})}
                    placeholder="2000"
                    className="w-full px-3 py-2 border border-adaptive rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-adaptive-700 mb-1">
                    Data
                  </label>
                  <input
                    type="date"
                    value={feeForm.date}
                    onChange={(e) => setFeeForm({...feeForm, date: e.target.value})}
                    className="w-full px-3 py-2 border border-adaptive rounded-md"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-adaptive-700 mb-1">
                    Descrizione
                  </label>
                  <input
                    type="text"
                    value={feeForm.description}
                    onChange={(e) => setFeeForm({...feeForm, description: e.target.value})}
                    placeholder="Transfer to cold wallet"
                    className="w-full px-3 py-2 border border-adaptive rounded-md"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowAddFee(false)}
                  className="flex-1 px-4 py-2 border border-adaptive rounded-md text-adaptive-700 hover:bg-gray-50"
                >
                  Annulla
                </button>
                <button
                  onClick={async () => {
                    if (!feeForm.sats) {
                      alert('Inserisci i sats')
                      return
                    }
                    
                    try {
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
                        setShowAddFee(false)
                        setFeeForm({
                          sats: '',
                          date: new Date().toISOString().split('T')[0],
                          description: ''
                        })
                        fetchPortfolio()
                      } else {
                        alert('Errore nella creazione della fee')
                      }
                    } catch (error) {
                      console.error('Errore nell\'aggiunta fee:', error)
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700"
                >
                  Aggiungi Fee
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal per modifica portfolio */}
      {showEditPortfolio && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="modal-content rounded-lg max-w-md w-full">
            <div className="p-6">
              <h3 className="text-lg font-medium text-adaptive-900 mb-4">
                Modifica Portfolio
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-adaptive-700 mb-1">
                    Nome Portfolio *
                  </label>
                  <input
                    type="text"
                    value={portfolioForm.name}
                    onChange={(e) => setPortfolioForm({...portfolioForm, name: e.target.value})}
                    className="w-full px-3 py-2 border border-adaptive rounded-md"
                  />
                </div>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={() => setShowEditPortfolio(false)}
                  className="flex-1 px-4 py-2 border border-adaptive rounded-md text-adaptive-700 hover:bg-gray-50"
                >
                  Annulla
                </button>
                <button
                  onClick={async () => {
                    if (!portfolioForm.name.trim()) {
                      alert('Inserisci un nome per il portfolio')
                      return
                    }
                    
                    try {
                      const response = await fetch(`/api/dca-portfolios/${portfolioId}`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          name: portfolioForm.name.trim()
                        })
                      })

                      if (response.ok) {
                        setShowEditPortfolio(false)
                        fetchPortfolio()
                      } else {
                        alert('Errore nell\'aggiornamento del portfolio')
                      }
                    } catch (error) {
                      console.error('Errore nell\'aggiornamento portfolio:', error)
                    }
                  }}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Aggiorna
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}