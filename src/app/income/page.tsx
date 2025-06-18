// src/app/income/page.tsx - VERSIONE COMPLETA CON FIX
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
  const [categoryForm, setCategoryForm] = useState({ 
    name: '', 
    color: '#3B82F6'
  })
  
  // Colori disponibili per le categorie
  const [availableColors] = useState([
    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
    '#06B6D4', '#F97316', '#84CC16', '#EC4899', '#6366F1',
    '#F43F5E', '#14B8A6'
  ])
  
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
  
  // Stati per gestione errori e caricamento
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // 🔥 TROVA CONTO PREDEFINITO
  const getDefaultAccount = () => {
    return accounts.find(account => account.isDefault) || accounts[0]
  }

  // Caricamento iniziale
  useEffect(() => {
    fetchData()
  }, [])

  // 🔥 IMPOSTA CONTO PREDEFINITO QUANDO APRONO I FORM
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
        fetch('/api/categories?type=income'),
        fetch('/api/transactions?type=income')
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
    setCategoryForm({ name: '', color: '#3B82F6' })
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
          type: 'income',
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
      color: category.color || '#3B82F6'
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
    if (!confirm('Sei sicuro di voler cancellare questa entrata?')) return

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

  // Aggiorna selectAll quando cambiano le selezioni
  useEffect(() => {
    if (paginatedTransactions.length > 0) {
      const allSelected = paginatedTransactions.every(t => selectedTransactions.includes(t.id))
      setSelectAll(allSelected)
    }
  }, [selectedTransactions, paginatedTransactions])

  // Cancellazione multipla
  const handleBulkDelete = async () => {
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
    
    // Dati per grafici CSS - MESE CORRENTE (usa colori categorie!)
    const thisMonthChartData = Object.entries(thisMonthByCategory).map(([categoryName, value]) => {
      const categoryData = thisMonthTransactions.find(t => t.category.name === categoryName)?.category
      
      return {
        name: categoryName,
        value,
        percentage: thisMonthTotal > 0 ? (value / thisMonthTotal) * 100 : 0,
        color: categoryData?.color || '#3B82F6'
      }
    })
    
    // Dati per grafici CSS - ALTRI PERIODI (usa colori categorie!)
    const otherChartData = Object.entries(otherByCategory).map(([categoryName, value]) => {
      const categoryData = otherTransactions.find(t => t.category.name === categoryName)?.category
      
      return {
        name: categoryName,
        value,
        percentage: otherTotal > 0 ? (value / otherTotal) * 100 : 0,
        color: categoryData?.color || '#3B82F6'
      }
    })
    
    return {
      thisMonth: {
        total: thisMonthTotal,
        count: thisMonthTransactions.length,
        chartData: thisMonthChartData
      },
      other: {
        total: otherTotal,
        count: otherTransactions.length,
        chartData: otherChartData
      },
      grandTotal,
      totalCount: transactions.length
    }
  }, [transactions])

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
              <div className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: item.color }}
                />
                <span className="font-medium text-adaptive-900">{item.name}</span>
              </div>
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

  // Helper per nome mese
  const getCurrentMonthName = () => {
    const months = [
      'Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
      'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'
    ]
    return months[new Date().getMonth()]
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
            € {statistiche.totalCount > 0 ? 
              (statistiche.grandTotal / Math.max(1, statistiche.totalCount / 12)).toFixed(2) : '0.00'}
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

      {/* Gestione Categorie */}
      <div className="card-adaptive rounded-lg shadow-sm border-adaptive">
        <div className="p-6 border-b border-adaptive">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold text-adaptive-900 flex items-center gap-2">
              <TagIcon className="w-5 h-5" />
              Categorie Entrate
            </h3>
            <button
              onClick={() => setShowCategoryForm(true)}
              className="btn-primary px-3 py-1 text-sm rounded-lg flex items-center gap-1"
            >
              <PlusIcon className="w-4 h-4" />
              Nuova Categoria
            </button>
          </div>
        </div>
        <div className="p-6">
          {categories.length === 0 ? (
            <p className="text-adaptive-600 text-center py-4">
              Nessuna categoria per entrate. Creane una per iniziare!
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
              {categories.map((category) => (
                <div key={category.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div 
                      className="w-4 h-4 rounded-full border-2 border-gray-300"
                      style={{ backgroundColor: category.color || '#3B82F6' }}
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
      </div>

      {/* Sezione Filtri e Ricerca */}
      <div className="card-adaptive rounded-lg shadow-sm border-adaptive">
        <div className="p-6 border-b border-adaptive">
          <div className="flex justify-between items-center">
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
        </div>

        {showFilters && (
          <div className="p-6 bg-gray-50 border-b border-adaptive">
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">
                  <MagnifyingGlassIcon className="w-4 h-4 inline mr-1" />
                  Ricerca
                </label>
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Descrizione, categoria, conto..."
                  className="w-full border-adaptive rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">Categoria</label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full border-adaptive rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Tutte le categorie</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id.toString()}>
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
                  className="w-full border-adaptive rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Tutti i conti</option>
                  {accounts.map(account => (
                    <option key={account.id} value={account.id.toString()}>
                      {account.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">Data Da</label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full border-adaptive rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">Data A</label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full border-adaptive rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
            
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => {
                  setSearchTerm('')
                  setSelectedCategory('')
                  setSelectedAccount('')
                  setDateFrom('')
                  setDateTo('')
                }}
                className="btn-secondary px-4 py-2 rounded-lg text-sm"
              >
                Pulisci Filtri
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Lista Transazioni */}
      <div className="card-adaptive rounded-lg shadow-sm border-adaptive">
        <div className="p-6 border-b border-adaptive">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-adaptive-900 flex items-center gap-2">
              <CurrencyEuroIcon className="w-5 h-5" />
              Transazioni ({filteredTransactions.length})
            </h3>
            {selectedTransactions.length > 0 && (
              <button
                onClick={handleBulkDelete}
                className="bg-red-600 text-white px-3 py-1 rounded-lg text-sm hover:bg-red-700"
              >
                Cancella {selectedTransactions.length} selezionate
              </button>
            )}
          </div>
        </div>
        
        <div className="p-6">
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-adaptive-600">
                {filteredTransactions.length === 0 
                  ? 'Nessuna entrata trovata'
                  : 'Nessuna transazione in questa pagina'
                }
              </p>
            </div>
          ) : (
            <div className="space-y-4">
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
                        style={{ backgroundColor: transaction.category.color || '#3B82F6' }}
                        title={transaction.category.name}
                      />
                      <div>
                        <p className="font-medium text-adaptive-900">
                          {transaction.description || 'Entrata senza descrizione'}
                        </p>
                        <p className="text-sm text-adaptive-600">
                          {transaction.category.name} • {transaction.account.name} • {
                            new Date(transaction.date).toLocaleDateString('it-IT')
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="font-bold text-green-600">€ {transaction.amount.toFixed(2)}</p>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={() => handleEditTransaction(transaction)}
                        className="text-blue-600 hover:text-blue-800 p-1"
                        title="Modifica"
                      >
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteTransaction(transaction.id)}
                        className="text-red-600 hover:text-red-800 p-1"
                        title="Cancella"
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

      {/* 🔥 MODAL TRANSAZIONE - CON CLASSE .modal-content */}
      {showTransactionForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="modal-content rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editingTransaction ? 'Modifica Entrata' : 'Nuova Entrata'}
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
                  placeholder="Es: Stipendio Giugno"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">
                  Importo (€) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={transactionForm.amount}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, amount: e.target.value }))}
                  placeholder="0.00"
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
                      {account.name} {account.isDefault ? '⭐' : ''} (€ {account.balance.toFixed(2)})
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

      {/* 🔥 MODAL CATEGORIA - CON CLASSE .modal-content */}
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
                  placeholder="Es: Stipendio"
                  required
                />
              </div>

              {/* 🎨 Selettore Colori */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  🎨 Colore Categoria
                </label>
                <div className="grid grid-cols-6 gap-2">
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
  )
}