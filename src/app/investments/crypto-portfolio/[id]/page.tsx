// src/app/investments/crypto-portfolio/[id]/page.tsx - FASE 1 FIX
'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  PlusIcon, 
  ArrowsRightLeftIcon,
  ArrowPathIcon,
  PencilIcon,
  TrashIcon,
  Cog6ToothIcon,
  ArrowLeftIcon
} from '@heroicons/react/24/outline'

interface CryptoPortfolio {
  id: number
  name: string
  description?: string
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
    
    // Derived calculations
    totalValueEur: number
    unrealizedGains: number
    totalROI: number
    
    // Counts
    holdingsCount: number
    transactionCount: number
    buyCount: number
    sellCount: number
  }
  holdings: CryptoHolding[]
  transactions: CryptoTransaction[]
}

interface CryptoHolding {
  id: number
  quantity: number
  avgPrice: number
  totalInvested: number
  realizedGains: number
  asset: {
    symbol: string
    name: string
    decimals: number
  }
  currentPrice?: number
  valueEur?: number
}

interface CryptoTransaction {
  id: number
  date: string
  type: string
  quantity: number
  eurValue: number
  pricePerUnit: number
  broker?: string
  notes?: string
  asset: {
    symbol: string
    name: string
  }
}

export default function CryptoPortfolioPage() {
  const params = useParams()
  const router = useRouter()
  const portfolioId = params.id as string

  // State
  const [portfolio, setPortfolio] = useState<CryptoPortfolio | null>(null)
  const [loading, setLoading] = useState(true)
  const [priceLoading, setPriceLoading] = useState(false)
  
  // Modals
  const [showAddTransaction, setShowAddTransaction] = useState(false)
  const [showEditPortfolio, setShowEditPortfolio] = useState(false)

  // Forms
  const [portfolioForm, setPortfolioForm] = useState({
    name: '',
    description: '',
    isActive: true
  })

  // Format functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const formatCrypto = (amount: number, decimals = 6) => {
    return amount.toFixed(decimals)
  }

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
  }

  useEffect(() => {
    fetchPortfolio()
  }, [portfolioId])

  // Data fetching
  const fetchPortfolio = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/crypto-portfolios/${portfolioId}`)
      if (response.ok) {
        const data = await response.json()
        setPortfolio(data)
        setPortfolioForm({
          name: data.name,
          description: data.description || '',
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

  const fetchPrices = async () => {
    if (!portfolio || portfolio.holdings.length === 0) return

    try {
      setPriceLoading(true)
      const symbols = portfolio.holdings.map(h => h.asset.symbol).join(',')
      const response = await fetch(`/api/crypto-prices?symbols=${symbols}`)
      
      if (response.ok) {
        const priceData = await response.json()
        
        // Aggiorna holdings con prezzi correnti
        const updatedHoldings = portfolio.holdings.map(holding => {
          const currentPrice = priceData.prices[holding.asset.symbol] || holding.avgPrice
          const valueEur = holding.quantity * currentPrice
          
          return {
            ...holding,
            currentPrice,
            valueEur
          }
        })

        setPortfolio(prev => prev ? { ...prev, holdings: updatedHoldings } : null)
      }
    } catch (error) {
      console.error('Errore nel recupero prezzi:', error)
    } finally {
      setPriceLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-adaptive flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
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
          <Link href="/investments" className="text-blue-600 hover:underline">
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
                🚀 {portfolio.name}
              </h1>
              <p className="text-adaptive-600">Crypto Wallet Multi-Asset</p>
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
              onClick={fetchPrices}
              disabled={priceLoading}
              className="p-2 text-blue-600 hover:bg-blue-50 rounded disabled:opacity-50"
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

        {/* 🎯 FASE 1 FIX: Enhanced Cash Flow Statistics - USA SOLO BACKEND STATS */}
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

          {/* Total ROI - USA DIRETTAMENTE DAL BACKEND */}
          <div className="card-adaptive rounded-lg shadow-sm border-adaptive p-4">
            <h3 className="text-sm font-medium text-adaptive-500">🎯 ROI Totale</h3>
            <p className={`text-2xl font-bold ${portfolio.stats.totalROI >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatPercentage(portfolio.stats.totalROI)}
            </p>
            <p className="text-sm text-adaptive-600">
              {portfolio.stats.totalROI >= 0 ? '📈 Profitto' : '📉 Perdita'}
            </p>
          </div>
        </div>

        {/* P&L Summary - USA DIRETTAMENTE LE STATS DAL BACKEND */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="card-adaptive rounded-lg shadow-sm border-adaptive p-4">
            <h3 className="text-sm font-medium text-adaptive-500">🏦 Valore Attuale</h3>
            <p className="text-2xl font-bold text-blue-600">
              {formatCurrency(portfolio.stats.totalValueEur)}
            </p>
            <p className="text-sm text-adaptive-600">{portfolio.stats.holdingsCount} asset</p>
          </div>

          <div className="card-adaptive rounded-lg shadow-sm border-adaptive p-4">
            <h3 className="text-sm font-medium text-adaptive-500">💸 Profitti Realizzati</h3>
            <p className={`text-2xl font-bold ${portfolio.stats.realizedProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(portfolio.stats.realizedProfit)}
            </p>
            <p className="text-sm text-adaptive-600">
              {portfolio.stats.sellCount} vendite
            </p>
          </div>

          <div className="card-adaptive rounded-lg shadow-sm border-adaptive p-4">
            <h3 className="text-sm font-medium text-adaptive-500">📊 Plus/Minus Non Real.</h3>
            <p className={`text-2xl font-bold ${portfolio.stats.unrealizedGains >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(portfolio.stats.unrealizedGains)}
            </p>
            <p className="text-sm text-adaptive-600">Su holdings correnti</p>
          </div>
        </div>

        {/* Holdings */}
        <div className="card-adaptive rounded-lg shadow-sm border-adaptive mb-8">
          <div className="p-4 border-b border-adaptive">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-adaptive-900">🪙 Holdings</h2>
              <button
                onClick={fetchPrices}
                disabled={priceLoading}
                className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50"
              >
                {priceLoading ? '⏳' : '🔄 Aggiorna Prezzi'}
              </button>
            </div>
          </div>
          
          {portfolio.holdings.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">🪙</div>
              <h3 className="text-lg font-medium text-adaptive-900 mb-2">Nessun Asset</h3>
              <p className="text-adaptive-600">I tuoi asset appariranno qui dopo la prima transazione</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-adaptive bg-adaptive-50">
                    <th className="text-left py-3 px-4 font-medium text-adaptive-700">Asset</th>
                    <th className="text-right py-3 px-4 font-medium text-adaptive-700">Quantità</th>
                    <th className="text-right py-3 px-4 font-medium text-adaptive-700">Prezzo Medio</th>
                    <th className="text-right py-3 px-4 font-medium text-adaptive-700">Prezzo Corrente</th>
                    <th className="text-right py-3 px-4 font-medium text-adaptive-700">Valore</th>
                    <th className="text-right py-3 px-4 font-medium text-adaptive-700">P&L</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolio.holdings.map(holding => {
                    const currentPrice = holding.currentPrice || holding.avgPrice
                    const currentValue = holding.valueEur || (holding.quantity * currentPrice)
                    const unrealizedPL = currentValue - holding.totalInvested

                    return (
                      <tr key={holding.id} className="border-b border-adaptive hover:bg-adaptive-50">
                        <td className="py-3 px-4">
                          <div className="font-medium text-adaptive-900">{holding.asset.symbol}</div>
                          <div className="text-sm text-adaptive-600">{holding.asset.name}</div>
                        </td>
                        <td className="text-right py-3 px-4">
                          {formatCrypto(holding.quantity, holding.asset.decimals)}
                        </td>
                        <td className="text-right py-3 px-4">
                          {formatCurrency(holding.avgPrice)}
                        </td>
                        <td className="text-right py-3 px-4">
                          <span className={
                            holding.currentPrice ? 
                            (currentPrice > holding.avgPrice ? 'text-green-600' : 'text-red-600') : 
                            'text-adaptive-600'
                          }>
                            {formatCurrency(currentPrice)}
                          </span>
                        </td>
                        <td className="text-right py-3 px-4 font-semibold">
                          {formatCurrency(currentValue)}
                        </td>
                        <td className="text-right py-3 px-4">
                          <div className={`font-semibold ${unrealizedPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrency(unrealizedPL)}
                          </div>
                          <div className="text-xs text-adaptive-500">
                            {formatPercentage(holding.totalInvested > 0 ? (unrealizedPL / holding.totalInvested) * 100 : 0)}
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
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
              <p className="text-adaptive-600 mb-4">Le tue transazioni appariranno qui</p>
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
                    <th className="text-left py-3 px-4 font-medium text-adaptive-700">Asset</th>
                    <th className="text-center py-3 px-4 font-medium text-adaptive-700">Tipo</th>
                    <th className="text-right py-3 px-4 font-medium text-adaptive-700">Quantità</th>
                    <th className="text-right py-3 px-4 font-medium text-adaptive-700">Valore EUR</th>
                    <th className="text-right py-3 px-4 font-medium text-adaptive-700">Prezzo/Unità</th>
                  </tr>
                </thead>
                <tbody>
                  {portfolio.transactions.map(transaction => (
                    <tr key={transaction.id} className="border-b border-adaptive hover:bg-adaptive-50">
                      <td className="py-3 px-4 text-adaptive-900">
                        {new Date(transaction.date).toLocaleDateString('it-IT')}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-medium text-adaptive-900">{transaction.asset.symbol}</div>
                        <div className="text-sm text-adaptive-600">{transaction.asset.name}</div>
                      </td>
                      <td className="text-center py-3 px-4">
                        <span className={`px-2 py-1 rounded-full text-xs ${
                          transaction.type === 'buy' ? 'bg-green-100 text-green-600' : 'bg-red-100 text-red-600'
                        }`}>
                          {transaction.type === 'buy' ? '📈 Buy' : '📉 Sell'}
                        </span>
                      </td>
                      <td className="text-right py-3 px-4 font-mono">
                        {formatCrypto(transaction.quantity)}
                      </td>
                      <td className="text-right py-3 px-4 font-semibold">
                        {formatCurrency(transaction.eurValue)}
                      </td>
                      <td className="text-right py-3 px-4">
                        {formatCurrency(transaction.pricePerUnit)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modals vanno qui - Add Transaction, Edit Portfolio */}
      {/* Per brevità non li includo, ma dovrebbero rimanere gli stessi */}
    </div>
  )
}