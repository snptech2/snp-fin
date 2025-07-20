'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { XMarkIcon } from '@heroicons/react/24/outline'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency } from '@/utils/formatters'
import { useNotifications } from '@/contexts/NotificationContext'

// Import dinamico per evitare hydration mismatch
const PerformanceChart = dynamic(() => import('@/components/charts/PerformanceChart'), {
  ssr: false,
  loading: () => (
    <div className="card-adaptive rounded-lg p-6 text-center">
      <div className="animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-3/4 mx-auto mb-4"></div>
        <div className="h-64 bg-gray-100 rounded"></div>
      </div>
    </div>
  )
})

interface Account {
  id: number
  name: string
  type: string
  balance: number
}

interface Portfolio {
  id: number
  name: string
  accountId: number
  type: 'dca_bitcoin' | 'crypto_wallet'
  stats: {
    // Enhanced Cash Flow Fields
    totalInvested: number
    capitalRecovered: number
    effectiveInvestment: number
    realizedProfit: number
    stakeRewards?: number
    isFullyRecovered: boolean
    
    // Portfolio-specific fields
    totalValueEur?: number // Per crypto portfolios
    netBTC?: number // Per DCA portfolios (PRIORITÀ ASSOLUTA)
    totalBTC?: number // Fallback per DCA portfolios
    totalROI?: number // Calcolato dal backend quando disponibile
    unrealizedGains?: number // Calcolato dal backend per crypto portfolios
    
    // Counts
    transactionCount: number
    buyCount: number
    sellCount?: number
    stakeRewardCount?: number // Per crypto portfolios
    holdingsCount?: number // Per crypto portfolios
    
    // Legacy fields (backwards compatibility)
    realizedGains?: number
    totalGains?: number
  }
}

interface BitcoinPrice {
  btcPrice: number
  currency: string
  cached: boolean
  timestamp: string
}

interface ChartDataPoint {
  date: string
  fiatValue: number
  btcValue: number
}

