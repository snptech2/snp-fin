'use client'
import { formatCurrency } from '@/utils/formatters'
import { useState, useEffect, useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { 
  PlusIcon, PencilIcon, TrashIcon, TagIcon, CurrencyEuroIcon, 
  FunnelIcon, MagnifyingGlassIcon, ChevronLeftIcon, ChevronRightIcon,
  CalendarIcon, CheckIcon, ChevronDownIcon, DocumentArrowUpIcon
} from '@heroicons/react/24/outline'
import ProtectedRoute from '@/components/ProtectedRoute'
import { usePathname } from 'next/navigation'
import { 
  TransactionFormModal, 
  CategoryFormModal, 
  BulkDeleteModal, 
  CSVImportModal 
} from '@/components/transactions'

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
  
  // Stati per import CSV
  const [showImportModal, setShowImportModal] = useState(false)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvData, setCsvData] = useState<any[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [importResult, setImportResult] = useState<any>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [useDefaultAccount, setUseDefaultAccount] = useState(true)
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, currentBatch: 0, totalBatches: 0 })
  
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
  const [isFormTouched, setIsFormTouched] = useState(false)
  
  // Stati per gestione categorie
  const [showCategoryForm, setShowCategoryForm] = useState(false)
  const [editingCategory, setEditingCategory] = useState<Category | null>(null)
  const [categoryForm, setCategoryForm] = useState({ 
    name: '', 
    color: '#3B82F6'
  })
  
  // Colori disponibili per le categorie - PALETTE AMPLIATA
  const [availableColors] = useState([
    // Blu
    '#3B82F6', '#1D4ED8', '#1E40AF', '#2563EB', '#60A5FA',
    // Verde
    '#10B981', '#059669', '#047857', '#065F46', '#6EE7B7',
    // Giallo/Arancione
    '#F59E0B', '#D97706', '#F97316', '#EA580C', '#FB923C',
    // Rosso/Rosa
    '#EF4444', '#DC2626', '#B91C1C', '#EC4899', '#F43F5E',
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
  const [itemsPerPage, setItemsPerPage] = useState(10)
  const [showCategories, setShowCategories] = useState(false)
  
  // Stati per selezione multipla
  const [selectedTransactions, setSelectedTransactions] = useState<number[]>([])
  const [selectAll, setSelectAll] = useState(false)
  
  // Stati per cancellazione bulk con progress
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteProgress, setDeleteProgress] = useState({ current: 0, total: 0 })
  
  // Stati per gestione errori e caricamento
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Pathname per i grafici
  const pathname = usePathname()

  // === NUOVE FUNZIONI PER RIEPILOGHI === 
  // Calcola transazioni del mese corrente
  const getCurrentMonthTransactions = useMemo(() => {
    const now = new Date()
    const currentMonth = now.getMonth()
    const currentYear = now.getFullYear()
    
    return transactions.filter(transaction => {
      const transactionDate = new Date(transaction.date)
      return transactionDate.getMonth() === currentMonth && 
             transactionDate.getFullYear() === currentYear
    })
  }, [transactions])

  // Calcola dati per grafico mese corrente  
  const currentMonthChartData = useMemo(() => {
    const categoryTotals = getCurrentMonthTransactions.reduce((acc, transaction) => {
      const categoryName = transaction.category.name
      const categoryColor = transaction.category.color || '#3B82F6'
      
      if (!acc[categoryName]) {
        acc[categoryName] = { amount: 0, color: categoryColor }
      }
      acc[categoryName].amount += transaction.amount
      return acc
    }, {})

    return Object.entries(categoryTotals)
      .map(([name, data]) => ({
        name,
        value: data.amount,
        color: data.color
      }))
      .sort((a, b) => b.value - a.value)
  }, [getCurrentMonthTransactions])

  // Calcola dati per grafico totale
  const totalChartData = useMemo(() => {
    const categoryTotals = transactions.reduce((acc, transaction) => {
      const categoryName = transaction.category.name
      const categoryColor = transaction.category.color || '#3B82F6'
      
      if (!acc[categoryName]) {
        acc[categoryName] = { amount: 0, color: categoryColor }
      }
      acc[categoryName].amount += transaction.amount
      return acc
    }, {})

    return Object.entries(categoryTotals)
      .map(([name, data]) => ({
        name,
        value: data.amount,
        color: data.color
      }))
      .sort((a, b) => b.value - a.value)
  }, [transactions])

  // Calcola totali
  const currentMonthTotal = getCurrentMonthTransactions.reduce((sum, t) => sum + t.amount, 0)
  const grandTotal = transactions.reduce((sum, t) => sum + t.amount, 0)

  // Trova conto predefinito
  const getDefaultAccount = () => {
    return accounts.find(account => account.isDefault && account.type === 'bank') || 
           accounts.find(account => account.type === 'bank')
  }

  // Caricamento iniziale
  useEffect(() => {
    fetchData()
  }, [])

  // Imposta conto predefinito quando aprono i form
  useEffect(() => {
    if (showTransactionForm && !editingTransaction && accounts.length > 0 && !isFormTouched) {
      const defaultAccount = getDefaultAccount()
      if (defaultAccount) {
        setTransactionForm(prev => ({
          ...prev,
          accountId: defaultAccount.id.toString()
        }))
      }
    }
  }, [showTransactionForm, editingTransaction, accounts, isFormTouched])

  const fetchData = async () => {
    setLoading(true)
    try {
      const [accountsRes, categoriesRes, transactionsRes] = await Promise.all([
        fetch('/api/accounts'),
        fetch('/api/categories?type=income'),
        fetch('/api/transactions?type=income&all=true')
      ])

      if (accountsRes.ok) setAccounts(await accountsRes.json())
      if (categoriesRes.ok) setCategories(await categoriesRes.json())
      if (transactionsRes.ok) {
        const data = await transactionsRes.json()
        setTransactions(data.transactions || [])
      }
    } catch (error) {
      setError('Errore nel caricamento dei dati')
    } finally {
      setLoading(false)
    }
  }

  // === FUNZIONI IMPORT CSV ===
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setCsvFile(file)
    
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const lines = text.split('\n').filter(line => line.trim())
      
      if (lines.length < 2) {
        setError('Il file CSV deve contenere almeno una riga di header e una di dati')
        return
      }

      // Funzione per parsare CSV considerando le virgolette
      const parseCSVLine = (line: string) => {
        const result = []
        let current = ''
        let inQuotes = false
        
        for (let i = 0; i < line.length; i++) {
          const char = line[i]
          
          if (char === '"') {
            inQuotes = !inQuotes
          } else if (char === ',' && !inQuotes) {
            result.push(current.trim())
            current = ''
          } else {
            current += char
          }
        }
        result.push(current.trim())
        return result
      }

      // Parse headers
      const headers = parseCSVLine(lines[0]).map(h => h.trim().toLowerCase())
      const expectedHeaders = ['data', 'descrizione', 'importo', 'categoria', 'conto']
      
      // Verifica headers
      const isValidFormat = expectedHeaders.every(header => 
        headers.includes(header) || headers.includes(header.replace('à', 'a'))
      )
      
      if (!isValidFormat) {
        setError(`Formato CSV non valido. Headers richiesti: ${expectedHeaders.join(', ')}`)
        return
      }

      // Parse righe
      const rows = lines.slice(1).map(line => {
        const values = parseCSVLine(line)
        return {
          data: values[headers.indexOf('data')] || '',
          descrizione: values[headers.indexOf('descrizione')] || '',
          importo: values[headers.indexOf('importo')] || '',
          categoria: values[headers.indexOf('categoria')] || '',
          conto: values[headers.indexOf('conto')] || ''
        }
      }).filter(row => row.data && row.importo && row.categoria) // Filtra righe incomplete

      setCsvData(rows)
      setShowPreview(true)
      setError('')
    }
    reader.readAsText(file)
  }

  const handleImportCSV = async () => {
    if (csvData.length === 0) return

    console.log('🚀 Starting CSV import for income page, csvData length:', csvData.length)
    setIsImporting(true)
    setImportResult(null)
    setImportProgress({ current: 0, total: csvData.length, currentBatch: 0, totalBatches: 0 })
    console.log('📊 Initial progress state set:', { current: 0, total: csvData.length, currentBatch: 0, totalBatches: 0 })

    try {
      // Usa SSE per progress tracking in tempo reale
      const response = await fetch('/api/transactions/import-csv-income-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvData })
      })

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`)
      }

      const reader = response.body?.getReader()
      const decoder = new TextDecoder()

      if (!reader) {
        throw new Error('Response body reader not available')
      }

      let result = null

      while (true) {
        const { done, value } = await reader.read()
        
        if (done) break

        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              console.log('📊 SSE Data received:', data)
              
              if (data.type === 'progress') {
                console.log('📈 Updating progress:', {
                  current: data.current,
                  total: data.total,
                  currentBatch: data.currentBatch,
                  totalBatches: data.totalBatches
                })
                setImportProgress({
                  current: data.current,
                  total: data.total,
                  currentBatch: data.currentBatch,
                  totalBatches: data.totalBatches
                })
              } else if (data.type === 'complete') {
                console.log('✅ Import complete:', data.result)
                result = data.result
              } else if (data.type === 'error') {
                console.error('❌ Import error:', data.error)
                throw new Error(data.error)
              }
            } catch (parseError) {
              console.error('Errore parsing SSE data:', parseError)
            }
          }
        }
      }
      
      // Assicurati che il risultato abbia la struttura corretta
      const safeResult = {
        success: result?.success || false,
        imported: result?.imported || 0,
        errors: result?.errors || [],
        createdCategories: result?.createdCategories || []
      }
      
      setImportResult(safeResult)

      if (safeResult.success && safeResult.imported > 0) {
        fetchData() // Refresh data
        // Non resettare il modal immediatamente - lascia che l'utente veda i risultati
      }
    } catch (error) {
      console.error('Errore durante import CSV:', error)
      setImportResult({
        success: false,
        imported: 0,
        errors: [
          'Errore durante l\'import del CSV.',
          error instanceof Error ? error.message : 'Errore sconosciuto'
        ],
        createdCategories: []
      })
    } finally {
      setIsImporting(false)
    }
  }

  const resetImportModal = () => {
    setShowImportModal(false)
    setShowPreview(false)
    setCsvFile(null)
    setCsvData([])
    setImportResult(null)
    setIsImporting(false)
    setUseDefaultAccount(true)
    setImportProgress({ current: 0, total: 0, currentBatch: 0, totalBatches: 0 })
    setError('')
  }

  // === FUNZIONI BULK DELETE ===
  const handleBulkDelete = async () => {
    if (selectedTransactions.length === 0) return

    setIsDeleting(true)
    setDeleteProgress({ current: 0, total: selectedTransactions.length })

    try {
      // Elimina transazioni una per una con feedback
      for (let i = 0; i < selectedTransactions.length; i++) {
        const transactionId = selectedTransactions[i]
        
        await fetch(`/api/transactions/${transactionId}`, {
          method: 'DELETE'
        })
        
        setDeleteProgress({ current: i + 1, total: selectedTransactions.length })
        
        // Piccola pausa per mostrare il progresso
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      // Refresh data e reset selezione
      await fetchData()
      setSelectedTransactions([])
      setSelectAll(false)
    } catch (error) {
      console.error('Errore durante eliminazione bulk:', error)
      setError('Errore durante l\'eliminazione delle transazioni')
    } finally {
      setIsDeleting(false)
      setDeleteProgress({ current: 0, total: 0 })
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
    setIsFormTouched(false)
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


  // Calcoli per statistiche
  const totalIncome = transactions.reduce((sum, transaction) => sum + transaction.amount, 0)
  const currentMonthIncome = transactions
    .filter(t => new Date(t.date).getMonth() === new Date().getMonth())
    .reduce((sum, transaction) => sum + transaction.amount, 0)

  // Statistiche per categoria
  const categoryStats = useMemo(() => {
    const stats = categories.map(category => {
      const categoryTransactions = transactions.filter(t => t.category.id === category.id)
      const total = categoryTransactions.reduce((sum, t) => sum + t.amount, 0)
      const percentage = totalIncome > 0 ? (total / totalIncome) * 100 : 0
      
      return {
        id: category.id,
        name: category.name,
        color: category.color || '#3B82F6',
        total,
        percentage,
        count: categoryTransactions.length
      }
    }).filter(stat => stat.total > 0)
    
    return stats.sort((a, b) => b.total - a.total)
  }, [categories, transactions, totalIncome])

  // === COMPONENTE GRAFICO - Mobile Optimized ===
  const renderPieChart = (data, title, total) => (
    <div className="card-adaptive p-4 sm:p-6 rounded-lg shadow-sm border-adaptive">
      <h3 className="text-base sm:text-lg font-medium text-adaptive-900 mb-4 sm:mb-6 text-center lg:text-left">{title}</h3>
      
      {/* Desktop Layout */}
      <div className="hidden lg:flex items-start gap-6">
        {/* Pie Chart */}
        <div className="w-40 h-40">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={35}
                outerRadius={70}
                paddingAngle={2}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        {/* Legend */}
        <div className="flex-1 space-y-3">
          {data.map((item, index) => {
            const percentage = total > 0 ? (item.value / total) * 100 : 0
            return (
              <div key={index} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div 
                    className="w-3 h-3 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm text-adaptive-700">{item.name}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-adaptive-900">
                    {formatCurrency(item.value)}
                  </div>
                  <div className="text-xs text-adaptive-500">
                    {percentage.toFixed(1)}%
                  </div>
                </div>
              </div>
            )
          })}
          
          {/* Total */}
          <div className="pt-3 border-t border-adaptive">
            <div className="flex justify-between">
              <span className="text-sm font-medium text-adaptive-700">Totale:</span>
              <span className="text-sm font-semibold text-adaptive-900">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile/Tablet Layout */}
      <div className="lg:hidden">
        {/* Pie Chart - Larger on mobile */}
        <div className="w-48 h-48 sm:w-56 sm:h-56 mx-auto mb-6">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={45}
                outerRadius={85}
                paddingAngle={2}
                dataKey="value"
                startAngle={90}
                endAngle={-270}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        
        {/* Legend - Full width cards on mobile */}
        <div className="space-y-2">
          {data.map((item, index) => {
            const percentage = total > 0 ? (item.value / total) * 100 : 0
            return (
              <div key={index} className="bg-adaptive-50 rounded-lg p-3 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div 
                    className="w-4 h-4 rounded-full" 
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm font-medium text-adaptive-700">{item.name}</span>
                </div>
                <div className="text-right">
                  <div className="text-sm font-semibold text-adaptive-900">
                    {formatCurrency(item.value)}
                  </div>
                  <div className="text-xs text-adaptive-500">
                    {percentage.toFixed(1)}%
                  </div>
                </div>
              </div>
            )
          })}
          
          {/* Total */}
          <div className="bg-adaptive-100 rounded-lg p-3 border-t border-adaptive">
            <div className="flex justify-between">
              <span className="text-sm font-semibold text-adaptive-700">Totale:</span>
              <span className="text-base font-bold text-adaptive-900">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="space-y-6">
          
          <div>
            <h1 className="text-3xl font-bold text-adaptive-900">Entrate</h1>
            <p className="text-adaptive-600">Gestisci le tue entrate e categorie</p>
            
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
        {/* Header - Mobile Optimized */}
        <div className="mb-6 sm:mb-8">
          <div className="mb-4">
            <h1 className="text-2xl sm:text-3xl font-bold text-adaptive-900">Entrate</h1>
            <p className="text-adaptive-600 text-sm sm:text-base">Gestisci le tue entrate e categorie</p>
          </div>
          {/* Desktop: Side by side */}
          <div className="hidden sm:flex justify-end gap-3">
            <button
              onClick={() => setShowImportModal(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 transition-colors text-sm"
            >
              <DocumentArrowUpIcon className="w-5 h-5" />
              Import CSV
            </button>
            <button
              onClick={() => setShowTransactionForm(true)}
              className="btn-primary px-4 py-2 rounded-lg flex items-center gap-2 text-sm"
            >
              <PlusIcon className="w-5 h-5" />
              Nuova Entrata
            </button>
          </div>
          {/* Mobile: Stacked */}
          <div className="sm:hidden space-y-3">
            <button
              onClick={() => setShowTransactionForm(true)}
              className="w-full btn-primary px-4 py-3 rounded-lg flex items-center justify-center gap-2 text-sm font-medium"
            >
              <PlusIcon className="w-5 h-5" />
              Nuova Entrata
            </button>
            <button
              onClick={() => setShowImportModal(true)}
              className="w-full bg-green-600 text-white px-4 py-3 rounded-lg flex items-center justify-center gap-2 hover:bg-green-700 transition-colors text-sm font-medium"
            >
              <DocumentArrowUpIcon className="w-5 h-5" />
              Import CSV
            </button>
          </div>
        </div>

        {/* Statistiche - Mobile Optimized */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          <div className="card-adaptive rounded-lg p-4 sm:p-6 text-center sm:text-left">
            <h3 className="text-base sm:text-lg font-semibold text-adaptive-900 mb-2">💰 Totale Entrate</h3>
            <p className="text-2xl sm:text-3xl font-bold text-green-600">{formatCurrency(totalIncome)}</p>
            <p className="text-sm text-adaptive-600">{transactions.length} transazioni</p>
          </div>
          
          <div className="card-adaptive rounded-lg p-4 sm:p-6 text-center sm:text-left">
            <h3 className="text-base sm:text-lg font-semibold text-adaptive-900 mb-2">📅 Questo Mese</h3>
            <p className="text-2xl sm:text-3xl font-bold text-blue-600">{formatCurrency(currentMonthIncome)}</p>
            <p className="text-sm text-adaptive-600">
              {totalIncome > 0 ? `${((currentMonthIncome / totalIncome) * 100).toFixed(1)}% del totale` : '0% del totale'}
            </p>
          </div>
          
          <div className="card-adaptive rounded-lg p-4 sm:p-6 text-center sm:text-left sm:col-span-2 lg:col-span-1">
            <h3 className="text-base sm:text-lg font-semibold text-adaptive-900 mb-2">🏷️ Categorie</h3>
            <p className="text-2xl sm:text-3xl font-bold text-purple-600">{categories.length}</p>
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
              Categorie Entrate ({categories.length})
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

        {/* === RIEPILOGHI CON GRAFICI === */}
        {!loading && transactions.length > 0 && (
          <div className="mb-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Riepilogo Mese Corrente */}
              {renderPieChart(
                currentMonthChartData, 
                `📊 ${pathname === '/income' ? 'Entrate' : 'Uscite'} - ${new Date().toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}`,
                currentMonthTotal
              )}
              
              {/* Riepilogo Totale */}
              {renderPieChart(
                totalChartData, 
                `📈 Totale ${pathname === '/income' ? 'Entrate' : 'Uscite'}`,
                grandTotal
              )}
            </div>
          </div>
        )}


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
                      {accounts.filter(account => account.type === 'bank').map(account => (
                        <option key={account.id} value={account.id.toString()}>
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
                <h3 className="text-lg font-medium text-adaptive-900 mb-2">Nessuna Entrata</h3>
                <p className="text-adaptive-600 mb-4">
                  {transactions.length === 0 
                    ? "Non hai ancora registrato entrate. Inizia aggiungendo la tua prima entrata!"
                    : "Nessuna entrata corrisponde ai filtri selezionati."
                  }
                </p>
                {transactions.length === 0 && (
                  <button
                    onClick={() => setShowTransactionForm(true)}
                    className="btn-primary px-4 py-2 rounded-lg"
                  >
                    Aggiungi Prima Entrata
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
                      <option value={100}>100</option>
                      <option value={filteredTransactions.length}>Tutte ({filteredTransactions.length})</option>
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

                {/* Desktop Table View */}
                <div className="hidden lg:block">
                  <div className="space-y-2">
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
                            />
                            <div>
                              <p className="font-medium text-adaptive-900">
                                {transaction.description || 'Entrata'}
                              </p>
                              <p className="text-sm text-adaptive-600">
                                {transaction.category.name} • {transaction.account.name} • {new Date(transaction.date).toLocaleDateString('it-IT')}
                              </p>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="text-lg font-semibold text-green-600">
                            +{formatCurrency(transaction.amount)}
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
                  </div>
                </div>

                {/* Mobile Card View */}
                <div className="lg:hidden space-y-4">
                  {paginatedTransactions.map((transaction) => (
                    <div key={transaction.id} className="card-adaptive rounded-lg p-4 border border-adaptive">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3 flex-1">
                          <input
                            type="checkbox"
                            checked={selectedTransactions.includes(transaction.id)}
                            onChange={() => handleTransactionSelect(transaction.id)}
                            className="rounded mt-1"
                          />
                          <div className="flex items-center gap-2 flex-1">
                            <div 
                              className="w-5 h-5 rounded-full border-2 border-white shadow-sm"
                              style={{ backgroundColor: transaction.category.color || '#3B82F6' }}
                            />
                            <div className="flex-1">
                              <p className="font-semibold text-adaptive-900 text-base mb-1">
                                {transaction.description || 'Entrata'}
                              </p>
                              <p className="text-xl font-bold text-green-600">
                                +{formatCurrency(transaction.amount)}
                              </p>
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 gap-2 mb-4">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 text-sm">📂</span>
                          <span className="text-sm text-adaptive-700 font-medium">{transaction.category.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 text-sm">🏦</span>
                          <span className="text-sm text-adaptive-700">{transaction.account.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-gray-500 text-sm">📅</span>
                          <span className="text-sm text-adaptive-700">{new Date(transaction.date).toLocaleDateString('it-IT')}</span>
                        </div>
                      </div>

                      <div className="flex justify-end gap-2 pt-2 border-t border-adaptive">
                        <button
                          onClick={() => handleEditTransaction(transaction)}
                          className="flex items-center gap-2 px-3 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors text-sm"
                        >
                          <PencilIcon className="w-4 h-4" />
                          Modifica
                        </button>
                        <button
                          onClick={() => handleDeleteTransaction(transaction.id)}
                          className="flex items-center gap-2 px-3 py-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors text-sm"
                        >
                          <TrashIcon className="w-4 h-4" />
                          Elimina
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

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

        {/* Transaction Form Modal */}
        <TransactionFormModal
          isOpen={showTransactionForm}
          onClose={resetTransactionForm}
          transactionType="income"
          editingTransaction={editingTransaction}
          transactionForm={transactionForm}
          onFormChange={(updatedForm) => {
            setIsFormTouched(true)
            setTransactionForm(prev => ({ ...prev, ...updatedForm }))
          }}
          onSubmit={handleTransactionSubmit}
          accounts={accounts}
          categories={categories}
          onNewCategory={() => {
            resetCategoryForm()
            setShowCategoryForm(true)
          }}
          error={error}
          isSubmitting={isSubmitting}
        />
        
        {/* TODO: Remove after testing */}
        {false && showTransactionForm && (
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
                    placeholder="Es: Stipendio Gennaio"
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
                    {accounts.filter(account => account.type === 'bank').map(account => (
                      <option key={account.id} value={account.id.toString()}>
                        {account.name}{account.isDefault ? '  (Predefinito)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
  <label className="block text-sm font-medium mb-1">
    Categoria *
  </label>
  <div className="flex gap-2">
    <select
      value={transactionForm.categoryId}
      onChange={(e) => setTransactionForm(prev => ({ ...prev, categoryId: e.target.value }))}
      required
      className="flex-1"
    >
      <option value="">Seleziona categoria</option>
      {categories.map(category => (
        <option key={category.id} value={category.id.toString()}>
          {category.name}
        </option>
      ))}
    </select>
    <button
      type="button"
      onClick={() => {
        resetCategoryForm()
        setShowCategoryForm(true)
      }}
      className="px-3 py-2 text-sm bg-adaptive-100 hover:bg-adaptive-200 border border-adaptive rounded-md transition-colors"
      title="Aggiungi nuova categoria"
    >
      +
    </button>
  </div>
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

        {/* Category Form Modal */}
        <CategoryFormModal
          isOpen={showCategoryForm}
          onClose={resetCategoryForm}
          transactionType="income"
          editingCategory={editingCategory}
          categoryForm={categoryForm}
          onFormChange={setCategoryForm}
          onSubmit={handleCategorySubmit}
          availableColors={availableColors}
          error={error}
          isSubmitting={isSubmitting}
        />
        
        {/* TODO: Remove after testing */}
        {false && showCategoryForm && (
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

        {/* Bulk Delete Progress Modal */}
        <BulkDeleteModal
          isOpen={isDeleting}
          progress={deleteProgress}
        />
        
        {/* TODO: Remove after testing */}
        {false && isDeleting && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-adaptive rounded-lg p-6 w-full max-w-md border border-adaptive">
              <h3 className="text-lg font-bold text-adaptive-900 mb-4">Cancellazione in corso...</h3>
              
              <div className="space-y-3">
                {/* Progress bar */}
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-red-600 h-3 rounded-full transition-all duration-300 ease-out"
                    style={{ 
                      width: `${deleteProgress.total > 0 ? (deleteProgress.current / deleteProgress.total) * 100 : 0}%` 
                    }}
                  ></div>
                </div>
                
                {/* Stats */}
                <div className="flex justify-between text-sm text-adaptive-900 font-medium">
                  <span>Cancellate: {deleteProgress.current} / {deleteProgress.total}</span>
                  <span className="font-medium">
                    {deleteProgress.total > 0 ? Math.round((deleteProgress.current / deleteProgress.total) * 100) : 0}%
                  </span>
                </div>
                
                {/* Loading indicator */}
                <div className="flex items-center justify-center space-x-2 pt-2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-red-600"></div>
                  <span className="text-sm text-adaptive-900 font-medium">Eliminazione transazioni...</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* CSV Import Modal */}
        <CSVImportModal
          isOpen={showImportModal}
          onClose={resetImportModal}
          transactionType="income"
          csvFile={csvFile}
          onFileSelect={(file) => {
            setCsvFile(file)
            parseCSV(file)
          }}
          useDefaultAccount={useDefaultAccount}
          onUseDefaultAccountChange={setUseDefaultAccount}
          accounts={accounts}
          showPreview={showPreview}
          csvData={csvData}
          onBackToFileSelect={() => setShowPreview(false)}
          isImporting={isImporting}
          onStartImport={handleImportCSV}
          importProgress={importProgress}
          importResult={importResult}
          onReset={resetImportModal}
        />
        
        {/* TODO: Remove after testing */}
        {false && showImportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-adaptive rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-adaptive">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-adaptive-900">Import CSV Entrate</h2>
                <button
                  onClick={resetImportModal}
                  disabled={isImporting}
                  className={`${isImporting ? 'text-adaptive-300 cursor-not-allowed' : 'text-adaptive-500 hover:text-adaptive-700'}`}
                >
                  ✕
                </button>
              </div>

              {!showPreview && !importResult && (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-medium text-blue-900 mb-2">📋 Formato CSV Richiesto</h3>
                    <p className="text-sm text-blue-800 mb-2">Il file CSV deve contenere le seguenti colonne nell'ordine esatto:</p>
                    <div className="bg-gray-100 rounded border p-2 font-mono text-sm text-gray-900 font-semibold">
                      data,descrizione,importo,categoria,conto
                    </div>
                    <ul className="text-sm text-blue-800 mt-2 space-y-1">
                      <li>• <strong>data:</strong> formato DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD o DD MMM YYYY</li>
                      <li>• <strong>descrizione:</strong> descrizione della transazione (opzionale)</li>
                      <li>• <strong>importo:</strong> importo positivo. Se contiene virgole, racchiudere tra virgolette: "€18,000.00", "1.234,56"</li>
                      <li>• <strong>categoria:</strong> nome categoria (verrà creata automaticamente se non esiste)</li>
                      <li>• <strong>conto:</strong> nome del conto bancario esistente (opzionale se fallback abilitato)</li>
                    </ul>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={useDefaultAccount}
                          onChange={(e) => setUseDefaultAccount(e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <span className="text-sm text-gray-700">
                          Usa conto predefinito per righe senza conto specificato
                        </span>
                      </label>
                      {useDefaultAccount && (
                        <p className="text-xs text-gray-500 mt-1 ml-7">
                          Verrà usato: {accounts.find(acc => acc.isDefault && acc.type === 'bank')?.name || 
                                       accounts.find(acc => acc.type === 'bank')?.name || 'Nessun conto disponibile'}
                        </p>
                      )}
                    </div>

                    <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                      <DocumentArrowUpIcon className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <p className="text-gray-600 mb-4">Seleziona il file CSV da importare</p>
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        className="hidden"
                        id="csv-upload"
                      />
                      <label 
                        htmlFor="csv-upload"
                        className="bg-blue-600 text-white px-4 py-2 rounded-lg cursor-pointer hover:bg-blue-700 transition-colors"
                      >
                        Scegli File CSV
                      </label>
                      {csvFile && (
                        <p className="text-sm text-gray-600 mt-2">
                          File selezionato: {csvFile.name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Progress Bar durante l'import */}
              {isImporting && (
                <div className="space-y-4">
                  <h3 className="text-lg font-bold text-adaptive-900">Import in corso...</h3>
                  
                  <div className="space-y-3">
                    {/* Progress bar principale */}
                    <div className="w-full bg-gray-200 rounded-full h-4">
                      <div 
                        className="bg-blue-600 h-4 rounded-full transition-all duration-300 ease-out"
                        style={{ 
                          width: `${importProgress.total > 0 ? (importProgress.current / importProgress.total) * 100 : 0}%` 
                        }}
                      ></div>
                    </div>
                    
                    {/* Statistiche progresso */}
                    <div className="flex justify-between text-sm text-adaptive-900 font-medium">
                      <span>{importProgress.current} / {importProgress.total} righe processate</span>
                      <span className="font-medium">{importProgress.total > 0 ? Math.round((importProgress.current / importProgress.total) * 100) : 0}%</span>
                    </div>
                    
                    {/* Batch info */}
                    {importProgress.totalBatches > 1 && (
                      <div className="text-sm text-adaptive-900 text-center font-semibold">
                        Batch {importProgress.currentBatch} / {importProgress.totalBatches}
                      </div>
                    )}
                    
                    {/* Loading spinner */}
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                      <span className="text-sm text-adaptive-900 font-semibold">Importazione in corso...</span>
                    </div>
                  </div>
                </div>
              )}

              {showPreview && csvData.length > 0 && !importResult && !isImporting && (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <h3 className="text-lg font-medium">Anteprima Dati ({csvData.length} righe)</h3>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowPreview(false)}
                        className="px-4 py-2 text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50"
                      >
                        Indietro
                      </button>
                      <button
                        onClick={handleImportCSV}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                      >
                        Conferma Import
                      </button>
                    </div>
                  </div>
                  
                  <div className="max-h-96 overflow-auto border rounded-lg">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0">
                        <tr>
                          <th className="px-4 py-2 text-left">Data</th>
                          <th className="px-4 py-2 text-left">Descrizione</th>
                          <th className="px-4 py-2 text-left">Importo</th>
                          <th className="px-4 py-2 text-left">Categoria</th>
                          <th className="px-4 py-2 text-left">Conto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {csvData.slice(0, 50).map((row, index) => (
                          <tr key={index} className="border-t">
                            <td className="px-4 py-2">{row.data}</td>
                            <td className="px-4 py-2">{row.descrizione || '-'}</td>
                            <td className="px-4 py-2">€{row.importo}</td>
                            <td className="px-4 py-2">{row.categoria}</td>
                            <td className="px-4 py-2">{row.conto || 'Default'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {csvData.length > 50 && (
                      <div className="p-4 text-center text-gray-500 bg-gray-50">
                        ... e altre {csvData.length - 50} righe
                      </div>
                    )}
                  </div>
                </div>
              )}

              {importResult && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Risultato Import</h3>
                  
                  <div className={`p-4 rounded-lg ${importResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'}`}>
                    <div className="flex items-center gap-2 mb-2">
                      {importResult.success ? (
                        <CheckIcon className="w-5 h-5 text-green-600" />
                      ) : (
                        <span className="text-red-600">❌</span>
                      )}
                      <span className={`font-medium ${importResult.success ? 'text-green-800' : 'text-red-800'}`}>
                        {importResult.success ? 'Import completato!' : 'Import fallito'}
                      </span>
                    </div>
                    
                    <div className="space-y-1 text-sm">
                      <p className={`${importResult.success ? 'text-green-800' : 'text-red-800'}`}>• <strong>Transazioni importate:</strong> {importResult.imported}</p>
                      {importResult.createdCategories?.length > 0 && (
                        <p className={`${importResult.success ? 'text-green-800' : 'text-red-800'}`}>• <strong>Nuove categorie create:</strong> {importResult.createdCategories.join(', ')}</p>
                      )}
                      {importResult.errors?.length > 0 && (
                        <p className={`${importResult.success ? 'text-green-800' : 'text-red-800'}`}>• <strong>Errori:</strong> {importResult.errors.length}</p>
                      )}
                    </div>
                  </div>

                  {importResult.errors?.length > 0 && (
                    <div className="max-h-48 overflow-auto bg-red-50 border border-red-200 rounded-lg p-4">
                      <h4 className="font-medium text-red-800 mb-2">Errori dettagliati:</h4>
                      <ul className="text-sm text-red-700 space-y-1">
                        {importResult.errors.map((error, index) => (
                          <li key={index}>• {error}</li>
                        ))}
                      </ul>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      onClick={resetImportModal}
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                    >
                      Chiudi
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
        {/* End TODO blocks */}
      </div>
    </ProtectedRoute>
  )
}