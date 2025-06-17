// src/app/expenses/page.tsx
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

const COLORS = ['#EF4444', '#F59E0B', '#8B5CF6', '#3B82F6', '#10B981', '#F97316', '#06B6D4', '#84CC16']

export default function ExpensesPage() {
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
        fetch('/api/transactions?type=expense&limit=1000') // Carica tutte per analisi
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
        const expenseCategories = categoriesData.filter((cat: Category) => cat.type === 'expense')
        setCategories(expenseCategories)
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

  // Cancellazione multipla
  const handleDeleteSelected = async () => {
    if (selectedTransactions.length === 0) return
    
    if (!confirm(`Sei sicuro di voler cancellare ${selectedTransactions.length} transazioni selezionate?`)) return

    try {
      // Cancella tutte le transazioni selezionate
      await Promise.all(
        selectedTransactions.map(id => 
          fetch(`/api/transactions/${id}`, { method: 'DELETE' })
        )
      )
      
      await fetchData()
      setSelectedTransactions([])
      setSelectAll(false)
    } catch (error) {
      console.error('Errore nella cancellazione multipla:', error)
      alert('Errore nella cancellazione delle transazioni')
    }
  }

  // Reset filtri
  const resetFilters = () => {
    setSearchTerm('')
    setSelectedCategory('')
    setSelectedAccount('')
    setDateFrom('')
    setDateTo('')
    setCurrentPage(1)
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
          type: 'expense'
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
    
    if (!transactionForm.amount || !transactionForm.accountId || !transactionForm.categoryId) {
      setError('Tutti i campi sono obbligatori')
      return
    }

    setIsSubmitting(true)
    setError('')

    try {
      const url = editingTransaction ? `/api/transactions/${editingTransaction.id}` : '/api/transactions'
      const method = editingTransaction ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          description: transactionForm.description.trim() || null,
          amount: parseFloat(transactionForm.amount),
          date: transactionForm.date,
          accountId: parseInt(transactionForm.accountId),
          categoryId: parseInt(transactionForm.categoryId),
          type: 'expense'
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Errore nel salvataggio')
      }

      await fetchData()
      resetTransactionForm()
    } catch (error: any) {
      setError(error.message)
    } finally {
      setIsSubmitting(false)
    }
  }

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

  const handleEditTransaction = (transaction: Transaction) => {
    setTransactionForm({
      description: transaction.description || '',
      amount: transaction.amount.toString(),
      date: transaction.date.split('T')[0],
      accountId: transaction.account.id.toString(),
      categoryId: transaction.category.id.toString()
    })
    setEditingTransaction(transaction)
    setShowTransactionForm(true)
  }

  const handleDeleteTransaction = async (transaction: Transaction) => {
    if (!confirm(`Sei sicuro di voler cancellare questa transazione di €${transaction.amount}?`)) return

    try {
      const response = await fetch(`/api/transactions/${transaction.id}`, { method: 'DELETE' })
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Errore nella cancellazione')
      }

      await fetchData()
    } catch (error: any) {
      alert(error.message)
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
        <div className="h-64 flex items-center justify-center text-gray-600">
          Nessuna transazione per {title.toLowerCase()}
        </div>
      )
    }

    return (
      <div className="space-y-3">
        {data.map((item, index) => (
          <div key={index} className="space-y-2">
            <div className="flex justify-between items-center text-sm">
              <span className="font-medium">{item.name}</span>
              <span className="text-gray-600">€{item.value.toFixed(2)} ({item.percentage.toFixed(1)}%)</span>
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
          <h1 className="text-3xl font-bold text-gray-900">Uscite</h1>
          <p className="text-gray-600">Gestisci le tue uscite e categorie</p>
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
          <h1 className="text-3xl font-bold text-gray-900">Uscite</h1>
          <p className="text-gray-600">Gestisci le tue uscite e categorie</p>
        </div>
        <button
          onClick={() => setShowTransactionForm(true)}
          className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 flex items-center gap-2"
        >
          <PlusIcon className="w-5 h-5" />
          Nuova Uscita
        </button>
      </div>

      {/* Riepilogo Generale */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-gradient-to-r from-red-500 to-red-600 text-white p-6 rounded-lg">
          <h2 className="text-lg font-medium">Totale Generale</h2>
          <p className="text-3xl font-bold">€ {statistiche.grandTotal.toFixed(2)}</p>
          <p className="text-red-100">{statistiche.totalCount} transazioni</p>
        </div>
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 text-white p-6 rounded-lg">
          <h2 className="text-lg font-medium">{getCurrentMonthName()}</h2>
          <p className="text-3xl font-bold">€ {statistiche.thisMonth.total.toFixed(2)}</p>
          <p className="text-orange-100">{statistiche.thisMonth.count} transazioni</p>
        </div>
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white p-6 rounded-lg">
          <h2 className="text-lg font-medium">Altri Periodi</h2>
          <p className="text-3xl font-bold">€ {statistiche.other.total.toFixed(2)}</p>
          <p className="text-amber-100">{statistiche.other.count} transazioni</p>
        </div>
      </div>

      {/* Grafici */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Grafico Mese Corrente */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Uscite per Categoria - {getCurrentMonthName()}
          </h3>
          <SimpleChart data={statistiche.thisMonth.chartData} title={getCurrentMonthName()} />
        </div>

        {/* Grafico Altri Periodi */}
        <div className="bg-white rounded-lg shadow-sm border p-6">
          <h3 className="text-lg font-semibold mb-4 flex items-center gap-2">
            <CalendarIcon className="w-5 h-5" />
            Uscite per Categoria - Altri Periodi
          </h3>
          <SimpleChart data={statistiche.other.chartData} title="Altri Periodi" />
        </div>
      </div>

      {/* Layout a tre colonne */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Gestione Categorie */}
        <div className="bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <TagIcon className="w-6 h-6" />
                Categorie
              </h2>
              <button
                onClick={() => setShowCategoryForm(true)}
                className="bg-blue-600 text-white px-3 py-1 rounded-lg hover:bg-blue-700 text-sm"
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
              <div className="border rounded-lg p-4 bg-gray-50">
                <form onSubmit={handleCategorySubmit} className="space-y-4">
                  <input
                    type="text"
                    placeholder="Nome categoria"
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm({ name: e.target.value })}
                    className="w-full border rounded-lg px-3 py-2"
                    required
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isSubmitting ? 'Salvando...' : editingCategory ? 'Aggiorna' : 'Crea'}
                    </button>
                    <button
                      type="button"
                      onClick={resetCategoryForm}
                      className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
                    >
                      Annulla
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Lista Categorie */}
            {categories.length === 0 ? (
              <p className="text-gray-600 text-center py-8">
                Nessuna categoria per uscite. Creane una per iniziare!
              </p>
            ) : (
              <div className="space-y-2">
                {categories.map((category) => (
                  <div key={category.id} className="border rounded-lg p-3 hover:bg-gray-50">
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

        {/* Lista Transazioni - Occupa 2 colonne */}
        <div className="xl:col-span-2 bg-white rounded-lg shadow-sm border">
          <div className="p-6 border-b">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
                <CurrencyEuroIcon className="w-6 h-6" />
                Transazioni ({filteredTransactions.length})
              </h2>
              <div className="flex gap-2">
                {selectedTransactions.length > 0 && (
                  <button
                    onClick={handleDeleteSelected}
                    className="bg-red-600 text-white px-3 py-2 rounded-lg hover:bg-red-700 text-sm"
                  >
                    Cancella {selectedTransactions.length} selezionate
                  </button>
                )}
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="bg-gray-600 text-white px-3 py-2 rounded-lg hover:bg-gray-700 flex items-center gap-2 text-sm"
                >
                  <FunnelIcon className="w-4 h-4" />
                  Filtri
                </button>
              </div>
            </div>

            {/* Barra di ricerca */}
            <div className="relative mb-4">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Cerca per descrizione, categoria, conto o importo..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border rounded-lg"
              />
            </div>

            {/* Filtri avanzati */}
            {showFilters && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-4 bg-gray-50 rounded-lg mb-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Categoria</label>
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Conto</label>
                  <select
                    value={selectedAccount}
                    onChange={(e) => setSelectedAccount(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2"
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dal</label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Al</label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full border rounded-lg px-3 py-2"
                  />
                </div>
                <div className="md:col-span-4 flex gap-2">
                  <button
                    onClick={resetFilters}
                    className="bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600 text-sm"
                  >
                    Reset Filtri
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="p-6">
            {filteredTransactions.length === 0 ? (
              <p className="text-gray-600 text-center py-8">
                {searchTerm || selectedCategory || selectedAccount || dateFrom || dateTo 
                  ? 'Nessuna transazione trovata con i filtri applicati.'
                  : 'Nessuna transazione da mostrare. Aggiungi la tua prima uscita!'
                }
              </p>
            ) : (
              <>
                {/* Controlli selezione */}
                {paginatedTransactions.length > 0 && (
                  <div className="flex items-center gap-4 mb-4 p-3 bg-gray-50 rounded-lg">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={handleSelectAll}
                        className="rounded"
                      />
                      <span className="text-sm font-medium">
                        Seleziona tutte ({paginatedTransactions.length})
                      </span>
                    </label>
                    {selectedTransactions.length > 0 && (
                      <span className="text-sm text-blue-600">
                        {selectedTransactions.length} transazioni selezionate
                      </span>
                    )}
                  </div>
                )}

                {/* Lista transazioni */}
                <div className="space-y-3">
                  {paginatedTransactions.map((transaction) => (
                    <div key={transaction.id} className="border rounded-lg p-4 hover:bg-gray-50">
                      <div className="flex items-start gap-4">
                        <input
                          type="checkbox"
                          checked={selectedTransactions.includes(transaction.id)}
                          onChange={() => handleSelectTransaction(transaction.id)}
                          className="mt-1 rounded"
                        />
                        <div className="flex-1">
                          <div className="flex justify-between items-center mb-2">
                            <h3 className="font-medium text-gray-900">
                              {transaction.description || 'Uscita senza descrizione'}
                            </h3>
                            <span className="text-xl font-bold text-red-600">
                              -€ {transaction.amount.toFixed(2)}
                            </span>
                          </div>
                          <div className="text-sm text-gray-600 space-y-1">
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
                    <div className="text-sm text-gray-600">
                      Mostrando {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredTransactions.length)} di {filteredTransactions.length} transazioni
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="flex items-center gap-1 px-3 py-2 border rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
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
                        className="flex items-center gap-1 px-3 py-2 border rounded-lg hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
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
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editingTransaction ? 'Modifica Uscita' : 'Nuova Uscita'}
            </h3>
            
            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg mb-4">
                {error}
              </div>
            )}

            <form onSubmit={handleTransactionSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Descrizione
                </label>
                <input
                  type="text"
                  placeholder="Es. Spesa supermercato"
                  value={transactionForm.description}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Importo *
                </label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={transactionForm.amount}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, amount: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Data *
                </label>
                <input
                  type="date"
                  value={transactionForm.date}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Conto *
                </label>
                <select
                  value={transactionForm.accountId}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, accountId: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2"
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
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Categoria *
                </label>
                <select
                  value={transactionForm.categoryId}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, categoryId: e.target.value }))}
                  className="w-full border rounded-lg px-3 py-2"
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
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 disabled:opacity-50"
                >
                  {isSubmitting ? 'Salvando...' : editingTransaction ? 'Aggiorna' : 'Salva'}
                </button>
                <button
                  type="button"
                  onClick={resetTransactionForm}
                  className="flex-1 bg-gray-500 text-white px-4 py-2 rounded-lg hover:bg-gray-600"
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