// src/app/accounts/page.tsx - ENHANCED CASH FLOW EDITION
'use client'

import { useState, useEffect, useMemo } from 'react'
import { 
  PlusIcon, PencilIcon, TrashIcon, 
  ArrowsRightLeftIcon, CheckIcon, ChevronDownIcon 
} from '@heroicons/react/24/outline'

interface Account {
  id: number
  name: string
  type: 'bank' | 'investment'
  balance: number
  isDefault: boolean
}

// 🎯 INTERFACCIA PORTFOLIO ENHANCED (uguale alla pagina investments)
interface Portfolio {
  id: number
  name: string
  accountId: number
  type?: 'dca_bitcoin' | 'crypto_wallet'
  stats: {
    // Enhanced Cash Flow Fields (source of truth)
    totalInvested: number
    capitalRecovered: number
    effectiveInvestment: number
    realizedProfit: number
    isFullyRecovered: boolean
    
    // Portfolio-specific fields
    totalValueEur?: number // Per crypto portfolios
    netBTC?: number // Per DCA portfolios (PRIORITÀ ASSOLUTA)
    totalBTC?: number // Fallback per DCA portfolios
    totalROI?: number // Calcolato dal backend quando disponibile
    
    // Counts
    transactionCount: number
    buyCount: number
    sellCount?: number
    
    // Legacy fields (backwards compatibility)
    realizedGains?: number
    unrealizedGains?: number
    totalGains?: number
  }
}

interface BitcoinPrice {
  btcUsd: number
  btcEur: number
  cached: boolean
}

interface Transfer {
  id: number
  amount: number
  description: string
  date: string
  fromAccount: { id: number; name: string }
  toAccount: { id: number; name: string }
}

// 🎯 ENHANCED ACCOUNT BREAKDOWN
interface EnhancedAccountBreakdown {
  // Enhanced Cash Flow Metrics
  totalInvested: number
  totalCapitalRecovered: number
  totalEffectiveInvestment: number
  totalRealizedProfit: number
  
  // Current Performance  
  totalCurrentValue: number
  totalUnrealizedGains: number
  totalROI: number
  
  // Account specific
  accountBalance: number
  unknownFunds: number
  linkedPortfolios: number
}

