'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

interface Account {
  id: number
  name: string
  type: 'bank' | 'investment'
  balance: number
  isDefault: boolean
  createdAt: string
  updatedAt: string
}

interface DCAPortfolio {
  id: number
  name: string
  type: string
  isActive: boolean
}

interface Transfer {
  id: number
  amount: number
  description: string
  date: string
  fromAccount: Account
  toAccount: Account
}

export default function AccountsPage() {
  const router = useRouter()
  const [accounts, setAccounts] = useState<Account[]>([])
  const [portfolios, setPortfolios] = useState<DCAPortfolio[]>([])
  const [transfers, setTransfers] = useState<Transfer[]>([])
  const [loading, setLoading] = useState(true)
  const [showAccountModal, setShowAccountModal] = useState(false)
  const [showTransferModal, setShowTransferModal] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)

  // Form states
  const [accountForm, setAccountForm] = useState({
    name: '',
    type: 'bank' as 'bank' | 'investment',
    linkedPortfolioId: ''
  })
  
  const [transferForm, setTransferForm] = useState({
    amount: '',
    description: '',
    fromAccountId: '',
    toAccountId: '',
    date: new Date().toISOString().split('T')[0]
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [accountsRes, portfoliosRes, transfersRes] = await Promise.all([
        fetch('/api/accounts'),
        fetch('/api/dca-portfolios'),
        fetch('/api/transfers?limit=5')
      ])
      
      const [accountsData, portfoliosData, transfersData] = await Promise.all([
        accountsRes.json(),
        portfoliosRes.json(),
        transfersRes.json()
      ])
      
      setAccounts(accountsData)
      setPortfolios(portfoliosData)
      setTransfers(transfersData.transfers || [])
    } catch (error) {
      console.error('Error fetching data:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSaveAccount = async (e: React.FormEvent) => {
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
      setAccountForm({ name: '', type: 'bank', linkedPortfolioId: '' })
    } catch (error) {
      console.error('Error saving account:', error)
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
      await fetch(`/api/accounts/${id}`, { method: 'DELETE' })
      await fetchData()
    } catch (error) {
      console.error('Error deleting account:', error)
    }
  }

  const bankAccounts = accounts.filter(acc => acc.type === 'bank')
  const investmentAccounts = accounts.filter(acc => acc.type === 'investment')
  
  const totalBankBalance = bankAccounts.reduce((sum, acc) => sum + acc.balance, 0)
  const totalInvestmentBalance = investmentAccounts.reduce((sum, acc) => sum + acc.balance, 0)
  
  const getPortfolioName = (accountId: number) => {
    return 'Non collegato' // TODO: Implement portfolio linking logic
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="h-24 bg-gray-200 rounded"></div>
            ))}
          </div>
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-16 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-adaptive-900">Conti</h1>
          <p className="text-adaptive-600">Gestisci i tuoi conti bancari e di investimento</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => setShowTransferModal(true)}
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            💸 Trasferimento
          </button>
          <button
            onClick={() => setShowAccountModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
          >
            ➕ Nuovo Conto
          </button>
        </div>
      </div>

      {/* Statistiche */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card-adaptive p-4 rounded-lg border-adaptive">
          <h3 className="text-sm font-medium text-adaptive-500">💳 Conti Bancari</h3>
          <p className="text-2xl font-bold text-green-600">€{totalBankBalance.toFixed(2)}</p>
          <p className="text-sm text-adaptive-600">{bankAccounts.length} conti</p>
        </div>
        <div className="card-adaptive p-4 rounded-lg border-adaptive">
          <h3 className="text-sm font-medium text-adaptive-500">📈 Conti Investimento</h3>
          <p className="text-2xl font-bold text-blue-600">€{totalInvestmentBalance.toFixed(2)}</p>
          <p className="text-sm text-adaptive-600">{investmentAccounts.length} conti</p>
        </div>
        <div className="card-adaptive p-4 rounded-lg border-adaptive">
          <h3 className="text-sm font-medium text-adaptive-500">💰 Totale Liquidità</h3>
          <p className="text-2xl font-bold text-adaptive-900">€{(totalBankBalance + totalInvestmentBalance).toFixed(2)}</p>
          <p className="text-sm text-adaptive-600">{accounts.length} conti totali</p>
        </div>
        <div className="card-adaptive p-4 rounded-lg border-adaptive">
          <h3 className="text-sm font-medium text-adaptive-500">💸 Trasferimenti</h3>
          <p className="text-2xl font-bold text-purple-600">{transfers.length}</p>
          <p className="text-sm text-adaptive-600">Ultimi 5 movimenti</p>
        </div>
      </div>

      {/* Conti Bancari */}
      <div className="card-adaptive rounded-lg shadow-sm border-adaptive">
        <div className="p-6 border-b border-adaptive">
          <h3 className="text-lg font-medium text-adaptive-900">💳 Conti Bancari</h3>
        </div>
        <div className="p-6">
          {bankAccounts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-adaptive-600">Nessun conto bancario trovato</p>
            </div>
          ) : (
            <div className="space-y-3">
              {bankAccounts.map((account) => (
                <div key={account.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-4">
                    {account.isDefault && (
                      <span className="text-green-500 text-xl">⭐</span>
                    )}
                    <div>
                      <h4 className="font-medium text-adaptive-900">{account.name}</h4>
                      <p className="text-sm text-adaptive-500">Conto Bancario</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-semibold text-adaptive-900">
                      €{account.balance.toFixed(2)}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingAccount(account)
                          setAccountForm({
                            name: account.name,
                            type: account.type,
                            linkedPortfolioId: ''
                          })
                          setShowAccountModal(true)
                        }}
                        className="text-blue-600 hover:text-blue-800 p-1"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteAccount(account.id)}
                        className="text-red-600 hover:text-red-800 p-1"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Conti di Investimento */}
      <div className="card-adaptive rounded-lg shadow-sm border-adaptive">
        <div className="p-6 border-b border-adaptive">
          <h3 className="text-lg font-medium text-adaptive-900">📈 Conti di Investimento</h3>
        </div>
        <div className="p-6">
          {investmentAccounts.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-adaptive-600">Nessun conto di investimento trovato</p>
            </div>
          ) : (
            <div className="space-y-3">
              {investmentAccounts.map((account) => (
                <div key={account.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div>
                    <h4 className="font-medium text-adaptive-900">{account.name}</h4>
                    <p className="text-sm text-adaptive-500">
                      Collegato a: {getPortfolioName(account.id)}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-lg font-semibold text-adaptive-900">
                      €{account.balance.toFixed(2)}
                    </span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingAccount(account)
                          setAccountForm({
                            name: account.name,
                            type: account.type,
                            linkedPortfolioId: ''
                          })
                          setShowAccountModal(true)
                        }}
                        className="text-blue-600 hover:text-blue-800 p-1"
                      >
                        ✏️
                      </button>
                      <button
                        onClick={() => handleDeleteAccount(account.id)}
                        className="text-red-600 hover:text-red-800 p-1"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Trasferimenti Recenti */}
      <div className="card-adaptive rounded-lg shadow-sm border-adaptive">
        <div className="p-6 border-b border-adaptive">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-adaptive-900">💸 Trasferimenti Recenti</h3>
            <button
              onClick={() => router.push('/transfers')}
              className="text-blue-600 hover:text-blue-800 text-sm"
            >
              Vedi tutti →
            </button>
          </div>
        </div>
        <div className="p-6">
          {transfers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-adaptive-600">Nessun trasferimento trovato</p>
            </div>
          ) : (
            <div className="space-y-3">
              {transfers.map((transfer) => (
                <div key={transfer.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div>
                    <p className="font-medium text-adaptive-900">
                      {transfer.fromAccount.name} → {transfer.toAccount.name}
                    </p>
                    <p className="text-sm text-adaptive-500">
                      {new Date(transfer.date).toLocaleDateString('it-IT')}
                      {transfer.description && ` • ${transfer.description}`}
                    </p>
                  </div>
                  <span className="text-lg font-semibold text-blue-600">
                    €{transfer.amount.toFixed(2)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Modal Conto */}
      {showAccountModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="modal-content rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-adaptive-900 mb-4">
              {editingAccount ? 'Modifica Conto' : 'Nuovo Conto'}
            </h3>
            <form onSubmit={handleSaveAccount}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-adaptive-700 mb-2">
                    Nome Conto *
                  </label>
                  <input
                    type="text"
                    required
                    value={accountForm.name}
                    onChange={(e) => setAccountForm({...accountForm, name: e.target.value})}
                    className="w-full px-3 py-2 border border-adaptive rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="es. Conto Corrente UniCredit"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-adaptive-700 mb-2">
                    Tipo Conto *
                  </label>
                  <select
                    value={accountForm.type}
                    onChange={(e) => setAccountForm({...accountForm, type: e.target.value as 'bank' | 'investment'})}
                    className="w-full px-3 py-2 border border-adaptive rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="bank">💳 Conto Bancario</option>
                    <option value="investment">📈 Conto di Investimento</option>
                  </select>
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAccountModal(false)
                      setEditingAccount(null)
                      setAccountForm({ name: '', type: 'bank', linkedPortfolioId: '' })
                    }}
                    className="px-4 py-2 text-adaptive-600 hover:text-adaptive-800"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    {editingAccount ? 'Aggiorna' : 'Crea'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Trasferimento */}
      {showTransferModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="modal-content rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-adaptive-900 mb-4">Nuovo Trasferimento</h3>
            <form onSubmit={handleTransfer}>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-adaptive-700 mb-2">
                    Da Conto *
                  </label>
                  <select
                    required
                    value={transferForm.fromAccountId}
                    onChange={(e) => setTransferForm({...transferForm, fromAccountId: e.target.value})}
                    className="w-full px-3 py-2 border border-adaptive rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleziona conto di origine</option>
                    {accounts.map(account => (
                      <option key={account.id} value={account.id}>
                        {account.name} (€{account.balance.toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-adaptive-700 mb-2">
                    A Conto *
                  </label>
                  <select
                    required
                    value={transferForm.toAccountId}
                    onChange={(e) => setTransferForm({...transferForm, toAccountId: e.target.value})}
                    className="w-full px-3 py-2 border border-adaptive rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Seleziona conto di destinazione</option>
                    {accounts.filter(acc => acc.id !== parseInt(transferForm.fromAccountId)).map(account => (
                      <option key={account.id} value={account.id}>
                        {account.name} (€{account.balance.toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-adaptive-700 mb-2">
                    Importo (€) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={transferForm.amount}
                    onChange={(e) => setTransferForm({...transferForm, amount: e.target.value})}
                    className="w-full px-3 py-2 border border-adaptive rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="0.00"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-adaptive-700 mb-2">
                    Descrizione
                  </label>
                  <input
                    type="text"
                    value={transferForm.description}
                    onChange={(e) => setTransferForm({...transferForm, description: e.target.value})}
                    className="w-full px-3 py-2 border border-adaptive rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="es. Trasferimento per investimenti"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-adaptive-700 mb-2">
                    Data *
                  </label>
                  <input
                    type="date"
                    required
                    value={transferForm.date}
                    onChange={(e) => setTransferForm({...transferForm, date: e.target.value})}
                    className="w-full px-3 py-2 border border-adaptive rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowTransferModal(false)
                      setTransferForm({
                        amount: '',
                        description: '',
                        fromAccountId: '',
                        toAccountId: '',
                        date: new Date().toISOString().split('T')[0]
                      })
                    }}
                    className="px-4 py-2 text-adaptive-600 hover:text-adaptive-800"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                  >
                    Trasferisci
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}