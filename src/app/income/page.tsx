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
  
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  // Carica dati iniziali
  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      
      const [accountsRes, categoriesRes, transactionsRes] = await Promise.all([
        fetch('/api/accounts'),
        fetch('/api/categories'),
        fetch('/api/transactions?type=income&limit=1000') // Carica tutte per analisi
      ])

      if (accountsRes.ok) {
        const accountsData = await accountsRes.json()
        setAccounts(accountsData)
        
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

      if (transactionsRes.ok) {
        const transactionsData = await transactionsRes.json()
        setTransactions(transactionsData)
      }
      
    } catch (error) {
      console.error('Errore nel caricamento dati:', error)
      setError('Errore nel caricamento dei dati')
    } finally {
      setLoading(false)
    }
  }

  // Calcoli per statistiche
  const statistiche = useMemo(() => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    
    // Transazioni del mese corrente
    const thisMonthTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.date)
      return transactionDate.getMonth() === currentMonth && 
             transactionDate.getFullYear() === currentYear
    })
    
    // Transazioni di tutti gli altri periodi
    const otherTransactions = transactions.filter(t => {
      const transactionDate = new Date(t.date)
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

  // Reset selezione quando cambia la pagina
  useEffect(() => {
    setSelectedTransactions([])
    setSelectAll(false)
  }, [currentPage])

  // Form handlers
  const resetTransactionForm = () => {
    setTransactionForm({
      description: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      accountId: accounts.find(acc => acc.isDefault)?.id.toString() || '',
      categoryId: ''
    })
    setEditingTransaction(null)
    setShowTransactionForm(false)
    setError('')
  }

  const resetCategoryForm = () => {
    setCategoryForm({ name: '' })
    setEditingCategory(null)
    setShowCategoryForm(false)
  }

  const handleTransactionSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return

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
          ...transactionForm,
          type: 'income',
          amount: parseFloat(transactionForm.amount)
        })
      })

      if (response.ok) {
        await fetchData()
        resetTransactionForm()
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Errore nella gestione della transazione')
      }
    } catch (error) {
      setError('Errore di connessione')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return

    setIsSubmitting(true)
    try {
      const url = editingCategory 
        ? `/api/categories/${editingCategory.id}`
        : '/api/categories'
      
      const method = editingCategory ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...categoryForm,
          type: 'income'
        })
      })

      if (response.ok) {
        await fetchData()
        resetCategoryForm()
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Errore nella gestione della categoria')
      }
    } catch (error) {
      setError('Errore di connessione')
    } finally {
      setIsSubmitting(false)
    }
  }

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

  const handleDeleteTransaction = async (transaction: Transaction) => {
    if (!confirm(`Sei sicuro di voler cancellare l'entrata "${transaction.description || 'senza descrizione'}"?`)) return

    try {
      const response = await fetch(`/api/transactions/${transaction.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchData()
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Errore nella cancellazione')
      }
    } catch (error) {
      setError('Errore di connessione')
    }
  }

  const handleDeleteSelected = async () => {
    if (selectedTransactions.length === 0) return
    if (!confirm(`Sei sicuro di voler cancellare ${selectedTransactions.length} entrate selezionate?`)) return

    try {
      const deletePromises = selectedTransactions.map(id =>
        fetch(`/api/transactions/${id}`, { method: 'DELETE' })
      )

      await Promise.all(deletePromises)
      await fetchData()
      setSelectedTransactions([])
      setSelectAll(false)
    } catch (error) {
      setError('Errore nella cancellazione multipla')
    }
  }

  const handleEditCategory = (category: Category) => {
    setEditingCategory(category)
    setCategoryForm({ name: category.name })
    setShowCategoryForm(true)
  }

  const handleDeleteCategory = async (category: Category) => {
    if (!confirm(`Sei sicuro di voler cancellare la categoria "${category.name}"?`)) return

    try {
      const response = await fetch(`/api/categories/${category.id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchData()
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Errore nella cancellazione della categoria')
      }
    } catch (error) {
      setError('Errore di connessione')
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT')
  }

  const getCurrentMonthName = () => {
    return new Date().toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })
  }

  // Componente grafico CSS semplice
  const SimpleChart = ({ data, title }: { data: any[], title: string }) => {
    if (data.length === 0) {
      return (
        <div className="h-64 flex items-center justify-center text-adaptive-600">
          Nessuna transazione per {title.toLowerCase()}
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

      {/* Layout a tre colonne */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Gestione Categorie */}
        <div className="card-adaptive rounded-lg shadow-sm border-adaptive">
          <div className="p-6 border-b border-adaptive">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-adaptive-900 flex items-center gap-2">
                <TagIcon className="w-6 h-6" />
                Categorie
              </h2>
              <button
                onClick={() => setShowCategoryForm(true)}
                className="btn-primary px-3 py-1 rounded-lg text-sm"
              >
                + Categoria
              </button>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
                {error}
              </div>
            )}

            {/* Form Categoria */}
            {showCategoryForm && (
              <div className="border-adaptive rounded-lg p-4 bg-gray-50">
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
              <p className="text-adaptive-600 text-center py-8">
                Nessuna categoria per entrate. Creane una per iniziare!
              </p>
            ) : (
              <div className="space-y-2">
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
        </div>

        {/* Filtri e Ricerca */}
        <div className="card-adaptive rounded-lg shadow-sm border-adaptive">
          <div className="p-6 border-b border-adaptive">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-adaptive-900 flex items-center gap-2">
                <FunnelIcon className="w-6 h-6" />
                Filtri e Ricerca
              </h2>
              <button
                onClick={() => setShowFilters(!showFilters)}
                className="text-blue-600 hover:text-blue-800 text-sm"
              >
                {showFilters ? 'Nascondi' : 'Mostra'} Filtri
              </button>
            </div>
          </div>

          <div className="p-6 space-y-4">
            {/* Barra di ricerca */}
            <div className="relative">
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
              <div className="space-y-4 pt-4 border-t border-adaptive">
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
                        {account.name} {account.isDefault && '⭐'}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-adaptive-700 mb-1">
                      Da
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
                      A
                    </label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-full border-adaptive rounded-lg px-3 py-2 focus:outline-none"
                    />
                  </div>
                </div>

                <button
                  onClick={() => {
                    setSearchTerm('')
                    setSelectedCategory('')
                    setSelectedAccount('')
                    setDateFrom('')
                    setDateTo('')
                  }}
                  className="w-full btn-secondary py-2 rounded-lg"
                >
                  Azzera Filtri
                </button>
              </div>
            )}

            {/* Riepilogo risultati */}
            <div className="pt-4 border-t border-adaptive">
              <p className="text-sm text-adaptive-600">
                {filteredTransactions.length} entrate trovate
                {searchTerm && (
                  <span className="ml-1 text-blue-600">
                    per "{searchTerm}"
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Lista Transazioni */}
        <div className="card-adaptive rounded-lg shadow-sm border-adaptive">
          <div className="p-6 border-b border-adaptive">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-adaptive-900 flex items-center gap-2">
                <CurrencyEuroIcon className="w-6 h-6" />
                Entrate
              </h2>
              {selectedTransactions.length > 0 && (
                <button
                  onClick={handleDeleteSelected}
                  className="text-red-600 hover:text-red-800 text-sm"
                >
                  Cancella Selezionate ({selectedTransactions.length})
                </button>
              )}
            </div>
          </div>

          <div className="p-6">
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
                    <div key={transaction.id} className="border-adaptive rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-start gap-3">
                        <input
                          type="checkbox"
                          checked={selectedTransactions.includes(transaction.id)}
                          onChange={() => handleSelectTransaction(transaction.id)}
                          className="mt-1 rounded border-adaptive"
                        />
                        <div className="flex-1">
                          <div className="flex justify-between items-start mb-2">
                            <h3 className="font-medium text-adaptive-900">
                              {transaction.description || 'Entrata senza descrizione'}
                            </h3>
                            <span className="text-xl font-bold text-green-600">
                              +€ {transaction.amount.toFixed(2)}
                            </span>
                          </div>
                          <div className="text-sm text-adaptive-600 space-y-1">
                            <p>📂 {transaction.category.name}</p>
                            <p>🏦 {transaction.account.name}</p>
                            <p>📅 {formatDate(transaction.date)}</p>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleEditTransaction(transaction)}
                            className="text-blue-600 hover:text-blue-800"
                            title="Modifica"
                          >
                            <PencilIcon className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteTransaction(transaction)}
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

                {/* Paginazione */}
                {totalPages > 1 && (
                  <div className="flex justify-between items-center mt-6 p-4 bg-gray-50 rounded-lg">
                    <div className="text-sm text-adaptive-600">
                      Mostrando {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredTransactions.length)} di {filteredTransactions.length} transazioni
                    </div>
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
                  placeholder="Es. Stipendio Dicembre"
                  value={transactionForm.description}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full border-adaptive rounded-lg px-3 py-2 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">
                  Importo *
                </label>
                <input
                  type="number"
                  step="0.01"
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
                      {account.name} {account.isDefault && '⭐'}
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

              <div className="flex gap-2 pt-4">
                <button
                  type="button"
                  onClick={resetTransactionForm}
                  className="btn-secondary flex-1 py-2 rounded-lg"
                  disabled={isSubmitting}
                >
                  Annulla
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn-primary flex-1 py-2 rounded-lg disabled:opacity-50"
                >
                  {isSubmitting ? 'Salvando...' : editingTransaction ? 'Aggiorna' : 'Salva'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}