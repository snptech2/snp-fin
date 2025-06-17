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
          <h1 className="text-3xl font-bold text-gray-900">Conti Bancari</h1>
          <p className="text-gray-600">Gestisci i tuoi conti bancari e trasferimenti</p>
        </div>
        <button
          onClick={handleNewAccount}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2"
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
            <div key={account.id} className="bg-white p-6 rounded-lg shadow-sm border flex justify-between items-center">
              <div className="flex items-center gap-4">
                <div className={`w-3 h-3 rounded-full ${account.isDefault ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    {account.name}
                    {account.isDefault && (
                      <span className="bg-green-100 text-green-800 text-xs px-2 py-1 rounded-full">
                        Predefinito
                      </span>
                    )}
                  </h3>
                  <p className="text-2xl font-bold text-gray-700">€ {account.balance.toFixed(2)}</p>
                </div>
              </div>
              
              <div className="flex gap-2">
                {!account.isDefault && (
                  <button
                    onClick={() => handleSetDefault(account.id)}
                    className="text-green-600 hover:bg-green-50 px-3 py-2 rounded-lg"
                    title="Imposta come predefinito"
                  >
                    ⭐ Predefinito
                  </button>
                )}
                <button
                  onClick={() => handleEditAccount(account)}
                  className="text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg"
                >
                  ✏️ Modifica
                </button>
                <button
                  onClick={() => handleDeleteAccount(account.id)}
                  className="text-red-600 hover:bg-red-50 px-3 py-2 rounded-lg"
                >
                  🗑️ Cancella
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12 text-gray-500">
            <p className="text-xl mb-4">Nessun conto configurato</p>
            <button
              onClick={handleNewAccount}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700"
            >
              Crea il tuo primo conto
            </button>
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">
              {editingAccount ? 'Modifica Conto' : 'Nuovo Conto'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nome Conto
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="es. Conto Corrente Principale"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Saldo Iniziale (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.balance}
                  onChange={(e) => setFormData({ ...formData, balance: e.target.value })}
                  className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 bg-gray-200 text-gray-800 py-2 px-4 rounded-lg hover:bg-gray-300"
              >
                Annulla
              </button>
              <button
                onClick={handleSaveAccount}
                disabled={!formData.name.trim() || saving}
                className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50"
              >
                {saving ? '⏳ Salvataggio...' : (editingAccount ? 'Aggiorna' : 'Crea Conto')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}