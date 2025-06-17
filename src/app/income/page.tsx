// src/app/income/page.tsx
'use client'

import { useState, useEffect, useMemo } from 'react'
import { 
  PlusIcon, PencilIcon, TrashIcon, TagIcon, CurrencyEuroIcon, 
  FunnelIcon, MagnifyingGlassIcon, ChevronLeftIcon, ChevronRightIcon,
  CalendarIcon, CheckIcon
} from '@heroicons/react/24/outline'

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
  type: 'income' | 'expense'
  account: {
    id: number
    name: string
  }
  category: {
    id: number
    name: string
    type: string
  }
}

const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#F97316', '#06B6D4', '#84CC16']

export default function IncomePage() {
  const [accounts, setAccounts] = useState<Account[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [loading, setLoading] = useState(true)
  
  // Stati per form transazione
  const [showTransactionForm, setShowTransactionForm] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
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
  
  // Stati per filtri e ricerca
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedAccount, setSelectedAccount] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showFilters, setShowFilters] = useState(false)
  
  // Stati per paginazione
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage] = useState(10)
  
  // Stati per selezione multipla
  const [selectedTransactions, setSelectedTransactions] = useState<number[]>([])
  const [selectAll, setSelectAll] = useState(false)
  
  // Stati per errori e caricamento
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Funzione per ottenere il nome del mese corrente
  const getCurrentMonthName = () => {
    const months = [
      'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
      'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
    ]
    return months[new Date().getMonth()]
  }

  // Caricamento dati iniziale
  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [accountsRes, categoriesRes, transactionsRes] = await Promise.all([
        fetch('/api/accounts'),
        fetch('/api/categories?type=income'),
        fetch('/api/transactions?type=income')
      ])

      if (accountsRes.ok && categoriesRes.ok && transactionsRes.ok) {
        const [accountsData, categoriesData, transactionsData] = await Promise.all([
          accountsRes.json(),
          categoriesRes.json(),
          transactionsRes.json()
        ])

        setAccounts(accountsData)
        setCategories(categoriesData)
        setTransactions(transactionsData)
        
        // Imposta conto predefinito se non selezionato
        if (accountsData.length > 0 && !transactionForm.accountId) {
          const defaultAccount = accountsData.find((acc: Account) => acc.isDefault)
          if (defaultAccount) {
            setTransactionForm(prev => ({
              ...prev,
              accountId: defaultAccount.id.toString()
            }))
          }
        }
      }
    } catch (error) {
      console.error('Errore nel caricamento dati:', error)
      setError('Errore nel caricamento dei dati')
    } finally {
      setLoading(false)
    }
  }

  // Reset form categoria
  const resetCategoryForm = () => {
    setCategoryForm({ name: '' })
    setShowCategoryForm(false)
    setEditingCategory(null)
    setError('')
  }

  // Reset form transazione
  const resetTransactionForm = () => {
    setTransactionForm({
      description: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      accountId: transactionForm.accountId, // Mantieni il conto selezionato
      categoryId: ''
    })
    setShowTransactionForm(false)
    setEditingTransaction(null)
    setError('')
  }

  // Gestione submit categoria
  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      const url = editingCategory 
        ? `/api/categories/${editingCategory.id}`
        : '/api/categories'
      
      const method = editingCategory ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: categoryForm.name.trim(),
          type: 'income'
        })
      })

      if (response.ok) {
        resetCategoryForm()
        fetchData()
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Errore durante il salvataggio della categoria')
      }
    } catch (error) {
      setError('Errore di rete durante il salvataggio')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Gestione modifica categoria
  const handleEditCategory = (category: Category) => {
    setEditingCategory(category)
    setCategoryForm({ name: category.name })
    setShowCategoryForm(true)
  }

  // Gestione cancellazione categoria
  const handleDeleteCategory = async (category: Category) => {
    if (!confirm(`Sei sicuro di voler cancellare la categoria "${category.name}"?`)) return

    try {
      const response = await fetch(`/api/categories/${category.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchData()
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Errore durante la cancellazione')
      }
    } catch (error) {
      setError('Errore di rete durante la cancellazione')
    }
  }

  // Gestione submit transazione
  const handleTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      const url = editingTransaction 
        ? `/api/transactions/${editingTransaction.id}`
        : '/api/transactions'
      
      const method = editingTransaction ? 'PUT' : 'POST'
      
      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: transactionForm.description.trim() || null,
          amount: parseFloat(transactionForm.amount),
          date: transactionForm.date,
          type: 'income',
          accountId: parseInt(transactionForm.accountId),
          categoryId: parseInt(transactionForm.categoryId)
        })
      })

      if (response.ok) {
        resetTransactionForm()
        fetchData()
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Errore durante il salvataggio della transazione')
      }
    } catch (error) {
      setError('Errore di rete durante il salvataggio')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Gestione modifica transazione
  const handleEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction)
    setTransactionForm({
      description: transaction.description || '',
      amount: transaction.amount.toString(),
      date: transaction.date.split('T')[0],
      accountId: transaction.account.id.toString(),
      categoryId: transaction.category.id.toString()
    })
    setShowTransactionForm(true)
  }

  // Gestione cancellazione transazione
  const handleDeleteTransaction = async (transaction: Transaction) => {
    if (!confirm(`Sei sicuro di voler cancellare questa entrata di €${transaction.amount}?`)) return

    try {
      const response = await fetch(`/api/transactions/${transaction.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchData()
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Errore durante la cancellazione')
      }
    } catch (error) {
      setError('Errore di rete durante la cancellazione')
    }
  }

  // Gestione cancellazione batch
  const handleBatchDelete = async () => {
    if (selectedTransactions.length === 0) return
    
    if (!confirm(`Sei sicuro di voler cancellare ${selectedTransactions.length} entrate selezionate?`)) return

    try {
      await Promise.all(
        selectedTransactions.map(id => 
          fetch(`/api/transactions/${id}`, { method: 'DELETE' })
        )
      )
      
      setSelectedTransactions([])
      setSelectAll(false)
      fetchData()
    } catch (error) {
      setError('Errore durante la cancellazione multipla')
    }
  }

  // Calcolo statistiche
  const statistiche = useMemo(() => {
    const currentDate = new Date()
    const currentMonth = currentDate.getMonth()
    const currentYear = currentDate.getFullYear()
    
    // Dividi transazioni per mese corrente e altri periodi
    const thisMonthTransactions = transactions.filter(transaction => {
      const transactionDate = new Date(transaction.date)
      return (transactionDate.getMonth() === currentMonth && 
               transactionDate.getFullYear() === currentYear)
    })
    
    const otherTransactions = transactions.filter(transaction => {
      const transactionDate = new Date(transaction.date)
      return !(transactionDate.getMonth() === currentMonth && 
               transactionDate.getFullYear() === currentYear)
    })
    
    // Totali
    const thisMonthTotal = thisMonthTransactions.reduce((sum, t) => sum + t.amount, 0)
    const otherTotal = otherTransactions.reduce((sum, t) => sum + t.amount, 0)
    const grandTotal = thisMonthTotal + otherTotal
    
    // Statistiche per categoria - mese corrente
    const thisMonthByCategory = thisMonthTransactions.reduce((acc, t) => {
      const categoryName = t.category.name
      acc[categoryName] = (acc[categoryName] || 0) + t.amount
      return acc
    }, {} as Record<string, number>)
    
    // Statistiche per categoria - altri periodi
    const otherByCategory = otherTransactions.reduce((acc, t) => {
      const categoryName = t.category.name
      acc[categoryName] = (acc[categoryName] || 0) + t.amount
      return acc
    }, {} as Record<string, number>)
    
    // Dati per grafici CSS
    const thisMonthChartData = Object.entries(thisMonthByCategory).map(([name, value], index) => ({
      name,
      value,
      percentage: thisMonthTotal > 0 ? (value / thisMonthTotal) * 100 : 0,
      color: COLORS[index % COLORS.length]
    }))
    
    const otherChartData = Object.entries(otherByCategory).map(([name, value], index) => ({
      name,
      value,
      percentage: otherTotal > 0 ? (value / otherTotal) * 100 : 0,
      color: COLORS[index % COLORS.length]
    }))
    
    return {
      thisMonth: {
        total: thisMonthTotal,
        count: thisMonthTransactions.length,
        byCategory: thisMonthByCategory,
        chartData: thisMonthChartData
      },
      other: {
        total: otherTotal,
        count: otherTransactions.length,
        byCategory: otherByCategory,
        chartData: otherChartData
      },
      grandTotal,
      totalCount: transactions.length
    }
  }, [transactions])

  // Transazioni filtrate
  const filteredTransactions = useMemo(() => {
    return transactions.filter(transaction => {
      // Filtro ricerca
      if (searchTerm) {
        const searchLower = searchTerm.toLowerCase()
        const matchesDescription = transaction.description?.toLowerCase().includes(searchLower)
        const matchesCategory = transaction.category.name.toLowerCase().includes(searchLower)
        const matchesAccount = transaction.account.name.toLowerCase().includes(searchLower)
        const matchesAmount = transaction.amount.toString().includes(searchTerm)
        
        if (!matchesDescription && !matchesCategory && !matchesAccount && !matchesAmount) {
          return false
        }
      }
      
      // Filtro categoria
      if (selectedCategory && transaction.category.id.toString() !== selectedCategory) {
        return false
      }
      
      // Filtro conto
      if (selectedAccount && transaction.account.id.toString() !== selectedAccount) {
        return false
      }
      
      // Filtro data
      if (dateFrom && new Date(transaction.date) < new Date(dateFrom)) {
        return false
      }
      
      if (dateTo && new Date(transaction.date) > new Date(dateTo)) {
        return false
      }
      
      return true
    })
  }, [transactions, searchTerm, selectedCategory, selectedAccount, dateFrom, dateTo])

  // Paginazione
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage)
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // Reset paginazione quando cambiano i filtri
  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, selectedCategory, selectedAccount, dateFrom, dateTo])

  // Gestione selezione multipla
  const handleSelectTransaction = (transactionId: number) => {
    setSelectedTransactions(prev =>
      prev.includes(transactionId)
        ? prev.filter(id => id !== transactionId)
        : [...prev, transactionId]
    )
  }

  const handleSelectAll = () => {
    if (selectAll) {
      setSelectedTransactions([])
    } else {
      setSelectedTransactions(paginatedTransactions.map(t => t.id))
    }
    setSelectAll(!selectAll)
  }

  // Aggiorna selectAll quando cambiano le selezioni
  useEffect(() => {
    if (paginatedTransactions.length > 0) {
      const allSelected = paginatedTransactions.every(t => selectedTransactions.includes(t.id))
      setSelectAll(allSelected)
    }
  }, [selectedTransactions, paginatedTransactions])

  // Componente per grafico semplice CSS
  const SimpleChart = ({ data, title }: { data: any[], title: string }) => {
    if (data.length === 0) {
      return (
        <div className="text-center text-adaptive-600 py-8">
          Nessun dato per {title.toLowerCase()}
        </div>
      )
    }

    return (
      <div className="space-y-3">
        {data.map((item, index) => (
          <div key={index} className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="font-medium text-adaptive-900">{item.name}</span>
              <span className="text-adaptive-700">€{item.value.toFixed(2)} ({item.percentage.toFixed(1)}%)</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="h-3 rounded-full"
                style={{ 
                  width: `${item.percentage}%`,
                  backgroundColor: item.color
                }}
              />
            </div>
          </div>
        ))}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-white">Entrate</h1>
          <p className="text-white opacity-80">Gestisci le tue entrate e categorie</p>
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          <div className="bg-gray-200 animate-pulse rounded-lg h-64"></div>
          <div className="bg-gray-200 animate-pulse rounded-lg h-64"></div>
          <div className="bg-gray-200 animate-pulse rounded-lg h-64"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Entrate</h1>
          <p className="text-white opacity-80">Gestisci le tue entrate e categorie</p>
        </div>
        <button
          onClick={() => setShowTransactionForm(true)}
          className="btn-primary px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <PlusIcon className="w-5 h-5" />
          Nuova Entrata
        </button>
      </div>

      {/* Riepilogo Statistiche */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card-adaptive p-4 rounded-lg border-adaptive">
          <h3 className="text-sm font-medium text-adaptive-500">Totale {getCurrentMonthName()}</h3>
          <p className="text-2xl font-bold text-green-600">€ {statistiche.thisMonth.total.toFixed(2)}</p>
          <p className="text-sm text-adaptive-600">{statistiche.thisMonth.count} transazioni</p>
        </div>
        
        <div className="card-adaptive p-4 rounded-lg border-adaptive">
          <h3 className="text-sm font-medium text-adaptive-500">Altri Periodi</h3>
          <p className="text-2xl font-bold text-blue-600">€ {statistiche.other.total.toFixed(2)}</p>
          <p className="text-sm text-adaptive-600">{statistiche.other.count} transazioni</p>
        </div>
        
        <div className="card-adaptive p-4 rounded-lg border-adaptive">
          <h3 className="text-sm font-medium text-adaptive-500">Totale Generale</h3>
          <p className="text-2xl font-bold text-adaptive-900">€ {statistiche.grandTotal.toFixed(2)}</p>
          <p className="text-sm text-adaptive-600">{statistiche.totalCount} transazioni</p>
        </div>
        
        <div className="card-adaptive p-4 rounded-lg border-adaptive">
          <h3 className="text-sm font-medium text-adaptive-500">Media Mensile</h3>
          <p className="text-2xl font-bold text-purple-600">
            € {statistiche.totalCount > 0 ? (statistiche.grandTotal / Math.max(1, statistiche.totalCount / 12)).toFixed(2) : '0.00'}
          </p>
          <p className="text-sm text-adaptive-600">Stima approssimativa</p>
        </div>
      </div>

      {/* Grafici */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-adaptive rounded-lg shadow-sm border-adaptive">
          <div className="p-6 border-b border-adaptive">
            <h3 className="text-lg font-semibold text-adaptive-900 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              Entrate per Categoria - {getCurrentMonthName()}
            </h3>
          </div>
          <div className="p-6">
            <SimpleChart data={statistiche.thisMonth.chartData} title="Mese Corrente" />
          </div>
        </div>

        <div className="card-adaptive rounded-lg shadow-sm border-adaptive">
          <div className="p-6 border-b border-adaptive">
            <h3 className="text-lg font-semibold text-adaptive-900 flex items-center gap-2">
              <CalendarIcon className="w-5 h-5" />
              Entrate per Categoria - Altri Periodi
            </h3>
          </div>
          <div className="p-6">
            <SimpleChart data={statistiche.other.chartData} title="Altri Periodi" />
          </div>
        </div>
      </div>

      {/* Sezione Unificata - Categorie, Filtri e Entrate */}
      <div className="card-adaptive rounded-lg shadow-sm border-adaptive">
        <div className="p-6 border-b border-adaptive">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold text-adaptive-900 flex items-center gap-2">
              <TagIcon className="w-6 h-6" />
              Gestione Completa Entrate
            </h2>
          </div>
        </div>

        <div className="p-6 space-y-8">
          {/* Sezione Categorie */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-adaptive-900">Gestione Categorie</h3>
              <button
                onClick={() => setShowCategoryForm(true)}
                className="btn-primary px-3 py-1 rounded-lg text-sm"
              >
                + Categoria
              </button>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            {/* Form Categoria */}
            {showCategoryForm && (
              <div className="border-adaptive rounded-lg p-4 bg-gray-50 mb-4">
                <form onSubmit={handleCategorySubmit} className="space-y-4">
                  <input
                    type="text"
                    placeholder="Nome categoria"
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({ name: e.target.value })}
                    className="w-full border-adaptive rounded-lg px-3 py-2 focus:outline-none"
                    required
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="btn-primary px-4 py-2 rounded-lg disabled:opacity-50"
                    >
                      {isSubmitting ? 'Salvando...' : editingCategory ? 'Aggiorna' : 'Crea'}
                    </button>
                    <button
                      type="button"
                      onClick={resetCategoryForm}
                      className="btn-secondary px-4 py-2 rounded-lg"
                    >
                      Annulla
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Lista Categorie */}
            {categories.length === 0 ? (
              <p className="text-adaptive-600 text-center py-4">
                Nessuna categoria per entrate. Creane una per iniziare!
              </p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {categories.map((category) => (
                  <div key={category.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="font-medium text-adaptive-900">{category.name}</span>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEditCategory(category)}
                        className="text-blue-600 hover:text-blue-800 p-1"
                        title="Modifica categoria"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteCategory(category)}
                        className="text-red-600 hover:text-red-800 p-1"
                        title="Cancella categoria"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Divisore visivo */}
          <div className="border-t border-adaptive"></div>

          {/* Sezione Filtri e Ricerca */}
          <div>
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-adaptive-900 flex items-center gap-2">
                <FunnelIcon className="w-5 h-5" />
                Filtri e Ricerca
              </h3>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                {showFilters ? 'Nascondi' : 'Mostra'} Filtri
              </button>
            </div>

            {/* Barra di ricerca sempre visibile */}
            <div className="relative mb-4">
              <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-adaptive-500" />
              <input
                type="text"
                placeholder="Cerca per descrizione, categoria, conto o importo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border-adaptive rounded-lg focus:outline-none"
              />
            </div>

            {/* Filtri avanzati */}
            {showFilters && (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                <div>
                  <label className="block text-sm font-medium text-adaptive-700 mb-1">
                    Categoria
                  </label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full border-adaptive rounded-lg px-3 py-2 focus:outline-none"
                  >
                    <option value="">Tutte le categorie</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-adaptive-700 mb-1">
                    Conto
                  </label>
                  <select
                    value={selectedAccount}
                    onChange={(e) => setSelectedAccount(e.target.value)}
                    className="w-full border-adaptive rounded-lg px-3 py-2 focus:outline-none"
                  >
                    <option value="">Tutti i conti</option>
                    {accounts.map((account) => (
                      <option key={account.id} value={account.id}>
                        {account.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-adaptive-700 mb-1">
                    Data Da
                  </label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full border-adaptive rounded-lg px-3 py-2 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-adaptive-700 mb-1">
                    Data A
                  </label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full border-adaptive rounded-lg px-3 py-2 focus:outline-none"
                  />
                </div>
              </div>
            )}

            {/* Risultati ricerca */}
            {(searchTerm || selectedCategory || selectedAccount || dateFrom || dateTo) && (
              <div className="mt-4 text-sm text-adaptive-600">
                Mostrate {filteredTransactions.length} di {transactions.length} entrate
                {(searchTerm || selectedCategory || selectedAccount || dateFrom || dateTo) && (
                  <button
                    onClick={() => {
                      setSearchTerm('')
                      setSelectedCategory('')
                      setSelectedAccount('')
                      setDateFrom('')
                      setDateTo('')
                    }}
                    className="ml-2 text-blue-600 hover:text-blue-800"
                  >
                    Cancella filtri
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Divisore visivo */}
          <div className="border-t border-adaptive"></div>

          {/* Sezione Lista Entrate */}
          <div>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-lg font-medium text-adaptive-900 flex items-center gap-2">
                <CurrencyEuroIcon className="w-5 h-5" />
                Lista Entrate
                {selectedTransactions.length > 0 && (
                  <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    {selectedTransactions.length} selezionate
                  </span>
                )}
              </h3>
              {selectedTransactions.length > 0 && (
                <button
                  onClick={handleBatchDelete}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Cancella Selezionate
                </button>
              )}
            </div>

            {filteredTransactions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-adaptive-600 mb-4">
                  {searchTerm || selectedCategory || selectedAccount || dateFrom || dateTo
                    ? 'Nessuna entrata corrisponde ai filtri selezionati'
                    : 'Nessuna entrata registrata'
                  }
                </p>
                <button
                  onClick={() => setShowTransactionForm(true)}
                  className="btn-primary px-4 py-2 rounded-lg"
                >
                  Registra Prima Entrata
                </button>
              </div>
            ) : (
              <>
                {/* Selezione multipla header */}
                {paginatedTransactions.length > 0 && (
                  <div className="flex items-center justify-between mb-4 p-3 bg-gray-50 rounded-lg">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={handleSelectAll}
                        className="rounded border-adaptive"
                      />
                      <span className="text-sm text-adaptive-600">
                        Seleziona tutte ({paginatedTransactions.length})
                      </span>
                    </label>
                    {selectedTransactions.length > 0 && (
                      <span className="text-sm text-blue-600 font-medium">
                        {selectedTransactions.length} selezionate
                      </span>
                    )}
                  </div>
                )}

                {/* Lista transazioni */}
                <div className="space-y-3">
                  {paginatedTransactions.map((transaction) => (
                    <div 
                      key={transaction.id} 
                      className={`border-adaptive rounded-lg p-4 hover:bg-gray-50 transition-colors ${
                        selectedTransactions.includes(transaction.id) ? 'bg-blue-50 border-blue-200' : ''
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedTransactions.includes(transaction.id)}
                          onChange={() => handleSelectTransaction(transaction.id)}
                          className="rounded border-adaptive"
                        />
                        
                        <div className="flex-1 min-w-0">
                          <div className="flex justify-between items-start mb-2">
                            <div className="flex-1">
                              <p className="font-medium text-adaptive-900">
                                {transaction.description || 'Nessuna descrizione'}
                              </p>
                              <p className="text-sm text-adaptive-600">
                                {transaction.category.name} • {transaction.account.name}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-green-600">€ {transaction.amount.toFixed(2)}</p>
                              <p className="text-xs text-adaptive-500">
                                {new Date(transaction.date).toLocaleDateString('it-IT')}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex gap-1">
                          <button
                            onClick={() => handleEditTransaction(transaction)}
                            className="text-blue-600 hover:text-blue-800 p-1"
                            title="Modifica entrata"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTransaction(transaction)}
                            className="text-red-600 hover:text-red-800 p-1"
                            title="Cancella entrata"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Paginazione */}
                {totalPages > 1 && (
                  <div className="flex justify-between items-center mt-6 pt-4 border-t border-adaptive">
                    <p className="text-sm text-adaptive-600">
                      Mostrate {((currentPage - 1) * itemsPerPage) + 1}-{Math.min(currentPage * itemsPerPage, filteredTransactions.length)} di {filteredTransactions.length} entrate
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="flex items-center gap-1 px-3 py-2 border-adaptive rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <ChevronLeftIcon className="w-4 h-4" />
                        Precedente
                      </button>
                      <span className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg">
                        {currentPage} di {totalPages}
                      </span>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="flex items-center gap-1 px-3 py-2 border-adaptive rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Successivo
                        <ChevronRightIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Modal Form Transazione */}
      {showTransactionForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="card-adaptive rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold text-adaptive-900 mb-4">
              {editingTransaction ? 'Modifica Entrata' : 'Nuova Entrata'}
            </h3>
            
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleTransactionSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">
                  Descrizione
                </label>
                <input
                  type="text"
                  placeholder="Es. Stipendio, Freelance..."
                  value={transactionForm.description}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full border-adaptive rounded-lg px-3 py-2 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">
                  Importo (€) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={transactionForm.amount}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full border-adaptive rounded-lg px-3 py-2 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">
                  Data *
                </label>
                <input
                  type="date"
                  value={transactionForm.date}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full border-adaptive rounded-lg px-3 py-2 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">
                  Conto *
                </label>
                <select
                  value={transactionForm.accountId}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, accountId: e.target.value }))}
                  className="w-full border-adaptive rounded-lg px-3 py-2 focus:outline-none"
                  required
                >
                  <option value="">Seleziona conto</option>
                  {accounts.map((account) => (
                    <option key={account.id} value={account.id}>
                      {account.name} {account.isDefault && '(Predefinito)'}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">
                  Categoria *
                </label>
                <select
                  value={transactionForm.categoryId}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, categoryId: e.target.value }))}
                  className="w-full border-adaptive rounded-lg px-3 py-2 focus:outline-none"
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

              <div className="flex gap-3 pt-4">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 btn-primary px-4 py-2 rounded-lg disabled:opacity-50"
                >
                  {isSubmitting ? 'Salvando...' : editingTransaction ? 'Aggiorna' : 'Salva'}
                </button>
                <button
                  type="button"
                  onClick={resetTransactionForm}
                  className="flex-1 btn-secondary px-4 py-2 rounded-lg"
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