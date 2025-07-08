'use client'

import { useParams, useRouter } from 'next/navigation'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { 
  PlusIcon, 
  ArrowPathIcon,
  PencilIcon,
  TrashIcon,
  Cog6ToothIcon,
  ArrowLeftIcon,
  XMarkIcon,
  DocumentArrowUpIcon,
  CheckIcon
} from '@heroicons/react/24/outline'
import ProtectedRoute from '@/components/ProtectedRoute'  // ← AGGIUNTO
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency } from '@/utils/formatters'

interface DCAPortfolio {
  id: number
  name: string
  isActive: boolean
  account: {
    id: number
    name: string
    balance: number
  }
  stats: {
    // 🎯 ENHANCED CASH FLOW FIELDS (source of truth dal backend)
    totalInvested: number
    capitalRecovered: number
    effectiveInvestment: number
    realizedProfit: number
    isFullyRecovered: boolean
    
    // BTC metrics
    totalBTC: number
    netBTC: number
    avgPurchasePrice: number
    
    // Counts
    transactionCount: number
    buyCount: number
    sellCount: number
    
    // Fees
    totalFeesBTC: number
    totalFeesSats: number
    feesCount: number
  }
  transactions: DCATransaction[]
  networkFees?: NetworkFee[]
}

interface DCATransaction {
  id: number
  date: string
  type: 'buy' | 'sell'
  btcQuantity: number
  eurPaid: number
  broker: string
  info: string
  notes?: string
  purchasePrice: number
}

interface NetworkFee {
  id: number
  sats: number
  description: string | null
  date: string
  btcAmount: number
}

interface BitcoinPrice {
  btcPrice: number
  currency: string
  cached: boolean
  timestamp: string
}

