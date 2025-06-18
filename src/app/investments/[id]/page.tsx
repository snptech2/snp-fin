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
    console.log('🚀 Frontend: Starting Bitcoin price fetch...')
    setPriceLoading(true)
    
    // Cache busting per forzare refresh
    const url = `/api/bitcoin-price?t=${Date.now()}`
    console.log('📡 Frontend: Calling API:', url)
    
    const response = await fetch(url)
    console.log('📊 Frontend: API Response status:', response.status)
    
    if (response.ok) {
      const data = await response.json()
      console.log('💰 Frontend: Price data received:', data)
      setBtcPrice(data)
    } else {
      console.error('❌ Frontend: API Error:', response.status, response.statusText)
    }
  } catch (error) {
    console.error('💥 Frontend: Network error:', error)
  } finally {
    console.log('✅ Frontend: Price fetch completed')
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
          ...transactionForm,
          btcQuantity: parseFloat(transactionForm.btcQuantity),
          eurPaid: parseFloat(transactionForm.eurPaid)
        })
      })

      if (response.ok) {
        setTransactionForm({
          date: new Date().toISOString().split('T')[0],
          broker: '',
          info: '',
          btcQuantity: '',
          eurPaid: '',
          notes: ''
        })
        setShowAddTransaction(false)
        fetchPortfolio()
      } else {
        const error = await response.json()
        alert(error.error || 'Errore nella creazione della transazione')
      }
    } catch (error) {
      alert('Errore nella creazione della transazione')
    } finally {
      setSubmitLoading(false)
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
          ...feeForm,
          sats: parseInt(feeForm.sats)
        })
      })

      if (response.ok) {
        setFeeForm({
          date: new Date().toISOString().split('T')[0],
          sats: '',
          description: ''
        })
        setShowAddFee(false)
        fetchPortfolio()
      } else {
        const error = await response.json()
        alert(error.error || 'Errore nella creazione della fee')
      }
    } catch (error) {
      alert('Errore nella creazione della fee')
    } finally {
      setSubmitLoading(false)
    }
  }

  const updatePortfolio = async () => {
    if (!portfolioName.trim()) {
      alert('Inserisci il nome del portafoglio')
      return
    }

    try {
      setSubmitLoading(true)
      const response = await fetch(`/api/dca-portfolios/${portfolioId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: portfolioName })
      })

      if (response.ok) {
        setShowEditPortfolio(false)
        fetchPortfolio()
      } else {
        const error = await response.json()
        alert(error.error || 'Errore nell\'aggiornamento del portafoglio')
      }
    } catch (error) {
      alert('Errore nell\'aggiornamento del portafoglio')
    } finally {
      setSubmitLoading(false)
    }
  }

  const deletePortfolio = async () => {
    if (!confirm('Sei sicuro di voler cancellare questo portafoglio? Verranno cancellate anche tutte le transazioni e fee associate.')) {
      return
    }

    try {
      const response = await fetch(`/api/dca-portfolios/${portfolioId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        router.push('/investments')
      } else {
        const error = await response.json()
        alert(error.error || 'Errore nella cancellazione del portafoglio')
      }
    } catch (error) {
      alert('Errore nella cancellazione del portafoglio')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const formatBTC = (amount: number | undefined) => {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '0.00000000 BTC'
  }
  return amount.toFixed(8) + ' BTC'
}

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT')
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-center items-center h-64">
          <div className="text-adaptive-600">Caricamento portafoglio...</div>
        </div>
      </div>
    )
  }

  if (!portfolio) {
    return (
      <div className="space-y-6">
        <div className="text-center">
          <p className="text-adaptive-600">Portafoglio non trovato</p>
          <Link href="/investments" className="text-blue-600 hover:text-blue-800">
            ← Torna agli investimenti
          </Link>
        </div>
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
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="card-adaptive p-6 rounded-lg shadow-sm border-adaptive">
          <div className="text-sm text-adaptive-600 mb-1">Bitcoin Totali</div>
          <div className="text-xl font-bold text-adaptive-900 font-mono">
            {formatBTC(portfolio.stats.totalBTC)}
          </div>
          <div className="text-xs text-adaptive-500 mt-1">
            - {formatBTC(portfolio.stats.totalFeesBTC)} fee = {formatBTC(portfolio.stats.netBTC)} netti
          </div>
        </div>

        <div className="card-adaptive p-6 rounded-lg shadow-sm border-adaptive">
          <div className="text-sm text-adaptive-600 mb-1">Investimento Totale</div>
          <div className="text-xl font-bold text-adaptive-900">
            {formatCurrency(portfolio.stats.totalEUR)}
          </div>
          <div className="text-xs text-adaptive-500 mt-1">
            Prezzo medio: {formatCurrency(portfolio.stats.avgPrice)}
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
                  <div className="font-bold text-orange-800">
                    Bitcoin: {formatCurrency(btcPrice.btcEur)}
                  </div>
                  <div className="text-xs text-orange-600">
                    ${btcPrice.btcUsd.toLocaleString()} USD
                    {btcPrice.cached && ' (cached)'}
                  </div>
                </>
              ) : (
                <div className="text-sm text-red-500">Errore nel caricamento prezzo</div>
              )}
            </div>
          </div>
          <button
            onClick={fetchBitcoinPrice}
            disabled={priceLoading}
            className="px-3 py-1 bg-orange-600 text-white rounded text-sm hover:bg-orange-700 disabled:opacity-50"
          >
            🔄 Aggiorna Prezzo
          </button>
        </div>
      </div>

      {/* Azioni */}
      <div className="flex space-x-4">
        <button
          onClick={() => setShowAddTransaction(true)}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          ➕ Aggiungi Transazione
        </button>
        <button
          onClick={() => setShowAddFee(true)}
          className="px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700"
        >
          ⚡ Aggiungi Fee Rete
        </button>
      </div>

      {/* Transazioni */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-adaptive-900">
          Transazioni ({portfolio.stats.transactionCount})
        </h2>
        
        {portfolio.transactions.length > 0 ? (
          <div className="card-adaptive rounded-lg shadow-sm border-adaptive overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Broker</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Info</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantità BTC</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Pagati €</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prezzo Acquisto</th>
                    {btcPrice && (
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valore Attuale</th>
                    )}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Note</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {portfolio.transactions.map((transaction) => (
                    <tr key={transaction.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(transaction.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transaction.broker}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {transaction.info}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {formatBTC(transaction.btcQuantity)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(transaction.eurPaid)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatCurrency(transaction.purchasePrice)}
                      </td>
                      {btcPrice && (
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {formatCurrency(transaction.btcQuantity * btcPrice.btcEur)}
                        </td>
                      )}
                      <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">
                        {transaction.notes || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="card-adaptive p-8 rounded-lg shadow-sm border-adaptive text-center">
            <p className="text-adaptive-600">Nessuna transazione ancora registrata.</p>
            <button
              onClick={() => setShowAddTransaction(true)}
              className="mt-2 text-blue-600 hover:text-blue-800"
            >
              Aggiungi la prima transazione →
            </button>
          </div>
        )}
      </div>

      {/* Fee di Rete */}
      <div className="space-y-4">
        <h2 className="text-xl font-semibold text-adaptive-900">
          Fee di Rete ({portfolio.stats.feesCount})
        </h2>
        
        {portfolio.networkFees.length > 0 ? (
          <div className="card-adaptive rounded-lg shadow-sm border-adaptive overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sats</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">BTC</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Descrizione</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {portfolio.networkFees.map((fee) => (
                    <tr key={fee.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatDate(fee.date)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {fee.sats.toLocaleString()} sats
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                        {formatBTC(fee.btcAmount)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {fee.description || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="card-adaptive p-8 rounded-lg shadow-sm border-adaptive text-center">
            <p className="text-adaptive-600">Nessuna fee di rete registrata.</p>
          </div>
        )}
      </div>

      {/* Modal Aggiungi Transazione */}
      {showAddTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4 max-h-screen overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Aggiungi Transazione</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Data</label>
                <input
                  type="date"
                  value={transactionForm.date}
                  onChange={(e) => setTransactionForm({...transactionForm, date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Broker *</label>
                <input
                  type="text"
                  value={transactionForm.broker}
                  onChange={(e) => setTransactionForm({...transactionForm, broker: e.target.value})}
                  placeholder="es. Binance, Kraken..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Info *</label>
                <input
                  type="text"
                  value={transactionForm.info}
                  onChange={(e) => setTransactionForm({...transactionForm, info: e.target.value})}
                  placeholder="es. DCA, Regalo, Acquisto..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Quantità BTC *</label>
                <input
                  type="number"
                  step="0.00000001"
                  value={transactionForm.btcQuantity}
                  onChange={(e) => setTransactionForm({...transactionForm, btcQuantity: e.target.value})}
                  placeholder="0.01012503"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Euro Pagati *</label>
                <input
                  type="number"
                  step="0.01"
                  value={transactionForm.eurPaid}
                  onChange={(e) => setTransactionForm({...transactionForm, eurPaid: e.target.value})}
                  placeholder="275.00"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Note</label>
                <input
                  type="text"
                  value={transactionForm.notes}
                  onChange={(e) => setTransactionForm({...transactionForm, notes: e.target.value})}
                  placeholder="Verificato, etc..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowAddTransaction(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                disabled={submitLoading}
              >
                Annulla
              </button>
              <button
                onClick={addTransaction}
                disabled={submitLoading}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {submitLoading ? 'Salvataggio...' : 'Salva'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Aggiungi Fee */}
      {showAddFee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Aggiungi Fee di Rete</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Data</label>
                <input
                  type="date"
                  value={feeForm.date}
                  onChange={(e) => setFeeForm({...feeForm, date: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Sats *</label>
                <input
                  type="number"
                  value={feeForm.sats}
                  onChange={(e) => setFeeForm({...feeForm, sats: e.target.value})}
                  placeholder="2000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Descrizione</label>
                <input
                  type="text"
                  value={feeForm.description}
                  onChange={(e) => setFeeForm({...feeForm, description: e.target.value})}
                  placeholder="Transfer to cold wallet..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowAddFee(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                disabled={submitLoading}
              >
                Annulla
              </button>
              <button
                onClick={addFee}
                disabled={submitLoading}
                className="flex-1 px-4 py-2 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 disabled:opacity-50"
              >
                {submitLoading ? 'Salvataggio...' : 'Salva'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal Modifica Portfolio */}
      {showEditPortfolio && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold mb-4">Modifica Portafoglio</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Nome Portafoglio</label>
                <input
                  type="text"
                  value={portfolioName}
                  onChange={(e) => setPortfolioName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={() => setShowEditPortfolio(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                disabled={submitLoading}
              >
                Annulla
              </button>
              <button
                onClick={updatePortfolio}
                disabled={submitLoading || !portfolioName.trim()}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {submitLoading ? 'Salvataggio...' : 'Salva'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}