export default function InvestmentsPage() {
  const { user } = useAuth()
  const { alert } = useNotifications()
  const router = useRouter()
  const [dcaPortfolios, setDcaPortfolios] = useState<Portfolio[]>([])
  const [cryptoPortfolios, setCryptoPortfolios] = useState<Portfolio[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [btcPrice, setBtcPrice] = useState<BitcoinPrice | null>(null)
  const [loading, setLoading] = useState(true)
  const [showCreateDCAModal, setShowCreateDCAModal] = useState(false)
  const [showCreateCryptoModal, setShowCreateCryptoModal] = useState(false)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [chartData, setChartData] = useState<ChartDataPoint[]>([])
  const [chartsLoading, setChartsLoading] = useState(true)

  // Form states
  const [formData, setFormData] = useState({
    name: '',
    accountId: undefined as number | undefined
  })

  const [cryptoFormData, setCryptoFormData] = useState({
    name: '',
    description: '',
    accountId: undefined as number | undefined
  })

  const investmentAccounts = accounts.filter(acc => acc.type === 'investment')

  useEffect(() => {
    fetchData()
    fetchBitcoinPrice()
    fetchChartData()
    
    // Check URL params for quick create actions - solo client-side per evitare hydration mismatch
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search)
      const createDCA = urlParams.get('createDCA')
      const createCrypto = urlParams.get('createCrypto')
      const accountId = urlParams.get('accountId')
      
      if (createDCA === 'true' && accountId) {
        setFormData({ name: '', accountId: parseInt(accountId) })
        setShowCreateDCAModal(true)
      } else if (createCrypto === 'true' && accountId) {
        setCryptoFormData({ name: '', description: '', accountId: parseInt(accountId) })
        setShowCreateCryptoModal(true)
      }
    }
  }, [])

  const fetchData = async () => {
    try {
      const [dcaRes, cryptoRes, accountsRes] = await Promise.all([
        fetch('/api/dca-portfolios'),
        fetch('/api/crypto-portfolios'),
        fetch('/api/accounts')
      ])

      if (dcaRes.ok) {
        const dcaData = await dcaRes.json()
        setDcaPortfolios(Array.isArray(dcaData) ? dcaData : [])
      }

      if (cryptoRes.ok) {
        const cryptoData = await cryptoRes.json()
        setCryptoPortfolios(Array.isArray(cryptoData) ? cryptoData : [])
      }

      if (accountsRes.ok) {
        const accountsData = await accountsRes.json()
        setAccounts(Array.isArray(accountsData) ? accountsData : [])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchBitcoinPrice = async () => {
    try {
      const response = await fetch('/api/bitcoin-price')
      if (response.ok) {
        const data = await response.json()
        setBtcPrice(data)
      }
    } catch (error) {
      console.error('Error fetching Bitcoin price:', error)
    }
  }

  const fetchChartData = async () => {
    try {
      setChartsLoading(true)
      const response = await fetch('/api/holdings-snapshots/charts')
      if (response.ok) {
        const data = await response.json()
        setChartData(data.data || [])
      }
    } catch (error) {
      console.error('Error fetching chart data:', error)
    } finally {
      setChartsLoading(false)
    }
  }

  // Format functions
  const formatCurrencyWithUserCurrency = (amount: number) => 
    formatCurrency(amount, user?.currency || 'EUR')

  const formatPercentage = (value: number) => 
    new Intl.NumberFormat('it-IT', { style: 'percent', minimumFractionDigits: 1 }).format(value / 100)


  // Enhanced Overall Stats - Reintrodotto useMemo con dipendenze sicure
  const overallStats = useMemo(() => {
    const allPortfolios = [...dcaPortfolios, ...cryptoPortfolios]
    
    // Enhanced Cash Flow: Somma tutte le stats dai portfolio backend
    const totalInvested = allPortfolios.reduce((sum, p) => sum + (p.stats.totalInvested || 0), 0)
    const totalCapitalRecovered = allPortfolios.reduce((sum, p) => sum + (p.stats.capitalRecovered || 0), 0)
    const totalEffectiveInvestment = allPortfolios.reduce((sum, p) => sum + (p.stats.effectiveInvestment || 0), 0)
    const totalRealizedProfit = allPortfolios.reduce((sum, p) => sum + (p.stats.realizedProfit || 0), 0)
    
    // Calcola current value direttamente inline per evitare dipendenze circolari
    let totalCurrentValue = 0
    const currentBtcPrice = btcPrice?.btcPrice || 0
    
    allPortfolios.forEach(portfolio => {
      const portfolioType = dcaPortfolios.includes(portfolio) ? 'dca_bitcoin' : 'crypto_wallet'
      
      if (portfolioType === 'crypto_wallet') {
        // Crypto portfolios: usa totalValueEur dal backend
        totalCurrentValue += portfolio.stats.totalValueEur || 0
      } else {
        // DCA portfolios: calcola inline usando logica getDCACurrentValue
        if (portfolio.type === 'dca_bitcoin' && currentBtcPrice > 0) {
          // Priority: netBTC (includes network fees)
          if (portfolio.stats?.netBTC !== undefined && portfolio.stats?.netBTC !== null) {
            totalCurrentValue += portfolio.stats.netBTC * currentBtcPrice
          } else if (portfolio.stats?.totalBTC !== undefined && portfolio.stats?.totalBTC !== null) {
            // Fallback: totalBTC
            totalCurrentValue += portfolio.stats.totalBTC * currentBtcPrice
          }
        }
      }
    })
    
    // Enhanced calculation per overall metrics
    const totalUnrealizedGains = totalCurrentValue - totalEffectiveInvestment
    const overallROI = totalInvested > 0 ? 
      ((totalRealizedProfit + totalUnrealizedGains) / totalInvested) * 100 : 0

    return {
      // Enhanced Cash Flow Metrics
      totalInvested,
      totalCapitalRecovered,
      totalEffectiveInvestment,
      totalRealizedProfit,
      isFullyRecovered: totalCapitalRecovered >= totalInvested,
      
      // Current Performance
      totalCurrentValue,
      totalUnrealizedGains,
      overallROI,
      
      // Counts
      totalPortfolios: allPortfolios.length,
      dcaCount: dcaPortfolios.length,
      cryptoCount: cryptoPortfolios.length
    }
  }, [dcaPortfolios, cryptoPortfolios, btcPrice])

  // Create DCA Portfolio
  const createDCAPortfolio = async () => {
    if (!formData.name.trim() || !formData.accountId) {
      await alert('Nome e account sono obbligatori')
      return
    }

    try {
      setSubmitLoading(true)
      const response = await fetch('/api/dca-portfolios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        await fetchData()
        setShowCreateDCAModal(false)
        setFormData({ name: '', accountId: undefined })
      } else {
        const error = await response.json()
        await alert(error.error || 'Errore nella creazione portfolio')
      }
    } catch (error) {
      console.error('Errore:', error)
      await alert('Errore nella creazione portfolio')
    } finally {
      setSubmitLoading(false)
    }
  }

  // Create Crypto Portfolio
  const createCryptoPortfolio = async () => {
    if (!cryptoFormData.name.trim() || !cryptoFormData.accountId) {
      await alert('Nome e account sono obbligatori')
      return
    }

    try {
      setSubmitLoading(true)
      const response = await fetch('/api/crypto-portfolios', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cryptoFormData)
      })

      if (response.ok) {
        await fetchData()
        setShowCreateCryptoModal(false)
        setCryptoFormData({ name: '', description: '', accountId: undefined })
      } else {
        const error = await response.json()
        await alert(error.error || 'Errore nella creazione portfolio')
      }
    } catch (error) {
      console.error('Errore:', error)
      await alert('Errore nella creazione portfolio')
    } finally {
      setSubmitLoading(false)
    }
  }

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-adaptive-900">Investimenti</h1>
            <p className="text-adaptive-600">Gestisci i tuoi portfolio di investimento</p>
          </div>
          <div className="flex justify-center items-center h-64">
            <div className="text-adaptive-600">Caricamento portfolio...</div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        {/* Header - Mobile Optimized */}
        <div className="mb-6 sm:mb-8">
          <div className="mb-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-adaptive-900">📈 Investimenti</h1>
            <p className="text-adaptive-600 text-sm sm:text-base">Gestisci i tuoi portfolio di investimento con Enhanced Cash Flow</p>
          </div>
          {/* Desktop */}
          <div className="hidden sm:flex justify-end gap-3">
            <button
              onClick={() => router.push('/investments/tracking')}
              className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 font-medium text-sm"
            >
              📊 Tracking Avanzato
            </button>
            <button
              onClick={() => setShowCreateDCAModal(true)}
              className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 font-medium text-sm"
            >
              🟠 Nuovo DCA Bitcoin
            </button>
            <button
              onClick={() => setShowCreateCryptoModal(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium text-sm"
            >
              🚀 Nuovo Crypto Wallet
            </button>
          </div>
          {/* Mobile */}
          <div className="sm:hidden space-y-3">
            <button
              onClick={() => router.push('/investments/tracking')}
              className="w-full px-4 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 font-medium text-sm flex items-center justify-center gap-2"
            >
              📊 Tracking Avanzato
            </button>
            <button
              onClick={() => setShowCreateDCAModal(true)}
              className="w-full px-4 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium text-sm flex items-center justify-center gap-2"
            >
              🟠 Nuovo DCA Bitcoin
            </button>
            <button
              onClick={() => setShowCreateCryptoModal(true)}
              className="w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm flex items-center justify-center gap-2"
            >
              🚀 Nuovo Crypto Wallet
            </button>
          </div>
        </div>

        {/* Enhanced Overall Statistics - Mobile Optimized with SATS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6">
          <div className="card-adaptive rounded-lg p-4 sm:p-6 shadow-sm border-adaptive text-center sm:text-left">
            <h3 className="text-sm font-medium text-adaptive-500">💰 Totale Investito</h3>
            <p className="text-2xl font-bold text-adaptive-900">
              {formatCurrencyWithUserCurrency(overallStats.totalInvested)}
            </p>
            <p className="text-sm text-adaptive-600">{overallStats.totalPortfolios} portfolio</p>
          </div>
          
          <div className="card-adaptive rounded-lg p-4 sm:p-6 shadow-sm border-adaptive text-center sm:text-left">
            <h3 className="text-sm font-medium text-adaptive-500">🔄 Capitale Recuperato</h3>
            <p className="text-2xl font-bold text-blue-600">
              {formatCurrencyWithUserCurrency(overallStats.totalCapitalRecovered)}
            </p>
            <div className="flex items-center justify-center sm:justify-start gap-2 text-sm text-adaptive-600">
              <span>
                {overallStats.totalInvested > 0 ? 
                  `${((overallStats.totalCapitalRecovered / overallStats.totalInvested) * 100).toFixed(1)}%` : '0%'}
              </span>
              {overallStats.isFullyRecovered && <span className="text-green-600">✅</span>}
            </div>
          </div>
          
          <div className="card-adaptive rounded-lg p-4 sm:p-6 shadow-sm border-adaptive text-center sm:text-left">
            <h3 className="text-sm font-medium text-adaptive-500">⚠️ Soldi a Rischio</h3>
            <p className="text-2xl font-bold text-orange-600">
              {formatCurrencyWithUserCurrency(overallStats.totalEffectiveInvestment)}
            </p>
            <p className="text-sm text-adaptive-600">
              {overallStats.isFullyRecovered ? '🎉 Investimento gratis!' : 'Non ancora recuperato'}
            </p>
          </div>
          
          <div className="card-adaptive rounded-lg p-4 sm:p-6 shadow-sm border-adaptive text-center sm:text-left">
            <h3 className="text-sm font-medium text-adaptive-500">📈 Valore Attuale</h3>
            <p className="text-2xl font-bold text-green-600">
              {formatCurrencyWithUserCurrency(overallStats.totalCurrentValue)}
            </p>
            <p className={`text-sm ${overallStats.overallROI >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              ROI: {formatPercentage(overallStats.overallROI)}
            </p>
          </div>
          
          <div className="card-adaptive rounded-lg p-4 sm:p-6 shadow-sm border-adaptive text-center sm:text-left">
            <h3 className="text-sm font-medium text-adaptive-500">⚡ SATS TOTALI</h3>
            <p className="text-2xl font-bold text-orange-500">
              {btcPrice?.btcPrice && overallStats.totalCurrentValue > 0 ? 
                new Intl.NumberFormat('it-IT').format(Math.round((overallStats.totalCurrentValue / btcPrice.btcPrice) * 100_000_000)) : 
                '0'
              }
            </p>
            <p className="text-sm text-adaptive-600">
              {btcPrice?.btcPrice && overallStats.totalCurrentValue > 0 ? 
                `${((overallStats.totalCurrentValue / btcPrice.btcPrice)).toFixed(8)} BTC` : 
                'N/A'
              }
            </p>
          </div>
        </div>

        {/* Performance Charts - Reintrodotti con dynamic import */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PerformanceChart
            data={chartData}
            currency={user?.currency || 'EUR'}
            type="fiat"
            title={`📈 Andamento Portfolio (${user?.currency || 'EUR'})`}
            height={300}
          />
          <PerformanceChart
            data={chartData}
            currency={user?.currency || 'EUR'}
            type="btc"
            title="₿ Andamento Portfolio (BTC)"
            height={300}
          />
        </div>

        {/* DCA Bitcoin Portfolios */}
        {dcaPortfolios.length > 0 && (
          <div className="card-adaptive rounded-lg shadow-sm border-adaptive mb-8">
            <div className="p-6 border-b border-adaptive text-center sm:text-left">
              <h2 className="text-lg font-semibold text-adaptive-900">🟠 DCA Bitcoin Portfolios</h2>
              <span className="text-sm text-adaptive-500">{dcaPortfolios.length} portfolio</span>
            </div>
            
            <div className="divide-y divide-adaptive">
              {dcaPortfolios.map(portfolio => {
                // Calcola current value inline
                let currentValue = 0
                const currentBtcPrice = btcPrice?.btcPrice || 0
                
                if (portfolio.type === 'dca_bitcoin' && currentBtcPrice > 0) {
                  // Priority: netBTC (includes network fees)
                  if (portfolio.stats?.netBTC !== undefined && portfolio.stats?.netBTC !== null) {
                    currentValue = portfolio.stats.netBTC * currentBtcPrice
                  } else if (portfolio.stats?.totalBTC !== undefined && portfolio.stats?.totalBTC !== null) {
                    // Fallback: totalBTC
                    currentValue = portfolio.stats.totalBTC * currentBtcPrice
                  }
                }
                
                const totalInvested = portfolio.stats.totalInvested || 0
                const effectiveInvestment = portfolio.stats.effectiveInvestment || 0
                const realizedProfit = portfolio.stats.realizedProfit || 0
                const unrealizedGains = currentValue - effectiveInvestment
                const totalGains = realizedProfit + unrealizedGains
                const totalROI = totalInvested > 0 ? ((totalGains / totalInvested) * 100) : 0

                return (
                  <div key={portfolio.id}>
                    {/* Desktop View */}
                    <div className="hidden lg:block p-6 hover:bg-adaptive-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-4 mb-3">
                            <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                              <span className="text-2xl">🟠</span>
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-adaptive-900">{portfolio.name}</h3>
                              <p className="text-sm text-adaptive-600">
                                {portfolio.stats.transactionCount} transazioni • Account: {accounts.find(a => a.id === portfolio.accountId)?.name}
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-adaptive-500">Profitto Realizzato</p>
                              <p className={`font-semibold ${realizedProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrencyWithUserCurrency(realizedProfit)}
                              </p>
                            </div>
                            <div>
                              <p className="text-adaptive-500">Plus/Minus Non Realizzati</p>
                              <p className={`font-semibold ${unrealizedGains >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrencyWithUserCurrency(unrealizedGains)}
                              </p>
                            </div>
                            <div>
                              <p className="text-adaptive-500">Totale P&L</p>
                              <p className={`font-semibold ${totalGains >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrencyWithUserCurrency(totalGains)}
                              </p>
                            </div>
                            <div>
                              <p className="text-adaptive-500">ROI</p>
                              <p className={`font-semibold ${totalROI >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatPercentage(totalROI)}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-6 ml-6">
                          {/* Investito */}
                          <div className="text-center min-w-[100px]">
                            <p className="text-xs text-adaptive-500">Investito</p>
                            <p className="font-semibold text-adaptive-900">
                              {formatCurrencyWithUserCurrency(totalInvested)}
                            </p>
                          </div>

                          {/* Valore Attuale */}
                          <div className="text-center min-w-[100px]">
                            <p className="text-xs text-adaptive-500">Valore Attuale</p>
                            <p className="font-semibold text-green-600">
                              {formatCurrencyWithUserCurrency(currentValue)}
                            </p>
                          </div>

                          {/* Pulsante Apri Wallet */}
                          <Link href={`/investments/${portfolio.id}`}>
                            <button className="px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 transition-colors text-sm font-medium">
                              🟠 Apri Wallet
                            </button>
                          </Link>
                        </div>
                      </div>
                    </div>

                    {/* Mobile Card View */}
                    <div className="lg:hidden p-4 hover:bg-adaptive-50 transition-colors">
                      <div className="card-adaptive rounded-lg p-4 border border-adaptive">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3 flex-1">
                            <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                              <span className="text-xl">🟠</span>
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-adaptive-900 text-base mb-1">{portfolio.name}</h3>
                              <p className="text-lg font-bold text-green-600">
                                {formatCurrencyWithUserCurrency(currentValue)}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                          <div className="bg-adaptive-50 rounded-lg p-3">
                            <p className="text-adaptive-500 text-xs">💰 Investito</p>
                            <p className="font-semibold text-adaptive-900">
                              {formatCurrencyWithUserCurrency(totalInvested)}
                            </p>
                          </div>
                          <div className="bg-adaptive-50 rounded-lg p-3">
                            <p className="text-adaptive-500 text-xs">📈 ROI</p>
                            <p className={`font-semibold ${totalROI >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatPercentage(totalROI)}
                            </p>
                          </div>
                          <div className="bg-adaptive-50 rounded-lg p-3">
                            <p className="text-adaptive-500 text-xs">✅ Realizzato</p>
                            <p className={`font-semibold ${realizedProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrencyWithUserCurrency(realizedProfit)}
                            </p>
                          </div>
                          <div className="bg-adaptive-50 rounded-lg p-3">
                            <p className="text-adaptive-500 text-xs">⏳ Non Realizzato</p>
                            <p className={`font-semibold ${unrealizedGains >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrencyWithUserCurrency(unrealizedGains)}
                            </p>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-adaptive text-center">
                          <p className="text-sm text-adaptive-600 mb-3">
                            {portfolio.stats.transactionCount} transazioni
                          </p>
                          <Link href={`/investments/${portfolio.id}`}>
                            <button className="w-full px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors text-sm font-medium">
                              🟠 Apri Wallet
                            </button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Crypto Portfolios */}
        {cryptoPortfolios.length > 0 && (
          <div className="card-adaptive rounded-lg shadow-sm border-adaptive mb-8">
            <div className="p-6 border-b border-adaptive text-center sm:text-left">
              <h2 className="text-lg font-semibold text-adaptive-900">🚀 Crypto Wallet Portfolios</h2>
              <span className="text-sm text-adaptive-500">{cryptoPortfolios.length} portfolio</span>
            </div>
            
            <div className="divide-y divide-adaptive">
              {cryptoPortfolios.map(portfolio => {
                // Usa le Enhanced stats dal backend
                const totalInvested = portfolio.stats.totalInvested || 0
                const currentValue = portfolio.stats.totalValueEur || 0
                const totalROI = portfolio.stats.totalROI || 0
                const realizedProfit = portfolio.stats.realizedProfit || 0
                const unrealizedGains = portfolio.stats.unrealizedGains || 0
                const totalGains = realizedProfit + unrealizedGains
                
                // Debug log removed - was causing noise in production
                // console.log(`🔍 Portfolio ${portfolio.name}:`, { ... })

                return (
                  <div key={portfolio.id}>
                    {/* Desktop View */}
                    <div className="hidden lg:block p-6 hover:bg-adaptive-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-4 mb-3">
                            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                              <span className="text-2xl">🚀</span>
                            </div>
                            <div>
                              <h3 className="text-lg font-semibold text-adaptive-900">{portfolio.name}</h3>
                              <p className="text-sm text-adaptive-600">
                                {portfolio.stats.holdingsCount} asset • {portfolio.stats.transactionCount} transazioni
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <p className="text-adaptive-500">Profitto Realizzato</p>
                              <p className={`font-semibold ${realizedProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrencyWithUserCurrency(realizedProfit)}
                              </p>
                            </div>
                            <div>
                              <p className="text-adaptive-500">Plus/Minus Non Realizzati</p>
                              <p className={`font-semibold ${unrealizedGains >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrencyWithUserCurrency(unrealizedGains)}
                              </p>
                            </div>
                            <div>
                              <p className="text-adaptive-500">Totale P&L</p>
                              <p className={`font-semibold ${totalGains >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrencyWithUserCurrency(totalGains)}
                              </p>
                            </div>
                            <div>
                              <p className="text-adaptive-500">ROI</p>
                              <p className={`font-semibold ${totalROI >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatPercentage(totalROI)}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-6 ml-6">
                          {/* Investito */}
                          <div className="text-center min-w-[100px]">
                            <p className="text-xs text-adaptive-500">Investito</p>
                            <p className="font-semibold text-adaptive-900">
                              {formatCurrencyWithUserCurrency(totalInvested)}
                            </p>
                          </div>

                          {/* Valore Attuale */}
                          <div className="text-center min-w-[100px]">
                            <p className="text-xs text-adaptive-500">Valore Attuale</p>
                            <p className="font-semibold text-green-600">
                              {formatCurrencyWithUserCurrency(currentValue)}
                            </p>
                          </div>

                          {/* Pulsante Apri Wallet */}
                          <Link href={`/investments/crypto-portfolio/${portfolio.id}`}>
                            <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium">
                              🚀 Apri Wallet
                            </button>
                          </Link>
                        </div>
                      </div>
                    </div>

                    {/* Mobile Card View */}
                    <div className="lg:hidden p-4 hover:bg-adaptive-50 transition-colors">
                      <div className="card-adaptive rounded-lg p-4 border border-adaptive">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3 flex-1">
                            <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                              <span className="text-xl">🚀</span>
                            </div>
                            <div className="flex-1">
                              <h3 className="font-semibold text-adaptive-900 text-base mb-1">{portfolio.name}</h3>
                              <p className="text-lg font-bold text-green-600">
                                {formatCurrencyWithUserCurrency(currentValue)}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 mb-4 text-sm">
                          <div className="bg-adaptive-50 rounded-lg p-3">
                            <p className="text-adaptive-500 text-xs">💰 Investito</p>
                            <p className="font-semibold text-adaptive-900">
                              {formatCurrencyWithUserCurrency(totalInvested)}
                            </p>
                          </div>
                          <div className="bg-adaptive-50 rounded-lg p-3">
                            <p className="text-adaptive-500 text-xs">📈 ROI</p>
                            <p className={`font-semibold ${totalROI >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatPercentage(totalROI)}
                            </p>
                          </div>
                          <div className="bg-adaptive-50 rounded-lg p-3">
                            <p className="text-adaptive-500 text-xs">✅ Realizzato</p>
                            <p className={`font-semibold ${realizedProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrencyWithUserCurrency(realizedProfit)}
                            </p>
                          </div>
                          <div className="bg-adaptive-50 rounded-lg p-3">
                            <p className="text-adaptive-500 text-xs">⏳ Non Realizzato</p>
                            <p className={`font-semibold ${unrealizedGains >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                              {formatCurrencyWithUserCurrency(unrealizedGains)}
                            </p>
                          </div>
                        </div>

                        <div className="pt-3 border-t border-adaptive text-center">
                          <p className="text-sm text-adaptive-600 mb-3">
                            {portfolio.stats.holdingsCount} asset • {portfolio.stats.transactionCount} transazioni
                          </p>
                          <Link href={`/investments/crypto-portfolio/${portfolio.id}`}>
                            <button className="w-full px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium">
                              🚀 Apri Wallet
                            </button>
                          </Link>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}

        {/* Empty State - Mobile Optimized */}
        {dcaPortfolios.length === 0 && cryptoPortfolios.length === 0 && (
          <div className="text-center py-8 sm:py-12">
            <div className="text-4xl sm:text-6xl mb-4">📊</div>
            <h3 className="text-lg sm:text-xl font-semibold text-adaptive-900 mb-2">Nessun portfolio ancora</h3>
            <p className="text-adaptive-600 mb-6 text-sm sm:text-base">Inizia creando il tuo primo portfolio di investimenti</p>
            {/* Desktop */}
            <div className="hidden sm:flex gap-4 justify-center">
              <button
                onClick={() => setShowCreateDCAModal(true)}
                className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium"
              >
                🟠 Crea DCA Bitcoin
              </button>
              <button
                onClick={() => setShowCreateCryptoModal(true)}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                🚀 Crea Crypto Wallet
              </button>
            </div>
            {/* Mobile */}
            <div className="sm:hidden space-y-3">
              <button
                onClick={() => setShowCreateDCAModal(true)}
                className="w-full px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium"
              >
                🟠 Crea DCA Bitcoin
              </button>
              <button
                onClick={() => setShowCreateCryptoModal(true)}
                className="w-full px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
              >
                🚀 Crea Crypto Wallet
              </button>
            </div>
          </div>
        )}

        {/* Create DCA Portfolio Modal */}
        {showCreateDCAModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4 border border-gray-300 dark:border-gray-600">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">🟠 Nuovo Portfolio DCA Bitcoin</h3>
                
                <button
                  onClick={() => setShowCreateDCAModal(false)}
                  className="text-white hover:text-gray-200"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>
<h4 className="text-white">Questo portfolio supporta esclusivamente l'acquisto e la vendita di btc con valute FIAT. Se hai bisogno di swap con stablecoins o shitcoins utilizza il Crypto Wallet.</h4><br></br>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nome Portfolio
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="es. DCA Bitcoin Principale"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Account di Investimento
                  </label>
                  <select
                    value={formData.accountId || ''}
                    onChange={(e) => setFormData({ ...formData, accountId: Number(e.target.value) || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Seleziona account</option>
                    {investmentAccounts.map(account => (
                      <option key={account.id} value={account.id}>
                        {account.name} ({formatCurrencyWithUserCurrency(account.balance)})
                      </option>
                    ))}
                  </select>
                  
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowCreateDCAModal(false)}
                    className="flex-1 px-4 py-2 border border-white rounded-md text-white hover:bg-gray-700"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={createDCAPortfolio}
                    disabled={submitLoading}
                    className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50"
                  >
                    {submitLoading ? 'Creazione...' : 'Crea Portfolio'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Create Crypto Portfolio Modal */}
        {showCreateCryptoModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4 border border-gray-300 dark:border-gray-600">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">🚀 Nuovo Portfolio Crypto</h3>
                <button
                  onClick={() => setShowCreateCryptoModal(false)}
                  className="text-white hover:text-gray-200"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Nome Portfolio
                  </label>
                  <input
                    type="text"
                    value={cryptoFormData.name}
                    onChange={(e) => setCryptoFormData({ ...cryptoFormData, name: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="es. Portfolio Altcoin"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Descrizione (opzionale)
                  </label>
                  <input
                    type="text"
                    value={cryptoFormData.description}
                    onChange={(e) => setCryptoFormData({ ...cryptoFormData, description: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                    placeholder="Portfolio per diversificazione crypto"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    Account di Investimento
                  </label>
                  <select
                    value={cryptoFormData.accountId || ''}
                    onChange={(e) => setCryptoFormData({ ...cryptoFormData, accountId: Number(e.target.value) || undefined })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:ring-blue-500 focus:border-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                  >
                    <option value="">Seleziona account</option>
                    {investmentAccounts.map(account => (
                      <option key={account.id} value={account.id}>
                        {account.name} ({formatCurrencyWithUserCurrency(account.balance)})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowCreateCryptoModal(false)}
                    className="flex-1 px-4 py-2 border border-white rounded-md text-white hover:bg-gray-700"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={createCryptoPortfolio}
                    disabled={submitLoading}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submitLoading ? 'Creazione...' : 'Crea Portfolio'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}