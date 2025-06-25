// src/app/investments/[id]/page.tsx - FASE 1 FIX
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
  ArrowLeftIcon
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
  }
  transactions: DCATransaction[]
}

interface DCATransaction {
  id: number
  date: string
  type: string
  btcQuantity: number
  eurPaid: number
  broker: string
  info: string
  notes?: string
  purchasePrice: number
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
  const [loading, setLoading] = useState(true)
  const [priceLoading, setPriceLoading] = useState(false)

  // Modals
  const [showAddTransaction, setShowAddTransaction] = useState(false)
  const [showEditTransaction, setShowEditTransaction] = useState(false)
  const [showEditPortfolio, setShowEditPortfolio] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<DCATransaction | null>(null)

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

  useEffect(() => {
    fetchPortfolio()
    fetchBitcoinPrice()
  }, [portfolioId])

  // Data fetching
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
        console.error('Errore nel caricamento portfolio')
      }
    } catch (error) {
      console.error('Errore nel caricamento portfolio:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchBitcoinPrice = async (force = false) => {
    try {
      setPriceLoading(true)
      const response = await fetch(`/api/bitcoin-price${force ? '?force=true' : ''}`)
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

  // 🎯 FASE 1 FIX: Usa SOLO Enhanced stats dal backend, rimuovi calcoli duplicati
  const currentValue = portfolio && btcPrice ? portfolio.stats.netBTC * btcPrice.btcEur : 0
  const unrealizedGains = currentValue - portfolio?.stats.effectiveInvestment || 0
  const totalGains = (portfolio?.stats.realizedProfit || 0) + unrealizedGains
  const totalROI = portfolio?.stats.totalInvested && portfolio.stats.totalInvested > 0 ?
    ((portfolio.stats.realizedProfit + unrealizedGains) / portfolio.stats.totalInvested) * 100 : 0

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
          <Link href="/investments" className="text-orange-600 hover:underline">
            ← Torna agli investimenti
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-adaptive">
      <div className="container mx-auto px-4 py-8 max-w-6xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <Link 
              href="/investments"
              className="p-2 hover:bg-adaptive-100 rounded-lg transition-colors"
            >
              <ArrowLeftIcon className="w-5 h-5 text-adaptive-600" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-adaptive-900">
                🟠 {portfolio.name}
              </h1>
              <p className="text-adaptive-600">Portfolio DCA Bitcoin</p>
            </div>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setShowAddTransaction(true)}
              className="btn-primary flex items-center gap-2"
            >
              <PlusIcon className="w-4 h-4" />
              Nuova Transazione
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
              {totalROI.toFixed(2)}%
            </p>
            <p className="text-sm text-adaptive-600">
              {totalROI >= 0 ? '📈 Profitto' : '📉 Perdita'}
            </p>
          </div>
        </div>

        {/* Bitcoin Holdings & Price */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Holdings */}
          <div className="card-adaptive rounded-lg shadow-sm border-adaptive">
            <div className="p-4 border-b border-adaptive">
              <h3 className="text-lg font-medium text-adaptive-900">₿ Holdings Bitcoin</h3>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-adaptive-600">BTC Netti:</span>
                <span className="font-semibold text-adaptive-900">{formatBTC(portfolio.stats.netBTC)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-adaptive-600">Prezzo Medio:</span>
                <span className="font-semibold text-adaptive-900">{formatCurrency(portfolio.stats.avgPurchasePrice)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-adaptive-600">Valore Attuale:</span>
                <span className="font-semibold text-green-600">{formatCurrency(currentValue)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-adaptive-600">Plus/Minus Non Real.:</span>
                <span className={`font-semibold ${unrealizedGains >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(unrealizedGains)}
                </span>
              </div>
            </div>
          </div>

          {/* Bitcoin Price */}
          {btcPrice && (
            <div className="card-adaptive rounded-lg shadow-sm border-adaptive">
              <div className="p-4 border-b border-adaptive">
                <h3 className="text-lg font-medium text-adaptive-900">₿ Prezzo Bitcoin</h3>
              </div>
              <div className="p-4">
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div>
                    <p className="text-sm text-adaptive-500">USD</p>
                    <p className="text-xl font-bold text-adaptive-900">${btcPrice.btcUsd.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-sm text-adaptive-500">EUR</p>
                    <p className="text-xl font-bold text-orange-600">{formatCurrency(btcPrice.btcEur)}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className={`px-2 py-1 rounded-full text-xs ${btcPrice.cached ? 
                    'bg-adaptive-100 text-adaptive-600' : 'bg-green-100 text-green-600'}`}>
                    {btcPrice.cached ? '📋 Cache' : '🔄 Live'}
                  </span>
                  <button
                    onClick={() => fetchBitcoinPrice(true)}
                    disabled={priceLoading}
                    className="px-3 py-1 bg-orange-600 text-white rounded hover:bg-orange-700 disabled:opacity-50 text-sm"
                  >
                    {priceLoading ? '⏳' : '🔄 Aggiorna'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* P&L Summary */}
        <div className="card-adaptive rounded-lg shadow-sm border-adaptive mb-8">
          <div className="p-4 border-b border-adaptive">
            <h3 className="text-lg font-medium text-adaptive-900">💼 Riepilogo P&L</h3>
          </div>
          <div className="p-4">
            <div className="grid grid-cols-3 gap-4 text-center">
              <div>
                <p className="text-sm text-adaptive-500">Profitti Realizzati</p>
                <p className={`text-xl font-bold ${portfolio.stats.realizedProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(portfolio.stats.realizedProfit)}
                </p>
              </div>
              <div>
                <p className="text-sm text-adaptive-500">Plus/Minus Non Realizzati</p>
                <p className={`text-xl font-bold ${unrealizedGains >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(unrealizedGains)}
                </p>
              </div>
              <div>
                <p className="text-sm text-adaptive-500">Totale P&L</p>
                <p className={`text-xl font-bold ${totalGains >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(totalGains)}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Transactions */}
        <div className="card-adaptive rounded-lg shadow-sm border-adaptive">
          <div className="p-4 border-b border-adaptive">
            <h2 className="text-lg font-semibold text-adaptive-900">
              💳 Transazioni ({portfolio.stats.transactionCount})
            </h2>
          </div>
          
          {portfolio.transactions.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">💳</div>
              <h3 className="text-lg font-medium text-adaptive-900 mb-2">Nessuna Transazione</h3>
              <p className="text-adaptive-600 mb-4">Le tue transazioni DCA appariranno qui</p>
              <button
                onClick={() => setShowAddTransaction(true)}
                className="btn-primary"
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
                    <th className="text-center py-3 px-4 font-medium text-adaptive-700">Tipo</th>
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
                      <td className="py-3 px-4 text-adaptive-900">
                        {new Date(transaction.date).toLocaleDateString('it-IT')}
                      </td>
                      <td className="text-center py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          transaction.type === 'buy' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
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
                        <button
                          onClick={() => {
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
                          }}
                          className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modals vanno qui - Add Transaction, Edit Transaction, Edit Portfolio */}
      {/* Per brevità non li includo, ma dovrebbero rimanere gli stessi */}
    </div>
  )
}