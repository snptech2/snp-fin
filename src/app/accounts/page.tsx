'use client'

import { useState, useEffect, useMemo } from 'react'
import { 
  PlusIcon, PencilIcon, TrashIcon, 
  ArrowsRightLeftIcon, CheckIcon, XMarkIcon, ArrowPathIcon 
} from '@heroicons/react/24/outline'
import ProtectedRoute from '@/components/ProtectedRoute'

interface Account {
  id: number
  name: string
  type: 'bank' | 'investment'
  balance: number
  isDefault: boolean
}

interface Portfolio {
  id: number
  name: string
  accountId: number
  type?: 'dca_bitcoin' | 'crypto_wallet'
  stats: {
    totalInvested: number
    capitalRecovered: number
    effectiveInvestment: number
    realizedProfit: number
    isFullyRecovered: boolean
    totalValueEur?: number
    netBTC?: number
    totalBTC?: number
    totalROI?: number
    transactionCount: number
    buyCount: number
    sellCount?: number
    realizedGains?: number
    unrealizedGains?: number
    totalGains?: number
  }
}

interface Transfer {
  id: number
  fromAccountId: number
  toAccountId: number
  amount: number
  description: string
  date: string
  fromAccount: { name: string }
  toAccount: { name: string }
}

interface BitcoinPrice {
  btcUsd: number
  btcEur: number
  cached: boolean
}

export default function AccountsPage() {
  // Stati esistenti
  const [accounts, setAccounts] = useState<Account[]>([])
  const [dcaPortfolios, setDCAPortfolios] = useState<Portfolio[]>([])
  const [cryptoPortfolios, setCryptoPortfolios] = useState<Portfolio[]>([])
  const [loading, setLoading] = useState(true)
  const [showAccountModal, setShowAccountModal] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [accountForm, setAccountForm] = useState({ name: '', type: 'bank' as 'bank' | 'investment' })

  // Stati per trasferimenti
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [editingTransfer, setEditingTransfer] = useState<Transfer | null>(null)
  const [transferForm, setTransferForm] = useState({
    fromAccountId: '',
    toAccountId: '',
    amount: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  })
  const [transferLoading, setTransferLoading] = useState(false)

  // Stato per prezzo Bitcoin
  const [btcPrice, setBtcPrice] = useState<BitcoinPrice | null>(null)

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount)

  const formatPercentage = (value: number) => 
    new Intl.NumberFormat('it-IT', { style: 'percent', minimumFractionDigits: 1 }).format(value / 100)

  // Load Bitcoin price
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

  // 1. AGGIUNGERE questa funzione per impostare il conto predefinito