export default function DCAPortfolioPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const portfolioId = params.id as string

  const [portfolio, setPortfolio] = useState<DCAPortfolio | null>(null)
  const [btcPrice, setBtcPrice] = useState<BitcoinPrice | null>(null)
  const [networkFees, setNetworkFees] = useState<NetworkFee[]>([])
  const [loading, setLoading] = useState(true)
  const [priceLoading, setPriceLoading] = useState(false)
  const [submitLoading, setSubmitLoading] = useState(false)

  // Modals
  const [showAddTransaction, setShowAddTransaction] = useState(false)
  const [showEditTransaction, setShowEditTransaction] = useState(false)
  const [showEditPortfolio, setShowEditPortfolio] = useState(false)
  const [showDeletePortfolio, setShowDeletePortfolio] = useState(false)
  const [showAddFee, setShowAddFee] = useState(false)
  const [showEditFee, setShowEditFee] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<DCATransaction | null>(null)
  const [editingFee, setEditingFee] = useState<NetworkFee | null>(null)

  // Forms
  const [transactionForm, setTransactionForm] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'buy' as 'buy' | 'sell',
    broker: '',
    info: '',
    btcQuantity: '',
    eurPaid: '',
    notes: ''
  })

  const [portfolioForm, setPortfolioForm] = useState({
    name: '',
    isActive: true
  })

  const [feeForm, setFeeForm] = useState({
    sats: '',
    description: '',
    date: new Date().toISOString().split('T')[0]
  })

  // Stati per import CSV
  const [showImportModal, setShowImportModal] = useState(false)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvData, setCsvData] = useState<any[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [importResult, setImportResult] = useState<any>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, currentBatch: 0, totalBatches: 0 })
  const [error, setError] = useState('')

  // Stati per selezione multipla e bulk delete
  const [selectedTransactions, setSelectedTransactions] = useState<number[]>([])
  const [selectAll, setSelectAll] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteProgress, setDeleteProgress] = useState({ current: 0, total: 0 })

  useEffect(() => {
    fetchPortfolio()
    fetchNetworkFees()
    fetchBitcoinPrice()
  }, [portfolioId])

  useEffect(() => {
    if (portfolio) {
      setPortfolioForm({
        name: portfolio.name,
        isActive: portfolio.isActive
      })
    }
  }, [portfolio])

  // Format functions
  const formatCurrencyWithUserCurrency = (amount: number) => {
    return formatCurrency(amount, user?.currency || 'EUR')
  }

  const formatBTC = (amount: number) => {
    return `${amount.toFixed(8)} BTC`
  }

  const formatPercentage = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`
  }

  const fetchPortfolio = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/dca-portfolios/${portfolioId}`)
      if (response.ok) {
        const data = await response.json()
        setPortfolio(data)
      } else {
        console.error('Errore nel caricamento portfolio')
      }
    } catch (error) {
      console.error('Errore:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchNetworkFees = async () => {
    try {
      const response = await fetch(`/api/network-fees?portfolioId=${portfolioId}`)
      if (response.ok) {
        const data = await response.json()
        setNetworkFees(data)
      }
    } catch (error) {
      console.error('Errore nel caricamento network fees:', error)
    }
  }

  const fetchBitcoinPrice = async () => {
    try {
      setPriceLoading(true)
      const response = await fetch('/api/bitcoin-price')
      if (response.ok) {
        const data = await response.json()
        setBtcPrice(data)
      }
    } catch (error) {
      console.error('Errore nel caricamento prezzo Bitcoin:', error)
    } finally {
      setPriceLoading(false)
    }
  }

  const handleAddTransaction = async (e: React.FormEvent) => {
  e.preventDefault()
  setSubmitLoading(true)

  try {
    const formData = {
      ...transactionForm,
      portfolioId: parseInt(portfolioId),
      btcQuantity: parseFloat(transactionForm.btcQuantity),
      eurPaid: parseFloat(transactionForm.eurPaid)
    }

    const response = await fetch(`/api/dca-transactions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(formData)
    })

    if (response.ok) {
      setShowAddTransaction(false)
      setTransactionForm({
        date: new Date().toISOString().split('T')[0],
        type: 'buy',
        broker: '',
        info: '',
        btcQuantity: '',
        eurPaid: '',
        notes: ''
      })
      fetchPortfolio()
    } else {
      // ✅ AGGIUNTO: Gestione errori mancante
      const errorData = await response.json()
      console.error('Errore API:', errorData)
      alert(errorData.error || 'Errore durante la creazione della transazione')
    }
  } catch (error) {
    console.error('Errore di rete:', error)
    alert('Errore di rete durante la creazione della transazione')
  } finally {
    setSubmitLoading(false)
  }
}

  const handleEditTransaction = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingTransaction) return

    setSubmitLoading(true)

    try {
      const formData = {
        ...transactionForm,
        portfolioId: parseInt(portfolioId),
        btcQuantity: parseFloat(transactionForm.btcQuantity),
        eurPaid: parseFloat(transactionForm.eurPaid)
      }

      const response = await fetch(`/api/dca-transactions/${editingTransaction.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        setShowEditTransaction(false)
        setEditingTransaction(null)
        fetchPortfolio()
      }
    } catch (error) {
      console.error('Errore:', error)
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleDeleteTransaction = async (transactionId: number) => {
    if (!confirm('Sei sicuro di voler eliminare questa transazione?')) return

    try {
      const response = await fetch(`/api/dca-transactions/${transactionId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchPortfolio()
      }
    } catch (error) {
      console.error('Errore:', error)
    }
  }

  const handleEditPortfolio = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitLoading(true)

    try {
      const response = await fetch(`/api/dca-portfolios/${portfolioId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(portfolioForm)
      })

      if (response.ok) {
        setShowEditPortfolio(false)
        fetchPortfolio()
      }
    } catch (error) {
      console.error('Errore:', error)
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleDeletePortfolio = async () => {
    try {
      const response = await fetch(`/api/dca-portfolios/${portfolioId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        router.push('/investments')
      }
    } catch (error) {
      console.error('Errore:', error)
    }
  }

  const handleAddFee = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitLoading(true)

    try {
      const formData = {
        ...feeForm,
        portfolioId: parseInt(portfolioId),
        sats: parseInt(feeForm.sats)
      }

      const response = await fetch(`/api/network-fees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        setShowAddFee(false)
        setFeeForm({
          sats: '',
          description: '',
          date: new Date().toISOString().split('T')[0]
        })
        fetchNetworkFees()
        fetchPortfolio()
      }
    } catch (error) {
      console.error('Errore:', error)
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleEditFee = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!editingFee) return

    setSubmitLoading(true)

    try {
      const formData = {
        ...feeForm,
        portfolioId: parseInt(portfolioId),
        sats: parseInt(feeForm.sats)
      }

      const response = await fetch(`/api/network-fees/${editingFee.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        setShowEditFee(false)
        setEditingFee(null)
        fetchNetworkFees()
        fetchPortfolio()
      }
    } catch (error) {
      console.error('Errore:', error)
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleDeleteFee = async (feeId: number) => {
    if (!confirm('Sei sicuro di voler eliminare questa commissione di rete?')) return

    try {
      const response = await fetch(`/api/network-fees/${feeId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        fetchNetworkFees()
        fetchPortfolio()
      }
    } catch (error) {
      console.error('Errore:', error)
    }
  }

  // === FUNZIONI CSV IMPORT ===
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
      const expectedHeaders = ['data', 'tipo', 'broker', 'info', 'quantita_btc', 'eur_pagati', 'note']
      
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
          tipo: values[headers.indexOf('tipo')] || '',
          broker: values[headers.indexOf('broker')] || '',
          info: values[headers.indexOf('info')] || '',
          quantita_btc: values[headers.indexOf('quantita_btc')] || '',
          eur_pagati: values[headers.indexOf('eur_pagati')] || '',
          note: values[headers.indexOf('note')] || ''
        }
      }).filter(row => row.data && row.tipo && row.broker && row.info && row.quantita_btc && row.eur_pagati)

      setCsvData(rows)
      setShowPreview(true)
      setError('')
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
      const response = await fetch('/api/dca-transactions/import-csv-stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ csvData, portfolioId })
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
              console.log('📊 DCA SSE Progress:', data)
              
              if (data.type === 'progress') {
                console.log('📈 Updating DCA progress:', data.current, '/', data.total)
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
      
      const safeResult = {
        success: result?.success || false,
        imported: result?.imported || 0,
        errors: result?.errors || []
      }
      
      setImportResult(safeResult)

      if (safeResult.success && safeResult.imported > 0) {
        fetchPortfolio() // Refresh portfolio data
        // Non resettare il modal immediatamente - lascia che l'utente veda i risultati
      }
    } catch (error) {
      console.error('Errore durante import CSV DCA:', error)
      setImportResult({
        success: false,
        imported: 0,
        errors: [
          'Errore durante l\'import del CSV DCA.',
          error instanceof Error ? error.message : 'Errore sconosciuto'
        ]
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
    setImportProgress({ current: 0, total: 0, currentBatch: 0, totalBatches: 0 })
    setError('')
  }

  // === FUNZIONI BULK DELETE ===
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
      setSelectedTransactions(portfolio?.transactions.map(t => t.id) || [])
    }
    setSelectAll(!selectAll)
  }

  const handleBulkDelete = async () => {
    if (selectedTransactions.length === 0) return

    if (!confirm(`Sei sicuro di voler eliminare ${selectedTransactions.length} transazioni selezionate?`)) return

    setIsDeleting(true)
    setDeleteProgress({ current: 0, total: selectedTransactions.length })

    try {
      // Elimina transazioni una per una con feedback
      for (let i = 0; i < selectedTransactions.length; i++) {
        const transactionId = selectedTransactions[i]
        
        await fetch(`/api/dca-transactions/${transactionId}`, {
          method: 'DELETE'
        })
        
        setDeleteProgress({ current: i + 1, total: selectedTransactions.length })
        
        // Piccola pausa per mostrare il progresso
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      // Refresh data e reset selezione
      await fetchPortfolio()
      setSelectedTransactions([])
      setSelectAll(false)
    } catch (error) {
      console.error('Errore durante eliminazione bulk:', error)
      alert('Errore durante l\'eliminazione delle transazioni')
    } finally {
      setIsDeleting(false)
      setDeleteProgress({ current: 0, total: 0 })
    }
  }

// NUOVO (CORRETTO):
const openEditTransaction = (transaction: DCATransaction) => {
  setEditingTransaction(transaction)
  setTransactionForm({
    date: transaction.date.split('T')[0],  // ← FIX: converte DateTime a date
    type: transaction.type,
    broker: transaction.broker,
    info: transaction.info,
    btcQuantity: transaction.btcQuantity.toString(),
    eurPaid: transaction.eurPaid.toString(),
    notes: transaction.notes || ''
  })
  setShowEditTransaction(true)
}

  const openEditFee = (fee: NetworkFee) => {
    setEditingFee(fee)
    setFeeForm({
      sats: fee.sats.toString(),
      description: fee.description || '',
      date: fee.date
    })
    setShowEditFee(true)
  }

  if (loading) {
    return (
      <ProtectedRoute>  {/* ← AGGIUNTO */}
        <div className="flex items-center justify-center h-64">
          <div className="text-adaptive-600">Caricamento...</div>
        </div>
      </ProtectedRoute>  // ← AGGIUNTO
    )
  }

  if (!portfolio) {
    return (
      <ProtectedRoute>  {/* ← AGGIUNTO */}
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-adaptive-900 mb-2">Portfolio non trovato</h1>
          <Link href="/investments" className="text-blue-600 hover:text-blue-700">
            Torna agli investimenti
          </Link>
        </div>
      </ProtectedRoute>  // ← AGGIUNTO
    )
  }

  // 🎯 CALCOLI ENHANCED - Cash Flow Analysis
  const {
    totalInvested,
    capitalRecovered,
    effectiveInvestment,
    realizedProfit,
    isFullyRecovered,
    netBTC,
    totalBTC,
    avgPurchasePrice,
    totalFeesBTC,
    totalFeesSats,
    feesCount,
    transactionCount,
    buyCount,
    sellCount
  } = portfolio.stats

  // Calcolo valore corrente e gains non realizzati
  const currentValue = btcPrice ? netBTC * btcPrice.btcPrice : 0
  const unrealizedGains = currentValue - effectiveInvestment
  const totalGains = realizedProfit + unrealizedGains

  // Calcolo ROI corretto: usa totalInvested quando effectiveInvestment = 0
  const effectiveROI = effectiveInvestment > 0 
    ? (totalGains / effectiveInvestment) * 100 
    : totalInvested > 0 
      ? (totalGains / totalInvested) * 100 
      : 0

  return (
    <ProtectedRoute>  {/* ← AGGIUNTO */}
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/investments" className="text-adaptive-500 hover:text-adaptive-700">
              <ArrowLeftIcon className="w-6 h-6" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold text-adaptive-900">{portfolio.name}</h1>
              <p className="text-adaptive-600">
                Portfolio DCA Bitcoin • Account: {portfolio.account.name}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowEditPortfolio(true)}
              className="p-2 text-adaptive-500 hover:text-adaptive-700"
            >
              <Cog6ToothIcon className="w-5 h-5" />
            </button>
            <button
              onClick={fetchBitcoinPrice}
              disabled={priceLoading}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50"
            >
              <ArrowPathIcon className={`w-4 h-4 ${priceLoading ? 'animate-spin' : ''}`} />
              Aggiorna Prezzo
            </button>
          </div>
        </div>

        {/* Bitcoin Price Display */}
        {btcPrice && (
          <div className="card-adaptive p-4 rounded-lg border-adaptive">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-adaptive-500">Prezzo Bitcoin Corrente</h3>
                <p className="text-2xl font-bold text-orange-600">
                  {formatCurrency(btcPrice.btcPrice, user?.currency || 'EUR')}
                </p>
                <p className="text-sm text-adaptive-600">
                  Valuta: {btcPrice.currency}
                  {btcPrice.cached && <span className="text-orange-500 ml-2">(Cache)</span>}
                </p>
              </div>
              <div className="text-4xl">₿</div>
            </div>
          </div>
        )}

        {/* 🎯 ENHANCED STATS GRID - Cash Flow Focus */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Investimento Effettivo */}
          <div className="card-adaptive p-4 rounded-lg border-adaptive">
            <h3 className="text-sm font-medium text-adaptive-500 mb-1">Investimento Effettivo</h3>
            <p className="text-2xl font-bold text-blue-600">
              {formatCurrencyWithUserCurrency(effectiveInvestment)}
            </p>
            <p className="text-xs text-adaptive-600">
              {isFullyRecovered ? 'Capitale completamente recuperato!' : `di ${formatCurrencyWithUserCurrency(totalInvested)} totali`}
            </p>
          </div>

          {/* Profitto Realizzato */}
          <div className="card-adaptive p-4 rounded-lg border-adaptive">
            <h3 className="text-sm font-medium text-adaptive-500 mb-1">Profitto Realizzato</h3>
            <p className={`text-2xl font-bold ${realizedProfit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrencyWithUserCurrency(realizedProfit)}
            </p>
            <p className="text-xs text-adaptive-600">
              Da {sellCount} vendite
            </p>
          </div>

          {/* Plus/Minus Non Realizzati */}
          <div className="card-adaptive p-4 rounded-lg border-adaptive">
            <h3 className="text-sm font-medium text-adaptive-500 mb-1">Plus/Minus Non Realizzati</h3>
            <p className={`text-2xl font-bold ${unrealizedGains >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrencyWithUserCurrency(unrealizedGains)}
            </p>
            <p className="text-xs text-adaptive-600">
              Su {formatBTC(netBTC)} detenuti
            </p>
          </div>

          {/* ROI Effettivo */}
          <div className="card-adaptive p-4 rounded-lg border-adaptive">
            <h3 className="text-sm font-medium text-adaptive-500 mb-1">ROI Effettivo</h3>
            <p className={`text-2xl font-bold ${effectiveROI >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatPercentage(effectiveROI)}
            </p>
            <p className="text-xs text-adaptive-600">
              Su investimento effettivo
            </p>
          </div>
        </div>

        {/* BTC Holdings & Fees Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* BTC Holdings */}
          <div className="card-adaptive p-4 rounded-lg border-adaptive">
            <h3 className="text-sm font-medium text-adaptive-500 mb-1">BTC Detenuti (Netti)</h3>
            <p className="text-xl font-bold text-orange-600">
              {formatBTC(netBTC)}
            </p>
            <p className="text-xs text-adaptive-600">
              Prezzo medio: {formatCurrencyWithUserCurrency(avgPurchasePrice)}
            </p>
          </div>

          {/* Network Fees */}
          <div className="card-adaptive p-4 rounded-lg border-adaptive">
            <h3 className="text-sm font-medium text-adaptive-500 mb-1">Commissioni di Rete</h3>
            <p className="text-xl font-bold text-red-600">
              -{formatBTC(totalFeesBTC)}
            </p>
            <p className="text-xs text-adaptive-600">
              {totalFeesSats.toLocaleString()} sats • {feesCount} fees
            </p>
          </div>

          {/* Valore Corrente */}
          <div className="card-adaptive p-4 rounded-lg border-adaptive">
            <h3 className="text-sm font-medium text-adaptive-500 mb-1">Valore Corrente</h3>
            <p className="text-xl font-bold text-blue-600">
              {formatCurrencyWithUserCurrency(currentValue)}
            </p>
            <p className="text-xs text-adaptive-600">
              Basato su prezzo corrente
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4">
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
          >
            <DocumentArrowUpIcon className="w-4 h-4" />
            Import CSV
          </button>
          <button
            onClick={() => setShowAddTransaction(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            <PlusIcon className="w-4 h-4" />
            Aggiungi Transazione
          </button>
          <button
            onClick={() => setShowAddFee(true)}
            className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
          >
            <PlusIcon className="w-4 h-4" />
            Aggiungi Commissione
          </button>
          
          {/* Bulk Delete Button */}
          {selectedTransactions.length > 0 && (
            <button
              onClick={handleBulkDelete}
              disabled={isDeleting}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
            >
              <TrashIcon className="w-4 h-4" />
              {isDeleting 
                ? `Eliminando... ${deleteProgress.current}/${deleteProgress.total}`
                : `Elimina ${selectedTransactions.length} selezionate`
              }
            </button>
          )}
        </div>

        {/* Transactions Table */}
        <div className="card-adaptive rounded-lg shadow-sm border-adaptive">
          <div className="p-6 border-b border-adaptive">
            <h2 className="text-xl font-semibold text-adaptive-900">
              Transazioni ({transactionCount})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-adaptive-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-adaptive-500 uppercase tracking-wider">
                    <input
                      type="checkbox"
                      checked={selectAll}
                      onChange={handleSelectAll}
                      className="h-4 w-4 text-blue-600 border-adaptive rounded focus:ring-blue-500"
                    />
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-adaptive-500 uppercase tracking-wider">Data</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-adaptive-500 uppercase tracking-wider">Tipo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-adaptive-500 uppercase tracking-wider">BTC</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-adaptive-500 uppercase tracking-wider">EUR</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-adaptive-500 uppercase tracking-wider">Prezzo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-adaptive-500 uppercase tracking-wider">Broker</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-adaptive-500 uppercase tracking-wider">Azioni</th>
                </tr>
              </thead>
              <tbody className="bg-adaptive-50 divide-y divide-adaptive-200">
                {portfolio.transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-adaptive-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-adaptive-900">
                      <input
                        type="checkbox"
                        checked={selectedTransactions.includes(transaction.id)}
                        onChange={() => handleSelectTransaction(transaction.id)}
                        className="h-4 w-4 text-blue-600 border-adaptive rounded focus:ring-blue-500"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-adaptive-900">
                      {new Date(transaction.date).toLocaleDateString('it-IT')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                        transaction.type === 'buy' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {transaction.type === 'buy' ? 'Acquisto' : 'Vendita'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-adaptive-900">
                      {transaction.type === 'buy' ? '+' : '-'}{formatBTC(transaction.btcQuantity)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-adaptive-900">
                      {transaction.type === 'buy' ? '-' : '+'}{formatCurrencyWithUserCurrency(transaction.eurPaid)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-adaptive-900">
                      {formatCurrencyWithUserCurrency(transaction.purchasePrice)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-adaptive-900">
                      {transaction.broker}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-adaptive-500">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditTransaction(transaction)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteTransaction(transaction.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Network Fees Table */}
        <div className="card-adaptive rounded-lg shadow-sm border-adaptive">
          <div className="p-6 border-b border-adaptive">
            <h2 className="text-xl font-semibold text-adaptive-900">
              Commissioni di Rete ({feesCount})
            </h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-adaptive-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-adaptive-500 uppercase tracking-wider">Data</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-adaptive-500 uppercase tracking-wider">Sats</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-adaptive-500 uppercase tracking-wider">BTC</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-adaptive-500 uppercase tracking-wider">Descrizione</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-adaptive-500 uppercase tracking-wider">Azioni</th>
                </tr>
              </thead>
              <tbody className="bg-adaptive-50 divide-y divide-adaptive-200">
                {networkFees.map((fee) => (
                  <tr key={fee.id} className="hover:bg-adaptive-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-adaptive-900">
                      {new Date(fee.date).toLocaleDateString('it-IT')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-adaptive-900">
                      {fee.sats.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-adaptive-900">
                      {formatBTC(fee.btcAmount)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-adaptive-900">
                      {fee.description || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-adaptive-500">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => openEditFee(fee)}
                          className="text-blue-600 hover:text-blue-700"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteFee(fee.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <TrashIcon className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Modals */}
        {/* Add Transaction Modal */}
        {showAddTransaction && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-adaptive-50 rounded-lg w-full max-w-md m-4">
              <div className="flex items-center justify-between p-6 border-b border-adaptive-200">
                <h3 className="text-lg font-semibold text-adaptive-900">Aggiungi Transazione</h3>
                <button
                  onClick={() => setShowAddTransaction(false)}
                  className="text-adaptive-500 hover:text-adaptive-700"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleAddTransaction} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-adaptive-700 mb-1">Data</label>
                  <input
                    type="date"
                    value={transactionForm.date}
                    onChange={(e) => setTransactionForm({...transactionForm, date: e.target.value})}
                    className="w-full p-2 border border-adaptive-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-adaptive-50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-adaptive-700 mb-1">Tipo</label>
                  <select
                    value={transactionForm.type}
                    onChange={(e) => setTransactionForm({...transactionForm, type: e.target.value as 'buy' | 'sell'})}
                    className="w-full p-2 border border-adaptive-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-adaptive-50"
                  >
                    <option value="buy">Acquisto</option>
                    <option value="sell">Vendita</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-adaptive-700 mb-1">Broker</label>
                  <input
                    type="text"
                    value={transactionForm.broker}
                    onChange={(e) => setTransactionForm({...transactionForm, broker: e.target.value})}
                    className="w-full p-2 border border-adaptive-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-adaptive-50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-adaptive-700 mb-1">Info</label>
                  <input
                    type="text"
                    value={transactionForm.info}
                    onChange={(e) => setTransactionForm({...transactionForm, info: e.target.value})}
                    className="w-full p-2 border border-adaptive-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-adaptive-50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-adaptive-700 mb-1">Quantità BTC</label>
                  <input
                    type="number"
                    step="0.00000001"
                    value={transactionForm.btcQuantity}
                    onChange={(e) => setTransactionForm({...transactionForm, btcQuantity: e.target.value})}
                    className="w-full p-2 border border-adaptive-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-adaptive-50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-adaptive-700 mb-1">Importo EUR</label>
                  <input
                    type="number"
                    step="0.01"
                    value={transactionForm.eurPaid}
                    onChange={(e) => setTransactionForm({...transactionForm, eurPaid: e.target.value})}
                    className="w-full p-2 border border-adaptive-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-adaptive-50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-adaptive-700 mb-1">Note (opzionale)</label>
                  <textarea
                    value={transactionForm.notes}
                    onChange={(e) => setTransactionForm({...transactionForm, notes: e.target.value})}
                    className="w-full p-2 border border-adaptive-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-adaptive-50"
                    rows={3}
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddTransaction(false)}
                    className="flex-1 px-4 py-2 border border-adaptive-300 text-adaptive-700 rounded-lg hover:bg-adaptive-100"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    disabled={submitLoading}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submitLoading ? 'Aggiungendo...' : 'Aggiungi'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Transaction Modal */}
        {showEditTransaction && editingTransaction && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-adaptive-50 rounded-lg w-full max-w-md m-4">
              <div className="flex items-center justify-between p-6 border-b border-adaptive-200">
                <h3 className="text-lg font-semibold text-adaptive-900">Modifica Transazione</h3>
                <button
                  onClick={() => setShowEditTransaction(false)}
                  className="text-adaptive-500 hover:text-adaptive-700"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleEditTransaction} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-adaptive-700 mb-1">Data</label>
                  <input
                    type="date"
                    value={transactionForm.date}
                    onChange={(e) => setTransactionForm({...transactionForm, date: e.target.value})}
                    className="w-full p-2 border border-adaptive-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-adaptive-50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-adaptive-700 mb-1">Tipo</label>
                  <select
                    value={transactionForm.type}
                    onChange={(e) => setTransactionForm({...transactionForm, type: e.target.value as 'buy' | 'sell'})}
                    className="w-full p-2 border border-adaptive-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-adaptive-50"
                  >
                    <option value="buy">Acquisto</option>
                    <option value="sell">Vendita</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-adaptive-700 mb-1">Broker</label>
                  <input
                    type="text"
                    value={transactionForm.broker}
                    onChange={(e) => setTransactionForm({...transactionForm, broker: e.target.value})}
                    className="w-full p-2 border border-adaptive-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-adaptive-50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-adaptive-700 mb-1">Info</label>
                  <input
                    type="text"
                    value={transactionForm.info}
                    onChange={(e) => setTransactionForm({...transactionForm, info: e.target.value})}
                    className="w-full p-2 border border-adaptive-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-adaptive-50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-adaptive-700 mb-1">Quantità BTC</label>
                  <input
                    type="number"
                    step="0.00000001"
                    value={transactionForm.btcQuantity}
                    onChange={(e) => setTransactionForm({...transactionForm, btcQuantity: e.target.value})}
                    className="w-full p-2 border border-adaptive-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-adaptive-50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-adaptive-700 mb-1">Importo EUR</label>
                  <input
                    type="number"
                    step="0.01"
                    value={transactionForm.eurPaid}
                    onChange={(e) => setTransactionForm({...transactionForm, eurPaid: e.target.value})}
                    className="w-full p-2 border border-adaptive-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-adaptive-50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-adaptive-700 mb-1">Note (opzionale)</label>
                  <textarea
                    value={transactionForm.notes}
                    onChange={(e) => setTransactionForm({...transactionForm, notes: e.target.value})}
                    className="w-full p-2 border border-adaptive-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-adaptive-50"
                    rows={3}
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowEditTransaction(false)}
                    className="flex-1 px-4 py-2 border border-adaptive-300 text-adaptive-700 rounded-lg hover:bg-adaptive-100"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    disabled={submitLoading}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submitLoading ? 'Salvando...' : 'Salva'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Portfolio Modal */}
        {showEditPortfolio && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-adaptive-50 rounded-lg w-full max-w-md m-4">
              <div className="flex items-center justify-between p-6 border-b border-adaptive-200">
                <h3 className="text-lg font-semibold text-adaptive-900">Impostazioni Portfolio</h3>
                <button
                  onClick={() => setShowEditPortfolio(false)}
                  className="text-adaptive-500 hover:text-adaptive-700"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleEditPortfolio} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-adaptive-700 mb-1">Nome Portfolio</label>
                  <input
                    type="text"
                    value={portfolioForm.name}
                    onChange={(e) => setPortfolioForm({...portfolioForm, name: e.target.value})}
                    className="w-full p-2 border border-adaptive-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-adaptive-50"
                    required
                  />
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="isActive"
                    checked={portfolioForm.isActive}
                    onChange={(e) => setPortfolioForm({...portfolioForm, isActive: e.target.checked})}
                    className="mr-2"
                  />
                  <label htmlFor="isActive" className="text-sm font-medium text-adaptive-700">
                    Portfolio attivo
                  </label>
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowEditPortfolio(false)}
                    className="flex-1 px-4 py-2 border border-adaptive-300 text-adaptive-700 rounded-lg hover:bg-adaptive-100"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    disabled={submitLoading}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submitLoading ? 'Salvando...' : 'Salva'}
                  </button>
                </div>
              </form>
              <div className="p-6 border-t border-adaptive-200">
                <button
                  onClick={() => setShowDeletePortfolio(true)}
                  className="w-full px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                >
                  Elimina Portfolio
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Portfolio Confirmation */}
        {showDeletePortfolio && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-adaptive-50 rounded-lg w-full max-w-md m-4">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-adaptive-900 mb-4">Conferma Eliminazione</h3>
                <p className="text-adaptive-600 mb-6">
                  Sei sicuro di voler eliminare questo portfolio? Questa azione eliminerà anche tutte le transazioni e commissioni associate.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => setShowDeletePortfolio(false)}
                    className="flex-1 px-4 py-2 border border-adaptive-300 text-adaptive-700 rounded-lg hover:bg-adaptive-100"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={handleDeletePortfolio}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Elimina
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Fee Modal */}
        {showAddFee && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-adaptive-50 rounded-lg w-full max-w-md m-4">
              <div className="flex items-center justify-between p-6 border-b border-adaptive-200">
                <h3 className="text-lg font-semibold text-adaptive-900">Aggiungi Commissione di Rete</h3>
                <button
                  onClick={() => setShowAddFee(false)}
                  className="text-adaptive-500 hover:text-adaptive-700"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleAddFee} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-adaptive-700 mb-1">Data</label>
                  <input
                    type="date"
                    value={feeForm.date}
                    onChange={(e) => setFeeForm({...feeForm, date: e.target.value})}
                    className="w-full p-2 border border-adaptive-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-adaptive-50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-adaptive-700 mb-1">Sats</label>
                  <input
                    type="number"
                    value={feeForm.sats}
                    onChange={(e) => setFeeForm({...feeForm, sats: e.target.value})}
                    className="w-full p-2 border border-adaptive-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-adaptive-50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-adaptive-700 mb-1">Descrizione (opzionale)</label>
                  <input
                    type="text"
                    value={feeForm.description}
                    onChange={(e) => setFeeForm({...feeForm, description: e.target.value})}
                    className="w-full p-2 border border-adaptive-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-adaptive-50"
                    placeholder="es. On-chain transfer, Lightning withdraw..."
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddFee(false)}
                    className="flex-1 px-4 py-2 border border-adaptive-300 text-adaptive-700 rounded-lg hover:bg-adaptive-100"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    disabled={submitLoading}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                  >
                    {submitLoading ? 'Aggiungendo...' : 'Aggiungi'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit Fee Modal */}
        {showEditFee && editingFee && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-adaptive-50 rounded-lg w-full max-w-md m-4">
              <div className="flex items-center justify-between p-6 border-b border-adaptive-200">
                <h3 className="text-lg font-semibold text-adaptive-900">Modifica Commissione di Rete</h3>
                <button
                  onClick={() => setShowEditFee(false)}
                  className="text-adaptive-500 hover:text-adaptive-700"
                >
                  <XMarkIcon className="w-6 h-6" />
                </button>
              </div>
              <form onSubmit={handleEditFee} className="p-6 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-adaptive-700 mb-1">Data</label>
                  <input
                    type="date"
                    value={feeForm.date}
                    onChange={(e) => setFeeForm({...feeForm, date: e.target.value})}
                    className="w-full p-2 border border-adaptive-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-adaptive-50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-adaptive-700 mb-1">Sats</label>
                  <input
                    type="number"
                    value={feeForm.sats}
                    onChange={(e) => setFeeForm({...feeForm, sats: e.target.value})}
                    className="w-full p-2 border border-adaptive-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-adaptive-50"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-adaptive-700 mb-1">Descrizione (opzionale)</label>
                  <input
                    type="text"
                    value={feeForm.description}
                    onChange={(e) => setFeeForm({...feeForm, description: e.target.value})}
                    className="w-full p-2 border border-adaptive-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-adaptive-50"
                    placeholder="es. On-chain transfer, Lightning withdraw..."
                  />
                </div>
                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowEditFee(false)}
                    className="flex-1 px-4 py-2 border border-adaptive-300 text-adaptive-700 rounded-lg hover:bg-adaptive-100"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    disabled={submitLoading}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50"
                  >
                    {submitLoading ? 'Salvando...' : 'Salva'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* CSV Import Modal */}
        {showImportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-adaptive rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-adaptive">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-adaptive-900">Import CSV Transazioni DCA</h2>
                <button
                  onClick={resetImportModal}
                  disabled={isImporting}
                  className={`${isImporting ? 'text-adaptive-300 cursor-not-allowed' : 'text-adaptive-500 hover:text-adaptive-700'}`}
                >
                  ✕
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-100 border border-red-200 rounded-lg">
                  <p className="text-red-700">{error}</p>
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

              {!showPreview && !importResult && !isImporting && (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="font-medium text-blue-900 mb-2">📋 Formato CSV Richiesto</h3>
                    <p className="text-sm text-blue-800 mb-2">Il file CSV deve contenere le seguenti colonne nell'ordine esatto:</p>
                    <div className="bg-gray-100 rounded border p-2 font-mono text-sm text-gray-900 font-semibold">
                      data,tipo,broker,info,quantita_btc,eur_pagati,note
                    </div>
                    <ul className="text-sm text-blue-800 mt-2 space-y-1">
                      <li>• <strong>data:</strong> formato DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD</li>
                      <li>• <strong>tipo:</strong> 'buy' o 'sell'</li>
                      <li>• <strong>broker:</strong> nome del broker/exchange (es. Binance, Kraken)</li>
                      <li>• <strong>info:</strong> informazioni sulla transazione (es. DCA, Profit taking)</li>
                      <li>• <strong>quantita_btc:</strong> quantità di Bitcoin (es. 0.00123456)</li>
                      <li>• <strong>eur_pagati:</strong> importo in Euro (es. 50.00)</li>
                      <li>• <strong>note:</strong> note opzionali</li>
                    </ul>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-adaptive-900 mb-2">
                        Seleziona file CSV
                      </label>
                      <input
                        type="file"
                        accept=".csv"
                        onChange={handleFileUpload}
                        className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                      />
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
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Broker</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Info</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">BTC</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">EUR</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Note</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {csvData.slice(0, 100).map((row, index) => (
                          <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-3 py-2 text-sm text-gray-900">{row.data}</td>
                            <td className="px-3 py-2 text-sm">
                              <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                row.tipo.toLowerCase() === 'buy' 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {row.tipo}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-sm text-gray-900">{row.broker}</td>
                            <td className="px-3 py-2 text-sm text-gray-900">{row.info}</td>
                            <td className="px-3 py-2 text-sm text-gray-900">{row.quantita_btc}</td>
                            <td className="px-3 py-2 text-sm text-gray-900">€{row.eur_pagati}</td>
                            <td className="px-3 py-2 text-sm text-gray-500">{row.note || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {csvData.length > 100 && (
                      <div className="p-3 bg-gray-50 text-center text-sm text-gray-600">
                        Mostrando prime 100 righe di {csvData.length} totali
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
                      <p className={`${importResult.success ? 'text-green-800' : 'text-red-800'}`}>• <strong>Transazioni DCA importate:</strong> {importResult.imported}</p>
                      {importResult.errors?.length > 0 && (
                        <p className={`${importResult.success ? 'text-green-800' : 'text-red-800'}`}>• <strong>Errori:</strong> {importResult.errors.length}</p>
                      )}
                    </div>

                    {importResult.errors?.length > 0 && (
                      <details className="mt-3">
                        <summary className={`cursor-pointer font-medium ${importResult.success ? 'text-green-800' : 'text-red-800'}`}>
                          Errori dettagliati ({importResult.errors.length})
                        </summary>
                        <div className="mt-2 p-2 bg-white rounded border max-h-40 overflow-y-auto">
                          {importResult.errors.map((error, index) => (
                            <div key={index} className="text-sm text-red-600 py-1 border-b border-gray-100 last:border-b-0">
                              {error}
                            </div>
                          ))}
                        </div>
                      </details>
                    )}

                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={resetImportModal}
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700"
                      >
                        Chiudi
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>  // ← AGGIUNTO
  )
}