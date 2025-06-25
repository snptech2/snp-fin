// src/app/accounts/page.tsx - VERSIONE COMPLETA CORRETTA
'use client'

import { useState, useEffect } from 'react'
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

// 🆕 INTERFACCIA PORTFOLIO AGGIORNATA
interface Portfolio {
  id: number
  name: string
  accountId: number
  type?: string  // 🆕 Per distinguere DCA vs Crypto
  stats: {
    totalInvested: number
    // DCA Portfolio stats
    capitalRecovered?: number
    realizedGains: number
    realizedLoss?: number
    effectiveInvestment?: number
    isFullyRecovered?: boolean
    
    // Crypto Portfolio stats
    totalValueEur?: number
    unrealizedGains?: number
    totalROI?: number
    holdingsCount?: number
    transactionCount?: number
  }
}

interface Transfer {
  id: number
  amount: number
  description: string
  date: string
  fromAccount: { id: number; name: string }
  toAccount: { id: number; name: string }
}

interface AccountBreakdown {
  totalBalance: number
  originalCapital: number
  realizedGains: number
  realizedLoss: number
  unknownFunds: number
  netRealizedPL: number
}

export default function EnhancedAccountsPage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [portfolios, setPortfolios] = useState<Portfolio[]>([])
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

  // Transfer management states
  const [editingTransfer, setEditingTransfer] = useState<Transfer | null>(null)
  const [showEditTransferModal, setShowEditTransferModal] = useState(false)
  const [selectedTransfers, setSelectedTransfers] = useState<number[]>([])
  const [selectAllTransfers, setSelectAllTransfers] = useState(false)

  // Investment account breakdowns
  const [investmentBreakdowns, setInvestmentBreakdowns] = useState<{[key: number]: AccountBreakdown}>({})

  // 🆕 SEZIONI COLLASSABILI
  const [showBankAccounts, setShowBankAccounts] = useState(true)
  const [showInvestmentAccounts, setShowInvestmentAccounts] = useState(true)
  const [showTransfers, setShowTransfers] = useState(true)

  useEffect(() => {
    fetchData()
  }, [])

  // 🆕 FETCH DATA AGGIORNATA
  const fetchData = async () => {
    setLoading(true)
    try {
      // Fetch accounts, DCA portfolios e crypto portfolios
      const [accountsRes, dcaPortfoliosRes, cryptoPortfoliosRes] = await Promise.all([
        fetch('/api/accounts'),
        fetch('/api/dca-portfolios'),
        fetch('/api/crypto-portfolios')
      ])

      let accountsData = []
      let dcaPortfoliosData = []
      let cryptoPortfoliosData = []

      if (accountsRes.ok) {
        accountsData = await accountsRes.json()
        setAccounts(Array.isArray(accountsData) ? accountsData : [])
      }
      
      if (dcaPortfoliosRes.ok) {
        dcaPortfoliosData = await dcaPortfoliosRes.json()
      }

      if (cryptoPortfoliosRes.ok) {
        cryptoPortfoliosData = await cryptoPortfoliosRes.json()
      }

      // 🆕 UNISCI ENTRAMBI I TIPI DI PORTFOLIO
      const allPortfolios = [
        // DCA Portfolios (mantieni originali)
        ...Array.isArray(dcaPortfoliosData) ? dcaPortfoliosData.map(p => ({
          ...p,
          type: 'dca_bitcoin'
        })) : [],
        // Crypto Portfolios (aggiungi type)
        ...Array.isArray(cryptoPortfoliosData) ? cryptoPortfoliosData.map(cp => ({
          ...cp,
          type: 'crypto_wallet'
        })) : []
      ]
      
      setPortfolios(allPortfolios)

      // Calculate breakdowns for investment accounts
      if (accountsData.length > 0 && allPortfolios.length > 0) {
        calculateInvestmentBreakdowns(accountsData, allPortfolios)
      }
      
      // Prova a caricare i trasferimenti separatamente
      try {
        const transfersRes = await fetch('/api/transfers?limit=5')
        if (transfersRes.ok) {
          const transfersData = await transfersRes.json()
          const transfersArray = transfersData.transfers || transfersData
          setTransfers(Array.isArray(transfersArray) ? transfersArray : [])
        } else {
          setTransfers([])
        }
      } catch (transferError) {
        console.log('Transfers API not available:', transferError)
        setTransfers([])
      }
        
    } catch (error) {
      console.error('Error fetching data:', error)
      setAccounts([])
      setPortfolios([])
      setTransfers([])
      setInvestmentBreakdowns({})
    } finally {
      setLoading(false)
    }
  }

  // 🆕 CALCULATE BREAKDOWNS AGGIORNATA
  const calculateInvestmentBreakdowns = (accounts: Account[], portfolios: Portfolio[]) => {
    const breakdowns: {[key: number]: AccountBreakdown} = {}
    
    accounts.filter(acc => acc.type === 'investment').forEach(account => {
      const accountPortfolios = portfolios.filter(p => p.accountId === account.id)
      
      if (accountPortfolios.length > 0) {
        let totalCapitalRecovered = 0
        let totalRealizedGains = 0
        let totalRealizedLoss = 0
        
        accountPortfolios.forEach(portfolio => {
          if (portfolio.type === 'crypto_wallet') {
            // 🚀 Crypto Portfolio: usa totalInvested come approssimazione di capital recovered
            totalCapitalRecovered += portfolio.stats.totalInvested || 0
            totalRealizedGains += portfolio.stats.realizedGains || 0
            // Crypto portfolios non hanno realizedLoss separato
          } else {
            // 🟠 DCA Portfolio: usa stats originali
            totalCapitalRecovered += portfolio.stats.capitalRecovered || 0
            totalRealizedGains += portfolio.stats.realizedGains || 0
            totalRealizedLoss += portfolio.stats.realizedLoss || 0
          }
        })
        
        const netRealizedPL = totalRealizedGains - totalRealizedLoss
        const trackedFunds = totalCapitalRecovered + netRealizedPL
        const unknownFunds = Math.max(0, account.balance - trackedFunds)
        
        breakdowns[account.id] = {
          totalBalance: account.balance,
          originalCapital: totalCapitalRecovered,
          realizedGains: totalRealizedGains,
          realizedLoss: totalRealizedLoss,
          unknownFunds,
          netRealizedPL
        }
      }
    })
    
    setInvestmentBreakdowns(breakdowns)
  }

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const url = editingAccount ? `/api/accounts/${editingAccount.id}` : '/api/accounts'
      const method = editingAccount ? 'PUT' : 'POST'
      
      await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(accountForm)
      })
      
      await fetchData()
      setShowAccountModal(false)
      setEditingAccount(null)
      setAccountForm({ name: '', type: 'bank' })
    } catch (error) {
      console.error('Error saving account:', error)
    }
  }

  const handleSetDefault = async (accountId: number) => {
    try {
      const response = await fetch(`/api/accounts/${accountId}/set-default`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' }
      })

      if (response.ok) {
        await fetchData()
      }
    } catch (error) {
      console.error('Error setting default:', error)
    }
  }

  const handleTransfer = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      await fetch('/api/transfers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...transferForm,
          amount: parseFloat(transferForm.amount),
          fromAccountId: parseInt(transferForm.fromAccountId),
          toAccountId: parseInt(transferForm.toAccountId)
        })
      })
      
      await fetchData()
      setShowTransferModal(false)
      setTransferForm({
        amount: '',
        description: '',
        fromAccountId: '',
        toAccountId: '',
        date: new Date().toISOString().split('T')[0]
      })
    } catch (error) {
      console.error('Error creating transfer:', error)
    }
  }

  const handleDeleteAccount = async (id: number) => {
    if (!confirm('Sei sicuro di voler cancellare questo conto?')) return
    
    try {
      const response = await fetch(`/api/accounts/${id}`, { method: 'DELETE' })
      
      if (response.ok) {
        await fetchData()
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Errore nella cancellazione del conto')
      }
    } catch (error) {
      console.error('Error deleting account:', error)
      alert('Errore di rete nella cancellazione del conto')
    }
  }

  // Transfer management functions
  const handleEditTransfer = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTransfer) return

    try {
      await fetch(`/api/transfers/${editingTransfer.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...transferForm,
          amount: parseFloat(transferForm.amount),
          fromAccountId: parseInt(transferForm.fromAccountId),
          toAccountId: parseInt(transferForm.toAccountId)
        })
      })
      
      await fetchData()
      setShowEditTransferModal(false)
      setEditingTransfer(null)
      setTransferForm({
        amount: '',
        description: '',
        fromAccountId: '',
        toAccountId: '',
        date: new Date().toISOString().split('T')[0]
      })
    } catch (error) {
      console.error('Error updating transfer:', error)
    }
  }

  const handleDeleteTransfer = async (id: number) => {
    if (!confirm('Sei sicuro di voler eliminare questo trasferimento?')) return
    
    try {
      await fetch(`/api/transfers/${id}`, { method: 'DELETE' })
      await fetchData()
    } catch (error) {
      console.error('Error deleting transfer:', error)
    }
  }

  // Gestione selezione multipla trasferimenti
  const handleTransferSelect = (transferId: number) => {
    setSelectedTransfers(prev => 
      prev.includes(transferId) 
        ? prev.filter(id => id !== transferId)
        : [...prev, transferId]
    )
  }

  const handleSelectAllTransfers = () => {
    if (selectAllTransfers) {
      setSelectedTransfers([])
    } else {
      setSelectedTransfers(transfers.map(t => t.id))
    }
    setSelectAllTransfers(!selectAllTransfers)
  }

  // Cancellazione multipla trasferimenti
  const handleBulkDeleteTransfers = async () => {
    if (selectedTransfers.length === 0) return
    
    if (!confirm(`Sei sicuro di voler cancellare ${selectedTransfers.length} trasferimenti selezionati?`)) {
      return
    }

    try {
      await Promise.all(
        selectedTransfers.map(id => 
          fetch(`/api/transfers/${id}`, { method: 'DELETE' })
        )
      )
      
      setSelectedTransfers([])
      setSelectAllTransfers(false)
      await fetchData()
    } catch (error) {
      console.error('Errore nella cancellazione multipla trasferimenti:', error)
      alert('Errore nella cancellazione dei trasferimenti')
    }
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  const bankAccounts = accounts.filter(acc => acc.type === 'bank')
  const investmentAccounts = accounts.filter(acc => acc.type === 'investment')
  
  const totalBankBalance = bankAccounts.reduce((sum, acc) => sum + acc.balance, 0)
  const totalInvestmentBalance = investmentAccounts.reduce((sum, acc) => sum + acc.balance, 0)

  // Calculate total investments and recoveries for overview
  const totalInvested = portfolios.reduce((sum, p) => sum + (p.stats.totalInvested || 0), 0)
  const totalRecovered = portfolios.reduce((sum, p) => sum + (p.stats.capitalRecovered || p.stats.totalInvested || 0), 0)
  const totalRealizedGains = portfolios.reduce((sum, p) => sum + (p.stats.realizedGains || 0), 0)

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-adaptive-900">Conti</h1>
          <p className="text-adaptive-600">Gestisci i tuoi conti bancari e di investimento con Enhanced Cash Flow</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          {[1, 2, 3, 4].map(i => (
            <div key={i} className="card-adaptive animate-pulse rounded-lg h-24"></div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-adaptive-900">💳 Conti</h1>
          <p className="text-adaptive-600">Gestisci i tuoi conti bancari e di investimento con Enhanced Cash Flow</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowTransferModal(true)}
            className="btn-primary px-4 py-2 rounded-md flex items-center gap-2"
          >
            💸 Trasferimento
          </button>
          <button
            onClick={() => setShowAccountModal(true)}
            className="btn-primary px-4 py-2 rounded-md flex items-center gap-2"
          >
            <PlusIcon className="w-4 h-4" />
            Nuovo Conto
          </button>
        </div>
      </div>

      {/* Enhanced Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="card-adaptive p-4 rounded-lg border-adaptive">
          <h3 className="text-sm font-medium text-adaptive-500">💳 Conti Bancari</h3>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totalBankBalance)}</p>
          <p className="text-sm text-adaptive-600">{bankAccounts.length} conti</p>
        </div>
        
        <div className="card-adaptive p-4 rounded-lg border-adaptive">
          <h3 className="text-sm font-medium text-adaptive-500">📈 Liquidità Investimenti</h3>
          <p className="text-2xl font-bold text-blue-600">{formatCurrency(totalInvestmentBalance)}</p>
          <p className="text-sm text-adaptive-600">{investmentAccounts.length} conti</p>
        </div>

        <div className="card-adaptive p-4 rounded-lg border-adaptive">
          <h3 className="text-sm font-medium text-adaptive-500">💰 Investito Totale</h3>
          <p className="text-2xl font-bold text-purple-600">{formatCurrency(totalInvested)}</p>
          <p className="text-sm text-adaptive-600">Enhanced tracking</p>
        </div>

        <div className="card-adaptive p-4 rounded-lg border-adaptive">
          <h3 className="text-sm font-medium text-adaptive-500">🔄 Capitale Recuperato</h3>
          <p className="text-2xl font-bold text-orange-600">{formatCurrency(totalRecovered)}</p>
          <p className="text-sm text-adaptive-600">
            {totalInvested > 0 ? ((totalRecovered / totalInvested) * 100).toFixed(1) : 0}%
          </p>
        </div>

        <div className="card-adaptive p-4 rounded-lg border-adaptive">
          <h3 className="text-sm font-medium text-adaptive-500">📈 Profitti Realizzati</h3>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(totalRealizedGains)}</p>
          <p className="text-sm text-adaptive-600">
            ROI: {totalInvested > 0 ? ((totalRealizedGains / totalInvested) * 100).toFixed(1) : 0}%
          </p>
        </div>
      </div>

      {/* Conti Bancari - COLLASSABILI */}
      <div className="card-adaptive rounded-lg shadow-sm border-adaptive">
        <div 
          className="p-6 border-b border-adaptive cursor-pointer"
          onClick={() => setShowBankAccounts(!showBankAccounts)}
        >
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-adaptive-900 flex items-center gap-2">
              💳 Conti Bancari
              <ChevronDownIcon className={`w-4 h-4 transition-transform ${showBankAccounts ? 'rotate-180' : ''}`} />
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
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">💳</span>
                        <div>
                          <h4 className="font-semibold text-adaptive-900">{account.name}</h4>
                          <p className="text-sm text-adaptive-600">Conto Bancario</p>
                        </div>
                      </div>
                      {account.isDefault && (
                        <div className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs font-medium">
                          Predefinito
                        </div>
                      )}
                    </div>
                    
                    <div className="mb-4">
                      <p className="text-2xl font-bold text-adaptive-900">{formatCurrency(account.balance)}</p>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      {!account.isDefault && (
                        <button
                          onClick={() => handleSetDefault(account.id)}
                          className="text-sm text-blue-600 hover:text-blue-800"
                        >
                          Imposta come predefinito
                        </button>
                      )}
                      <div className="flex gap-2">
                        <button
                          onClick={() => {
                            setEditingAccount(account)
                            setAccountForm({ name: account.name, type: account.type })
                            setShowAccountModal(true)
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteAccount(account.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Enhanced Investment Accounts with Breakdown - COLLASSABILI */}
      <div className="card-adaptive rounded-lg shadow-sm border-adaptive">
        <div 
          className="p-6 border-b border-adaptive cursor-pointer"
          onClick={() => setShowInvestmentAccounts(!showInvestmentAccounts)}
        >
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-adaptive-900 flex items-center gap-2">
              📈 Conti Investimento con Enhanced Cash Flow
              <ChevronDownIcon className={`w-4 h-4 transition-transform ${showInvestmentAccounts ? 'rotate-180' : ''}`} />
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
                  const breakdown = investmentBreakdowns[account.id]
                  const linkedPortfolios = portfolios.filter(p => p.accountId === account.id)
                  
                  return (
                    <div key={account.id} className="border border-adaptive rounded-lg p-6">
                      {/* Account Header */}
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center gap-4">
                          <span className="text-2xl">📈</span>
                          <div>
                            <h4 className="font-semibold text-adaptive-900">{account.name}</h4>
                            <p className="text-sm text-adaptive-600">Conto Investimento</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => {
                              setEditingAccount(account)
                              setAccountForm({ name: account.name, type: account.type })
                              setShowAccountModal(true)
                            }}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteAccount(account.id)}
                            className="p-2 text-red-600 hover:bg-red-50 rounded"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Balance and Breakdown */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-4">
                        <div>
                          <h5 className="font-medium text-adaptive-700 mb-2">💳 Saldo Conto</h5>
                          <p className="text-3xl font-bold text-adaptive-900">{formatCurrency(account.balance)}</p>
                        </div>
                        
                        {breakdown && (
                          <div className="grid grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-adaptive-600">Capitale Originale</p>
                              <p className="font-semibold text-purple-600">{formatCurrency(breakdown.originalCapital)}</p>
                            </div>
                            <div>
                              <p className="text-adaptive-600">Profitti Realizzati</p>
                              <p className="font-semibold text-green-600">{formatCurrency(breakdown.realizedGains)}</p>
                            </div>
                            <div>
                              <p className="text-adaptive-600">Fondi Non Tracciati</p>
                              <p className="font-semibold text-orange-600">{formatCurrency(breakdown.unknownFunds)}</p>
                            </div>
                            <div>
                              <p className="text-adaptive-600">P&L Netto</p>
                              <p className={`font-semibold ${breakdown.netRealizedPL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {formatCurrency(breakdown.netRealizedPL)}
                              </p>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* 🆕 PORTFOLIO COLLEGATI SECTION CORRETTA */}
                      <div className="mt-4">
                        <h5 className="font-medium text-adaptive-700 mb-2">Portfolio Collegati:</h5>
                        {linkedPortfolios.length === 0 ? (
                          <p className="text-sm text-adaptive-500">Nessun portfolio collegato</p>
                        ) : (
                          <div className="space-y-2">
                            {linkedPortfolios.map(portfolio => (
                              <div key={`${portfolio.type || 'dca'}-${portfolio.id}`} className="text-sm">
                                <span className="font-medium">
                                  {portfolio.type === 'crypto_wallet' ? '🚀' : '🟠'} {portfolio.name}
                                </span>
                                <span className="text-adaptive-500 ml-2">
                                  ({portfolio.type === 'crypto_wallet' ? 'Crypto Wallet' : 'DCA Bitcoin'})
                                </span>
                                {portfolio.stats && (
                                  <span className="text-adaptive-600 ml-2">
                                    - Investiti: {formatCurrency(portfolio.stats.totalInvested)}
                                  </span>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Trasferimenti Recenti - COLLASSABILI */}
      <div className="card-adaptive rounded-lg shadow-sm border-adaptive">
        <div 
          className="p-6 border-b border-adaptive cursor-pointer"
          onClick={() => setShowTransfers(!showTransfers)}
        >
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-adaptive-900 flex items-center gap-2">
              🔄 Trasferimenti Recenti ({transfers.length})
              <ChevronDownIcon className={`w-4 h-4 transition-transform ${showTransfers ? 'rotate-180' : ''}`} />
            </h3>
            {selectedTransfers.length > 0 && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  handleBulkDeleteTransfers()
                }}
                className="bg-red-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-red-700"
              >
                Cancella {selectedTransfers.length} selezionati
              </button>
            )}
          </div>
        </div>
        {showTransfers && (
          <div className="p-6">
            {transfers.length === 0 ? (
              <p className="text-adaptive-600 text-center py-4">Nessun trasferimento recente</p>
            ) : (
              <div className="space-y-3">
                {/* Header con selezione multipla */}
                <div className="flex items-center gap-3 pb-2 border-b border-adaptive">
                  <input
                    type="checkbox"
                    checked={selectAllTransfers}
                    onChange={handleSelectAllTransfers}
                    className="rounded"
                  />
                  <span className="text-sm text-adaptive-600">
                    Seleziona tutto ({transfers.length})
                  </span>
                </div>

                {transfers.map((transfer) => (
                  <div key={transfer.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedTransfers.includes(transfer.id)}
                        onChange={() => handleTransferSelect(transfer.id)}
                        className="rounded"
                      />
                      <ArrowsRightLeftIcon className="w-5 h-5 text-gray-400" />
                      <div>
                        <p className="font-medium text-adaptive-900">
                          {transfer.fromAccount.name} → {transfer.toAccount.name}
                        </p>
                        <p className="text-sm text-adaptive-600">{transfer.description}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="text-right">
                        <p className="font-semibold text-adaptive-900">{formatCurrency(transfer.amount)}</p>
                        <p className="text-sm text-adaptive-600">
                          {new Date(transfer.date).toLocaleDateString('it-IT')}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            setEditingTransfer(transfer)
                            setTransferForm({
                              amount: transfer.amount.toString(),
                              description: transfer.description,
                              fromAccountId: transfer.fromAccount.id.toString(),
                              toAccountId: transfer.toAccount.id.toString(),
                              date: transfer.date.split('T')[0]
                            })
                            setShowEditTransferModal(true)
                          }}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded"
                          title="Modifica trasferimento"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTransfer(transfer.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded"
                          title="Elimina trasferimento"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create/Edit Account Modal */}
      {showAccountModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="modal-content rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editingAccount ? 'Modifica Conto' : 'Nuovo Conto'}
            </h3>
            
            <form onSubmit={handleAccountSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Nome</label>
                <input
                  type="text"
                  value={accountForm.name}
                  onChange={(e) => setAccountForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-adaptive rounded-md"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Tipo</label>
                <select
                  value={accountForm.type}
                  onChange={(e) => setAccountForm(prev => ({ ...prev, type: e.target.value as 'bank' | 'investment' }))}
                  className="w-full px-3 py-2 border border-adaptive rounded-md"
                >
                  <option value="bank">💳 Conto Bancario</option>
                  <option value="investment">📈 Conto Investimento</option>
                </select>
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAccountModal(false)
                    setEditingAccount(null)
                    setAccountForm({ name: '', type: 'bank' })
                  }}
                  className="btn-secondary px-4 py-2 rounded-md"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="btn-primary px-4 py-2 rounded-md"
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
          <div className="modal-content rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Nuovo Trasferimento</h3>
            
            <form onSubmit={handleTransfer} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Importo</label>
                <input
                  type="number"
                  step="0.01"
                  value={transferForm.amount}
                  onChange={(e) => setTransferForm(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full px-3 py-2 border border-adaptive rounded-md"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Da Conto</label>
                <select
                  value={transferForm.fromAccountId}
                  onChange={(e) => setTransferForm(prev => ({ ...prev, fromAccountId: e.target.value }))}
                  className="w-full px-3 py-2 border border-adaptive rounded-md"
                  required
                >
                  <option value="">Seleziona conto</option>
                  {accounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.name} ({formatCurrency(account.balance)})
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">A Conto</label>
                <select
                  value={transferForm.toAccountId}
                  onChange={(e) => setTransferForm(prev => ({ ...prev, toAccountId: e.target.value }))}
                  className="w-full px-3 py-2 border border-adaptive rounded-md"
                  required
                >
                  <option value="">Seleziona conto</option>
                  {accounts.filter(acc => acc.id.toString() !== transferForm.fromAccountId).map(account => (
                    <option key={account.id} value={account.id}>
                      {account.name} ({formatCurrency(account.balance)})
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Descrizione</label>
                <input
                  type="text"
                  value={transferForm.description}
                  onChange={(e) => setTransferForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-adaptive rounded-md"
                />
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowTransferModal(false)}
                  className="btn-secondary px-4 py-2 rounded-md"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="btn-primary px-4 py-2 rounded-md"
                >
                  Trasferisci
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Transfer Modal */}
      {showEditTransferModal && editingTransfer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="modal-content rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">Modifica Trasferimento</h3>
            
            <form onSubmit={handleEditTransfer} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Importo</label>
                <input
                  type="number"
                  step="0.01"
                  value={transferForm.amount}
                  onChange={(e) => setTransferForm(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full px-3 py-2 border border-adaptive rounded-md"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Da Conto</label>
                <select
                  value={transferForm.fromAccountId}
                  onChange={(e) => setTransferForm(prev => ({ ...prev, fromAccountId: e.target.value }))}
                  className="w-full px-3 py-2 border border-adaptive rounded-md"
                  required
                >
                  <option value="">Seleziona conto</option>
                  {accounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.name} ({formatCurrency(account.balance)})
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">A Conto</label>
                <select
                  value={transferForm.toAccountId}
                  onChange={(e) => setTransferForm(prev => ({ ...prev, toAccountId: e.target.value }))}
                  className="w-full px-3 py-2 border border-adaptive rounded-md"
                  required
                >
                  <option value="">Seleziona conto</option>
                  {accounts.filter(acc => acc.id.toString() !== transferForm.fromAccountId).map(account => (
                    <option key={account.id} value={account.id}>
                      {account.name} ({formatCurrency(account.balance)})
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Data</label>
                <input
                  type="date"
                  value={transferForm.date}
                  onChange={(e) => setTransferForm(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-adaptive rounded-md"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium mb-1">Descrizione</label>
                <input
                  type="text"
                  value={transferForm.description}
                  onChange={(e) => setTransferForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-adaptive rounded-md"
                />
              </div>
              
              <div className="flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditTransferModal(false)
                    setEditingTransfer(null)
                  }}
                  className="btn-secondary px-4 py-2 rounded-md"
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  className="btn-primary px-4 py-2 rounded-md"
                >
                  Salva Modifiche
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}