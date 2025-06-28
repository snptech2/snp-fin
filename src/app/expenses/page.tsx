'use client'
import { formatCurrency } from '@/utils/formatters'
import { useState, useEffect, useMemo } from 'react'
import { 
  PlusIcon, PencilIcon, TrashIcon, TagIcon, CurrencyEuroIcon, 
  FunnelIcon, MagnifyingGlassIcon, ChevronLeftIcon, ChevronRightIcon,
  CalendarIcon, CheckIcon, ChevronDownIcon
} from '@heroicons/react/24/outline'
import ProtectedRoute from '@/components/ProtectedRoute'

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
  color?: string
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
    color?: string
  }
}

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
  const [categoryForm, setCategoryForm] = useState({ 
    name: '', 
    color: '#EF4444'  // Rosso per le uscite
  })
  
  // Colori disponibili per le categorie - PALETTE AMPLIATA (ORDINATA CON ROSSI PRIMA)
  const [availableColors] = useState([
    // Rosso/Rosa (priorità per uscite)
    '#EF4444', '#DC2626', '#B91C1C', '#EC4899', '#F43F5E',
    // Arancione/Giallo
    '#F97316', '#EA580C', '#F59E0B', '#D97706', '#FB923C',
    // Verde
    '#10B981', '#059669', '#047857', '#065F46', '#6EE7B7',
    // Blu
    '#3B82F6', '#1D4ED8', '#1E40AF', '#2563EB', '#60A5FA',
    // Viola/Indaco
    '#8B5CF6', '#7C3AED', '#6366F1', '#4F46E5', '#A78BFA',
    // Ciano/Teal
    '#06B6D4', '#0891B2', '#14B8A6', '#0D9488', '#2DD4BF',
    // Lime/Verde chiaro
    '#84CC16', '#65A30D', '#16A34A', '#15803D', '#22C55E',
    // Grigio/Neutri
    '#6B7280', '#4B5563', '#374151', '#1F2937', '#9CA3AF',
    // Extra
    '#F472B6', '#C084FC', '#FB7185', '#FBBF24', '#34D399'
  ])
  
  // Stati per filtri e ricerca
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState('')
  const [selectedAccount, setSelectedAccount] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [showFilters, setShowFilters] = useState(true)
  
  // Stati per paginazione
  const [currentPage, setCurrentPage] = useState(1)
  const [itemsPerPage, setItemsPerPage] = useState(25)
  const [showCategories, setShowCategories] = useState(false)
  
  // Stati per selezione multipla
  const [selectedTransactions, setSelectedTransactions] = useState<number[]>([])
  const [selectAll, setSelectAll] = useState(false)
  
  // Stati per gestione errori e caricamento
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Trova conto predefinito
  const getDefaultAccount = () => {
    return accounts.find(account => account.isDefault) || accounts[0]
  }

  // Caricamento iniziale
  useEffect(() => {
    fetchData()
  }, [])

  // Imposta conto predefinito quando aprono i form
  useEffect(() => {
    if (showTransactionForm && !editingTransaction && accounts.length > 0) {
      const defaultAccount = getDefaultAccount()
      if (defaultAccount) {
        setTransactionForm(prev => ({
          ...prev,
          accountId: defaultAccount.id.toString()
        }))
      }
    }
  }, [showTransactionForm, editingTransaction, accounts])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [accountsRes, categoriesRes, transactionsRes] = await Promise.all([
        fetch('/api/accounts'),
        fetch('/api/categories?type=expense'),
        fetch('/api/transactions?type=expense')
      ])

      if (accountsRes.ok) setAccounts(await accountsRes.json())
      if (categoriesRes.ok) setCategories(await categoriesRes.json())
      if (transactionsRes.ok) setTransactions(await transactionsRes.json())
    } catch (error) {
      setError('Errore nel caricamento dei dati')
    } finally {
      setLoading(false)
    }
  }

  // Funzioni di reset form
  const resetTransactionForm = () => {
    const defaultAccount = getDefaultAccount()
    setTransactionForm({
      description: '',
      amount: '',
      date: new Date().toISOString().split('T')[0],
      accountId: defaultAccount ? defaultAccount.id.toString() : '',
      categoryId: ''
    })
    setEditingTransaction(null)
    setShowTransactionForm(false)
    setError('')
  }

  const resetCategoryForm = () => {
    setCategoryForm({ name: '', color: '#EF4444' })
    setEditingCategory(null)
    setShowCategoryForm(false)
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
          type: 'expense',
          color: categoryForm.color
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
    setCategoryForm({ 
      name: category.name,
      color: category.color || '#EF4444'
    })
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
          type: 'expense',
          accountId: parseInt(transactionForm.accountId),
          categoryId: parseInt(transactionForm.categoryId)
        })
      })

      if (response.ok) {
        resetTransactionForm()
        fetchData()
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Errore durante il salvataggio')
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
  const handleDeleteTransaction = async (transactionId: number) => {
    if (!confirm('Sei sicuro di voler cancellare questa uscita?')) return

    try {
      const response = await fetch(`/api/transactions/${transactionId}`, {
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

  // Filtri e ricerca
  const filteredTransactions = useMemo(() => {
    return transactions.filter(transaction => {
      const matchesSearch = searchTerm === '' || 
        transaction.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.category.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.account.name.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesCategory = selectedCategory === '' || 
        transaction.category.id.toString() === selectedCategory
      
      const matchesAccount = selectedAccount === '' || 
        transaction.account.id.toString() === selectedAccount
      
      const transactionDate = new Date(transaction.date)
      const matchesDateFrom = dateFrom === '' || 
        transactionDate >= new Date(dateFrom)
      
      const matchesDateTo = dateTo === '' || 
        transactionDate <= new Date(dateTo + 'T23:59:59')
      
      return matchesSearch && matchesCategory && matchesAccount && 
             matchesDateFrom && matchesDateTo
    })
  }, [transactions, searchTerm, selectedCategory, selectedAccount, dateFrom, dateTo])

  // Paginazione
  const totalPages = Math.ceil(filteredTransactions.length / itemsPerPage)
  const paginatedTransactions = filteredTransactions.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  // Gestione selezione
  const handleTransactionSelect = (transactionId: number) => {
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
  const handleBulkDelete = async () => {
    if (!confirm(`Sei sicuro di voler cancellare ${selectedTransactions.length} uscite?`)) return

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

  // Calcoli per statistiche
  const totalExpenses = transactions.reduce((sum, transaction) => sum + transaction.amount, 0)
  const currentMonthExpenses = transactions
    .filter(t => new Date(t.date).getMonth() === new Date().getMonth())
    .reduce((sum, transaction) => sum + transaction.amount, 0)

  // Statistiche per categoria
  const categoryStats = useMemo(() => {
    const stats = categories.map(category => {
      const categoryTransactions = transactions.filter(t => t.category.id === category.id)
      const total = categoryTransactions.reduce((sum, t) => sum + t.amount, 0)
      const percentage = totalExpenses > 0 ? (total / totalExpenses) * 100 : 0
      
      return {
        id: category.id,
        name: category.name,
        color: category.color || '#EF4444',
        total,
        percentage,
        count: categoryTransactions.length
      }
    }).filter(stat => stat.total > 0)
    
    return stats.sort((a, b) => b.total - a.total)
  }, [categories, transactions, totalExpenses])

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-adaptive-900">Uscite</h1>
            <p className="text-adaptive-600">Gestisci le tue uscite e categorie</p>
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            <div className="card-adaptive animate-pulse rounded-lg h-64"></div>
            <div className="card-adaptive animate-pulse rounded-lg h-64"></div>
            <div className="card-adaptive animate-pulse rounded-lg h-64"></div>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-adaptive-900">Uscite</h1>
            <p className="text-adaptive-600">Gestisci le tue uscite e categorie</p>
          </div>
          <button
            onClick={() => setShowTransactionForm(true)}
            className="btn-primary px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            Nuova Uscita
          </button>
        </div>

        {/* Statistiche */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="card-adaptive rounded-lg p-6">
            <h3 className="text-lg font-semibold text-adaptive-900 mb-2">💸 Totale Uscite</h3>
            <p className="text-3xl font-bold text-red-600">{formatCurrency(totalExpenses)}</p>
            <p className="text-sm text-adaptive-600">{transactions.length} transazioni</p>
          </div>
          
          <div className="card-adaptive rounded-lg p-6">
            <h3 className="text-lg font-semibold text-adaptive-900 mb-2">📅 Questo Mese</h3>
            <p className="text-3xl font-bold text-orange-600">{formatCurrency(currentMonthExpenses)}</p>
            <p className="text-sm text-adaptive-600">
              {totalExpenses > 0 ? `${((currentMonthExpenses / totalExpenses) * 100).toFixed(1)}% del totale` : '0% del totale'}
            </p>
          </div>
          
          <div className="card-adaptive rounded-lg p-6">
            <h3 className="text-lg font-semibold text-adaptive-900 mb-2">🏷️ Categorie</h3>
            <p className="text-3xl font-bold text-purple-600">{categories.length}</p>
            <button 
              onClick={() => setShowCategories(!showCategories)}
              className="text-sm text-blue-600 hover:text-blue-700 mt-1"
            >
              {showCategories ? 'Nascondi' : 'Mostra'} categorie
            </button>
          </div>
        </div>

        {/* Gestione Categorie */}
        <div className={`card-adaptive rounded-lg p-6 transition-all duration-300 ${
          showCategories ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden p-0'
        }`}>
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-medium text-adaptive-900 flex items-center gap-2">
              <TagIcon className="w-5 h-5" />
              Categorie Uscite ({categories.length})
            </h3>
            <button
              onClick={() => setShowCategoryForm(true)}
              className="btn-primary px-3 py-2 rounded-lg text-sm"
            >
              <PlusIcon className="w-4 h-4 inline mr-1" />
              Nuova Categoria
            </button>
          </div>
          
          {categories.length === 0 ? (
            <p className="text-adaptive-600 text-center py-4">
              Nessuna categoria per uscite. Creane una per iniziare!
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {categories.map((category) => (
                <div key={category.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full border-2 border-gray-300"
                      style={{ backgroundColor: category.color || '#EF4444' }}
                    />
                    <span className="font-medium text-adaptive-900">{category.name}</span>
                  </div>
                  <div className="flex gap-1">
                    <button
                      onClick={() => handleEditCategory(category)}
                      className="text-blue-600 hover:text-blue-800 p-1"
                    >
                      <PencilIcon className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteCategory(category)}
                      className="text-red-600 hover:text-red-800 p-1"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Lista Transazioni con Filtri */}
        <div className="card-adaptive rounded-lg shadow-sm border-adaptive">
          <div className="p-6 border-b border-adaptive">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-adaptive-900 flex items-center gap-2">
                <CurrencyEuroIcon className="w-5 h-5" />
                Transazioni ({filteredTransactions.length})
              </h3>
              {selectedTransactions.length > 0 && (
                <button
                  onClick={handleBulkDelete}
                  className="bg-red-600 text-white px-3 py-2 rounded-lg text-sm"
                >
                  Elimina {selectedTransactions.length} selezionate
                </button>
              )}
            </div>

            {/* Filtri */}
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <div className="relative">
                    <MagnifyingGlassIcon className="w-5 h-5 absolute left-3 top-1/2 transform -translate-y-1/2 text-adaptive-400" />
                    <input
                      type="text"
                      placeholder="Cerca transazioni..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-adaptive rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
                <button
                  onClick={() => setShowFilters(!showFilters)}
                  className="px-4 py-2 border border-adaptive rounded-md hover:bg-adaptive-50 flex items-center gap-2"
                >
                  <FunnelIcon className="w-5 h-5" />
                  Filtri
                </button>
              </div>

              {showFilters && (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 p-4 bg-adaptive-50 rounded-lg">
                  <div>
                    <label className="block text-sm font-medium text-adaptive-700 mb-1">Categoria</label>
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-adaptive rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Tutte le categorie</option>
                      {categories.map(category => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-adaptive-700 mb-1">Conto</label>
                    <select
                      value={selectedAccount}
                      onChange={(e) => setSelectedAccount(e.target.value)}
                      className="w-full px-3 py-2 border border-adaptive rounded-md focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Tutti i conti</option>
                      {accounts.map(account => (
                        <option key={account.id} value={account.id}>
                          {account.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-adaptive-700 mb-1">Da Data</label>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="w-full px-3 py-2 border border-adaptive rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-adaptive-700 mb-1">A Data</label>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="w-full px-3 py-2 border border-adaptive rounded-md focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="p-6">
            {filteredTransactions.length === 0 ? (
              <div className="text-center py-8">
                <CurrencyEuroIcon className="w-12 h-12 text-adaptive-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-adaptive-900 mb-2">Nessuna Uscita</h3>
                <p className="text-adaptive-600 mb-4">
                  {transactions.length === 0 
                    ? "Non hai ancora registrato uscite. Inizia aggiungendo la tua prima uscita!"
                    : "Nessuna uscita corrisponde ai filtri selezionati."
                  }
                </p>
                {transactions.length === 0 && (
                  <button
                    onClick={() => setShowTransactionForm(true)}
                    className="btn-primary px-4 py-2 rounded-lg"
                  >
                    Aggiungi Prima Uscita
                  </button>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                {/* Controlli paginazione */}
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-adaptive-600">Mostra:</span>
                    <select
                      value={itemsPerPage}
                      onChange={(e) => {
                        setItemsPerPage(Number(e.target.value))
                        setCurrentPage(1)
                      }}
                      className="px-2 py-1 border border-adaptive rounded text-sm"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                    </select>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="p-1 rounded border border-adaptive disabled:opacity-50"
                    >
                      <ChevronLeftIcon className="w-4 h-4" />
                    </button>
                    <span className="text-sm">
                      {currentPage} di {totalPages}
                    </span>
                    <button
                      onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="p-1 rounded border border-adaptive disabled:opacity-50"
                    >
                      <ChevronRightIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Header con selezione multipla */}
                <div className="flex items-center gap-3 pb-2 border-b border-adaptive">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={handleSelectAll}
                    className="rounded"
                  />
                  <span className="text-sm text-adaptive-600">
                    Seleziona tutto ({paginatedTransactions.length})
                  </span>
                </div>

                {/* Lista transazioni */}
                {paginatedTransactions.map(transaction => (
                  <div key={transaction.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={selectedTransactions.includes(transaction.id)}
                        onChange={() => handleTransactionSelect(transaction.id)}
                        className="rounded"
                      />
                      <div className="flex items-center gap-3">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: transaction.category.color || '#EF4444' }}
                        />
                        <div>
                          <p className="font-medium text-adaptive-900">
                            {transaction.description || 'Uscita'}
                          </p>
                          <p className="text-sm text-adaptive-600">
                            {transaction.category.name} • {transaction.account.name} • {new Date(transaction.date).toLocaleDateString('it-IT')}
                          </p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="text-lg font-semibold text-red-600">
                        -{formatCurrency(transaction.amount)}
                      </p>
                      <div className="flex gap-1">
                        <button
                          onClick={() => handleEditTransaction(transaction)}
                          className="p-1 text-adaptive-600 hover:text-blue-600"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTransaction(transaction.id)}
                          className="p-1 text-adaptive-600 hover:text-red-600"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}

                {/* Paginazione */}
                {totalPages > 1 && (
                  <div className="flex justify-between items-center pt-4 border-t border-adaptive">
                    <div className="text-sm text-adaptive-600">
                      Pagina {currentPage} di {totalPages} ({filteredTransactions.length} totali)
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                        disabled={currentPage === 1}
                        className="p-2 rounded-lg border-adaptive disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                      >
                        <ChevronLeftIcon className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                        disabled={currentPage === totalPages}
                        className="p-2 rounded-lg border-adaptive disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-100"
                      >
                        <ChevronRightIcon className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Modal Transazione */}
        {showTransactionForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="modal-content rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">
                {editingTransaction ? 'Modifica Uscita' : 'Nuova Uscita'}
              </h3>
              
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}
              
              <form onSubmit={handleTransactionSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Descrizione
                  </label>
                  <input
                    type="text"
                    value={transactionForm.description}
                    onChange={(e) => setTransactionForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Es: Spesa supermercato"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Importo (EUR) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={transactionForm.amount}
                    onChange={(e) => setTransactionForm(prev => ({ ...prev, amount: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Data *
                  </label>
                  <input
                    type="date"
                    value={transactionForm.date}
                    onChange={(e) => setTransactionForm(prev => ({ ...prev, date: e.target.value }))}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Conto *
                  </label>
                  <select
                    value={transactionForm.accountId}
                    onChange={(e) => setTransactionForm(prev => ({ ...prev, accountId: e.target.value }))}
                    required
                  >
                    <option value="">Seleziona conto</option>
                    {accounts.map(account => (
                      <option key={account.id} value={account.id.toString()}>
                        {account.name}{account.isDefault ? ' ⭐' : ''} (€ {account.balance.toFixed(2)})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Categoria *
                  </label>
                  <select
                    value={transactionForm.categoryId}
                    onChange={(e) => setTransactionForm(prev => ({ ...prev, categoryId: e.target.value }))}
                    required
                  >
                    <option value="">Seleziona categoria</option>
                    {categories.map(category => (
                      <option key={category.id} value={category.id.toString()}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={resetTransactionForm}
                    className="flex-1 btn-secondary px-4 py-2 rounded-lg"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 btn-primary px-4 py-2 rounded-lg disabled:opacity-50"
                  >
                    {isSubmitting ? 'Salvando...' : editingTransaction ? 'Aggiorna' : 'Crea'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Categoria */}
        {showCategoryForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="modal-content rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">
                {editingCategory ? 'Modifica Categoria' : 'Nuova Categoria'}
              </h3>
              
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}
              
              <form onSubmit={handleCategorySubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Nome Categoria *
                  </label>
                  <input
                    type="text"
                    value={categoryForm.name}
                    onChange={(e) => setCategoryForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Es: Alimentari"
                    required
                  />
                </div>

                {/* Selettore Colori */}
                <div>
                  <label className="block text-sm font-medium mb-2">
                    🎨 Colore Categoria
                  </label>
                  <div className="grid grid-cols-10 gap-2">
                    {availableColors.map((color) => (
                      <button
                        key={color}
                        type="button"
                        onClick={() => setCategoryForm(prev => ({ ...prev, color }))}
                        className={`w-8 h-8 rounded-lg border-2 transition-all ${
                          categoryForm.color === color 
                            ? 'border-gray-900 scale-110' 
                            : 'border-gray-300 hover:border-gray-500'
                        }`}
                        style={{ backgroundColor: color }}
                        title={color}
                      />
                    ))}
                  </div>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={resetCategoryForm}
                    className="flex-1 btn-secondary px-4 py-2 rounded-lg"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 btn-primary px-4 py-2 rounded-lg disabled:opacity-50"
                  >
                    {isSubmitting ? 'Salvando...' : editingCategory ? 'Aggiorna' : 'Crea'}
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