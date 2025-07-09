'use client'
import { 
  formatCurrency, 
  filterOutFiscalTransactions, 
  filterFiscalTransactions 
} from '@/utils/formatters'
import { useState, useEffect, useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { 
  PlusIcon, PencilIcon, TrashIcon, TagIcon, CurrencyEuroIcon, 
  FunnelIcon, MagnifyingGlassIcon, ChevronLeftIcon, ChevronRightIcon,
  CalendarIcon, CheckIcon, ChevronDownIcon, DocumentArrowUpIcon
} from '@heroicons/react/24/outline'
import ProtectedRoute from '@/components/ProtectedRoute'
import { usePathname } from 'next/navigation'

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
        fetch('/api/transactions?type=expense&all=true')
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

  // CSV Import Functions
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === 'text/csv') {
      setCsvFile(file)
      parseCSV(file)
    } else {
      alert('Please select a valid CSV file')
    }
  }

  // Parser CSV robusto che gestisce virgole quotate e caratteri speciali
  const parseCSVLine = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false
    let i = 0
    
    while (i < line.length) {
      const char = line[i]
      
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          // Doppio quote = quote escaped
          current += '"'
          i += 2
        } else {
          // Toggle quote mode
          inQuotes = !inQuotes
          i++
        }
      } else if (char === ',' && !inQuotes) {
        // Virgola non quotata = separatore
        result.push(current.trim())
        current = ''
        i++
      } else {
        current += char
        i++
      }
    }
    
    // Aggiungi ultimo campo
    result.push(current.trim())
    
    return result
  }

  const parseCSV = (file: File) => {
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      console.log('📄 CSV raw text (primi 500 caratteri):', text.substring(0, 500))
      
      const lines = text.split('\n').filter(line => line.trim())
      console.log('📊 Righe totali nel CSV:', lines.length)
      
      if (lines.length < 2) {
        alert('Il file CSV deve contenere almeno una riga di intestazione e una di dati')
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

      // Skip header row and parse data
      const headers = parseCSVLine(lines[0]).map(h => h.trim())
      console.log('📋 Headers trovati:', headers)
      
      const defaultAccount = accounts.find(acc => acc.isDefault && acc.type === 'bank') || 
                           accounts.find(acc => acc.type === 'bank')

      const allParsedRows = lines.slice(1).map((line, index) => {
        const values = parseCSVLine(line)
        const row = {
          originalLine: line,
          lineNumber: index + 2, // +2 perché iniziamo da 1 e saltiamo header
          data: values[0] || '',
          descrizione: values[1] || '',
          importo: values[2] || '',
          categoria: values[3] || '',
          conto: values[4] || '',
          contoEffettivo: values[4] || (useDefaultAccount && defaultAccount ? defaultAccount.name : ''),
          usaFallback: !values[4] && useDefaultAccount && defaultAccount,
          valuesCount: values.length
        }
        
        // Log delle prime 10 righe per debug
        if (index < 10) {
          console.log(`Riga ${row.lineNumber}:`, {
            original: line,
            parsed: row,
            values: values
          })
        }
        
        return row
      })
      
      console.log('📊 Righe parsate totali:', allParsedRows.length)
      
      // DETAILED DEBUG: Analizza ogni riga per capire perdite
      let validCount = 0
      let invalidCount = 0
      const problemRows = []
      
      allParsedRows.forEach((row, index) => {
        const hasData = row.data && row.data.length > 0
        const hasDescrizione = row.descrizione !== undefined // Può essere vuota
        const hasImporto = row.importo && row.importo.length > 0
        
        if (hasData && hasImporto) { // Descrizione può essere vuota
          validCount++
        } else {
          invalidCount++
          problemRows.push({
            lineNumber: row.lineNumber,
            missing: [
              !hasData ? 'data' : null,
              !hasDescrizione ? 'descrizione' : null,
              !hasImporto ? 'importo' : null
            ].filter(Boolean),
            original: row.originalLine,
            parsed: { data: row.data, descrizione: row.descrizione, importo: row.importo }
          })
        }
        
        // Log delle prime 10 e ultime 10 righe per debug
        if (index < 10 || index >= allParsedRows.length - 10) {
          console.log(`DEBUG Riga ${row.lineNumber}:`, {
            original: row.originalLine,
            parsed: { data: row.data, descrizione: row.descrizione, importo: row.importo },
            valuesCount: row.valuesCount,
            valid: hasData && hasImporto
          })
        }
      })
      
      console.log(`🔍 ANALISI DETTAGLIATA:`)
      console.log(`   - Righe valide: ${validCount}`)
      console.log(`   - Righe problematiche: ${invalidCount}`)
      console.log(`   - Tasso successo: ${((validCount / allParsedRows.length) * 100).toFixed(1)}%`)
      
      if (problemRows.length > 0) {
        console.log('❌ Prime 10 righe problematiche:')
        problemRows.slice(0, 10).forEach(row => {
          console.log(`   Riga ${row.lineNumber}: Mancanti [${row.missing.join(', ')}]`)
          console.log(`      Original: ${row.original}`)
          console.log(`      Parsed: data="${row.parsed.data}" desc="${row.parsed.descrizione}" importo="${row.parsed.importo}"`)
        })
      }
      
      const filteredRows = allParsedRows.filter(row => row.data && row.importo) // Descrizione può essere vuota
      console.log('📊 Righe dopo filtering:', filteredRows.length)
      
      // Calcola totale per verifica
      let totalParsed = 0
      let validAmounts = 0
      filteredRows.forEach(row => {
        const cleanAmount = row.importo
          .replace(/[€$£¥]/g, '')
          .replace(',', '.')
          .trim()
        const amount = parseFloat(cleanAmount)
        if (!isNaN(amount) && amount > 0) {
          totalParsed += amount
          validAmounts++
        }
      })
      
      console.log(`💰 TOTALI CALCOLATI:`)
      console.log(`   - Righe con importi validi: ${validAmounts}`)
      console.log(`   - Totale calcolato: €${totalParsed.toFixed(2)}`)
      console.log(`   - Atteso: €27,036.77`)
      console.log(`   - Differenza: €${(27036.77 - totalParsed).toFixed(2)}`)

      setCsvData(filteredRows)
      setShowPreview(true)
    }
    reader.readAsText(file)
  }

  const handleImportCSV = async () => {
    if (csvData.length === 0) return

    setIsImporting(true)
    setImportResult(null)
    setImportProgress({ current: 0, total: csvData.length, currentBatch: 0, totalBatches: 0 })

    try {
      // Usa SSE per progress tracking in tempo reale
      const response = await fetch('/api/transactions/import-csv-stream', {
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
              
              if (data.type === 'progress') {
                setImportProgress({
                  current: data.current,
                  total: data.total,
                  currentBatch: data.currentBatch,
                  totalBatches: data.totalBatches
                })
              } else if (data.type === 'complete') {
                result = data.result
              } else if (data.type === 'error') {
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

    setIsDeleting(true)
    setDeleteProgress({ current: 0, total: selectedTransactions.length })

    try {
      // Cancella una per volta per mostrare progresso
      for (let i = 0; i < selectedTransactions.length; i++) {
        const id = selectedTransactions[i]
        await fetch(`/api/transactions/${id}`, { method: 'DELETE' })
        setDeleteProgress({ current: i + 1, total: selectedTransactions.length })
      }
      
      setSelectedTransactions([])
      setSelectAll(false)
      fetchData()
    } catch (error) {
      setError('Errore durante la cancellazione multipla')
    } finally {
      setIsDeleting(false)
      setDeleteProgress({ current: 0, total: 0 })
    }
  }

  // Calcoli per statistiche - ESCLUSE TASSE FISCALI
  const operationalTransactions = filterOutFiscalTransactions(transactions)
  const fiscalTransactions = filterFiscalTransactions(transactions)
  
  const totalExpenses = operationalTransactions.reduce((sum, transaction) => sum + transaction.amount, 0)
  const currentMonthExpenses = operationalTransactions
    .filter(t => new Date(t.date).getMonth() === new Date().getMonth())
    .reduce((sum, transaction) => sum + transaction.amount, 0)
  
  // Calcoli separati per tasse fiscali
  const totalFiscalExpenses = fiscalTransactions.reduce((sum, transaction) => sum + transaction.amount, 0)
  const currentMonthFiscalExpenses = fiscalTransactions
    .filter(t => new Date(t.date).getMonth() === new Date().getMonth())
    .reduce((sum, transaction) => sum + transaction.amount, 0)

  // Statistiche per categoria - SOLO OPERATIVE (senza tasse fiscali)
  const categoryStats = useMemo(() => {
    const stats = categories.map(category => {
      const categoryTransactions = operationalTransactions.filter(t => t.category.id === category.id)
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
  }, [categories, operationalTransactions, totalExpenses])

  // Dati per grafici - SOLO SPESE OPERATIVE (senza tasse fiscali)
  const currentMonthChartData = categoryStats
    .filter(stat => {
      const categoryTransactions = operationalTransactions.filter(t => 
        t.category.id === stat.id && new Date(t.date).getMonth() === new Date().getMonth()
      )
      return categoryTransactions.reduce((sum, t) => sum + t.amount, 0) > 0
    })
    .map(stat => ({
      name: stat.name,
      value: operationalTransactions
        .filter(t => t.category.id === stat.id && new Date(t.date).getMonth() === new Date().getMonth())
        .reduce((sum, t) => sum + t.amount, 0),
      color: stat.color
    }))

  const totalChartData = categoryStats.map(stat => ({
    name: stat.name,
    value: stat.total,
    color: stat.color
  }))

  const currentMonthTotal = currentMonthExpenses
  const grandTotal = totalExpenses

  // === COMPONENTE GRAFICO ===
  const renderPieChart = (data, title, total) => (
    <div className="card-adaptive p-6 rounded-lg shadow-sm border-adaptive">
      <h3 className="text-lg font-medium text-adaptive-900 mb-6">{title}</h3>
      
      <div className="flex items-start gap-6">
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
    </div>
  )

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
          <div className="flex gap-3">
            <button
              onClick={() => setShowImportModal(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-green-700 transition-colors"
            >
              <DocumentArrowUpIcon className="w-5 h-5" />
              Import CSV
            </button>
            <button
              onClick={() => setShowTransactionForm(true)}
              className="btn-primary px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <PlusIcon className="w-5 h-5" />
              Nuova Uscita
            </button>
          </div>
        </div>

        {/* Statistiche */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <div className="card-adaptive rounded-lg p-6">
            <h3 className="text-lg font-semibold text-adaptive-900 mb-2">💸 Spese Operative</h3>
            <p className="text-3xl font-bold text-red-600">{formatCurrency(totalExpenses)}</p>
            <p className="text-sm text-adaptive-600">{operationalTransactions.length} transazioni</p>
          </div>
          
          <div className="card-adaptive rounded-lg p-6">
            <h3 className="text-lg font-semibold text-adaptive-900 mb-2">📅 Questo Mese</h3>
            <p className="text-3xl font-bold text-orange-600">{formatCurrency(currentMonthExpenses)}</p>
            <p className="text-sm text-adaptive-600">
              {totalExpenses > 0 ? `${((currentMonthExpenses / totalExpenses) * 100).toFixed(1)}% del totale` : '0% del totale'}
            </p>
          </div>
          
          <div className="card-adaptive rounded-lg p-6">
            <h3 className="text-lg font-semibold text-adaptive-900 mb-2">💰 Tasse Pagate</h3>
            <p className="text-3xl font-bold text-purple-600">{formatCurrency(totalFiscalExpenses)}</p>
            <p className="text-sm text-adaptive-600">
              {fiscalTransactions.length} pagamenti fiscali
            </p>
          </div>
          
          <div className="card-adaptive rounded-lg p-6">
            <h3 className="text-lg font-semibold text-adaptive-900 mb-2">🏷️ Categorie</h3>
            <p className="text-3xl font-bold text-blue-600">{categories.length}</p>
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

        {/* === RIEPILOGHI CON GRAFICI === */}
        {!loading && transactions.length > 0 && (
          <div className="mb-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
              {/* Riepilogo Mese Corrente */}
              {renderPieChart(
                currentMonthChartData, 
                `📊 Spese Operative - ${new Date().toLocaleDateString('it-IT', { month: 'long', year: 'numeric' })}`,
                currentMonthTotal
              )}
              
              {/* Riepilogo Totale */}
              {renderPieChart(
                totalChartData, 
                `📈 Totale Spese Operative`,
                grandTotal
              )}
            </div>
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <p className="text-sm text-blue-800">
                ℹ️ I grafici mostrano solo <strong>spese operative</strong>. 
                Le tasse P.IVA e pagamenti fiscali ({formatCurrency(totalFiscalExpenses)}) sono esclusi per una migliore analisi dei pattern di spesa.
              </p>
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

        {/* Bulk Delete Progress Modal */}
        {isDeleting && (
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
        {showImportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-adaptive rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-adaptive">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-adaptive-900">Import CSV Uscite</h2>
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
                      <li>• <strong>descrizione:</strong> descrizione della transazione</li>
                      <li>• <strong>importo:</strong> importo positivo (es: 25.50, €25.50, $25.50)</li>
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
                        disabled={isImporting}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                      >
                        {isImporting ? 'Importando...' : 'Conferma Import'}
                      </button>
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4 max-h-96 overflow-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-gray-300">
                          <th className="text-left p-2">Data</th>
                          <th className="text-left p-2">Descrizione</th>
                          <th className="text-left p-2">Importo</th>
                          <th className="text-left p-2">Categoria</th>
                          <th className="text-left p-2">Conto</th>
                        </tr>
                      </thead>
                      <tbody>
                        {csvData.slice(0, 10).map((row, index) => (
                          <tr key={index} className={`border-b border-gray-200 ${row.usaFallback ? 'bg-blue-50' : ''}`}>
                            <td className="p-2">{row.data}</td>
                            <td className="p-2">{row.descrizione}</td>
                            <td className="p-2">€{row.importo}</td>
                            <td className="p-2">{row.categoria}</td>
                            <td className="p-2">
                              {row.usaFallback ? (
                                <div className="flex items-center gap-1">
                                  <span className="text-blue-600 font-medium">{row.contoEffettivo}</span>
                                  <span className="text-xs text-blue-500">(predefinito)</span>
                                </div>
                              ) : (
                                row.conto || <span className="text-red-500 text-xs">Mancante</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {csvData.length > 10 && (
                      <p className="text-center text-gray-500 mt-2">
                        ... e altre {csvData.length - 10} righe
                      </p>
                    )}
                    
                    {/* Legenda */}
                    <div className="flex items-center gap-4 mt-3 text-xs">
                      <div className="flex items-center gap-1">
                        <div className="w-3 h-3 bg-blue-50 border border-blue-200 rounded"></div>
                        <span className="text-gray-600">Righe che useranno il conto predefinito</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <span className="text-red-500">Mancante</span>
                        <span className="text-gray-600">= Conto non specificato e fallback disabilitato</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {importResult && (
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Risultato Import</h3>
                  
                  <div className={`p-4 rounded-lg ${
                    importResult.success ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                  }`}>
                    <div className="flex items-center gap-2 mb-2">
                      <span className={`text-lg ${importResult.success ? 'text-green-600' : 'text-red-600'}`}>
                        {importResult.success ? '✅' : '❌'}
                      </span>
                      <span className={`font-medium ${importResult.success ? 'text-green-900' : 'text-red-900'}`}>
                        {importResult.success ? 'Import completato' : 'Import fallito'}
                      </span>
                    </div>
                    
                    {importResult?.imported > 0 && (
                      <p className="text-green-800 text-sm">
                        ✅ {importResult.imported} transazioni importate con successo
                      </p>
                    )}
                    
                    {importResult?.createdCategories?.length > 0 && (
                      <p className="text-blue-800 text-sm">
                        🏷️ Categorie create: {importResult.createdCategories.join(', ')}
                      </p>
                    )}
                    
                    {importResult?.errors?.length > 0 && (
                      <div className="mt-2">
                        <p className="text-red-800 text-sm font-medium">Errori:</p>
                        <ul className="text-red-700 text-sm mt-1 space-y-1">
                          {importResult.errors.map((error, index) => (
                            <li key={index}>• {error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>

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
      </div>
    </ProtectedRoute>
  )
}