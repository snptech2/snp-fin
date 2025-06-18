'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'

interface DCATransaction {
  id: number
  date: string
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
  btcAmount: number
}

interface DCAPortfolio {
  id: number
  name: string
  type: string
  transactions: DCATransaction[]
  networkFees: NetworkFee[]
  stats: {
    totalBTC: number
    totalEUR: number
    totalFeesSats: number
    totalFeesBTC: number
    netBTC: number
    avgPrice: number
    transactionCount: number
    feesCount: number
  }
}

interface BitcoinPrice {
  btcEur: number
  btcUsd: number
  timestamp: number
  cached?: boolean
}

export default function DCAPortfolioPage() {
  const params = useParams()
  const router = useRouter()
  const portfolioId = params.id as string

  const [portfolio, setPortfolio] = useState<DCAPortfolio | null>(null)
  const [btcPrice, setBtcPrice] = useState<BitcoinPrice | null>(null)
  const [loading, setLoading] = useState(true)
  const [priceLoading, setPriceLoading] = useState(false)
  
  // Modals
  const [showAddTransaction, setShowAddTransaction] = useState(false)
  const [showAddFee, setShowAddFee] = useState(false)
  const [showEditPortfolio, setShowEditPortfolio] = useState(false)
  const [showEditTransaction, setShowEditTransaction] = useState(false)
  const [showEditFee, setShowEditFee] = useState(false)
  
  // Forms
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
  
  const [portfolioName, setPortfolioName] = useState('')
  const [submitLoading, setSubmitLoading] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<DCATransaction | null>(null)
  const [editingFee, setEditingFee] = useState<NetworkFee | null>(null)

  useEffect(() => {
    if (portfolioId) {
      fetchPortfolio()
      fetchBitcoinPrice()
      
      // Auto-refresh prezzo ogni 15 minuti
      const interval = setInterval(fetchBitcoinPrice, 15 * 60 * 1000)
      return () => clearInterval(interval)
    }
  }, [portfolioId])

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

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const formatBTC = (amount: number) => {
    return amount.toFixed(8) + ' BTC'
  }

  // 🔧 FIX: Conversione corretta sats→BTC
  const satsTobtc = (sats: number) => {
    return sats / 100000000 // 1 BTC = 100,000,000 sats
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT')
  }

  // 🔧 FIX: Calcolo prezzo medio carico EUR (formula E1/D1)
  const calculateAvgLoadPrice = () => {
    if (!portfolio || portfolio.stats.netBTC <= 0) return 0
    return portfolio.stats.totalEUR / portfolio.stats.netBTC
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="text-adaptive-600">Caricamento portafoglio...</div>
      </div>
    )
  }

  if (!portfolio) {
    return (
      <div className="space-y-6">
        <div className="text-adaptive-600">Portafoglio non trovato</div>
      </div>
    )
  }

  const currentValue = btcPrice ? portfolio.stats.netBTC * btcPrice.btcEur : 0
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

      {/* Statistiche Principali */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        {/* 🔧 FIX: Bitcoin NETTI nel primo card */}
        <div className="card-adaptive p-6 rounded-lg shadow-sm border-adaptive">
          <div className="text-sm text-adaptive-600 mb-1">Bitcoin Netti</div>
          <div className="text-xl font-bold text-adaptive-900 font-mono">
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

        {/* 🔧 FIX: Aggiunto prezzo medio carico EUR */}
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
                @ {formatCurrency(btcPrice.btcEur)} per BTC
              </div>
            </>
          ) : (
            <div className="text-xl font-bold text-gray-500">
              Caricamento prezzo...
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
              <div className={`text-xs mt-1 ${roi >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {roi >= 0 ? '+' : ''}{formatCurrency(currentValue - portfolio.stats.totalEUR)}
              </div>
            </>
          ) : (
            <div className="text-xl font-bold text-gray-500">
              ---%
            </div>
          )}
        </div>
      </div>

      {/* Prezzo Bitcoin Attuale */}
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">₿</span>
            <div>
              {priceLoading ? (
                <div className="text-sm text-gray-500">Aggiornamento prezzo...</div>
              ) : btcPrice ? (
                <>
                  <div className="text-lg font-bold text-gray-900">
                    {formatCurrency(btcPrice.btcEur)}
                  </div>
                  <div className="text-xs text-gray-500">
                    ${btcPrice.btcUsd.toLocaleString('en-US')} • Ultimo aggiornamento: {new Date(btcPrice.timestamp).toLocaleTimeString('it-IT')}
                  </div>
                </>
              ) : (
                <div className="text-sm text-gray-500">Prezzo non disponibile</div>
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

      {/* Transazioni */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-adaptive-900">Transazioni ({portfolio.stats.transactionCount})</h2>
        <div className="card-adaptive rounded-lg shadow-sm border-adaptive">
          <div className="p-6 border-b border-adaptive">
            <h3 className="text-lg font-medium text-adaptive-900">Lista Transazioni</h3>
          </div>
          <div className="p-6">
            {portfolio.transactions.length > 0 ? (
              <div className="space-y-3">
                {portfolio.transactions.map((transaction) => (
                  <div key={transaction.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
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
                      <div className="text-sm font-mono text-adaptive-900 min-w-[120px]">
                        {formatBTC(transaction.btcQuantity)}
                      </div>
                      <div className="text-sm text-adaptive-900 min-w-[80px]">
                        {formatCurrency(transaction.eurPaid)}
                      </div>
                      <div className="text-sm text-adaptive-500 flex-1">
                        {transaction.notes || '-'}
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
                <p className="text-adaptive-600">Nessuna transazione registrata. Aggiungi la prima transazione per iniziare!</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Fee di Rete */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-adaptive-900">Fee di Rete ({portfolio.stats.feesCount})</h2>
        <div className="card-adaptive rounded-lg shadow-sm border-adaptive">
          <div className="p-6 border-b border-adaptive">
            <h3 className="text-lg font-medium text-adaptive-900">Lista Fee di Rete</h3>
          </div>
          <div className="p-6">
            {portfolio.networkFees.length > 0 ? (
              <div className="space-y-3">
                {portfolio.networkFees.map((fee) => (
                  <div key={fee.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-4 flex-1">
                      <div className="text-sm text-adaptive-600 min-w-[80px]">
                        {formatDate(fee.date)}
                      </div>
                      <div className="text-sm font-mono text-adaptive-900 min-w-[100px]">
                        {fee.sats.toLocaleString()} sats
                      </div>
                      <div className="text-sm font-mono text-adaptive-900 min-w-[120px]">
                        {formatBTC(satsTobtc(fee.sats))}
                      </div>
                      <div className="text-sm text-adaptive-500 flex-1">
                        {fee.description || '-'}
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
                <p className="text-adaptive-600">Nessuna fee di rete registrata.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal Aggiungi/Modifica Transazione */}
      {(showAddTransaction || showEditTransaction) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="modal-content rounded-lg p-6 w-full max-w-md mx-4 max-h-screen overflow-y-auto">
            <h3 className="text-lg font-semibold text-adaptive-900 mb-4">
              {showEditTransaction ? 'Modifica Transazione' : 'Aggiungi Transazione'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-2">Data</label>
                <input
                  type="date"
                  value={transactionForm.date}
                  onChange={(e) => setTransactionForm({...transactionForm, date: e.target.value})}
                  className="w-full px-3 py-2 border border-adaptive rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-2">Broker *</label>
                <input
                  type="text"
                  value={transactionForm.broker}
                  onChange={(e) => setTransactionForm({...transactionForm, broker: e.target.value})}
                  placeholder="es. Binance, Kraken..."
                  className="w-full px-3 py-2 border border-adaptive rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-2">Info *</label>
                <input
                  type="text"
                  value={transactionForm.info}
                  onChange={(e) => setTransactionForm({...transactionForm, info: e.target.value})}
                  placeholder="es. DCA, Acquisto, Regalo..."
                  className="w-full px-3 py-2 border border-adaptive rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-2">Quantità BTC *</label>
                <input
                  type="number"
                  step="0.00000001"
                  value={transactionForm.btcQuantity}
                  onChange={(e) => setTransactionForm({...transactionForm, btcQuantity: e.target.value})}
                  placeholder="es. 0.01012503"
                  className="w-full px-3 py-2 border border-adaptive rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-2">€ Pagati *</label>
                <input
                  type="number"
                  step="0.01"
                  value={transactionForm.eurPaid}
                  onChange={(e) => setTransactionForm({...transactionForm, eurPaid: e.target.value})}
                  placeholder="es. 275.00"
                  className="w-full px-3 py-2 border border-adaptive rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-2">Note</label>
                <input
                  type="text"
                  value={transactionForm.notes}
                  onChange={(e) => setTransactionForm({...transactionForm, notes: e.target.value})}
                  placeholder="Note opzionali..."
                  className="w-full px-3 py-2 border border-adaptive rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    if (showEditTransaction) {
                      setShowEditTransaction(false)
                      setEditingTransaction(null)
                    } else {
                      setShowAddTransaction(false)
                    }
                    setTransactionForm({
                      date: new Date().toISOString().split('T')[0],
                      broker: '',
                      info: '',
                      btcQuantity: '',
                      eurPaid: '',
                      notes: ''
                    })
                  }}
                  className="px-4 py-2 text-adaptive-600 hover:text-adaptive-800"
                  disabled={submitLoading}
                >
                  Annulla
                </button>
                <button
                  onClick={showEditTransaction ? updateTransaction : addTransaction}
                  disabled={submitLoading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {submitLoading ? 'Salvataggio...' : (showEditTransaction ? 'Aggiorna' : 'Aggiungi')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Aggiungi/Modifica Fee */}
      {(showAddFee || showEditFee) && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="modal-content rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-adaptive-900 mb-4">
              {showEditFee ? 'Modifica Fee di Rete' : 'Aggiungi Fee di Rete'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-2">Data</label>
                <input
                  type="date"
                  value={feeForm.date}
                  onChange={(e) => setFeeForm({...feeForm, date: e.target.value})}
                  className="w-full px-3 py-2 border border-adaptive rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-2">Sats *</label>
                <input
                  type="number"
                  value={feeForm.sats}
                  onChange={(e) => setFeeForm({...feeForm, sats: e.target.value})}
                  placeholder="es. 1000"
                  className="w-full px-3 py-2 border border-adaptive rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-2">Descrizione</label>
                <input
                  type="text"
                  value={feeForm.description}
                  onChange={(e) => setFeeForm({...feeForm, description: e.target.value})}
                  placeholder="es. Transfer to cold wallet"
                  className="w-full px-3 py-2 border border-adaptive rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => {
                    if (showEditFee) {
                      setShowEditFee(false)
                      setEditingFee(null)
                    } else {
                      setShowAddFee(false)
                    }
                    setFeeForm({
                      date: new Date().toISOString().split('T')[0],
                      sats: '',
                      description: ''
                    })
                  }}
                  className="px-4 py-2 text-adaptive-600 hover:text-adaptive-800"
                  disabled={submitLoading}
                >
                  Annulla
                </button>
                <button
                  onClick={showEditFee ? updateFee : addFee}
                  disabled={submitLoading}
                  className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
                >
                  {submitLoading ? 'Salvataggio...' : (showEditFee ? 'Aggiorna' : 'Aggiungi')}
                </button>
              </div>
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
                <label className="block text-sm font-medium text-adaptive-700 mb-2">Nome Portafoglio</label>
                <input
                  type="text"
                  value={portfolioName}
                  onChange={(e) => setPortfolioName(e.target.value)}
                  className="w-full px-3 py-2 border border-adaptive rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowEditPortfolio(false)}
                  className="px-4 py-2 text-adaptive-600 hover:text-adaptive-800"
                  disabled={submitLoading}
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
        </div>
      )}
    </div>
  )
}