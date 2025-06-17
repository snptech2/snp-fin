// src/app/income/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { PlusIcon, PencilIcon, TrashIcon, TagIcon } from '@heroicons/react/24/outline'

interface Account {
  id: number
  name: string
  balance: number
  isDefault: boolean
}

interface Category {
  id: number
  name: string
  type: 'income' | 'expense'
}

interface Transaction {
  id: number
  description?: string
  amount: number
  date: string
  account: Account
  category: Category
}

export default function IncomePage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  
  // Stati per form transazione
  const [showTransactionForm, setShowTransactionForm] = useState(false)
  const [transactionForm, setTransactionForm] = useState({
    description: '',
    amount: '',
    date: new Date().toISOString().split('T')[0],
    accountId: '',
    categoryId: ''
  })
  
  // Stati per gestione categorie
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [categoryForm, setCategoryForm] = useState({ name: '' })
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Carica dati iniziali
  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      // Carica conti, categorie entrate, transazioni entrate
      const [accountsRes, categoriesRes] = await Promise.all([
        fetch('/api/accounts'),
        fetch('/api/categories')
      ])

      if (accountsRes.ok) {
        const accountsData = await accountsRes.json()
        setAccounts(accountsData)
        
        // Imposta conto predefinito nel form
        const defaultAccount = accountsData.find((acc: Account) => acc.isDefault)
        if (defaultAccount) {
          setTransactionForm(prev => ({ ...prev, accountId: defaultAccount.id.toString() }))
        }
      }

      if (categoriesRes.ok) {
        const categoriesData = await categoriesRes.json()
        const incomeCategories = categoriesData.filter((cat: Category) => cat.type === 'income')
        setCategories(incomeCategories)
      }

      // TODO: Caricare transazioni entrate quando avremo le API
      setTransactions([])
      
    } catch (error) {
      console.error('Errore nel caricamento dati:', error)
      setError('Errore nel caricamento dei dati')
    } finally {
      setLoading(false)
    }
  }

  // Gestione categoria
  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!categoryForm.name.trim()) return

    setIsSubmitting(true)
    setError('')

    try {
      const url = editingCategory ? `/api/categories/${editingCategory.id}` : '/api/categories'
      const method = editingCategory ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: categoryForm.name.trim(),
          type: 'income'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Errore nel salvataggio')
      }

      await fetchData()
      resetCategoryForm()
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetCategoryForm = () => {
    setCategoryForm({ name: '' })
    setEditingCategory(null)
    setShowCategoryForm(false)
    setError('')
  }

  const handleEditCategory = (category: Category) => {
    setCategoryForm({ name: category.name })
    setEditingCategory(category)
    setShowCategoryForm(true)
  }

  const handleDeleteCategory = async (category: Category) => {
    if (!confirm(`Sei sicuro di voler cancellare la categoria "${category.name}"?`)) return

    try {
      const response = await fetch(`/api/categories/${category.id}`, { method: 'DELETE' })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Errore nella cancellazione')
      }

      await fetchData()
    } catch (error: any) {
      alert(error.message)
    }
  }

  // Gestione transazione
  const handleTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // TODO: Implementare API per transazioni
    alert('API transazioni da implementare nella prossima fase')
    setShowTransactionForm(false)
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Entrate</h1>
          <p className="text-gray-600">Gestisci le tue entrate e categorie</p>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-4 bg-gray-200 rounded w-1/4"></div>
          <div className="h-20 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Entrate</h1>
          <p className="text-gray-600">Gestisci le tue entrate e categorie</p>
        </div>
        <button
          onClick={() => setShowTransactionForm(!showTransactionForm)}
          className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 flex items-center gap-2"
        >
          <PlusIcon className="w-5 h-5" />
          Nuova Entrata
        </button>
      </div>

      {/* Riepilogo */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-gray-500">Entrate Questo Mese</h3>
          <p className="text-2xl font-bold text-green-600">€ 0,00</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-gray-500">Media Mensile</h3>
          <p className="text-2xl font-bold text-gray-900">€ 0,00</p>
        </div>
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-gray-500">Totale Anno</h3>
          <p className="text-2xl font-bold text-gray-900">€ 0,00</p>
        </div>
      </div>

      {/* Form Nuova Entrata */}
      {showTransactionForm && (
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h2 className="text-lg font-semibold mb-4">Nuova Entrata</h2>
          
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-lg mb-4">
              {error}
            </div>
          )}

          <form onSubmit={handleTransactionSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Descrizione
              </label>
              <input
                type="text"
                value={transactionForm.description}
                onChange={(e) => setTransactionForm({ ...transactionForm, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="Es: Stipendio Giugno"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Importo (€)
              </label>
              <input
                type="number"
                step="0.01"
                value={transactionForm.amount}
                onChange={(e) => setTransactionForm({ ...transactionForm, amount: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                placeholder="0.00"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Data
              </label>
              <input
                type="date"
                value={transactionForm.date}
                onChange={(e) => setTransactionForm({ ...transactionForm, date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Conto
              </label>
              <select
                value={transactionForm.accountId}
                onChange={(e) => setTransactionForm({ ...transactionForm, accountId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                required
              >
                <option value="">Seleziona conto</option>
                {accounts.map((account) => (
                  <option key={account.id} value={account.id}>
                    {account.name} {account.isDefault && '⭐'}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Categoria
              </label>
              <select
                value={transactionForm.categoryId}
                onChange={(e) => setTransactionForm({ ...transactionForm, categoryId: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                required
              >
                <option value="">Seleziona categoria</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2 flex gap-3">
              <button
                type="submit"
                disabled={isSubmitting}
                className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 disabled:opacity-50"
              >
                {isSubmitting ? 'Salvataggio...' : 'Aggiungi Entrata'}
              </button>
              <button
                type="button"
                onClick={() => setShowTransactionForm(false)}
                className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
              >
                Annulla
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Gestione Categorie Entrate */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
            <TagIcon className="w-5 h-5 text-green-600" />
            Categorie Entrate ({categories.length})
          </h2>
          <button
            onClick={() => setShowCategoryForm(!showCategoryForm)}
            className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 text-sm"
          >
            <PlusIcon className="w-4 h-4" />
            Nuova Categoria
          </button>
        </div>

        <div className="p-6">
          {/* Form Categoria */}
          {showCategoryForm && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-medium mb-3">
                {editingCategory ? 'Modifica Categoria' : 'Nuova Categoria'}
              </h3>
              
              <form onSubmit={handleCategorySubmit} className="flex gap-3">
                <input
                  type="text"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ name: e.target.value })}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Es: Stipendio, Freelance, Bonus..."
                  required
                />
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Salva...' : editingCategory ? 'Aggiorna' : 'Crea'}
                </button>
                <button
                  type="button"
                  onClick={resetCategoryForm}
                  className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                >
                  Annulla
                </button>
              </form>
            </div>
          )}

          {/* Lista Categorie */}
          {categories.length === 0 ? (
            <p className="text-gray-500 text-center py-8">
              Nessuna categoria per entrate. Creane una per iniziare!
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {categories.map((category) => (
                <div key={category.id} className="border rounded-lg p-4 hover:bg-gray-50">
                  <div className="flex justify-between items-center">
                    <span className="font-medium text-gray-900">{category.name}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEditCategory(category)}
                        className="text-blue-600 hover:text-blue-800"
                        title="Modifica"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category)}
                        className="text-red-600 hover:text-red-800"
                        title="Cancella"
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
      </div>

      {/* Lista Transazioni */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <h2 className="text-xl font-semibold text-gray-900">Transazioni Entrate</h2>
        </div>
        <div className="p-6">
          <div className="text-center text-gray-500 py-8">
            Nessuna transazione da mostrare.<br />
            <span className="text-sm">Le transazioni verranno implementate nella prossima fase.</span>
          </div>
        </div>
      </div>
    </div>
  )
}