const handleSetDefaultAccount = async (accountId: number) => {
  try {
    const response = await fetch(`/api/accounts/${accountId}/set-default`, {
      method: 'PUT'
    })
    
    if (response.ok) {
      await fetchData() // Ricarica i dati per aggiornare l'interfaccia
    } else {
      alert('Errore nell\'impostazione del conto predefinito')
    }
  } catch (error) {
    console.error('Error setting default account:', error)
    alert('Errore nell\'impostazione del conto predefinito')
  }
}

  // DCA Current Value Calculator
  const getDCACurrentValue = (portfolio: Portfolio) => {
    if (portfolio.type !== 'dca_bitcoin' && !portfolio.stats?.totalBTC && !portfolio.stats?.netBTC) {
      return 0
    }
    
    if (!btcPrice?.btcEur) {
      return 0
    }
    
    // Priority: netBTC (includes network fees)
    if (portfolio.stats?.netBTC !== undefined && portfolio.stats?.netBTC !== null) {
      return portfolio.stats.netBTC * btcPrice.btcEur
    }
    
    // Fallback: totalBTC
    if (portfolio.stats?.totalBTC !== undefined && portfolio.stats?.totalBTC !== null) {
      return portfolio.stats.totalBTC * btcPrice.btcEur
    }
    
    return 0
  }

  useEffect(() => {
    fetchData()
    fetchBitcoinPrice()
  }, [])

  const fetchData = async () => {
  setLoading(true)
  try {
    const [accountsRes, dcaRes, cryptoRes, transfersRes] = await Promise.all([
      fetch('/api/accounts'),
      fetch('/api/dca-portfolios'),
      fetch('/api/crypto-portfolios'),
      fetch('/api/transfers')
    ])

    if (accountsRes.ok) setAccounts(await accountsRes.json())
    if (dcaRes.ok) setDCAPortfolios(await dcaRes.json())
    if (cryptoRes.ok) setCryptoPortfolios(await cryptoRes.json())
    
    // 🔧 FIX: Estrae correttamente l'array transfers dalla risposta API
    if (transfersRes.ok) {
      const data = await transfersRes.json()
      setTransfers(data.transfers || [])  // Era: setTransfers(await transfersRes.json())
    }
  } catch (error) {
    console.error('Error fetching data:', error)
  } finally {
    setLoading(false)
  }
}

  // Enhanced account breakdowns con prezzo Bitcoin
  const enhancedAccountBreakdowns = useMemo(() => {
    const breakdowns: Record<number, any> = {}
    
    accounts.forEach(account => {
      const linkedDCAPortfolios = dcaPortfolios.filter(p => p.accountId === account.id)
      const linkedCryptoPortfolios = cryptoPortfolios.filter(p => p.accountId === account.id)
      const allLinkedPortfolios = [...linkedDCAPortfolios, ...linkedCryptoPortfolios]
      
      const totalInvested = allLinkedPortfolios.reduce((sum, p) => sum + (p.stats.totalInvested || 0), 0)
      const totalCapitalRecovered = allLinkedPortfolios.reduce((sum, p) => sum + (p.stats.capitalRecovered || 0), 0)
      const totalRealizedProfit = allLinkedPortfolios.reduce((sum, p) => sum + (p.stats.realizedProfit || 0), 0)
      const totalEffectiveInvestment = allLinkedPortfolios.reduce((sum, p) => sum + (p.stats.effectiveInvestment || 0), 0)
      
      let totalCurrentValue = 0
      allLinkedPortfolios.forEach(portfolio => {
        const isCryptoWallet = cryptoPortfolios.includes(portfolio)
        if (isCryptoWallet) {
          totalCurrentValue += portfolio.stats.totalValueEur || 0
        } else {
          totalCurrentValue += getDCACurrentValue(portfolio)
        }
      })
      
      const totalUnrealizedProfit = Math.max(0, totalCurrentValue - totalEffectiveInvestment)
      const totalROI = totalInvested > 0 ? ((totalRealizedProfit + totalUnrealizedProfit) / totalInvested) * 100 : 0
      
      breakdowns[account.id] = {
        linkedPortfolios: allLinkedPortfolios.length,
        totalInvested,
        totalCapitalRecovered,
        totalRealizedProfit,
        totalEffectiveInvestment,
        totalCurrentValue,
        totalUnrealizedProfit,
        totalROI,
        unknownFunds: Math.max(0, account.balance - totalEffectiveInvestment)
      }
    })
    
    return breakdowns
  }, [accounts, dcaPortfolios, cryptoPortfolios, btcPrice])

  // Account handlers
  const handleAccountSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  try {
    const method = editingAccount ? 'PUT' : 'POST'
    const url = editingAccount ? `/api/accounts/${editingAccount.id}` : '/api/accounts'
    
    // 🔧 NUOVO: Se è il primo conto bancario, lo impostiamo automaticamente come predefinito
    const isFirstBankAccount = !editingAccount && 
                               accountForm.type === 'bank' && 
                               bankAccounts.length === 0
    
    const response = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...accountForm,
        makeDefault: isFirstBankAccount // 🔧 NUOVO: Imposta come predefinito se è il primo conto bancario
      })
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

  const handleRecalculateBalance = async (accountId: number, accountName: string) => {
    if (confirm(`Ricalcolare il saldo per il conto "${accountName}"? Questa operazione aggiornerà il saldo basandosi su tutte le transazioni e trasferimenti.`)) {
      try {
        const response = await fetch(`/api/accounts/${accountId}`, {
          method: 'POST'
        })

        if (response.ok) {
          const result = await response.json()
          alert(`Saldo ricalcolato per "${accountName}":\nVecchio saldo: ${formatCurrency(result.oldBalance)}\nNuovo saldo: ${formatCurrency(result.newBalance)}`)
          await fetchData() // Refresh data
        } else {
          const error = await response.json()
          alert(`Errore nel ricalcolo: ${error.error}`)
        }
      } catch (error) {
        console.error('Error recalculating balance:', error)
        alert('Errore durante il ricalcolo del saldo')
      }
    }
  }

  // Transfer handlers
  const resetTransferForm = () => {
    setTransferForm({ 
      fromAccountId: '', 
      toAccountId: '', 
      amount: '', 
      description: '', 
      date: new Date().toISOString().split('T')[0] 
    })
  }

  const handleTransferSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (transferLoading) return

    if (!transferForm.fromAccountId || !transferForm.toAccountId || !transferForm.amount) {
      alert('Compila tutti i campi obbligatori')
      return
    }

    if (transferForm.fromAccountId === transferForm.toAccountId) {
      alert('Non puoi trasferire denaro sullo stesso conto')
      return
    }

    const amount = parseFloat(transferForm.amount)
    if (isNaN(amount) || amount <= 0) {
      alert('Inserisci un importo valido')
      return
    }

    const fromAccount = accounts.find(a => a.id === parseInt(transferForm.fromAccountId))
    if (fromAccount && fromAccount.balance < amount) {
      alert('Saldo insufficiente nel conto di origine')
      return
    }

    setTransferLoading(true)
    try {
      const response = await fetch('/api/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromAccountId: parseInt(transferForm.fromAccountId),
          toAccountId: parseInt(transferForm.toAccountId),
          amount: amount,
          description: transferForm.description || `Trasferimento di ${formatCurrency(amount)}`,
          date: transferForm.date
        })
      })

      if (response.ok) {
        await fetchData()
        setShowTransferModal(false)
        setEditingTransfer(null)
        resetTransferForm()
        alert('Trasferimento completato con successo!')
      } else {
        const error = await response.json()
        alert(`Errore: ${error.error || 'Trasferimento fallito'}`)
      }
    } catch (error) {
      console.error('Error creating transfer:', error)
      alert('Errore durante il trasferimento')
    } finally {
      setTransferLoading(false)
    }
  }

  const handleDeleteTransfer = async (transferId: number) => {
    if (confirm('Sei sicuro di voler eliminare questo trasferimento?')) {
      try {
        const response = await fetch(`/api/transfers/${transferId}`, {
          method: 'DELETE'
        })

        if (response.ok) {
          await fetchData()
          alert('Trasferimento eliminato con successo!')
        } else {
          const error = await response.json()
          alert(`Errore: ${error.error || 'Eliminazione fallita'}`)
        }
      } catch (error) {
        console.error('Error deleting transfer:', error)
        alert('Errore durante l\'eliminazione del trasferimento')
      }
    }
  }

  const bankAccounts = accounts.filter(account => account.type === 'bank')
  const investmentAccounts = accounts.filter(account => account.type === 'investment')
  const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0)

  if (loading) {
    return (
      <ProtectedRoute>
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
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-adaptive-900">Conti</h1>
            <p className="text-adaptive-600 mt-2">Gestisci i tuoi conti bancari e di investimento con Enhanced Cash Flow.</p>
            
          </div>
          <div className="flex gap-3">
            <button
              onClick={() => setShowTransferModal(true)}
              disabled={accounts.length < 2}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
              title={accounts.length < 2 ? "Serve almeno 2 conti per trasferire" : "Trasferisci denaro tra conti"}
            >
              <ArrowsRightLeftIcon className="w-5 h-5" />
              Trasferimento
            </button>
            
            <button
              onClick={() => setShowAccountModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
            >
              <PlusIcon className="w-5 h-5" />
              Nuovo Conto
            </button>
          </div>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
          <div className="card-adaptive rounded-lg p-6">
            <h3 className="text-lg font-semibold text-adaptive-900 mb-2">💰 Saldo Totale</h3>
            <p className="text-3xl font-bold text-adaptive-900">{formatCurrency(totalBalance)}</p>
          </div>
          
          <div className="card-adaptive rounded-lg p-6">
            <h3 className="text-lg font-semibold text-adaptive-900 mb-2">🏦 Conti Bancari</h3>
            <p className="text-3xl font-bold text-adaptive-900">{bankAccounts.length}</p>
          </div>
          
          <div className="card-adaptive rounded-lg p-6">
            <h3 className="text-lg font-semibold text-adaptive-900 mb-2">📈 Investimenti</h3>
            <p className="text-3xl font-bold text-adaptive-900">{investmentAccounts.length}</p>
          </div>
          
          <div className="card-adaptive rounded-lg p-6">
            <h3 className="text-lg font-semibold text-adaptive-900 mb-2">🔄 Trasferimenti</h3>
            <p className="text-3xl font-bold text-adaptive-900">
              {Array.isArray(transfers) ? transfers.length : 0}
            </p>
          </div>
          
          <div className="card-adaptive rounded-lg p-6">
            <h3 className="text-lg font-semibold text-adaptive-900 mb-2">💼 Portfolio</h3>
            <p className="text-3xl font-bold text-adaptive-900">{dcaPortfolios.length + cryptoPortfolios.length}</p>
          </div>
        </div>

        {/* Bank Accounts */}
<div className="mb-8">
  <h2 className="text-2xl font-bold text-adaptive-900 mb-4">🏦 Conti Bancari</h2>
              <p className="text-adaptive-600 mt-2">Utilizza uno o più conti bancari per gestire le entrate, le uscite e pianificare budget personalizzati.</p><br></br>

  {bankAccounts.length === 0 ? (
    <div className="card-adaptive rounded-lg p-8 text-center">
      <div className="text-4xl mb-4">🏦</div>
      <h3 className="text-lg font-medium text-adaptive-900 mb-2">Nessun Conto Bancario</h3>
      <p className="text-adaptive-600 mb-4">Crea il tuo primo conto per iniziare a gestire le tue finanze</p>
      <button
        onClick={() => {
          setAccountForm({ name: '', type: 'bank' })
          setShowAccountModal(true)
        }}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
      >
        Crea Primo Conto
      </button>
    </div>
  ) : (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {bankAccounts.map((account) => (
        <div key={account.id} className="card-adaptive rounded-lg p-6 hover:shadow-md transition-shadow">
          {/* Header with edit/delete buttons */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🏦</span>
              <div>
                <h4 className="font-semibold text-adaptive-900 flex items-center gap-2">
                  {account.name}
                  {account.isDefault && (
                    <span className="px-2 py-1 bg-green-100 text-green-600 text-xs rounded-full">
                      Predefinito
                    </span>
                  )}
                </h4>
                <p className="text-sm text-adaptive-600">Conto Bancario</p>
              </div>
            </div>
            <div className="flex gap-1">
              {/* 🔧 NUOVO: Bottone stella per impostare come predefinito */}
              <button
                onClick={() => handleSetDefaultAccount(account.id)}
                className={`p-1 ${account.isDefault ? 'text-yellow-500' : 'text-adaptive-600 hover:text-yellow-500'}`}
                title={account.isDefault ? 'Conto predefinito' : 'Imposta come predefinito'}
              >
                <span className="text-sm">{account.isDefault ? '⭐' : '☆'}</span>
              </button>
              <button
                onClick={() => handleRecalculateBalance(account.id, account.name)}
                className="p-1 text-adaptive-600 hover:text-green-600"
                title="Ricalcola saldo"
              >
                <ArrowPathIcon className="w-4 h-4" />
              </button>
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

          {/* Balance */}
          <div className="text-center mb-4">
            <p className="text-2xl font-bold text-adaptive-900">
              {formatCurrency(account.balance)}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-2">
            <div className="grid grid-cols-2 gap-2">
              {/* Nuova Entrata */}
              <a
                href={`/income?accountId=${account.id}`}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 transition-colors"
              >
                <span className="text-xs">💰</span>
                Entrata
              </a>

              {/* Nuova Uscita */}
              <a
                href={`/expenses?accountId=${account.id}`}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700 transition-colors"
              >
                <span className="text-xs">💸</span>
                Uscita
              </a>
            </div>

            {/* Trasferimento */}
            <button
              onClick={() => {
                setTransferForm({
                  fromAccountId: account.id.toString(),
                  toAccountId: '',
                  amount: '',
                  description: '',
                  date: new Date().toISOString().split('T')[0]
                })
                setShowTransferModal(true)
              }}
              disabled={accounts.length < 2}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ArrowsRightLeftIcon className="w-4 h-4" />
              Trasferimento
            </button>
          </div>
        </div>
      ))}
    </div>
  )}
</div>

        {/* Investment Accounts with Enhanced Breakdown */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-adaptive-900 mb-4">📈 Conti Investimento</h2>
                        <p className="text-adaptive-600 mt-2">Collega uno o più Portfolio per gestire i tuoi investimenti.</p><br></br>

          {investmentAccounts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-adaptive-600 mb-4">Nessun conto di investimento trovato</p>
              <button
                onClick={() => {
                  setAccountForm({ name: '', type: 'investment' })
                  setShowAccountModal(true)
                }}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
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
                  <div key={account.id} className="card-adaptive rounded-lg p-6">
                    {/* Account Header */}
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-4">
                        <span className="text-2xl">📈</span>
                        <div>
                          <h4 className="font-semibold text-adaptive-900 flex items-center gap-2">
                            {account.name}
                            {account.isDefault && (
                              <span className="px-2 py-1 bg-green-100 text-green-600 text-xs rounded-full">
                                Predefinito
                              </span>
                            )}
                          </h4>
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
                            onClick={() => handleRecalculateBalance(account.id, account.name)}
                            className="p-1 text-adaptive-600 hover:text-green-600"
                            title="Ricalcola saldo"
                          >
                            <ArrowPathIcon className="w-4 h-4" />
                          </button>
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

                    {/* Enhanced Breakdown */}
                    {breakdown && (
                      <div className="bg-adaptive-50 rounded-lg p-4 mb-4">
                        <h5 className="font-semibold text-adaptive-900 mb-3">Enhanced Cash Flow Breakdown</h5>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                          <div>
                            <p className="text-adaptive-500">💰 Totale Investito</p>
                            <p className="font-semibold text-adaptive-900">{formatCurrency(breakdown.totalInvested)}</p>
                          </div>
                          <div>
                            <p className="text-adaptive-500">🔄 Capitale Recuperato</p>
                            <p className="font-semibold text-blue-600">{formatCurrency(breakdown.totalCapitalRecovered)}</p>
                          </div>
                          <div>
                            <p className="text-adaptive-500">⚠️ Soldi a Rischio</p>
                            <p className="font-semibold text-orange-600">{formatCurrency(breakdown.totalEffectiveInvestment)}</p>
                          </div>
                          <div>
                            <p className="text-adaptive-500">📈 Valore Attuale</p>
                            <p className="font-semibold text-green-600">{formatCurrency(breakdown.totalCurrentValue)}</p>
                          </div>
                        </div>
                        
                        {linkedPortfolios.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-adaptive">
                            <h6 className="font-medium text-adaptive-900 mb-2">Portfolio Collegati:</h6>
                            <div className="flex flex-wrap gap-2">
                              {linkedPortfolios.map((portfolio) => {
                                const portfolioUrl = portfolio.type === 'dca_bitcoin' 
                                  ? `/investments/${portfolio.id}` 
                                  : `/investments/crypto-portfolio/${portfolio.id}`
                                
                                return (
                                  <a
                                    key={portfolio.id}
                                    href={portfolioUrl}
                                    className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full hover:bg-blue-200 transition-colors cursor-pointer"
                                  >
                                    {portfolio.name} - {portfolio.type === 'dca_bitcoin' ? '🟠 DCA Bitcoin' : '🚀 Crypto Wallet'}
                                  </a>
                                )
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Quick Actions for Investment Account */}
                    <div className="flex gap-2 mt-4">
                      <a
                        href={`/investments?createDCA=true&accountId=${account.id}`}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-orange-600 text-white text-sm rounded-md hover:bg-orange-700 transition-colors"
                      >
                        <span className="text-sm">🟠</span>
                        Nuovo DCA Bitcoin
                      </a>
                      <a
                        href={`/investments?createCrypto=true&accountId=${account.id}`}
                        className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 transition-colors"
                      >
                        <span className="text-sm">🚀</span>
                        Nuovo Crypto Wallet
                      </a>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Recent Transfers */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-adaptive-900 mb-4">🔄 Trasferimenti</h2>
                        <p className="text-adaptive-600 mt-2">Trasferimenti di liquidità tra due conti diversi.</p><br></br>

          {!Array.isArray(transfers) || transfers.length === 0 ? (
            <div className="card-adaptive rounded-lg p-8 text-center">
              <div className="text-4xl mb-4">🔄</div>
              <h3 className="text-lg font-medium text-adaptive-900 mb-2">Nessun Trasferimento</h3>
              <p className="text-adaptive-600 mb-4">I tuoi trasferimenti tra conti appariranno qui</p>
              <button
                onClick={() => setShowTransferModal(true)}
                disabled={accounts.length < 2}
                className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 font-medium"
              >
                Crea Primo Trasferimento
              </button>
            </div>
          ) : (
            <div className="card-adaptive rounded-lg overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-adaptive-100">
                    <tr>
                      <th className="text-left py-3 px-4 font-semibold text-adaptive-900">Data</th>
                      <th className="text-left py-3 px-4 font-semibold text-adaptive-900">Da</th>
                      <th className="text-left py-3 px-4 font-semibold text-adaptive-900">A</th>
                      <th className="text-right py-3 px-4 font-semibold text-adaptive-900">Importo</th>
                      <th className="text-left py-3 px-4 font-semibold text-adaptive-900">Descrizione</th>
                      <th className="text-center py-3 px-4 font-semibold text-adaptive-900">Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transfers.slice(0, 10).map((transfer) => (
                      <tr key={transfer.id} className="border-b border-adaptive">
                        <td className="py-3 px-4 text-adaptive-900">
                          {new Date(transfer.date).toLocaleDateString('it-IT')}
                        </td>
                        <td className="py-3 px-4 text-adaptive-900">{transfer.fromAccount.name}</td>
                        <td className="py-3 px-4 text-adaptive-900">{transfer.toAccount.name}</td>
                        <td className="py-3 px-4 text-right font-semibold text-green-600">
                          {formatCurrency(transfer.amount)}
                        </td>
                        <td className="py-3 px-4 text-adaptive-600">{transfer.description}</td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleDeleteTransfer(transfer.id)}
                            className="p-1 text-adaptive-600 hover:text-red-600"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Account Modal */}
        {showAccountModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="card-adaptive rounded-lg p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-adaptive-900">
                  {editingAccount ? 'Modifica Conto' : 'Nuovo Conto'}
                </h3>
                <button
                  onClick={() => {
                    setShowAccountModal(false)
                    setEditingAccount(null)
                    setAccountForm({ name: '', type: 'bank' })
                  }}
                  className="text-adaptive-600 hover:text-adaptive-900"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAccountSubmit} className="space-y-4">
                <p>Usa Conto Bancario per gestione entrate e uscite, usa Conto Investimento per collegarlo a dei Portfolio</p>
                <div>
                  <label className="block text-sm font-medium text-adaptive-900 mb-1">
                    Nome Conto
                  </label>
                  <input
                    type="text"
                    value={accountForm.name}
                    onChange={(e) => setAccountForm({ ...accountForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-adaptive rounded-md focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-adaptive-900 mb-1">
                    Tipo Conto
                  </label>
                  <select
                    value={accountForm.type}
                    onChange={(e) => setAccountForm({ ...accountForm, type: e.target.value as 'bank' | 'investment' })}
                    className="w-full px-3 py-2 border border-adaptive rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="bank">🏦 Bancario</option>
                    <option value="investment">📈 Investimento</option>
                  </select>
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAccountModal(false)
                      setEditingAccount(null)
                      setAccountForm({ name: '', type: 'bank' })
                    }}
                    className="flex-1 px-4 py-2 border border-adaptive rounded-md text-adaptive-700 hover:bg-adaptive-50"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    {editingAccount ? 'Aggiorna' : 'Crea'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Transfer Modal */}
        {showTransferModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="card-adaptive rounded-lg p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-adaptive-900">
                  {editingTransfer ? 'Modifica Trasferimento' : 'Nuovo Trasferimento'}
                </h3>
                <button
                  onClick={() => {
                    setShowTransferModal(false)
                    setEditingTransfer(null)
                    resetTransferForm()
                  }}
                  className="text-adaptive-600 hover:text-adaptive-900"
                >
                  <XMarkIcon className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleTransferSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-adaptive-900 mb-1">
                    Da Conto
                  </label>
                  <select
                    value={transferForm.fromAccountId}
                    onChange={(e) => setTransferForm({ ...transferForm, fromAccountId: e.target.value })}
                    className="w-full px-3 py-2 border border-adaptive rounded-md focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Seleziona conto di origine</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name} ({formatCurrency(account.balance)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-adaptive-900 mb-1">
                    A Conto
                  </label>
                  <select
                    value={transferForm.toAccountId}
                    onChange={(e) => setTransferForm({ ...transferForm, toAccountId: e.target.value })}
                    className="w-full px-3 py-2 border border-adaptive rounded-md focus:ring-blue-500 focus:border-blue-500"
                    required
                  >
                    <option value="">Seleziona conto di destinazione</option>
                    {accounts
                      .filter(account => account.id.toString() !== transferForm.fromAccountId)
                      .map((account) => (
                        <option key={account.id} value={account.id}>
                          {account.name} ({formatCurrency(account.balance)})
                        </option>
                      ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-adaptive-900 mb-1">
                    Importo (EUR)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={transferForm.amount}
                    onChange={(e) => setTransferForm({ ...transferForm, amount: e.target.value })}
                    className="w-full px-3 py-2 border border-adaptive rounded-md focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-adaptive-900 mb-1">
                    Descrizione
                  </label>
                  <input
                    type="text"
                    value={transferForm.description}
                    onChange={(e) => setTransferForm({ ...transferForm, description: e.target.value })}
                    className="w-full px-3 py-2 border border-adaptive rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Opzionale"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-adaptive-900 mb-1">
                    Data
                  </label>
                  <input
                    type="date"
                    value={transferForm.date}
                    onChange={(e) => setTransferForm({ ...transferForm, date: e.target.value })}
                    className="w-full px-3 py-2 border border-adaptive rounded-md focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowTransferModal(false)
                      setEditingTransfer(null)
                      resetTransferForm()
                    }}
                    className="flex-1 px-4 py-2 border border-adaptive rounded-md text-adaptive-700 hover:bg-adaptive-50"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    disabled={transferLoading}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50"
                  >
                    {transferLoading ? 'Trasferimento...' : editingTransfer ? 'Aggiorna' : 'Trasferisci'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}