export default function EnhancedAccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [dcaPortfolios, setDcaPortfolios] = useState<Portfolio[]>([])
  const [cryptoPortfolios, setCryptoPortfolios] = useState<Portfolio[]>([])
  const [btcPrice, setBtcPrice] = useState<BitcoinPrice | null>(null)
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [loading, setLoading] = useState(true)
  
  // Modal states
  const [showAccountModal, setShowAccountModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  
  // Form states
  const [accountForm, setAccountForm] = useState({
    name: '',
    type: 'bank' as 'bank' | 'investment'
  })
  
  const [transferForm, setTransferForm] = useState({
    amount: '',
    description: '',
    fromAccountId: '',
    toAccountId: '',
    date: new Date().toISOString().split('T')[0]
  })

  // UI states
  const [showBankAccounts, setShowBankAccounts] = useState(true)
  const [showInvestmentAccounts, setShowInvestmentAccounts] = useState(true)
  const [showTransfers, setShowTransfers] = useState(true)

  useEffect(() => {
    fetchData()
    fetchBitcoinPrice()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [accountsRes, dcaRes, cryptoRes] = await Promise.all([
        fetch('/api/accounts'),
        fetch('/api/dca-portfolios'),
        fetch('/api/crypto-portfolios')
      ])

      if (accountsRes.ok) {
        const accountsData = await accountsRes.json()
        setAccounts(Array.isArray(accountsData) ? accountsData : [])
      }

      if (dcaRes.ok) {
        const dcaData = await dcaRes.json()
        setDcaPortfolios(Array.isArray(dcaData) ? dcaData : [])
      }

      if (cryptoRes.ok) {
        const cryptoData = await cryptoRes.json()
        setCryptoPortfolios(Array.isArray(cryptoData) ? cryptoData : [])
      }

      // Try to load transfers separately
      try {
        const transfersRes = await fetch('/api/transfers?limit=5')
        if (transfersRes.ok) {
          const transfersData = await transfersRes.json()
          setTransfers(Array.isArray(transfersData) ? transfersData : [])
        }
      } catch (transferError) {
        console.log('Transfers API not available')
        setTransfers([])
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
      console.error('Errore nel recupero prezzo Bitcoin:', error)
    }
  }

  // Format functions (stesse della pagina investments)
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
  }

  // 🎯 ENHANCED CALCULATION FUNCTIONS (stesse della pagina investments con safety checks)
  
  // DCA Current Value con safety check
  const getDCACurrentValue = (portfolio: Portfolio) => {
    if (portfolio.type !== 'dca_bitcoin') {
      console.warn(`getDCACurrentValue called for non-DCA portfolio ${portfolio.name}`)
      return 0
    }
    
    if (!btcPrice?.btcEur) return 0
    
    // Priorità assoluta: usa netBTC se disponibile
    if (portfolio.stats.netBTC !== undefined && portfolio.stats.netBTC !== null) {
      return portfolio.stats.netBTC * btcPrice.btcEur
    }
    
    // Fallback: usa totalBTC
    if (portfolio.stats.totalBTC !== undefined && portfolio.stats.totalBTC !== null && portfolio.stats.totalBTC > 0) {
      return portfolio.stats.totalBTC * btcPrice.btcEur
    }
    
    return 0
  }

  // Portfolio ROI calculation con safety check
  const getPortfolioROI = (portfolio: Portfolio) => {
    if (portfolio.stats.totalROI !== undefined && portfolio.stats.totalROI !== null) {
      return portfolio.stats.totalROI
    }
    
    const isCryptoWallet = cryptoPortfolios.includes(portfolio)
    const currentValue = isCryptoWallet 
      ? (portfolio.stats.totalValueEur || 0)
      : getDCACurrentValue(portfolio)
    
    const effectiveInvestment = portfolio.stats.effectiveInvestment || 0
    const realizedProfit = portfolio.stats.realizedProfit || 0
    const totalInvested = portfolio.stats.totalInvested || 0
    
    if (totalInvested <= 0) return 0
    
    const unrealizedGains = currentValue - effectiveInvestment
    const totalGains = realizedProfit + unrealizedGains
    
    return (totalGains / totalInvested) * 100
  }

  // Portfolio Total Gains calculation con safety check
  const getPortfolioTotalGains = (portfolio: Portfolio) => {
    const isCryptoWallet = cryptoPortfolios.includes(portfolio)
    const currentValue = isCryptoWallet 
      ? (portfolio.stats.totalValueEur || 0)
      : getDCACurrentValue(portfolio)
    
    const effectiveInvestment = portfolio.stats.effectiveInvestment || 0
    const realizedProfit = portfolio.stats.realizedProfit || 0
    
    const unrealizedGains = currentValue - effectiveInvestment
    return realizedProfit + unrealizedGains
  }

  // 🎯 ENHANCED OVERALL STATS (stessi della pagina investments)
  const overallStats = useMemo(() => {
    const allPortfolios = [...dcaPortfolios, ...cryptoPortfolios]
    
    // Enhanced Cash Flow: Somma tutte le stats dai portfolio backend
    const totalInvested = allPortfolios.reduce((sum, p) => sum + (p.stats.totalInvested || 0), 0)
    const totalCapitalRecovered = allPortfolios.reduce((sum, p) => sum + (p.stats.capitalRecovered || 0), 0)
    const totalEffectiveInvestment = allPortfolios.reduce((sum, p) => sum + (p.stats.effectiveInvestment || 0), 0)
    const totalRealizedProfit = allPortfolios.reduce((sum, p) => sum + (p.stats.realizedProfit || 0), 0)
    
    // Calcola current value usando helper functions Enhanced
    let totalCurrentValue = 0
    allPortfolios.forEach(portfolio => {
      const portfolioType = dcaPortfolios.includes(portfolio) ? 'dca_bitcoin' : 'crypto_wallet'
      
      if (portfolioType === 'crypto_wallet') {
        totalCurrentValue += portfolio.stats.totalValueEur || 0
      } else {
        totalCurrentValue += getDCACurrentValue(portfolio)
      }
    })
    
    const totalUnrealizedGains = totalCurrentValue - totalEffectiveInvestment
    const overallROI = totalInvested > 0 ? 
      ((totalRealizedProfit + totalUnrealizedGains) / totalInvested) * 100 : 0

    return {
      totalInvested,
      totalCapitalRecovered,
      totalEffectiveInvestment,
      totalRealizedProfit,
      isFullyRecovered: totalCapitalRecovered >= totalInvested,
      totalCurrentValue,
      totalUnrealizedGains,
      overallROI,
      totalPortfolios: allPortfolios.length,
      dcaCount: dcaPortfolios.length,
      cryptoCount: cryptoPortfolios.length
    }
  }, [dcaPortfolios, cryptoPortfolios, btcPrice])

  // 🎯 ENHANCED ACCOUNT BREAKDOWNS
  const enhancedAccountBreakdowns = useMemo(() => {
    const breakdowns: {[key: number]: EnhancedAccountBreakdown} = {}
    
    accounts.filter(acc => acc.type === 'investment').forEach(account => {
      const accountPortfolios = [...dcaPortfolios, ...cryptoPortfolios].filter(p => p.accountId === account.id)
      
      if (accountPortfolios.length > 0) {
        // Aggrega Enhanced metrics dai portfolio
        const totalInvested = accountPortfolios.reduce((sum, p) => sum + (p.stats.totalInvested || 0), 0)
        const totalCapitalRecovered = accountPortfolios.reduce((sum, p) => sum + (p.stats.capitalRecovered || 0), 0)
        const totalEffectiveInvestment = accountPortfolios.reduce((sum, p) => sum + (p.stats.effectiveInvestment || 0), 0)
        const totalRealizedProfit = accountPortfolios.reduce((sum, p) => sum + (p.stats.realizedProfit || 0), 0)
        
        // Calcola current value per questo account
        let totalCurrentValue = 0
        accountPortfolios.forEach(portfolio => {
          const portfolioType = dcaPortfolios.includes(portfolio) ? 'dca_bitcoin' : 'crypto_wallet'
          
          if (portfolioType === 'crypto_wallet') {
            totalCurrentValue += portfolio.stats.totalValueEur || 0
          } else {
            totalCurrentValue += getDCACurrentValue(portfolio)
          }
        })
        
        const totalUnrealizedGains = totalCurrentValue - totalEffectiveInvestment
        const totalROI = totalInvested > 0 ? 
          ((totalRealizedProfit + totalUnrealizedGains) / totalInvested) * 100 : 0
        
        // Unknown funds = balance - capital recovered - realized profit
        const trackedFunds = totalCapitalRecovered + totalRealizedProfit
        const unknownFunds = Math.max(0, account.balance - trackedFunds)
        
        breakdowns[account.id] = {
          totalInvested,
          totalCapitalRecovered,
          totalEffectiveInvestment,
          totalRealizedProfit,
          totalCurrentValue,
          totalUnrealizedGains,
          totalROI,
          accountBalance: account.balance,
          unknownFunds,
          linkedPortfolios: accountPortfolios.length
        }
      } else {
        // Account without portfolios
        breakdowns[account.id] = {
          totalInvested: 0,
          totalCapitalRecovered: 0,
          totalEffectiveInvestment: 0,
          totalRealizedProfit: 0,
          totalCurrentValue: 0,
          totalUnrealizedGains: 0,
          totalROI: 0,
          accountBalance: account.balance,
          unknownFunds: account.balance,
          linkedPortfolios: 0
        }
      }
    })
    
    return breakdowns
  }, [accounts, dcaPortfolios, cryptoPortfolios, btcPrice])

  // Filter arrays
  const bankAccounts = accounts.filter(acc => acc.type === 'bank')
  const investmentAccounts = accounts.filter(acc => acc.type === 'investment')

  // Account management functions
  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const url = editingAccount ? `/api/accounts/${editingAccount.id}` : '/api/accounts'
      const method = editingAccount ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accountForm)
      })

      if (response.ok) {
        await fetchData()
        setShowAccountModal(false)
        setEditingAccount(null)
        setAccountForm({ name: '', type: 'bank' })
      }
    } catch (error) {
      console.error('Error saving account:', error)
    }
  }

  const handleDeleteAccount = async (accountId: number) => {
    if (confirm('Sei sicuro di voler eliminare questo account?')) {
      try {
        const response = await fetch(`/api/accounts/${accountId}`, {
          method: 'DELETE'
        })
        if (response.ok) {
          await fetchData()
        }
      } catch (error) {
        console.error('Error deleting account:', error)
      }
    }
  }

  const handleEditAccount = (account: Account) => {
    setEditingAccount(account)
    setAccountForm({ name: account.name, type: account.type })
    setShowAccountModal(true)
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-adaptive-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-32 bg-adaptive-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold text-adaptive-900">Conti</h1>
          <p className="text-adaptive-600 mt-2">Gestisci i tuoi conti bancari e di investimento con Enhanced Cash Flow</p>
        </div>
        
        <div className="flex gap-3">
          <button
            onClick={() => setShowTransferModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium flex items-center gap-2"
          >
            <ArrowsRightLeftIcon className="w-4 h-4" />
            Trasferimento
          </button>
          <button
            onClick={() => {
              setAccountForm({ name: '', type: 'bank' })
              setShowAccountModal(true)
            }}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 text-sm font-medium flex items-center gap-2"
          >
            <PlusIcon className="w-4 h-4" />
            Nuovo Conto
          </button>
        </div>
      </div>

      {/* Enhanced Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
        <div className="card-adaptive p-6 rounded-lg shadow-sm border-adaptive">
          <h3 className="text-sm font-medium text-adaptive-500">🏦 Conti Bancari</h3>
          <p className="text-2xl font-bold text-adaptive-900">
            {formatCurrency(bankAccounts.reduce((sum, acc) => sum + acc.balance, 0))}
          </p>
          <p className="text-sm text-adaptive-600">{bankAccounts.length} conti</p>
        </div>

        <div className="card-adaptive p-6 rounded-lg shadow-sm border-adaptive">
          <h3 className="text-sm font-medium text-adaptive-500">📈 Liquidità Investimenti</h3>
          <p className="text-2xl font-bold text-blue-600">
            {formatCurrency(investmentAccounts.reduce((sum, acc) => sum + acc.balance, 0))}
          </p>
          <p className="text-sm text-adaptive-600">{investmentAccounts.length} conti</p>
        </div>

        <div className="card-adaptive p-6 rounded-lg shadow-sm border-adaptive">
          <h3 className="text-sm font-medium text-adaptive-500">💰 Investito Totale</h3>
          <p className="text-2xl font-bold text-orange-600">
            {formatCurrency(overallStats.totalInvested)}
          </p>
          <p className="text-sm text-adaptive-600">Enhanced tracking</p>
        </div>

        <div className="card-adaptive p-6 rounded-lg shadow-sm border-adaptive">
          <h3 className="text-sm font-medium text-adaptive-500">🔄 Capitale Recuperato</h3>
          <p className="text-2xl font-bold text-blue-600">
            {formatCurrency(overallStats.totalCapitalRecovered)}
          </p>
          <p className="text-sm text-adaptive-600">
            {overallStats.totalInvested > 0 ? 
              ((overallStats.totalCapitalRecovered / overallStats.totalInvested) * 100).toFixed(1) : 0}%
          </p>
        </div>

        <div className="card-adaptive p-6 rounded-lg shadow-sm border-adaptive">
          <h3 className="text-sm font-medium text-adaptive-500">💸 Profitti Realizzati</h3>
          <p className={`text-2xl font-bold ${overallStats.totalRealizedProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatCurrency(overallStats.totalRealizedProfit)}
          </p>
          <p className="text-sm text-adaptive-600">
            ROI: {overallStats.totalInvested > 0 ? 
              formatPercentage((overallStats.totalRealizedProfit / overallStats.totalInvested) * 100) : '0.00%'}
          </p>
        </div>
      </div>

      {/* Bank Accounts Section */}
      <div className="card-adaptive rounded-lg shadow-sm border-adaptive mb-8">
        <div 
          className="p-6 border-b border-adaptive cursor-pointer"
          onClick={() => setShowBankAccounts(!showBankAccounts)}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-adaptive-900 flex items-center gap-2">
              🏦 Conti Bancari
              <ChevronDownIcon className={`w-5 h-5 transition-transform ${showBankAccounts ? 'rotate-180' : ''}`} />
            </h3>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setAccountForm({ name: '', type: 'bank' })
                setShowAccountModal(true)
              }}
              className="btn-primary px-3 py-1 text-sm rounded-lg flex items-center gap-1"
            >
              <PlusIcon className="w-4 h-4" />
              Nuovo Conto Bancario
            </button>
          </div>
        </div>
        {showBankAccounts && (
          <div className="p-6">
            {bankAccounts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-adaptive-600 mb-4">Nessun conto bancario trovato</p>
                <button
                  onClick={() => {
                    setAccountForm({ name: '', type: 'bank' })
                    setShowAccountModal(true)
                  }}
                  className="btn-primary px-4 py-2 rounded-md"
                >
                  Crea il tuo primo conto bancario
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {bankAccounts.map((account) => (
                  <div key={account.id} className="border border-adaptive rounded-lg p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">🏦</span>
                        <h4 className="font-semibold text-adaptive-900">{account.name}</h4>
                        {account.isDefault && (
                          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">
                            Predefinito
                          </span>
                        )}
                      </div>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEditAccount(account)}
                          className="p-1 text-adaptive-600 hover:text-blue-600"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteAccount(account.id)}
                          className="p-1 text-adaptive-600 hover:text-red-600"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                    <p className="text-2xl font-bold text-adaptive-900">
                      {formatCurrency(account.balance)}
                    </p>
                    <p className="text-sm text-adaptive-600">Conto Bancario</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Investment Accounts Section con Enhanced Cash Flow */}
      <div className="card-adaptive rounded-lg shadow-sm border-adaptive mb-8">
        <div 
          className="p-6 border-b border-adaptive cursor-pointer"
          onClick={() => setShowInvestmentAccounts(!showInvestmentAccounts)}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-adaptive-900 flex items-center gap-2">
              📈 Conti Investimento con Enhanced Cash Flow
              <ChevronDownIcon className={`w-5 h-5 transition-transform ${showInvestmentAccounts ? 'rotate-180' : ''}`} />
            </h3>
            <button
              onClick={(e) => {
                e.stopPropagation()
                setAccountForm({ name: '', type: 'investment' })
                setShowAccountModal(true)
              }}
              className="btn-primary px-3 py-1 text-sm rounded-lg flex items-center gap-1"
            >
              <PlusIcon className="w-4 h-4" />
              Nuovo Conto Investimento
            </button>
          </div>
        </div>
        {showInvestmentAccounts && (
          <div className="p-6">
            {investmentAccounts.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-adaptive-600 mb-4">Nessun conto di investimento trovato</p>
                <button
                  onClick={() => {
                    setAccountForm({ name: '', type: 'investment' })
                    setShowAccountModal(true)
                  }}
                  className="btn-primary px-4 py-2 rounded-md"
                >
                  Crea il tuo primo conto investimento
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                {investmentAccounts.map((account) => {
                  const breakdown = enhancedAccountBreakdowns[account.id]
                  const linkedPortfolios = [...dcaPortfolios, ...cryptoPortfolios].filter(p => p.accountId === account.id)
                  
                  return (
                    <div key={account.id} className="border border-adaptive rounded-lg p-6">
                      {/* Account Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <span className="text-2xl">📈</span>
                          <div>
                            <h4 className="font-semibold text-adaptive-900">{account.name}</h4>
                            <p className="text-sm text-adaptive-600">
                              {breakdown?.linkedPortfolios || 0} portfolio collegati
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <p className="text-sm text-adaptive-500">Saldo Conto</p>
                            <p className="text-xl font-bold text-adaptive-900">
                              {formatCurrency(account.balance)}
                            </p>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => handleEditAccount(account)}
                              className="p-1 text-adaptive-600 hover:text-blue-600"
                            >
                              <PencilIcon className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteAccount(account.id)}
                              className="p-1 text-adaptive-600 hover:text-red-600"
                            >
                              <TrashIcon className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>

                      {breakdown && (
                        <>
                          {/* Enhanced Metrics Grid */}
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                            <div className="text-center">
                              <p className="text-xs text-adaptive-500">Capitale Originale</p>
                              <p className="font-semibold text-blue-600">
                                {formatCurrency(breakdown.totalCapitalRecovered)}
                              </p>
                              <p className="text-xs text-adaptive-600">
                                {breakdown.totalInvested > 0 ? 
                                  ((breakdown.totalCapitalRecovered / breakdown.totalInvested) * 100).toFixed(1) : 0}%
                              </p>
                            </div>

                            <div className="text-center">
                              <p className="text-xs text-adaptive-500">Profitti Realizzati</p>
                              <p className={`font-semibold ${breakdown.totalRealizedProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(breakdown.totalRealizedProfit)}
                              </p>
                              <p className="text-xs text-adaptive-600">Da vendite</p>
                            </div>

                            <div className="text-center">
                              <p className="text-xs text-adaptive-500">Fondi Non Tracciati</p>
                              <p className={`font-semibold ${breakdown.unknownFunds > 0 ? 'text-orange-600' : 'text-adaptive-900'}`}>
                                {formatCurrency(breakdown.unknownFunds)}
                              </p>
                              <p className="text-xs text-adaptive-600">
                                {account.balance > 0 ? 
                                  ((breakdown.unknownFunds / account.balance) * 100).toFixed(1) : 0}%
                              </p>
                            </div>

                            <div className="text-center">
                              <p className="text-xs text-adaptive-500">P&L Netto</p>
                              <p className={`font-semibold ${breakdown.totalRealizedProfit + breakdown.totalUnrealizedGains >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(breakdown.totalRealizedProfit + breakdown.totalUnrealizedGains)}
                              </p>
                              <p className="text-xs text-adaptive-600">
                                ROI: {formatPercentage(breakdown.totalROI)}
                              </p>
                            </div>
                          </div>

                          {/* Portfolio Collegati */}
                          {linkedPortfolios.length > 0 && (
                            <div className="border-t border-adaptive pt-4">
                              <h5 className="text-sm font-medium text-adaptive-700 mb-2">Portfolio Collegati:</h5>
                              <div className="flex flex-wrap gap-2">
                                {linkedPortfolios.map(portfolio => {
                                  const portfolioType = dcaPortfolios.includes(portfolio) ? 'dca_bitcoin' : 'crypto_wallet'
                                  return (
                                    <span 
                                      key={portfolio.id}
                                      className={`text-xs px-2 py-1 rounded ${
                                        portfolioType === 'dca_bitcoin' 
                                          ? 'bg-orange-100 text-orange-800' 
                                          : 'bg-blue-100 text-blue-800'
                                      }`}
                                    >
                                      {portfolioType === 'dca_bitcoin' ? '🟠' : '🚀'} {portfolio.name}
                                      {' • Investito: '}{formatCurrency(portfolio.stats.totalInvested)}
                                    </span>
                                  )
                                })}
                              </div>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Account Modal */}
      {showAccountModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">
                {editingAccount ? 'Modifica Conto' : 'Nuovo Conto'}
              </h3>
              <button
                onClick={() => {
                  setShowAccountModal(false)
                  setEditingAccount(null)
                  setAccountForm({ name: '', type: 'bank' })
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAccountSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome Conto
                </label>
                <input
                  type="text"
                  value={accountForm.name}
                  onChange={(e) => setAccountForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="es. Conto Corrente Principale"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo Conto
                </label>
                <select
                  value={accountForm.type}
                  onChange={(e) => setAccountForm(prev => ({ ...prev, type: e.target.value as 'bank' | 'investment' }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="bank">🏦 Conto Bancario</option>
                  <option value="investment">📈 Conto Investimento</option>
                </select>
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                >
                  {editingAccount ? 'Salva Modifiche' : 'Crea Conto'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAccountModal(false)
                    setEditingAccount(null)
                    setAccountForm({ name: '', type: 'bank' })
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Annulla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}