'use client'

import { useState, useEffect, useMemo } from 'react'
import { 
  PlusIcon, PencilIcon, TrashIcon, 
  ArrowsRightLeftIcon, CheckIcon, XMarkIcon 
} from '@heroicons/react/24/outline'

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

  // 🔧 NUOVI STATI per trasferimenti
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

  // 🔧 FIX: Aggiungi stato per prezzo Bitcoin
  const [btcPrice, setBtcPrice] = useState<BitcoinPrice | null>(null)

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('it-IT', { style: 'currency', currency: 'EUR' }).format(amount)

  const formatPercentage = (value: number) => 
    new Intl.NumberFormat('it-IT', { style: 'percent', minimumFractionDigits: 2 }).format(value / 100)

  // 🔧 FIX: Aggiungi fetch prezzo Bitcoin
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

  // Caricamento dati
  const fetchData = async () => {
    setLoading(true)
    try {
      const [accountsRes, dcaRes, cryptoRes, transfersRes] = await Promise.all([
        fetch('/api/accounts'),
        fetch('/api/dca-portfolios'),
        fetch('/api/crypto-portfolios'),
        fetch('/api/transfers').catch(() => ({ ok: false }))
      ])

      if (accountsRes.ok) setAccounts(await accountsRes.json())
      if (dcaRes.ok) setDCAPortfolios(await dcaRes.json())
      if (cryptoRes.ok) setCryptoPortfolios(await cryptoRes.json())
      
      // 🔧 FIX: Controlla che transfersRes sia un vero Response object prima di chiamare .json()
      if (transfersRes.ok && 'json' in transfersRes) {
        try {
          const transfersData = await transfersRes.json()
          if (transfersData && transfersData.transfers && Array.isArray(transfersData.transfers)) {
            setTransfers(transfersData.transfers)
          } else if (Array.isArray(transfersData)) {
            setTransfers(transfersData)
          } else {
            console.warn('Transfers API returned unexpected format:', transfersData)
            setTransfers([])
          }
        } catch (error) {
          console.warn('Transfers API error:', error)
          setTransfers([])
        }
      } else {
        setTransfers([])
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      setTransfers([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
    fetchBitcoinPrice() // 🔧 FIX: Carica anche il prezzo Bitcoin
  }, [])

  // 🔧 NUOVA FUNZIONE: Modifica trasferimento
  const handleEditTransfer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (transferLoading || !editingTransfer) return

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

    setTransferLoading(true)
    try {
      const response = await fetch(`/api/transfers/${editingTransfer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromAccountId: parseInt(transferForm.fromAccountId),
          toAccountId: parseInt(transferForm.toAccountId),
          amount: amount,
          description: transferForm.description || `Trasferimento di ${formatCurrency(amount)}`,
          date: transferForm.date || editingTransfer.date
        })
      })

      if (response.ok) {
        await fetchData()
        setShowTransferModal(false)
        setEditingTransfer(null)
        resetTransferForm()
        alert('Trasferimento modificato con successo!')
      } else {
        const error = await response.json()
        alert(`Errore: ${error.error || 'Modifica trasferimento fallita'}`)
      }
    } catch (error) {
      console.error('Error editing transfer:', error)
      alert('Errore durante la modifica del trasferimento')
    } finally {
      setTransferLoading(false)
    }
  }

  // 🔧 NUOVA FUNZIONE: Cancella trasferimento
  const handleDeleteTransfer = async (transferId: number) => {
    if (!confirm('Sei sicuro di voler eliminare questo trasferimento?')) return

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

  // 🔧 NUOVA FUNZIONE: Imposta conto predefinito
  const handleSetDefaultAccount = async (accountId: number) => {
    try {
      const response = await fetch(`/api/accounts/${accountId}/set-default`, {
        method: 'PUT'
      })

      if (response.ok) {
        await fetchData()
        alert('Conto predefinito aggiornato!')
      } else {
        const error = await response.json()
        alert(`Errore: ${error.error || 'Aggiornamento fallito'}`)
      }
    } catch (error) {
      console.error('Error setting default account:', error)
      alert('Errore durante l\'aggiornamento del conto predefinito')
    }
  }

  // 🔧 UTILITY per reset e gestione form trasferimenti
  const resetTransferForm = () => {
    setTransferForm({ 
      fromAccountId: '', 
      toAccountId: '', 
      amount: '', 
      description: '', 
      date: new Date().toISOString().split('T')[0] 
    })
  }

  const openEditTransfer = (transfer: Transfer) => {
    setEditingTransfer(transfer)
    setTransferForm({
      fromAccountId: transfer.fromAccountId.toString(),
      toAccountId: transfer.toAccountId.toString(),
      amount: transfer.amount.toString(),
      description: transfer.description,
      date: transfer.date.split('T')[0]
    })
    setShowTransferModal(true)
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

  // 🔧 FIX: Enhanced account breakdowns con prezzo Bitcoin corretto
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
          const netBTC = portfolio.stats.netBTC || portfolio.stats.totalBTC || 0
          // 🔧 FIX: Usa il prezzo Bitcoin dall'API invece di hardcoded
          const currentBtcPrice = btcPrice?.btcEur || 0
          totalCurrentValue += netBTC * currentBtcPrice
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
  }, [accounts, dcaPortfolios, cryptoPortfolios, btcPrice]) // 🔧 FIX: Aggiungi btcPrice alle dependencies

  // Funzioni esistenti per account
  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const method = editingAccount ? 'PUT' : 'POST'
      const url = editingAccount ? `/api/accounts/${editingAccount.id}` : '/api/accounts'
      
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

  const bankAccounts = accounts.filter(account => account.type === 'bank')
  const investmentAccounts = accounts.filter(account => account.type === 'investment')
  const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0)

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
        {bankAccounts.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-adaptive-600 mb-4">Nessun conto bancario trovato</p>
            <button
              onClick={() => {
                setAccountForm({ name: '', type: 'bank' })
                setShowAccountModal(true)
              }}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
            >
              Crea il tuo primo conto bancario
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {bankAccounts.map((account) => (
              <div key={account.id} className="card-adaptive rounded-lg p-6">
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
                    {!account.isDefault && (
                      <button
                        onClick={() => handleSetDefaultAccount(account.id)}
                        className="p-1 text-adaptive-600 hover:text-green-600"
                        title="Imposta come predefinito"
                      >
                        <CheckIcon className="w-4 h-4" />
                      </button>
                    )}
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
                <div className="text-center">
                  <p className="text-2xl font-bold text-adaptive-900">
                    {formatCurrency(account.balance)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Investment Accounts with Enhanced Breakdown */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-adaptive-900 mb-4">📈 Conti Investimento</h2>
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
                          <p className="text-adaptive-500">Capitale Investito</p>
                          <p className="font-bold text-adaptive-900">{formatCurrency(breakdown.totalInvested)}</p>
                        </div>
                        <div>
                          <p className="text-adaptive-500">Capitale Recuperato</p>
                          <p className="font-bold text-adaptive-900">{formatCurrency(breakdown.totalCapitalRecovered)}</p>
                        </div>
                        <div>
                          <p className="text-adaptive-500">Investimento Effettivo</p>
                          <p className="font-bold text-orange-600">{formatCurrency(breakdown.totalEffectiveInvestment)}</p>
                        </div>
                        <div>
                          <p className="text-adaptive-500">Profitti Realizzati</p>
                          <p className="font-bold text-green-600">{formatCurrency(breakdown.totalRealizedProfit)}</p>
                        </div>
                        <div>
                          <p className="text-adaptive-500">Valore Corrente</p>
                          <p className="font-bold text-adaptive-900">{formatCurrency(breakdown.totalCurrentValue)}</p>
                        </div>
                        <div>
                          <p className="text-adaptive-500">Profitti Non Realizzati</p>
                          <p className="font-bold text-blue-600">{formatCurrency(breakdown.totalUnrealizedProfit)}</p>
                        </div>
                        <div>
                          <p className="text-adaptive-500">ROI Totale</p>
                          <p className={`font-bold ${breakdown.totalROI >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatPercentage(breakdown.totalROI)}
                          </p>
                        </div>
                        <div>
                          <p className="text-adaptive-500">Fondi Non Tracciati</p>
                          <p className="font-bold text-adaptive-600">{formatCurrency(breakdown.unknownFunds)}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Linked Portfolios */}
                  {linkedPortfolios.length > 0 && (
                    <div>
                      <h5 className="font-semibold text-adaptive-900 mb-2">Portfolio Collegati</h5>
                      <div className="space-y-2">
                        {linkedPortfolios.map(portfolio => (
                          <div key={portfolio.id} className="flex justify-between items-center py-2 px-3 bg-adaptive-100 rounded">
                            <span className="font-medium">{portfolio.name}</span>
                            <span className="text-sm text-adaptive-600">
                              {dcaPortfolios.includes(portfolio) ? '🟠 DCA Bitcoin' : '🚀 Crypto Wallet'}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Recent Transfers */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-adaptive-900 mb-4">🔄 Trasferimenti</h2>
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
                  {Array.isArray(transfers) && transfers.map((transfer) => (
                    <tr key={transfer.id} className="border-t border-adaptive hover:bg-adaptive-100">
                      <td className="py-3 px-4 text-sm">
                        {new Date(transfer.date).toLocaleDateString('it-IT')}
                      </td>
                      <td className="py-3 px-4">{transfer.fromAccount?.name || 'N/A'}</td>
                      <td className="py-3 px-4">{transfer.toAccount?.name || 'N/A'}</td>
                      <td className="text-right py-3 px-4 font-semibold">
                        {formatCurrency(transfer.amount)}
                      </td>
                      <td className="py-3 px-4 text-sm text-adaptive-600">
                        {transfer.description}
                      </td>
                      <td className="text-center py-3 px-4">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => openEditTransfer(transfer)}
                            className="p-1 text-adaptive-600 hover:text-blue-600"
                            title="Modifica trasferimento"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTransfer(transfer.id)}
                            className="p-1 text-adaptive-600 hover:text-red-600"
                            title="Elimina trasferimento"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {Array.isArray(transfers) && transfers.length > 10 && (
              <div className="p-4 bg-adaptive-100 text-center">
                <p className="text-sm text-adaptive-600">
                  Mostrati {Math.min(10, transfers.length)} di {transfers.length} trasferimenti
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Account Modal */}
      {showAccountModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="card-adaptive rounded-lg p-6 w-full max-w-md mx-4">
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
                className="text-adaptive-500 hover:text-adaptive-700"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAccountSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">
                  Nome Conto
                </label>
                <input
                  type="text"
                  value={accountForm.name}
                  onChange={(e) => setAccountForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-adaptive rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="es. Conto Corrente Principale"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">
                  Tipo Conto
                </label>
                <select
                  value={accountForm.type}
                  onChange={(e) => setAccountForm(prev => ({ ...prev, type: e.target.value as 'bank' | 'investment' }))}
                  className="w-full px-3 py-2 border border-adaptive rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                  className="px-4 py-2 border border-adaptive text-adaptive-700 rounded-md hover:bg-adaptive-50"
                >
                  Annulla
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
              <h3 className="text-lg font-semibold">
                {editingTransfer ? '✏️ Modifica Trasferimento' : '🔄 Nuovo Trasferimento'}
              </h3>
              <button
                onClick={() => {
                  setShowTransferModal(false)
                  setEditingTransfer(null)
                  resetTransferForm()
                }}
                className="text-adaptive-500 hover:text-adaptive-700"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={editingTransfer ? handleEditTransfer : handleTransferSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">
                  Da Conto
                </label>
                <select
                  value={transferForm.fromAccountId}
                  onChange={(e) => setTransferForm(prev => ({ ...prev, fromAccountId: e.target.value }))}
                  className="w-full px-3 py-2 border border-adaptive rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                >
                  <option value="">Seleziona conto di origine...</option>
                  {accounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.type === 'bank' ? '🏦' : '📈'} {account.name} ({formatCurrency(account.balance)})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">
                  A Conto
                </label>
                <select
                  value={transferForm.toAccountId}
                  onChange={(e) => setTransferForm(prev => ({ ...prev, toAccountId: e.target.value }))}
                  className="w-full px-3 py-2 border border-adaptive rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                >
                  <option value="">Seleziona conto di destinazione...</option>
                  {accounts
                    .filter(account => account.id.toString() !== transferForm.fromAccountId)
                    .map(account => (
                      <option key={account.id} value={account.id}>
                        {account.type === 'bank' ? '🏦' : '📈'} {account.name} ({formatCurrency(account.balance)})
                      </option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">
                  Importo
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0.01"
                  value={transferForm.amount}
                  onChange={(e) => setTransferForm(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full px-3 py-2 border border-adaptive rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="0.00"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">
                  Data
                </label>
                <input
                  type="date"
                  value={transferForm.date}
                  onChange={(e) => setTransferForm(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-adaptive rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">
                  Descrizione (opzionale)
                </label>
                <input
                  type="text"
                  value={transferForm.description}
                  onChange={(e) => setTransferForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-adaptive rounded-md focus:outline-none focus:ring-2 focus:ring-green-500"
                  placeholder="es. Trasferimento per investimenti"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  disabled={transferLoading}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 font-medium"
                >
                  {transferLoading ? 
                    (editingTransfer ? 'Modifica...' : 'Trasferimento...') : 
                    (editingTransfer ? 'Salva Modifiche' : 'Conferma Trasferimento')
                  }
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowTransferModal(false)
                    setEditingTransfer(null)
                    resetTransferForm()
                  }}
                  className="px-4 py-2 border border-adaptive text-adaptive-700 rounded-md hover:bg-adaptive-50"
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