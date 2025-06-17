'use client'

import { useState, useEffect } from 'react'

// Tipi TypeScript
type Account = {
  id: number
  name: string
  balance: number
  isDefault: boolean
}

export default function AccountsPage() {
  // Stati
  const [accounts, setAccounts] = useState<Account[]>([])
  const [loading, setLoading] = useState(true)

  const [showForm, setShowForm] = useState(false)
  const [editingAccount, setEditingAccount] = useState<Account | null>(null)
  const [formData, setFormData] = useState({ name: '', balance: '' })
  const [saving, setSaving] = useState(false)

  // Carica conti dal database
  const loadAccounts = async () => {
    try {
      const response = await fetch('/api/accounts')
      if (response.ok) {
        const data = await response.json()
        setAccounts(data)
      }
    } catch (error) {
      console.error('Errore nel caricamento conti:', error)
    } finally {
      setLoading(false)
    }
  }

  // Carica conti all'avvio
  useEffect(() => {
    loadAccounts()
  }, [])

  // Calcola saldo totale
  const totalBalance = accounts.reduce((sum, account) => sum + account.balance, 0)

  // Gestisce apertura form per nuovo conto
  const handleNewAccount = () => {
    setEditingAccount(null)
    setFormData({ name: '', balance: '0' })
    setShowForm(true)
  }

  // Gestisce apertura form per modifica
  const handleEditAccount = (account: Account) => {
    setEditingAccount(account)
    setFormData({ name: account.name, balance: account.balance.toString() })
    setShowForm(true)
  }

  // Salva conto (nuovo o modificato)
  const handleSaveAccount = async () => {
    if (!formData.name.trim()) return
    
    setSaving(true)
    try {
      if (editingAccount) {
        // Modifica conto esistente
        const response = await fetch(`/api/accounts/${editingAccount.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        })
        
        if (response.ok) {
          await loadAccounts() // Ricarica i dati
        }
      } else {
        // Crea nuovo conto
        const response = await fetch('/api/accounts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        })
        
        if (response.ok) {
          await loadAccounts() // Ricarica i dati
        }
      }
      
      setShowForm(false)
      setFormData({ name: '', balance: '' })
    } catch (error) {
      console.error('Errore nel salvataggio:', error)
      alert('Errore nel salvataggio del conto')
    } finally {
      setSaving(false)
    }
  }

  // Imposta conto predefinito
  const handleSetDefault = async (accountId: number) => {
    try {
      const response = await fetch(`/api/accounts/${accountId}/set-default`, {
        method: 'PUT'
      })
      
      if (response.ok) {
        await loadAccounts() // Ricarica i dati
      }
    } catch (error) {
      console.error('Errore nell\'impostazione conto predefinito:', error)
      alert('Errore nell\'impostazione del conto predefinito')
    }
  }

  // Cancella conto
  const handleDeleteAccount = async (accountId: number) => {
    if (!confirm('Sei sicuro di voler cancellare questo conto?')) return
    
    try {
      const response = await fetch(`/api/accounts/${accountId}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        await loadAccounts() // Ricarica i dati
      } else {
        const error = await response.json()
        alert(error.error || 'Errore nella cancellazione del conto')
      }
    } catch (error) {
      console.error('Errore nella cancellazione:', error)
      alert('Errore nella cancellazione del conto')
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Conti Bancari</h1>
          <p className="text-white opacity-80">Gestisci i tuoi conti bancari e trasferimenti</p>
        </div>
        <button
          onClick={handleNewAccount}
          className="btn-primary px-4 py-2 rounded-lg flex items-center gap-2"
        >
          ➕ Nuovo Conto
        </button>
      </div>

      {/* Saldo Totale */}
      {loading ? (
        <div className="bg-gray-200 animate-pulse p-6 rounded-lg h-24"></div>
      ) : (
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 text-white p-6 rounded-lg">
          <h2 className="text-lg font-medium">Saldo Totale</h2>
          <p className="text-3xl font-bold">€ {totalBalance.toFixed(2)}</p>
          <p className="text-blue-100">{accounts.length} conti attivi</p>
        </div>
      )}

      {/* Lista Conti */}
      <div className="space-y-4">
        {loading ? (
          // Skeleton loading
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-gray-200 animate-pulse p-6 rounded-lg h-20"></div>
            ))}
          </div>
        ) : accounts.length > 0 ? (
          accounts.map((account) => (
            <div 
              key={account.id} 
              className="card-adaptive p-6 rounded-lg shadow-sm border-adaptive flex items-center justify-between"
            >
              <div className="flex items-center gap-4">
                {/* Stellina per conto predefinito */}
                {account.isDefault && (
                  <span className="text-green-500 text-xl">⭐</span>
                )}
                
                <div>
                  <h3 className="text-lg font-semibold text-adaptive-900">{account.name}</h3>
                  <p className="text-sm text-adaptive-500">
                    {account.isDefault ? 'Conto predefinito' : 'Conto secondario'}
                  </p>
                </div>
              </div>
              
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <p className="text-xl font-bold text-adaptive-900">
                    € {account.balance.toFixed(2)}
                  </p>
                  <p className="text-sm text-adaptive-500">Saldo disponibile</p>
                </div>
                
                <div className="flex gap-2">
                  {!account.isDefault && (
                    <button
                      onClick={() => handleSetDefault(account.id)}
                      className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium"
                    >
                      Imposta Predefinito
                    </button>
                  )}
                  
                  <button
                    onClick={() => handleEditAccount(account)}
                    className="px-3 py-1 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm font-medium"
                  >
                    Modifica
                  </button>
                  
                  <button
                    onClick={() => handleDeleteAccount(account.id)}
                    className="px-3 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 text-sm font-medium"
                  >
                    Cancella
                  </button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="card-adaptive p-8 rounded-lg shadow-sm border-adaptive text-center">
            <p className="text-adaptive-500 mb-4">Nessun conto bancario trovato</p>
            <button
              onClick={handleNewAccount}
              className="btn-primary px-4 py-2 rounded-lg"
            >
              Crea il tuo primo conto
            </button>
          </div>
        )}
      </div>

      {/* Modal Form */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="card-adaptive p-6 rounded-lg shadow-lg w-96">
            <h3 className="text-lg font-semibold text-adaptive-900 mb-4">
              {editingAccount ? 'Modifica Conto' : 'Nuovo Conto'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">
                  Nome Conto
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({...formData, name: e.target.value})}
                  className="w-full p-2 border-adaptive rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="Es. Conto Corrente BNL"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">
                  Saldo Iniziale
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.balance}
                  onChange={(e) => setFormData({...formData, balance: e.target.value})}
                  className="w-full p-2 border-adaptive rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
            </div>
            
            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="btn-secondary flex-1 py-2 rounded-md"
                disabled={saving}
              >
                Annulla
              </button>
              <button
                onClick={handleSaveAccount}
                className="btn-primary flex-1 py-2 rounded-md disabled:opacity-50"
                disabled={saving || !formData.name.trim()}
              >
                {saving ? 'Salvataggio...' : 'Salva'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}