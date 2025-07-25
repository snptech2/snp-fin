'use client'

import React, { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { 
  ArrowLeftIcon, PlusIcon, PencilIcon, TrashIcon, 
  Cog6ToothIcon, XMarkIcon, ChevronDownIcon, DocumentArrowUpIcon,
  CheckIcon
} from '@heroicons/react/24/outline'
import { useAuth } from '@/contexts/AuthContext'
import { formatCurrency, formatCryptoSmart, formatCurrencySmart, smartRoundPrice } from '@/utils/formatters'
import { useNotifications } from '@/contexts/NotificationContext'

interface Asset {
  id: number
  name: string
  symbol: string
  decimals: number
}

interface Transaction {
  id: number
  type: 'buy' | 'sell' | 'stake_reward' | 'swap_in' | 'swap_out' | 'trade_open' | 'trade_close'
  assetId: number
  quantity: number
  eurValue: number
  pricePerUnit: number
  date: string
  notes?: string
  swapPairId?: number
  tradeId?: number
  asset: Asset
}

interface Holding {
  id: number
  assetId: number
  quantity: number
  avgPrice: number
  totalInvested: number
  realizedGains: number
  currentPrice?: number
  valueEur?: number
  lastUpdated: string
  asset: Asset
}

interface CryptoPortfolio {
  id: number
  name: string
  description?: string
  accountId: number
  userId: number
  createdAt: string
  updatedAt: string
  account: {
    id: number
    name: string
    balance: number
  }
  stats: {
    totalInvested: number
    capitalRecovered: number
    effectiveInvestment: number
    realizedProfit: number
    stakeRewards: number
    isFullyRecovered: boolean
    totalValueEur: number
    totalROI: number
    unrealizedGains: number
    transactionCount: number
    buyCount: number
    sellCount: number
    stakeRewardCount: number
    holdingsCount: number
  }
  holdings: Holding[]
  transactions: Transaction[]
}

export default function CryptoPortfolioDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { user } = useAuth()
  const { alert, confirm } = useNotifications()
  const portfolioId = params.id as string

  // 🔧 STATI PRINCIPALI
  const [portfolio, setPortfolio] = useState<CryptoPortfolio | null>(null)
  const [loading, setLoading] = useState(true)
  const [priceLoading, setPriceLoading] = useState(false)
  const [livePrices, setLivePrices] = useState<Record<string, number>>({})

  // 🔧 STATI MODAL E FORM
  const [showAddTransaction, setShowAddTransaction] = useState(false)
  const [showEditTransaction, setShowEditTransaction] = useState(false)
  const [showEditPortfolio, setShowEditPortfolio] = useState(false)
  const [showSwap, setShowSwap] = useState(false)
  const [showNetworkFees, setShowNetworkFees] = useState(false)
  const [showAddFee, setShowAddFee] = useState(false)
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null)
  const [editingFee, setEditingFee] = useState<any | null>(null)
  const [submitLoading, setSubmitLoading] = useState(false)
  const [expandedSwaps, setExpandedSwaps] = useState<Set<string>>(new Set())
  const [trades, setTrades] = useState<any[]>([])
  const [showTrades, setShowTrades] = useState(false)
  const [tradesLoading, setTradesLoading] = useState(false)
  const [showOpenTrade, setShowOpenTrade] = useState(false)

  // 🔧 FORM TRANSAZIONE
  const [transactionForm, setTransactionForm] = useState({
    type: 'buy' as 'buy' | 'sell' | 'stake_reward',
    ticker: '',
    quantity: '',
    eurValue: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  })

  // 🔧 STATO PER PREZZO CORRENTE
  const [currentPrice, setCurrentPrice] = useState<number | null>(null)
  const [fetchingPrice, setFetchingPrice] = useState(false)
  const [priceTimeout, setPriceTimeout] = useState<NodeJS.Timeout | null>(null)

  // 🔧 FORM PORTFOLIO SETTINGS
  const [portfolioForm, setPortfolioForm] = useState({
    name: '',
    description: ''
  })

  // 🔧 FORM SWAP
  const [swapForm, setSwapForm] = useState({
    fromAsset: '',
    toAsset: '',
    fromQuantity: '',
    toQuantity: '',
    date: new Date().toISOString().split('T')[0],
    notes: ''
  })

  // 🔧 FORM NETWORK FEE
  const [feeForm, setFeeForm] = useState({
    assetId: '',
    quantity: '',
    eurValue: '',
    date: new Date().toISOString().split('T')[0],
    description: ''
  })

  // 🔧 STATO NETWORK FEES
  const [networkFees, setNetworkFees] = useState<any[]>([])
  const [feesLoading, setFeesLoading] = useState(false)

  // 🔧 STATI CSV IMPORT
  const [showImportModal, setShowImportModal] = useState(false)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [csvData, setCsvData] = useState<any[]>([])
  const [showPreview, setShowPreview] = useState(false)
  const [importResult, setImportResult] = useState<any>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [importProgress, setImportProgress] = useState({ current: 0, total: 0, currentBatch: 0, totalBatches: 0 })
  const [error, setError] = useState('')

  // 🔧 STATI BULK DELETE
  const [selectedTransactions, setSelectedTransactions] = useState<number[]>([])
  const [selectAll, setSelectAll] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [deleteProgress, setDeleteProgress] = useState({ current: 0, total: 0 })
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false)

  // Format functions
  const formatCurrencyWithUserCurrency = (amount: number) =>
    formatCurrency(amount, user?.currency || 'EUR')
  
  const formatCurrencySmartWithUserCurrency = (amount: number) =>
    formatCurrencySmart(amount, user?.currency || 'EUR')

  const formatPercentage = (value: number) =>
    `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`


  // 🔄 FUNZIONE HELPER PER RAGGRUPPARE SWAP
  const groupTransactions = (transactions: Transaction[]) => {
    const groupedItems: (Transaction | {
      id: string
      type: 'swap_group'
      swapOut: Transaction
      swapIn: Transaction
      date: string
      isExpanded?: boolean
    })[] = []
    
    const processedSwapIds = new Set<number>()
    
    for (const transaction of transactions) {
      // Se è una transazione swap e non l'abbiamo già processata
      if ((transaction.type === 'swap_out' || transaction.type === 'swap_in') && 
          transaction.swapPairId && 
          !processedSwapIds.has(transaction.id)) {
        
        // Trova la transazione collegata
        const pairedTransaction = transactions.find(t => 
          t.id === transaction.swapPairId || 
          (t.swapPairId === transaction.id)
        )
        
        if (pairedTransaction) {
          // Determina quale è swap_out e quale è swap_in
          const swapOut = transaction.type === 'swap_out' ? transaction : pairedTransaction
          const swapIn = transaction.type === 'swap_in' ? transaction : pairedTransaction
          
          // Crea gruppo swap
          groupedItems.push({
            id: `swap-${swapOut.id}-${swapIn.id}`,
            type: 'swap_group',
            swapOut,
            swapIn,
            date: transaction.date,
            isExpanded: false
          })
          
          // Marca entrambe come processate
          processedSwapIds.add(transaction.id)
          processedSwapIds.add(pairedTransaction.id)
        } else {
          // Se non trova la coppia, mostra come transazione singola
          groupedItems.push(transaction)
        }
      } else if (!processedSwapIds.has(transaction.id)) {
        // Transazione normale
        groupedItems.push(transaction)
      }
    }
    
    return groupedItems
  }

  // 🔄 FUNZIONI SWAP (spostate qui per hoisting)
  const resetSwapForm = () => {
    setSwapForm({
      fromAsset: '',
      toAsset: '',
      fromQuantity: '',
      toQuantity: '',
      date: new Date().toISOString().split('T')[0],
      notes: ''
    })
  }

  async function handleSwap(e: React.FormEvent) {
    e.preventDefault()

    if (!swapForm.fromAsset || !swapForm.toAsset || !swapForm.fromQuantity || !swapForm.toQuantity) {
      await alert({
        title: 'Campi Obbligatori',
        message: 'Compila tutti i campi obbligatori',
        variant: 'warning'
      })
      return
    }

    if (swapForm.fromAsset === swapForm.toAsset) {
      await alert({
        title: 'Errore Validazione',
        message: 'Non puoi fare swap dello stesso asset',
        variant: 'warning'
      })
      return
    }

    setSubmitLoading(true)
    try {
      const response = await fetch(`/api/crypto-portfolios/${portfolioId}/swap`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromAsset: swapForm.fromAsset,
          toAsset: swapForm.toAsset,
          fromQuantity: parseFloat(swapForm.fromQuantity),
          toQuantity: parseFloat(swapForm.toQuantity),
          date: swapForm.date,
          notes: swapForm.notes || null
        })
      })

      if (response.ok) {
        await fetchPortfolio()
        setShowSwap(false)
        resetSwapForm()
        await alert({
          title: 'Successo',
          message: 'Swap completato con successo!',
          variant: 'success'
        })
      } else {
        const error = await response.json()
        await alert({
          title: 'Errore',
          message: `Errore: ${error.error || 'Swap fallito'}`,
          variant: 'error'
        })
      }
    } catch (error) {
      console.error('Error creating swap:', error)
      await alert({
        title: 'Errore',
        message: 'Errore durante il swap',
        variant: 'error'
      })
    } finally {
      setSubmitLoading(false)
    }
  }

  // 🔄 FUNZIONI GESTIONE SWAP UNIFICATO
  async function handleEditSwap(swapGroup: any) {
    // TODO: Implementare modal modifica swap dedicato
    await alert({
      title: 'Funzione in Sviluppo',
      message: 'Modifica swap - Da implementare nel prossimo step',
      variant: 'info'
    })
  }

  async function handleDeleteSwap(swapGroup: any) {
    const confirmed = await confirm({
      title: 'Elimina Swap',
      message: `Sei sicuro di voler eliminare questo swap ${swapGroup.swapOut.asset.symbol} → ${swapGroup.swapIn.asset.symbol}?`,
      confirmText: 'Elimina',
      cancelText: 'Annulla',
      variant: 'danger'
    })

    if (!confirmed) return

    setSubmitLoading(true)
    try {
      // 🆕 USA IL NUOVO ENDPOINT CHE ELIMINA E RICALCOLA AUTOMATICAMENTE
      const response = await fetch(`/api/crypto-portfolios/${portfolioId}/swap/${swapGroup.swapOut.id}`, {
        method: 'DELETE'
      })
      
      if (response.ok) {
        const result = await response.json()
        await fetchPortfolio()
        // Rimuovi dall'espansione se era espanso
        const newExpanded = new Set(expandedSwaps)
        newExpanded.delete(swapGroup.id)
        setExpandedSwaps(newExpanded)
        await alert({
          title: 'Successo',
          message: 'Swap eliminato con successo! Holdings ricalcolati automaticamente.',
          variant: 'success'
        })
      } else {
        const error = await response.json()
        await alert({
          title: 'Errore',
          message: `Errore: ${error.error || 'Eliminazione swap fallita'}`,
          variant: 'error'
        })
      }
    } catch (error) {
      console.error('Error deleting swap:', error)
      await alert({
        title: 'Errore',
        message: 'Errore durante l\'eliminazione dello swap',
        variant: 'error'
      })
    } finally {
      setSubmitLoading(false)
    }
  }

  // 🎯 TRADE FUNCTIONS
  const handleOpenTrade = async (fromAssetId: number, toAssetSymbol: string, fromQuantity: number, toQuantity: number, notes?: string) => {
    try {
      const response = await fetch(`/api/crypto-portfolios/${portfolioId}/trades/open`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          fromAssetId, 
          toAssetSymbol, 
          fromQuantity, 
          toQuantity,
          notes 
        })
      })

      if (response.ok) {
        await fetchPortfolio() // Ricarica il portfolio per aggiornare holdings
        await fetchTrades() // Ricarica trades per mostrarli subito
        setShowOpenTrade(false)
        await alert({
          title: 'Successo',
          message: 'Trade aperto con successo!',
          variant: 'success'
        })
      } else {
        const error = await response.json()
        await alert({
          title: 'Errore',
          message: `Errore: ${error.error || 'Apertura trade fallita'}`,
          variant: 'error'
        })
      }
    } catch (error) {
      console.error('Errore apertura trade:', error)
      await alert({
        title: 'Errore',
        message: 'Errore durante l\'apertura del trade',
        variant: 'error'
      })
    }
  }

  const fetchTrades = async () => {
    setTradesLoading(true)
    try {
      const response = await fetch(`/api/crypto-portfolios/${portfolioId}/trades?t=${Date.now()}`)
      if (response.ok) {
        const data = await response.json()
        setTrades(data.trades || [])
      }
    } catch (error) {
      console.error('Errore caricamento trades:', error)
    } finally {
      setTradesLoading(false)
    }
  }

  const handleCloseTrade = async (trade: any) => {
    // Modal React nativo per input quantità
    const receivedQuantity = await new Promise<string | null>((resolve) => {
      const modal = document.createElement('div')
      modal.className = 'fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50'
      modal.innerHTML = `
        <div class="bg-white rounded-lg p-6 w-full max-w-md mx-4">
          <h3 class="text-lg font-semibold mb-4">Chiudi Trade</h3>
          <p class="text-gray-600 mb-4">Inserisci la quantità di ${trade.fromAsset.symbol} ricevuta:</p>
          <input type="number" id="quantityInput" class="w-full px-3 py-2 border border-gray-300 rounded-md mb-4" 
                 step="any" placeholder="0.00000000" value="${trade.fromQuantity || '0'}">
          <div class="flex gap-3 justify-end">
            <button id="cancelBtn" class="px-4 py-2 bg-gray-300 text-gray-700 rounded-md">Annulla</button>
            <button id="confirmBtn" class="px-4 py-2 bg-green-600 text-white rounded-md">Conferma</button>
          </div>
        </div>
      `
      document.body.appendChild(modal)
      
      const input = modal.querySelector('#quantityInput') as HTMLInputElement
      const cancelBtn = modal.querySelector('#cancelBtn')
      const confirmBtn = modal.querySelector('#confirmBtn')
      
      input.focus()
      input.select()
      
      const cleanup = () => {
        document.body.removeChild(modal)
      }
      
      cancelBtn?.addEventListener('click', () => {
        cleanup()
        resolve(null)
      })
      
      confirmBtn?.addEventListener('click', () => {
        const value = input.value.trim()
        cleanup()
        resolve(value)
      })
      
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          cleanup()
          resolve(input.value.trim())
        } else if (e.key === 'Escape') {
          cleanup()
          resolve(null)
        }
      })
    })

    if (!receivedQuantity || parseFloat(receivedQuantity) <= 0) {
      await alert({
        title: 'Errore',
        message: 'Quantità ricevuta non valida',
        variant: 'error'
      })
      return
    }

    const confirmed = await confirm({
      title: 'Chiudi Trade',
      message: `Confermi di aver ricevuto ${receivedQuantity} ${trade.fromAsset.symbol} chiudendo il trade?`,
      confirmText: 'Chiudi Trade',
      cancelText: 'Annulla',
      variant: 'warning'
    })

    if (!confirmed) return

    try {
      const response = await fetch(`/api/crypto-portfolios/${portfolioId}/trades/${trade.id}/close`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          receivedQuantity: parseFloat(receivedQuantity)
        })
      })

      if (response.ok) {
        const result = await response.json()
        await fetchTrades()
        await fetchPortfolio()
        await alert({
          title: 'Trade chiuso con successo!', 
          message: `P&L: ${result.performance.realizedPnL >= 0 ? '+' : ''}${result.performance.realizedPnL.toFixed(2)}€ (${result.performance.pnLPercentage >= 0 ? '+' : ''}${result.performance.pnLPercentage.toFixed(2)}%)`,
          variant: 'success'
        })
      } else {
        const error = await response.json()
        throw new Error(error.error || 'Errore sconosciuto')
      }
    } catch (error) {
      console.error('Error closing trade:', error)
      await alert({
        title: 'Errore', 
        message: error instanceof Error ? error.message : 'Errore durante la chiusura del trade',
        variant: 'error'
      })
    }
  }

  // 🔧 NETWORK FEES MANAGEMENT
  const fetchNetworkFees = async () => {
    setFeesLoading(true)
    try {
      const response = await fetch(`/api/crypto-portfolios/${portfolioId}/network-fees`)
      if (response.ok) {
        const data = await response.json()
        setNetworkFees(data.fees || [])
      }
    } catch (error) {
      console.error('Error fetching network fees:', error)
    } finally {
      setFeesLoading(false)
    }
  }

  const resetFeeForm = () => {
    setFeeForm({
      assetId: '',
      quantity: '',
      eurValue: '',
      date: new Date().toISOString().split('T')[0],
      description: ''
    })
  }

  const handleAddFee = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitLoading(true)

    try {
      const response = await fetch(`/api/crypto-portfolios/${portfolioId}/network-fees`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(feeForm)
      })

      if (response.ok) {
        await fetchPortfolio()
        await fetchNetworkFees()
        setShowAddFee(false)
        resetFeeForm()
        await alert({
          title: 'Successo',
          message: 'Network fee aggiunta con successo!',
          variant: 'success'
        })
      } else {
        const error = await response.json()
        await alert({
          title: 'Errore',
          message: `Errore: ${error.error || 'Creazione fee fallita'}`,
          variant: 'error'
        })
      }
    } catch (error) {
      console.error('Error adding network fee:', error)
      await alert({
        title: 'Errore',
        message: 'Errore durante l\'aggiunta della network fee',
        variant: 'error'
      })
    } finally {
      setSubmitLoading(false)
    }
  }

  const handleDeleteFee = async (feeId: number) => {
    const confirmed = await confirm({
      title: 'Elimina Network Fee',
      message: 'Sei sicuro di voler eliminare questa network fee?',
      confirmText: 'Elimina',
      cancelText: 'Annulla',
      variant: 'danger'
    })

    if (!confirmed) return

    setSubmitLoading(true)
    try {
      const response = await fetch(`/api/crypto-portfolios/${portfolioId}/network-fees/${feeId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchPortfolio()
        await fetchNetworkFees()
        await alert({
          title: 'Successo',
          message: 'Network fee eliminata con successo!',
          variant: 'success'
        })
      } else {
        const error = await response.json()
        await alert({
          title: 'Errore',
          message: `Errore: ${error.error || 'Eliminazione fee fallita'}`,
          variant: 'error'
        })
      }
    } catch (error) {
      console.error('Error deleting network fee:', error)
      await alert({
        title: 'Errore',
        message: 'Errore durante l\'eliminazione della network fee',
        variant: 'error'
      })
    } finally {
      setSubmitLoading(false)
    }
  }

  // 🔧 CARICAMENTO DATI
  const fetchPortfolio = async () => {
    setLoading(true)
    try {
      const portfolioRes = await fetch(`/api/crypto-portfolios/${portfolioId}`)

      if (portfolioRes.ok) {
        const portfolioData = await portfolioRes.json()
        setPortfolio(portfolioData)
        setPortfolioForm({
          name: portfolioData.name,
          description: portfolioData.description || ''
        })
      }
    } catch (error) {
      console.error('Error fetching portfolio:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPortfolio()
    fetchNetworkFees()
  }, [portfolioId])

  // 🔧 FETCH PREZZI LIVE per tutti gli holding
  const fetchLivePrices = async () => {
    if (!portfolio || portfolio.holdings.length === 0) return
    
    try {
      const symbols = portfolio.holdings.map(h => h.asset.symbol).join(',')
      console.log('🔄 Fetching live prices for:', symbols)
      
      const response = await fetch(`/api/crypto-prices?symbols=${symbols}&force=true`)
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ Live prices received:', data.prices)
        setLivePrices(data.prices || {})
      } else {
        console.error('❌ Errore fetch prezzi live:', response.status)
      }
    } catch (error) {
      console.error('💥 Errore fetch prezzi live:', error)
    }
  }

  // 🔧 CARICA PREZZI LIVE quando il portfolio si carica
  useEffect(() => {
    if (portfolio && portfolio.holdings.length > 0) {
      fetchLivePrices()
    }
  }, [portfolio])

  // 🔧 CLEANUP DEL TIMEOUT AL DISMOUNT
  useEffect(() => {
    return () => {
      if (priceTimeout) {
        clearTimeout(priceTimeout)
      }
    }
  }, [priceTimeout])

  // 🔧 AGGIORNA PREZZI LIVE (non database)
  const updatePrices = async () => {
    if (!portfolio || portfolio.holdings.length === 0) return
    
    setPriceLoading(true)
    try {
      const symbols = portfolio.holdings.map(h => h.asset.symbol).join(',')
      
      console.log('🔄 Aggiornando prezzi live per:', symbols)
      
      const response = await fetch(`/api/crypto-prices?symbols=${symbols}&force=true`)
      
      if (response.ok) {
        const data = await response.json()
        console.log('✅ Prezzi live aggiornati:', data.prices)
        setLivePrices(data.prices || {})
        
        // Mostra messaggio di successo
        await alert({
          title: 'Successo',
          message: 'Prezzi aggiornati con successo!',
          variant: 'success'
        })
      } else {
        console.error('❌ Errore aggiornamento prezzi:', response.status)
        await alert({
        title: 'Errore',
        message: 'Errore durante l\'aggiornamento dei prezzi',
        variant: 'error'
      })
      }
    } catch (error) {
      console.error('💥 Errore aggiornamento prezzi:', error)
      await alert({
        title: 'Errore',
        message: 'Errore durante l\'aggiornamento dei prezzi',
        variant: 'error'
      })
    } finally {
      setPriceLoading(false)
    }
  }

  // 🔧 FETCH PREZZO DA CRYPTOPRICES.CC con debounce
  const debouncedFetchPrice = (ticker: string) => {
    if (priceTimeout) {
      clearTimeout(priceTimeout)
    }
    
    const newTimeout = setTimeout(() => {
      fetchCryptoPrice(ticker)
    }, 500)
    
    setPriceTimeout(newTimeout)
  }

  // 🔧 FETCH PREZZO DA CRYPTOPRICES.CC
  const fetchCryptoPrice = async (ticker: string) => {
    const cleanTicker = ticker.trim().toUpperCase()
    
    if (!cleanTicker || cleanTicker.length < 2) {
      setCurrentPrice(null)
      return
    }

    console.log(`🔍 Fetching price for: ${cleanTicker}`)
    setFetchingPrice(true)
    
    try {
      const response = await fetch(`/api/crypto-prices?symbols=${cleanTicker}`)
      
      if (response.ok) {
        const data = await response.json()
        const price = data.prices?.[cleanTicker]
        
        if (price && price > 0) {
          console.log(`✅ Price found for ${cleanTicker}: €${price}`)
          setCurrentPrice(price)
          
          if (transactionForm.quantity && !isNaN(parseFloat(transactionForm.quantity))) {
            const quantity = parseFloat(transactionForm.quantity)
            const calculatedValue = smartRoundPrice(quantity * price)
            setTransactionForm(prev => ({ ...prev, eurValue: calculatedValue.toString() }))
          }
        } else {
          console.warn(`⚠️ Prezzo non disponibile per ${cleanTicker}`)
          setCurrentPrice(null)
        }
      } else {
        console.error(`❌ Errore API (${response.status}) per ${cleanTicker}`)
        setCurrentPrice(null)
      }
    } catch (error) {
      console.error(`💥 Errore fetch prezzo per ${cleanTicker}:`, error)
      setCurrentPrice(null)
    } finally {
      setFetchingPrice(false)
    }
  }

  // Handle delete portfolio
  const handleDeletePortfolio = async () => {
    const confirmed = await confirm({
      title: 'Elimina Portfolio',
      message: 'Sei sicuro di voler eliminare questo portfolio? Questa azione non può essere annullata.',
      confirmText: 'Elimina',
      cancelText: 'Annulla',
      variant: 'danger'
    })

    if (!confirmed) return

    try {
      const response = await fetch(`/api/crypto-portfolios/${portfolioId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        router.push('/investments')
      } else {
        const error = await response.json()
        await alert({
          title: 'Errore',
          message: `Errore: ${error.error || 'Eliminazione portfolio fallita'}`,
          variant: 'error'
        })
      }
    } catch (error) {
      console.error('Error deleting portfolio:', error)
      await alert({
        title: 'Errore',
        message: 'Errore durante l\'eliminazione del portfolio',
        variant: 'error'
      })
    }
  }

  // Utility functions
  const resetTransactionForm = () => {
    setTransactionForm({
      type: 'buy',
      ticker: '',
      quantity: '',
      eurValue: '',
      date: new Date().toISOString().split('T')[0],
      notes: ''
    })
    setCurrentPrice(null)
    if (priceTimeout) {
      clearTimeout(priceTimeout)
      setPriceTimeout(null)
    }
  }

  const openEditTransaction = (transaction: Transaction) => {
    setEditingTransaction(transaction)
    setTransactionForm({
      type: transaction.type,
      ticker: transaction.asset.symbol,
      quantity: transaction.quantity.toString(),
      eurValue: transaction.eurValue.toString(),
      date: transaction.date.split('T')[0],
      notes: transaction.notes || ''
    })
    
    if (transaction.asset.symbol && transaction.asset.symbol.length >= 3) {
      fetchCryptoPrice(transaction.asset.symbol)
    }
    
    setShowEditTransaction(true)
  }

  // 🔧 CSV IMPORT FUNCTIONS
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.name.toLowerCase().endsWith('.csv')) {
      setError('Seleziona un file CSV valido')
      return
    }

    setCsvFile(file)
    setError('')

    const reader = new FileReader()
    reader.onload = (event) => {
      const csvText = event.target?.result as string
      try {
        // Rileva automaticamente il separatore (virgola o punto e virgola)
        const lines = csvText.split('\n').filter(line => line.trim())
        let separator = ','
        
        if (lines[0] && lines[0].includes(';') && lines[0].split(';').length > lines[0].split(',').length) {
          separator = ';'
        }
        
        console.log(`🔍 Separatore CSV rilevato: "${separator}"`)
        console.log(`📄 Prima riga: ${lines[0]}`)
        
        // Parser CSV più robusto che gestisce virgolette
        const parseCSVLine = (line: string) => {
          const result = []
          let current = ''
          let inQuotes = false
          
          for (let i = 0; i < line.length; i++) {
            const char = line[i]
            const nextChar = line[i + 1]
            
            if (char === '"') {
              if (inQuotes && nextChar === '"') {
                current += '"'
                i++ // Skip next quote
              } else {
                inQuotes = !inQuotes
              }
            } else if (char === separator && !inQuotes) {
              result.push(current.trim())
              current = ''
            } else {
              current += char
            }
          }
          result.push(current.trim())
          return result
        }
        
        const headerValues = parseCSVLine(lines[0])
        const headers = headerValues.map(h => h.toLowerCase().replace(/['"]/g, ''))
        
        console.log(`📋 Headers rilevati:`, headers)
        
        const expectedHeaders = ['data', 'tipo', 'asset', 'asset_to', 'quantita', 'quantita_to', 'valore_eur', 'prezzo_unitario', 'broker', 'note']
        
        const data = lines.slice(1).map((line, index) => {
          const values = parseCSVLine(line)
          const row: any = {}
          
          console.log(`🔍 Riga ${index + 2} RAW:`, line)
          console.log(`🔍 Riga ${index + 2} VALUES:`, values)
          console.log(`🔍 Numero campi trovati: ${values.length}, attesi: ${expectedHeaders.length}`)
          
          expectedHeaders.forEach((header, i) => {
            const value = values[i] || ''
            row[header] = value.replace(/['"]/g, '').trim()
          })
          
          console.log(`🔍 Riga ${index + 2} PARSED:`, row)
          
          // Debug specifico per broker
          if (!row.broker || row.broker.trim() === '') {
            console.error(`❌ Riga ${index + 2}: BROKER VUOTO!`, {
              brokerIndex: expectedHeaders.indexOf('broker'),
              brokerValue: values[expectedHeaders.indexOf('broker')],
              allValues: values
            })
          }
          
          return row
        }).filter(row => row.data && row.tipo && row.asset)

        if (data.length === 0) {
          setError('Nessun dato valido trovato nel CSV')
          return
        }

        setCsvData(data)
        setShowPreview(true)
      } catch (error) {
        console.error('Error parsing CSV:', error)
        setError('Errore nel parsing del CSV. Controlla il formato del file.')
      }
    }

    reader.readAsText(file)
  }

  const handleImportCSV = async () => {
    if (csvData.length === 0) return

    setIsImporting(true)
    setImportResult(null)
    setImportProgress({ current: 0, total: csvData.length, currentBatch: 0, totalBatches: 0 })

    try {
      const response = await fetch(`/api/crypto-portfolios/${portfolioId}/transactions/import-csv-stream`, {
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
              console.log('📊 Crypto SSE Progress:', data)
              
              if (data.type === 'progress') {
                console.log('📈 Updating crypto progress:', data.current, '/', data.total)
                setImportProgress({
                  current: data.current,
                  total: data.total,
                  currentBatch: data.currentBatch || 0,
                  totalBatches: data.totalBatches || 0
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
        fetchPortfolio()
      }
    } catch (error) {
      console.error('Errore durante import CSV crypto:', error)
      setImportResult({
        success: false,
        imported: 0,
        errors: [
          'Errore durante l\'import del CSV crypto.',
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

  // 🔧 BULK DELETE FUNCTIONS
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

  const handleBulkDelete = () => {
    if (selectedTransactions.length === 0) return
    setShowBulkDeleteModal(true)
  }

  const confirmBulkDelete = async () => {
    setIsDeleting(true)
    setDeleteProgress({ current: 0, total: selectedTransactions.length })

    try {
      for (let i = 0; i < selectedTransactions.length; i++) {
        const transactionId = selectedTransactions[i]
        
        await fetch(`/api/crypto-portfolios/${portfolioId}/transactions/${transactionId}`, {
          method: 'DELETE'
        })
        
        setDeleteProgress({ current: i + 1, total: selectedTransactions.length })
        
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      await fetchPortfolio()
      setSelectedTransactions([])
      setSelectAll(false)
      setShowBulkDeleteModal(false)
    } catch (error) {
      console.error('Errore durante eliminazione bulk:', error)
      await alert({
        title: 'Errore',
        message: 'Errore durante l\'eliminazione delle transazioni',
        variant: 'error'
      })
    } finally {
      setIsDeleting(false)
      setDeleteProgress({ current: 0, total: 0 })
    }
  }

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse">
          <div className="h-8 bg-adaptive-200 rounded w-1/3 mb-6"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-32 bg-adaptive-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (!portfolio) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="text-center py-12">
          <h1 className="text-2xl font-bold text-adaptive-900 mb-4">Portfolio non trovato</h1>
          <Link href="/investments" className="text-blue-600 hover:text-blue-800">
            ← Torna agli investimenti
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-4 sm:py-8">
      {/* Header - Mobile Optimized */}
      <div className="mb-6 sm:mb-8">
        <div className="flex items-center gap-4 mb-4">
          <Link
            href="/investments"
            className="p-2 text-adaptive-600 hover:text-adaptive-900 hover:bg-adaptive-100 rounded-lg"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </Link>
          <div className="flex-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-adaptive-900 flex items-center gap-2 sm:gap-3">
              🚀 {portfolio.name}
            </h1>
            {portfolio.description && (
              <p className="text-adaptive-600 mt-1 text-sm sm:text-base">{portfolio.description}</p>
            )}
            <p className="text-xs sm:text-sm text-adaptive-500 mt-1">
              Collegato a: {portfolio.account.name} ({formatCurrencyWithUserCurrency(portfolio.account.balance)})
            </p>
          </div>
        </div>
        
        {/* Desktop Buttons */}
        <div className="hidden sm:flex gap-3 justify-end">
          <button
            onClick={() => setShowEditPortfolio(true)}
            className="flex items-center gap-2 px-4 py-2 text-adaptive-600 border border-adaptive-300 rounded-md hover:bg-adaptive-50"
            title="Impostazioni Portfolio"
          >
            <Cog6ToothIcon className="w-5 h-5" />
            Impostazioni
          </button>
          
          <button
            onClick={handleDeletePortfolio}
            className="flex items-center gap-2 px-4 py-2 text-red-600 border border-red-300 rounded-md hover:bg-red-50"
            title="Elimina Portfolio"
          >
            <TrashIcon className="w-5 h-5" />
            Elimina
          </button>
          
          <button
            onClick={() => setShowImportModal(true)}
            className="flex items-center gap-2 px-4 py-2 text-green-600 border border-green-300 rounded-md hover:bg-green-50"
            title="Import CSV Transazioni Crypto"
          >
            <DocumentArrowUpIcon className="w-5 h-5" />
            Import CSV
          </button>
          
          <button
            onClick={() => setShowAddTransaction(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
          >
            <PlusIcon className="w-5 h-5" />
            Nuova Transazione
          </button>
        </div>
        
        {/* Mobile Buttons */}
        <div className="sm:hidden space-y-3">
          <button
            onClick={() => setShowAddTransaction(true)}
            className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
          >
            <PlusIcon className="w-4 h-4" />
            Nuova Transazione
          </button>
          
          <div className="grid grid-cols-3 gap-2">
            <button
              onClick={() => setShowImportModal(true)}
              className="flex items-center justify-center gap-1 px-3 py-2 text-green-600 border border-green-300 rounded-lg hover:bg-green-50 text-xs"
            >
              <DocumentArrowUpIcon className="w-4 h-4" />
              Import
            </button>
            
            <button
              onClick={() => setShowEditPortfolio(true)}
              className="flex items-center justify-center gap-1 px-3 py-2 text-adaptive-600 border border-adaptive-300 rounded-lg hover:bg-adaptive-50 text-xs"
            >
              <Cog6ToothIcon className="w-4 h-4" />
              Impostazioni
            </button>
            
            <button
              onClick={handleDeletePortfolio}
              className="flex items-center justify-center gap-1 px-3 py-2 text-red-600 border border-red-300 rounded-lg hover:bg-red-50 text-xs"
            >
              <TrashIcon className="w-4 h-4" />
              Elimina
            </button>
          </div>
        </div>
      </div>

      {/* 🚀 Enhanced Statistics Overview - Mobile Optimized */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-6 sm:mb-8">
        <div className="card-adaptive rounded-lg shadow-sm border-adaptive p-4 sm:p-6 text-center sm:text-left">
          <h3 className="text-sm font-medium text-adaptive-500 mb-2">💰 Investimento Totale</h3>
          <p className="text-xl sm:text-2xl font-bold text-adaptive-900">{formatCurrencyWithUserCurrency(portfolio.stats.totalInvested)}</p>
          <p className="text-xs text-adaptive-600 mt-1">{portfolio.stats.buyCount} acquisti</p>
        </div>
        
        <div className="card-adaptive rounded-lg shadow-sm border-adaptive p-4 sm:p-6 text-center sm:text-left">
          <h3 className="text-sm font-medium text-adaptive-500 mb-2">💸 Capitale Recuperato</h3>
          <p className="text-xl sm:text-2xl font-bold text-adaptive-900">{formatCurrencyWithUserCurrency(portfolio.stats.capitalRecovered)}</p>
          <p className="text-xs text-adaptive-600 mt-1">
            {portfolio.stats.sellCount} vendite
            {portfolio.stats.capitalFromSwaps > 0 && (
              <span className="block text-orange-600">
                + {formatCurrencyWithUserCurrency(portfolio.stats.capitalFromSwaps)} da {portfolio.stats.swapCount} swap
              </span>
            )}
          </p>
        </div>
        
        <div className="card-adaptive rounded-lg shadow-sm border-adaptive p-4 sm:p-6 text-center sm:text-left">
          <h3 className="text-sm font-medium text-adaptive-500 mb-2">📈 Valore Attuale</h3>
          <p className="text-xl sm:text-2xl font-bold text-green-600">{formatCurrencyWithUserCurrency(portfolio.stats.totalValueEur)}</p>
          <p className="text-xs text-adaptive-600 mt-1">{portfolio.stats.holdingsCount} asset</p>
        </div>
        
        <div className="card-adaptive rounded-lg shadow-sm border-adaptive p-4 sm:p-6 text-center sm:text-left sm:col-span-2 lg:col-span-1">
          <h3 className="text-sm font-medium text-adaptive-500 mb-2">🎯 ROI Totale</h3>
          <p className={`text-xl sm:text-2xl font-bold ${portfolio.stats.totalROI >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {formatPercentage(portfolio.stats.totalROI)}
          </p>
          <p className="text-xs text-adaptive-600 mt-1">
            {portfolio.stats.isFullyRecovered ? 'Recuperato' : 'A rischio'}
          </p>
        </div>
      </div>

      {/* 🆕 Riepilogo P&L Multi-Asset - Mobile Optimized */}
      <div className="card-adaptive rounded-lg shadow-sm border-adaptive mb-6 sm:mb-8">
        <div className="p-4 sm:p-6 border-b border-adaptive">
          <h2 className="text-base sm:text-lg font-semibold text-adaptive-900">📊 Riepilogo P&L Multi-Asset</h2>
        </div>
        
        <div className="p-4 sm:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 mb-4 sm:mb-6">
            <div className="card-adaptive p-4 rounded-lg border border-adaptive text-center sm:text-left">
              <div className="text-sm text-adaptive-500 mb-1">💰 Profitti Realizzati</div>
              <div className="text-xl sm:text-2xl font-bold text-green-600">
                {formatCurrencyWithUserCurrency(portfolio.stats.realizedProfit - (portfolio.stats.stakeRewards || 0))}
              </div>
              <div className="text-xs text-adaptive-600 mt-1">Da vendite</div>
            </div>
            
            <div className="card-adaptive p-4 rounded-lg border border-adaptive text-center sm:text-left">
              <div className="text-sm text-adaptive-500 mb-1">🏆 Staking Rewards</div>
              <div className="text-xl sm:text-2xl font-bold text-blue-600">
                {formatCurrencyWithUserCurrency(portfolio.stats.stakeRewards || 0)}
              </div>
              <div className="text-xs text-adaptive-600 mt-1">
                {portfolio.stats.stakeRewardCount || 0} reward
                {portfolio.stats.stakeRewards > 0 && (
                  <span className="block text-blue-500">Valore corrente</span>
                )}
              </div>
            </div>
            
            <div className="card-adaptive p-4 rounded-lg border border-adaptive text-center sm:text-left">
              <div className="text-sm text-adaptive-500 mb-1">📈 Plus/Minus Non Realizzati</div>
              <div className={`text-xl sm:text-2xl font-bold ${portfolio.stats.unrealizedGains >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrencyWithUserCurrency(portfolio.stats.unrealizedGains)}
              </div>
              <div className="text-xs text-adaptive-600 mt-1">Su holdings correnti</div>
            </div>
            
            <div className="card-adaptive p-4 rounded-lg border border-adaptive text-center sm:text-left sm:col-span-2 lg:col-span-1">
              <div className="text-sm text-adaptive-500 mb-1">🎯 Totale P&L</div>
              <div className={`text-xl sm:text-2xl font-bold ${(portfolio.stats.realizedProfit + portfolio.stats.unrealizedGains) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                {formatCurrencyWithUserCurrency(portfolio.stats.realizedProfit + portfolio.stats.unrealizedGains)}
              </div>
              <div className="text-xs text-adaptive-600 mt-1">Performance totale</div>
            </div>
          </div>

          {/* 🆕 Performance per Asset - Mobile Optimized */}
          <div className="mt-4 sm:mt-6">
            <h3 className="text-sm font-medium text-adaptive-500 mb-4">📈 Performance per Asset</h3>
            
            {/* Desktop View */}
            <div className="hidden lg:block space-y-3">
              {portfolio.holdings
                .filter(holding => (holding.netQuantity || holding.quantity) > 0.0000001)
                .sort((a, b) => {
                  const aLivePrice = livePrices[a.asset.symbol]
                  const aNetQuantity = a.netQuantity || a.quantity
                  const aValue = (aLivePrice && aLivePrice > 0) ? aNetQuantity * aLivePrice : 
                    (a.currentPrice && Math.abs(a.currentPrice - a.avgPrice) > 0.000001 && !(Math.abs(a.currentPrice - a.avgPrice) < 0.000001 && a.currentPrice > 0.001 && (!aLivePrice || aLivePrice === 0))) ? aNetQuantity * a.currentPrice : 
                    (Math.abs(a.currentPrice - a.avgPrice) < 0.000001 && a.currentPrice > 0.001 && (!aLivePrice || aLivePrice === 0)) ? 0 : aNetQuantity * a.avgPrice
                  
                  const bLivePrice = livePrices[b.asset.symbol]
                  const bNetQuantity = b.netQuantity || b.quantity
                  const bValue = (bLivePrice && bLivePrice > 0) ? bNetQuantity * bLivePrice : 
                    (b.currentPrice && Math.abs(b.currentPrice - b.avgPrice) > 0.000001 && !(Math.abs(b.currentPrice - b.avgPrice) < 0.000001 && b.currentPrice > 0.001 && (!bLivePrice || bLivePrice === 0))) ? bNetQuantity * b.currentPrice : 
                    (Math.abs(b.currentPrice - b.avgPrice) < 0.000001 && b.currentPrice > 0.001 && (!bLivePrice || bLivePrice === 0)) ? 0 : bNetQuantity * b.avgPrice
                  
                  return bValue - aValue
                })
                .map(holding => {
                const livePrice = livePrices[holding.asset.symbol]
                const currentPrice = livePrice || ((holding.currentPrice !== null && holding.currentPrice !== undefined) ? holding.currentPrice : holding.avgPrice)
                const netQuantity = holding.netQuantity || holding.quantity
                const isPriceDataSuspect = Math.abs(holding.currentPrice - holding.avgPrice) < 0.000001 && 
                  holding.currentPrice > 0.001 && // Prezzo sospettosamente alto
                  (!livePrice || livePrice === 0) // Ma API dice 0
                
                const shouldUseLivePrice = livePrice && livePrice > 0
                const shouldUseCurrentPrice = holding.currentPrice && 
                  Math.abs(holding.currentPrice - holding.avgPrice) > 0.000001 && // Non identici
                  !isPriceDataSuspect // E non sospetti
                
                const currentValue = shouldUseLivePrice
                  ? netQuantity * livePrice 
                  : shouldUseCurrentPrice 
                    ? netQuantity * holding.currentPrice
                    : isPriceDataSuspect 
                      ? 0 // Forza a 0 se i dati sono sospetti
                      : netQuantity * holding.avgPrice
                const investedValue = netQuantity * holding.avgPrice
                const assetPnL = currentValue - investedValue
                const assetROI = investedValue > 0 ? ((assetPnL / investedValue) * 100) : 0
                const portfolioWeight = portfolio.stats.totalValueEur > 0 ? ((currentValue / portfolio.stats.totalValueEur) * 100) : 0

                return (
                  <div key={holding.asset.symbol} className="flex items-center justify-between p-3 bg-adaptive-50 rounded">
                    <div className="flex items-center gap-3">
                      <div className="text-lg font-bold">{holding.asset.symbol}</div>
                      <div className="text-sm text-adaptive-600">{holding.asset.name}</div>
                    </div>
                    
                    <div className="flex items-center gap-6 text-sm">
                      <div className="text-center">
                        <div className="text-xs text-adaptive-500">Valore</div>
                        <div className="font-semibold">{formatCurrencyWithUserCurrency(currentValue)}</div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-xs text-adaptive-500">P&L</div>
                        <div className={`font-semibold ${assetPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatCurrencyWithUserCurrency(assetPnL)}
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-xs text-adaptive-500">ROI</div>
                        <div className={`font-semibold ${assetROI >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          {formatPercentage(assetROI)}
                        </div>
                      </div>
                      
                      <div className="text-center">
                        <div className="text-xs text-adaptive-500">% Portfolio</div>
                        <div className="font-semibold text-adaptive-900">
                          {portfolioWeight.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
            
            {/* Mobile Card View */}
            <div className="lg:hidden space-y-3">
              {portfolio.holdings
                .filter(holding => (holding.netQuantity || holding.quantity) > 0.0000001)
                .sort((a, b) => {
                  const aLivePrice = livePrices[a.asset.symbol]
                  const aNetQuantity = a.netQuantity || a.quantity
                  const aValue = (aLivePrice && aLivePrice > 0) ? aNetQuantity * aLivePrice : 
                    (a.currentPrice && Math.abs(a.currentPrice - a.avgPrice) > 0.000001 && !(Math.abs(a.currentPrice - a.avgPrice) < 0.000001 && a.currentPrice > 0.001 && (!aLivePrice || aLivePrice === 0))) ? aNetQuantity * a.currentPrice : 
                    (Math.abs(a.currentPrice - a.avgPrice) < 0.000001 && a.currentPrice > 0.001 && (!aLivePrice || aLivePrice === 0)) ? 0 : aNetQuantity * a.avgPrice
                  
                  const bLivePrice = livePrices[b.asset.symbol]
                  const bNetQuantity = b.netQuantity || b.quantity
                  const bValue = (bLivePrice && bLivePrice > 0) ? bNetQuantity * bLivePrice : 
                    (b.currentPrice && Math.abs(b.currentPrice - b.avgPrice) > 0.000001 && !(Math.abs(b.currentPrice - b.avgPrice) < 0.000001 && b.currentPrice > 0.001 && (!bLivePrice || bLivePrice === 0))) ? bNetQuantity * b.currentPrice : 
                    (Math.abs(b.currentPrice - b.avgPrice) < 0.000001 && b.currentPrice > 0.001 && (!bLivePrice || bLivePrice === 0)) ? 0 : bNetQuantity * b.avgPrice
                  
                  return bValue - aValue
                })
                .map(holding => {
                const livePrice = livePrices[holding.asset.symbol]
                const currentPrice = livePrice || ((holding.currentPrice !== null && holding.currentPrice !== undefined) ? holding.currentPrice : holding.avgPrice)
                const netQuantity = holding.netQuantity || holding.quantity
                const isPriceDataSuspect = Math.abs(holding.currentPrice - holding.avgPrice) < 0.000001 && 
                  holding.currentPrice > 0.001 && // Prezzo sospettosamente alto
                  (!livePrice || livePrice === 0) // Ma API dice 0
                
                const shouldUseLivePrice = livePrice && livePrice > 0
                const shouldUseCurrentPrice = holding.currentPrice && 
                  Math.abs(holding.currentPrice - holding.avgPrice) > 0.000001 && // Non identici
                  !isPriceDataSuspect // E non sospetti
                
                const currentValue = shouldUseLivePrice
                  ? netQuantity * livePrice 
                  : shouldUseCurrentPrice 
                    ? netQuantity * holding.currentPrice
                    : isPriceDataSuspect 
                      ? 0 // Forza a 0 se i dati sono sospetti
                      : netQuantity * holding.avgPrice
                const investedValue = netQuantity * holding.avgPrice
                const assetPnL = currentValue - investedValue
                const assetROI = investedValue > 0 ? ((assetPnL / investedValue) * 100) : 0
                const portfolioWeight = portfolio.stats.totalValueEur > 0 ? ((currentValue / portfolio.stats.totalValueEur) * 100) : 0

                return (
                  <div key={holding.asset.symbol} className="card-adaptive p-4 rounded-lg border border-adaptive">
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="text-lg font-bold text-adaptive-900">{holding.asset.symbol}</h4>
                          {livePrice && (
                            <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded">LIVE</span>
                          )}
                        </div>
                        <p className="text-sm text-adaptive-600 mb-2">{holding.asset.name}</p>
                        <p className="text-lg font-bold text-adaptive-900">
                          {formatCurrencyWithUserCurrency(currentValue)}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-adaptive-500">% Portfolio</div>
                        <div className="text-sm font-bold text-adaptive-900">
                          {portfolioWeight.toFixed(1)}%
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 text-sm">📈</span>
                        <div>
                          <span className="text-xs text-adaptive-600">P&L</span>
                          <p className={`text-sm font-bold ${assetPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatCurrencyWithUserCurrency(assetPnL)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-gray-500 text-sm">🎯</span>
                        <div>
                          <span className="text-xs text-adaptive-600">ROI</span>
                          <p className={`text-sm font-bold ${assetROI >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {formatPercentage(assetROI)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Holdings Table */}
      <div className="card-adaptive rounded-lg shadow-sm border-adaptive mb-8">
        <div className="flex items-center justify-between p-6 border-b border-adaptive">
          <h2 className="text-xl font-bold text-adaptive-900">🪙 Holdings</h2>
          <div className="flex gap-3">
            <button
              onClick={updatePrices}
              disabled={priceLoading}
              className="flex items-center gap-2 px-3 py-1 text-sm bg-adaptive-100 text-adaptive-700 rounded-md hover:bg-adaptive-200 disabled:opacity-50"
            >
              {priceLoading ? '⏳ Aggiornamento...' : '🔄 Aggiorna Prezzi'}
            </button>
          </div>
        </div>
        
        <div className="p-6">
          {portfolio.holdings.filter(holding => (holding.netQuantity || holding.quantity) > 0.0000001).length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">🪙</div>
              <h3 className="text-lg font-medium text-adaptive-900 mb-2">Nessun Asset</h3>
              <p className="text-adaptive-600">I tuoi asset appariranno qui dopo la prima transazione</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* 🆕 Grafico a Torta Holdings */}
              <div className="flex flex-col lg:flex-row gap-6">
                <div className="lg:w-1/3">
                  <div className="bg-adaptive-50 rounded-lg p-6">
                    <h3 className="text-base sm:text-lg font-semibold text-adaptive-900 mb-4">📊 Distribuzione Portfolio</h3>
                    <div className="relative">
                      <svg viewBox="0 0 200 200" className="w-40 h-40 sm:w-48 sm:h-48 mx-auto">
                        {(() => {
                          const filteredHoldings = portfolio.holdings.filter(holding => (holding.netQuantity || holding.quantity) > 0.0000001)
                          const totalValue = filteredHoldings.reduce((sum, holding) => {
                            const livePrice = livePrices[holding.asset.symbol]
                            const currentPrice = livePrice || ((holding.currentPrice !== null && holding.currentPrice !== undefined) ? holding.currentPrice : holding.avgPrice)
                            const netQuantity = holding.netQuantity || holding.quantity
                            const currentValue = livePrice 
                              ? netQuantity * livePrice 
                              : netQuantity * ((holding.currentPrice !== null && holding.currentPrice !== undefined) ? holding.currentPrice : holding.avgPrice)
                            return sum + currentValue
                          }, 0)
                          
                          let currentAngle = 0
                          const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6B7280']
                          
                          return filteredHoldings
                            .sort((a, b) => {
                              const aLivePrice = livePrices[a.asset.symbol]
                              const aNetQuantity = a.netQuantity || a.quantity
                              const aValue = (aLivePrice && aLivePrice > 0) ? aNetQuantity * aLivePrice : 
                    (a.currentPrice && Math.abs(a.currentPrice - a.avgPrice) > 0.000001 && !(Math.abs(a.currentPrice - a.avgPrice) < 0.000001 && a.currentPrice > 0.001 && (!aLivePrice || aLivePrice === 0))) ? aNetQuantity * a.currentPrice : 
                    (Math.abs(a.currentPrice - a.avgPrice) < 0.000001 && a.currentPrice > 0.001 && (!aLivePrice || aLivePrice === 0)) ? 0 : aNetQuantity * a.avgPrice
                              
                              const bLivePrice = livePrices[b.asset.symbol]
                              const bNetQuantity = b.netQuantity || b.quantity
                              const bValue = (bLivePrice && bLivePrice > 0) ? bNetQuantity * bLivePrice : 
                    (b.currentPrice && Math.abs(b.currentPrice - b.avgPrice) > 0.000001 && !(Math.abs(b.currentPrice - b.avgPrice) < 0.000001 && b.currentPrice > 0.001 && (!bLivePrice || bLivePrice === 0))) ? bNetQuantity * b.currentPrice : 
                    (Math.abs(b.currentPrice - b.avgPrice) < 0.000001 && b.currentPrice > 0.001 && (!bLivePrice || bLivePrice === 0)) ? 0 : bNetQuantity * b.avgPrice
                              
                              return bValue - aValue // Ordine decrescente
                            })
                            .map((holding, index) => {
                            const livePrice = livePrices[holding.asset.symbol]
                            const currentPrice = livePrice || ((holding.currentPrice !== null && holding.currentPrice !== undefined) ? holding.currentPrice : holding.avgPrice)
                            const netQuantity = holding.netQuantity || holding.quantity
                            const currentValue = livePrice 
                              ? netQuantity * livePrice 
                              : netQuantity * ((holding.currentPrice !== null && holding.currentPrice !== undefined) ? holding.currentPrice : holding.avgPrice)
                            const percentage = (currentValue / totalValue) * 100
                            const angle = (percentage / 100) * 360
                            
                            const startAngle = currentAngle
                            const endAngle = currentAngle + angle
                            currentAngle = endAngle
                            
                            const startAngleRad = (startAngle * Math.PI) / 180
                            const endAngleRad = (endAngle * Math.PI) / 180
                            
                            const x1 = 100 + 80 * Math.cos(startAngleRad)
                            const y1 = 100 + 80 * Math.sin(startAngleRad)
                            const x2 = 100 + 80 * Math.cos(endAngleRad)
                            const y2 = 100 + 80 * Math.sin(endAngleRad)
                            
                            const largeArcFlag = angle > 180 ? 1 : 0
                            
                            const pathData = [
                              'M', 100, 100,
                              'L', x1, y1,
                              'A', 80, 80, 0, largeArcFlag, 1, x2, y2,
                              'Z'
                            ].join(' ')
                            
                            return (
                              <path
                                key={holding.asset.symbol}
                                d={pathData}
                                fill={colors[index % colors.length]}
                                stroke="white"
                                strokeWidth="2"
                              />
                            )
                          })
                        })()}
                      </svg>
                    </div>
                    
                    {/* Legenda */}
                    <div className="mt-4 space-y-2">
                      {(() => {
                        const filteredHoldings = portfolio.holdings.filter(holding => (holding.netQuantity || holding.quantity) > 0.0000001)
                        const totalValue = filteredHoldings.reduce((sum, holding) => {
                          const livePrice = livePrices[holding.asset.symbol]
                          const currentPrice = livePrice || ((holding.currentPrice !== null && holding.currentPrice !== undefined) ? holding.currentPrice : holding.avgPrice)
                          const netQuantity = holding.netQuantity || holding.quantity
                          const currentValue = livePrice 
                            ? netQuantity * livePrice 
                            : netQuantity * ((holding.currentPrice !== null && holding.currentPrice !== undefined) ? holding.currentPrice : holding.avgPrice)
                          return sum + currentValue
                        }, 0)
                        
                        const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6B7280']
                        
                        return filteredHoldings
                          .sort((a, b) => {
                            const aLivePrice = livePrices[a.asset.symbol]
                            const aNetQuantity = a.netQuantity || a.quantity
                            const aValue = (aLivePrice && aLivePrice > 0) ? aNetQuantity * aLivePrice : 
                    (a.currentPrice && Math.abs(a.currentPrice - a.avgPrice) > 0.000001 && !(Math.abs(a.currentPrice - a.avgPrice) < 0.000001 && a.currentPrice > 0.001 && (!aLivePrice || aLivePrice === 0))) ? aNetQuantity * a.currentPrice : 
                    (Math.abs(a.currentPrice - a.avgPrice) < 0.000001 && a.currentPrice > 0.001 && (!aLivePrice || aLivePrice === 0)) ? 0 : aNetQuantity * a.avgPrice
                            
                            const bLivePrice = livePrices[b.asset.symbol]
                            const bNetQuantity = b.netQuantity || b.quantity
                            const bValue = (bLivePrice && bLivePrice > 0) ? bNetQuantity * bLivePrice : 
                    (b.currentPrice && Math.abs(b.currentPrice - b.avgPrice) > 0.000001 && !(Math.abs(b.currentPrice - b.avgPrice) < 0.000001 && b.currentPrice > 0.001 && (!bLivePrice || bLivePrice === 0))) ? bNetQuantity * b.currentPrice : 
                    (Math.abs(b.currentPrice - b.avgPrice) < 0.000001 && b.currentPrice > 0.001 && (!bLivePrice || bLivePrice === 0)) ? 0 : bNetQuantity * b.avgPrice
                            
                            return bValue - aValue // Ordine decrescente
                          })
                          .map((holding, index) => {
                          const livePrice = livePrices[holding.asset.symbol]
                          const currentPrice = livePrice || ((holding.currentPrice !== null && holding.currentPrice !== undefined) ? holding.currentPrice : holding.avgPrice)
                          const netQuantity = holding.netQuantity || holding.quantity
                          const currentValue = livePrice 
                            ? netQuantity * livePrice 
                            : netQuantity * ((holding.currentPrice !== null && holding.currentPrice !== undefined) ? holding.currentPrice : holding.avgPrice)
                          const percentage = (currentValue / totalValue) * 100
                          
                          return (
                            <div key={holding.asset.symbol} className="flex items-center gap-2">
                              <div
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: colors[index % colors.length] }}
                              />
                              <span className="text-sm font-medium">{holding.asset.symbol}</span>
                              <span className="text-sm text-adaptive-600 ml-auto">
                                {percentage.toFixed(1)}%
                              </span>
                            </div>
                          )
                        })
                      })()}
                    </div>
                  </div>
                </div>
                
                <div className="lg:w-2/3">
                  {/* Desktop Table View */}
                  <div className="hidden lg:block overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-adaptive bg-adaptive-50">
                          <th className="text-left py-3 px-4 font-medium text-adaptive-700">Asset</th>
                          <th className="text-right py-3 px-4 font-medium text-adaptive-700">Quantità</th>
                          <th className="text-right py-3 px-4 font-medium text-adaptive-700">Prezzo Medio</th>
                          <th className="text-right py-3 px-4 font-medium text-adaptive-700">Prezzo Corrente</th>
                          <th className="text-right py-3 px-4 font-medium text-adaptive-700">Valore</th>
                          <th className="text-right py-3 px-4 font-medium text-adaptive-700">P&L</th>
                        </tr>
                      </thead>
                      <tbody>
                        {portfolio.holdings
                          .filter(holding => (holding.netQuantity || holding.quantity) > 0.0000001)
                          .sort((a, b) => {
                            const aLivePrice = livePrices[a.asset.symbol]
                            const aCurrentPrice = aLivePrice || a.currentPrice || a.avgPrice
                            const aNetQuantity = a.netQuantity || a.quantity
                            const aValue = (aLivePrice && aLivePrice > 0) ? aNetQuantity * aLivePrice : 
                    (a.currentPrice && Math.abs(a.currentPrice - a.avgPrice) > 0.000001 && !(Math.abs(a.currentPrice - a.avgPrice) < 0.000001 && a.currentPrice > 0.001 && (!aLivePrice || aLivePrice === 0))) ? aNetQuantity * a.currentPrice : 
                    (Math.abs(a.currentPrice - a.avgPrice) < 0.000001 && a.currentPrice > 0.001 && (!aLivePrice || aLivePrice === 0)) ? 0 : aNetQuantity * a.avgPrice
                            
                            const bLivePrice = livePrices[b.asset.symbol]
                            const bCurrentPrice = bLivePrice || b.currentPrice || b.avgPrice
                            const bNetQuantity = b.netQuantity || b.quantity
                            const bValue = (bLivePrice && bLivePrice > 0) ? bNetQuantity * bLivePrice : 
                    (b.currentPrice && Math.abs(b.currentPrice - b.avgPrice) > 0.000001 && !(Math.abs(b.currentPrice - b.avgPrice) < 0.000001 && b.currentPrice > 0.001 && (!bLivePrice || bLivePrice === 0))) ? bNetQuantity * b.currentPrice : 
                    (Math.abs(b.currentPrice - b.avgPrice) < 0.000001 && b.currentPrice > 0.001 && (!bLivePrice || bLivePrice === 0)) ? 0 : bNetQuantity * b.avgPrice
                            
                            return bValue - aValue // Ordine decrescente (maggior valore prima)
                          })
                          .map(holding => {
                          const livePrice = livePrices[holding.asset.symbol]
                          const currentPrice = livePrice || ((holding.currentPrice !== null && holding.currentPrice !== undefined) ? holding.currentPrice : holding.avgPrice)
                          const netQuantity = holding.netQuantity || holding.quantity
                          // Fix temporaneo per token con prezzi chiaramente sbagliati
                          // Se currentPrice e avgPrice sono identici E molto più alti del livePrice (0),
                          // probabilmente sono entrambi sbagliati
                          const isPriceDataSuspect = Math.abs(holding.currentPrice - holding.avgPrice) < 0.000001 && 
                            holding.currentPrice > 0.001 && // Prezzo sospettosamente alto
                            (!livePrice || livePrice === 0) // Ma API dice 0
                          
                          const shouldUseLivePrice = livePrice && livePrice > 0
                          const shouldUseCurrentPrice = holding.currentPrice && 
                            Math.abs(holding.currentPrice - holding.avgPrice) > 0.000001 && // Non identici
                            !isPriceDataSuspect // E non sospetti
                          
                          const currentValue = shouldUseLivePrice
                            ? netQuantity * livePrice 
                            : shouldUseCurrentPrice 
                              ? netQuantity * holding.currentPrice
                              : isPriceDataSuspect 
                                ? 0 // Forza a 0 se i dati sono sospetti
                                : netQuantity * holding.avgPrice
                          
                          const investedValue = netQuantity * holding.avgPrice
                          const unrealizedPnL = currentValue - investedValue

                          // Debug per LUNC
                          if (holding.asset.symbol === 'LUNC') {
                            console.log('🔍 LUNC Debug v2:', {
                              symbol: holding.asset.symbol,
                              netQuantity,
                              currentPrice: holding.currentPrice,
                              avgPrice: holding.avgPrice,
                              livePrice,
                              isPriceDataSuspect,
                              shouldUseLivePrice,
                              shouldUseCurrentPrice,
                              finalPrice: shouldUseLivePrice ? livePrice : shouldUseCurrentPrice ? holding.currentPrice : isPriceDataSuspect ? 0 : holding.avgPrice,
                              currentValue,
                              investedValue,
                              unrealizedPnL
                            })
                          }

                          return (
                            <tr key={holding.id} className="border-b border-adaptive hover:bg-adaptive-50">
                              <td className="py-4 px-4">
                                <div className="flex items-center gap-3">
                                  <div>
                                    <div className="font-semibold text-adaptive-900">{holding.asset.symbol}</div>
                                    <div className="text-sm text-adaptive-600">{holding.asset.name}</div>
                                  </div>
                                </div>
                              </td>
                              <td className="py-4 px-4 text-right font-mono">
                                {formatCryptoSmart(holding.netQuantity || holding.quantity, holding.asset.decimals)}
                                {holding.feesQuantity > 0 && (
                                  <div className="text-xs text-red-500">
                                    -{formatCryptoSmart(holding.feesQuantity, holding.asset.decimals)} fees
                                  </div>
                                )}
                              </td>
                              <td className="py-4 px-4 text-right">
                                {formatCurrencySmartWithUserCurrency(holding.avgPrice)}
                              </td>
                              <td className="py-4 px-4 text-right">
                                <div className="flex items-center justify-end gap-2">
                                  {formatCurrencySmartWithUserCurrency(currentPrice)}
                                  {livePrice && (
                                    <span className="text-xs bg-green-100 text-green-600 px-1 rounded">LIVE</span>
                                  )}
                                </div>
                              </td>
                              <td className="py-4 px-4 text-right font-semibold">
                                {formatCurrencyWithUserCurrency(currentValue)}
                              </td>
                              <td className="py-4 px-4 text-right">
                                <div className={`font-semibold ${unrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {formatCurrencyWithUserCurrency(unrealizedPnL)}
                                </div>
                                <div className={`text-xs ${unrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {formatPercentage(investedValue > 0 ? (unrealizedPnL / investedValue) * 100 : 0)}
                                </div>
                              </td>
                            </tr>
                          )
                        })}
                      </tbody>
                    </table>
                  </div>
                  
                  {/* Mobile Card View */}
                  <div className="lg:hidden space-y-4">
                    {portfolio.holdings
                      .filter(holding => (holding.netQuantity || holding.quantity) > 0.0000001)
                      .sort((a, b) => {
                        const aLivePrice = livePrices[a.asset.symbol]
                        const aNetQuantity = a.netQuantity || a.quantity
                        const aValue = (aLivePrice && aLivePrice > 0) ? aNetQuantity * aLivePrice : 
                    (a.currentPrice && Math.abs(a.currentPrice - a.avgPrice) > 0.000001 && !(Math.abs(a.currentPrice - a.avgPrice) < 0.000001 && a.currentPrice > 0.001 && (!aLivePrice || aLivePrice === 0))) ? aNetQuantity * a.currentPrice : 
                    (Math.abs(a.currentPrice - a.avgPrice) < 0.000001 && a.currentPrice > 0.001 && (!aLivePrice || aLivePrice === 0)) ? 0 : aNetQuantity * a.avgPrice
                        
                        const bLivePrice = livePrices[b.asset.symbol]
                        const bNetQuantity = b.netQuantity || b.quantity
                        const bValue = (bLivePrice && bLivePrice > 0) ? bNetQuantity * bLivePrice : 
                    (b.currentPrice && Math.abs(b.currentPrice - b.avgPrice) > 0.000001 && !(Math.abs(b.currentPrice - b.avgPrice) < 0.000001 && b.currentPrice > 0.001 && (!bLivePrice || bLivePrice === 0))) ? bNetQuantity * b.currentPrice : 
                    (Math.abs(b.currentPrice - b.avgPrice) < 0.000001 && b.currentPrice > 0.001 && (!bLivePrice || bLivePrice === 0)) ? 0 : bNetQuantity * b.avgPrice
                        
                        return bValue - aValue
                      })
                      .map(holding => {
                      const livePrice = livePrices[holding.asset.symbol]
                      const currentPrice = livePrice || ((holding.currentPrice !== null && holding.currentPrice !== undefined) ? holding.currentPrice : holding.avgPrice)
                      const netQuantity = holding.netQuantity || holding.quantity
                      const currentValue = livePrice 
                        ? netQuantity * livePrice 
                        : netQuantity * ((holding.currentPrice !== null && holding.currentPrice !== undefined) ? holding.currentPrice : holding.avgPrice)
                      const investedValue = netQuantity * holding.avgPrice
                      const unrealizedPnL = currentValue - investedValue
                      const roiPercentage = investedValue > 0 ? (unrealizedPnL / investedValue) * 100 : 0

                      return (
                        <div key={holding.id} className="card-adaptive rounded-lg p-4 border border-adaptive">
                          <div className="flex items-start justify-between mb-3">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h4 className="font-bold text-adaptive-900 text-lg">{holding.asset.symbol}</h4>
                                {livePrice && (
                                  <span className="text-xs bg-green-100 text-green-600 px-2 py-1 rounded">LIVE</span>
                                )}
                              </div>
                              <p className="text-sm text-adaptive-600 mb-2">{holding.asset.name}</p>
                              <p className="text-lg font-bold text-adaptive-900">
                                {formatCurrencyWithUserCurrency(currentValue)}
                              </p>
                            </div>
                          </div>
                          
                          <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 text-sm">💰</span>
                              <div>
                                <span className="text-xs text-adaptive-600">Quantità</span>
                                <p className="text-sm font-medium text-adaptive-900 font-mono">
                                  {formatCryptoSmart(netQuantity, holding.asset.decimals)}
                                </p>
                                {holding.feesQuantity > 0 && (
                                  <p className="text-xs text-red-500">
                                    -{formatCryptoSmart(holding.feesQuantity, holding.asset.decimals)} fees
                                  </p>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 text-sm">📈</span>
                              <div>
                                <span className="text-xs text-adaptive-600">P&L</span>
                                <p className={`text-sm font-bold ${unrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {formatCurrencyWithUserCurrency(unrealizedPnL)}
                                </p>
                                <p className={`text-xs ${unrealizedPnL >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                  {formatPercentage(roiPercentage)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 text-sm">⚖️</span>
                              <div>
                                <span className="text-xs text-adaptive-600">Prezzo Medio</span>
                                <p className="text-sm font-medium text-adaptive-900">
                                  {formatCurrencySmartWithUserCurrency(holding.avgPrice)}
                                </p>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-gray-500 text-sm">🔥</span>
                              <div>
                                <span className="text-xs text-adaptive-600">Prezzo Corrente</span>
                                <p className="text-sm font-medium text-adaptive-900">
                                  {formatCurrencySmartWithUserCurrency(currentPrice)}
                                </p>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 🎯 TRADES SECTION */}
      {showTrades && (
        <div className="card-adaptive rounded-lg shadow-sm border-adaptive mb-6 sm:mb-8">
          <div className="p-4 sm:p-6 border-b border-adaptive">
            <h3 className="text-lg font-semibold text-adaptive-900">🎯 Trades Aperti</h3>
          </div>
          
          <div className="p-4 sm:p-6">
            {tradesLoading ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              </div>
            ) : trades.filter(t => t.status === 'open').length === 0 ? (
              <div className="text-center py-8 text-adaptive-600">
                <p>Nessun trade aperto</p>
              </div>
            ) : (
              <div className="space-y-4">
                {trades.filter(t => t.status === 'open').map((trade) => (
                  <TradeCard 
                    key={trade.id} 
                    trade={trade} 
                    onClose={() => {}} // Non usato più, ora il pulsante chiudi è interno
                    onCloseTrade={handleCloseTrade}
                    portfolioId={portfolioId}
                  />
                ))}
              </div>
            )}
            
            {/* Trades Chiusi */}
            {trades.filter(t => t.status === 'closed').length > 0 && (
              <div className="mt-8 pt-8 border-t border-gray-300 dark:border-gray-700">
                <h4 className="text-md font-semibold text-adaptive-900 mb-4">✅ Trades Chiusi</h4>
                <div className="space-y-4">
                  {trades.filter(t => t.status === 'closed').map((trade) => (
                    <div key={trade.id} className="p-4 bg-gray-100 dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-medium text-adaptive-900">
                            {trade.fromAsset.symbol} → {trade.toAsset.symbol}
                          </div>
                          <div className="text-sm text-adaptive-600">
                            {new Date(trade.openDate).toLocaleDateString('it-IT')} - {new Date(trade.closeDate).toLocaleDateString('it-IT')}
                          </div>
                        </div>
                        <div className={`font-semibold ${trade.realizedPnL >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                          {trade.realizedPnL >= 0 ? '+' : ''}{formatCurrencySmart(trade.realizedPnL)} ({trade.pnLPercentage >= 0 ? '+' : ''}{trade.pnLPercentage.toFixed(2)}%)
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Network Fees Section - Mobile Optimized */}
      <div className="card-adaptive rounded-lg shadow-sm border-adaptive mb-6 sm:mb-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-6 border-b border-adaptive gap-3 sm:gap-0">
          <h2 className="text-lg sm:text-xl font-bold text-adaptive-900">🌐 Network Fees</h2>
          {/* Desktop */}
          <div className="hidden sm:flex gap-3">
            <button
              onClick={() => setShowNetworkFees(!showNetworkFees)}
              className="flex items-center gap-2 px-3 py-1 text-sm bg-adaptive-100 text-adaptive-700 rounded-md hover:bg-adaptive-200"
            >
              {showNetworkFees ? '🔼 Nascondi' : '🔽 Mostra'}
            </button>
            <button
              onClick={() => setShowAddFee(true)}
              className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium"
            >
              <PlusIcon className="w-4 h-4" />
              Aggiungi Fee
            </button>
          </div>
          {/* Mobile */}
          <div className="sm:hidden grid grid-cols-2 gap-2">
            <button
              onClick={() => setShowNetworkFees(!showNetworkFees)}
              className="flex items-center justify-center gap-2 px-3 py-2 text-sm bg-adaptive-100 text-adaptive-700 rounded-lg hover:bg-adaptive-200"
            >
              {showNetworkFees ? '🔼 Nascondi' : '🔽 Mostra'}
            </button>
            <button
              onClick={() => setShowAddFee(true)}
              className="flex items-center justify-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium text-sm"
            >
              <PlusIcon className="w-4 h-4" />
              Aggiungi Fee
            </button>
          </div>
        </div>

        {showNetworkFees && (
          <div className="p-6">
            {/* Network Fees Summary */}
            {portfolio.stats?.feesByAsset && Object.keys(portfolio.stats.feesByAsset).length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-adaptive-900 mb-4">📊 Riepilogo Fees per Asset</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {Object.entries(portfolio.stats.feesByAsset).map(([symbol, feeData]: [string, any]) => (
                    <div key={symbol} className="bg-red-50 rounded-lg p-4 border border-red-200">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-semibold text-red-900">{symbol}</div>
                        <div className="text-sm text-red-600">{feeData.count} fees</div>
                      </div>
                      <div className="text-sm text-red-700">
                        <div>Quantità: {formatCryptoSmart(feeData.quantity, feeData.asset?.decimals || 6)}</div>
                        <div>Valore: {formatCurrencyWithUserCurrency(feeData.eurValue)}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Network Fees Table */}
            {feesLoading ? (
              <div className="text-center py-8">
                <div className="text-lg">⏳ Caricamento network fees...</div>
              </div>
            ) : networkFees.length === 0 ? (
              <div className="text-center py-8">
                <div className="text-4xl mb-4">🌐</div>
                <h3 className="text-lg font-medium text-adaptive-900 mb-2">Nessuna Network Fee</h3>
                <p className="text-adaptive-600">Le tue network fees appariranno qui</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-adaptive bg-adaptive-50">
                      <th className="text-left py-3 px-4 font-medium text-adaptive-700">Data</th>
                      <th className="text-left py-3 px-4 font-medium text-adaptive-700">Asset</th>
                      <th className="text-right py-3 px-4 font-medium text-adaptive-700">Quantità</th>
                      <th className="text-right py-3 px-4 font-medium text-adaptive-700">Valore EUR</th>
                      <th className="text-left py-3 px-4 font-medium text-adaptive-700">Descrizione</th>
                      <th className="text-center py-3 px-4 font-medium text-adaptive-700">Azioni</th>
                    </tr>
                  </thead>
                  <tbody>
                    {networkFees.map(fee => (
                      <tr key={fee.id} className="border-b border-adaptive hover:bg-adaptive-50">
                        <td className="py-3 px-4 text-sm">
                          {new Date(fee.date).toLocaleDateString('it-IT')}
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-semibold text-red-600">{fee.asset?.symbol}</div>
                          <div className="text-xs text-adaptive-600">{fee.asset?.name}</div>
                        </td>
                        <td className="py-3 px-4 text-right font-mono text-red-600">
                          -{formatCryptoSmart(fee.quantity, fee.asset?.decimals || 6)}
                        </td>
                        <td className="py-3 px-4 text-right text-red-600">
                          {fee.eurValue ? formatCurrencyWithUserCurrency(fee.eurValue) : '-'}
                        </td>
                        <td className="py-3 px-4 text-sm">
                          {fee.description || '-'}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <button
                            onClick={() => handleDeleteFee(fee.id)}
                            className="text-red-600 hover:text-red-800 p-1"
                            title="Elimina fee"
                          >
                            <TrashIcon className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Transactions Table - Mobile Optimized */}
      <div className="card-adaptive rounded-lg shadow-sm border-adaptive">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-4 sm:p-6 border-b border-adaptive gap-3 sm:gap-0">
          <h2 className="text-lg sm:text-xl font-bold text-adaptive-900">📊 Transazioni ({portfolio.transactions.length})</h2>
          
          {/* Desktop Actions */}
          <div className="hidden sm:flex gap-3">
            {selectedTransactions.length > 0 && (
              <button
                onClick={handleBulkDelete}
                disabled={isDeleting}
                className="flex items-center gap-2 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 font-medium disabled:opacity-50"
              >
                <TrashIcon className="w-4 h-4" />
                {isDeleting ? `Eliminando ${deleteProgress.current}/${deleteProgress.total}...` : `Elimina ${selectedTransactions.length}`}
              </button>
            )}
            <button
              onClick={() => setShowSwap(true)}
              className="flex items-center gap-2 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 font-medium"
            >
              🔄 Swap
            </button>
            <button
              onClick={() => setShowOpenTrade(true)}
              className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 font-medium"
            >
              🚀 Apri Trade
            </button>
            <button
              onClick={() => {
                setShowTrades(!showTrades)
                if (!showTrades) fetchTrades()
              }}
              className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 font-medium"
            >
              📈 Trades {trades.filter(t => t.status === 'open').length > 0 && `(${trades.filter(t => t.status === 'open').length})`}
            </button>
            <button
              onClick={() => setShowAddTransaction(true)}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
            >
              <PlusIcon className="w-4 h-4" />
              Aggiungi
            </button>
          </div>
          
          {/* Mobile Actions */}
          <div className="sm:hidden space-y-2">
            <button
              onClick={() => setShowAddTransaction(true)}
              className="flex items-center justify-center gap-2 w-full px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium text-sm"
            >
              <PlusIcon className="w-4 h-4" />
              Aggiungi Transazione
            </button>
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={() => setShowSwap(true)}
                className="flex items-center justify-center gap-2 px-3 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 font-medium text-sm"
              >
                🔄 Swap
              </button>
              {selectedTransactions.length > 0 && (
                <button
                  onClick={handleBulkDelete}
                  disabled={isDeleting}
                  className="flex items-center justify-center gap-2 px-3 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium disabled:opacity-50 text-sm"
                >
                  <TrashIcon className="w-4 h-4" />
                  {isDeleting ? `${deleteProgress.current}/${deleteProgress.total}` : `Elimina ${selectedTransactions.length}`}
                </button>
              )}
            </div>
          </div>
        </div>
        
        <div className="p-4 sm:p-6">
          {portfolio.transactions.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-4xl mb-4">📊</div>
              <h3 className="text-lg font-medium text-adaptive-900 mb-2">Nessuna Transazione</h3>
              <p className="text-adaptive-600">Le tue transazioni appariranno qui</p>
            </div>
          ) : (
            <>
              {/* Desktop Table View */}
              <div className="hidden lg:block overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-adaptive bg-adaptive-50">
                    <th className="text-center py-3 px-4 font-medium text-adaptive-700">
                      <input
                        type="checkbox"
                        checked={selectAll}
                        onChange={handleSelectAll}
                        className="rounded"
                      />
                    </th>
                    <th className="text-left py-3 px-4 font-medium text-adaptive-700">Data</th>
                    <th className="text-left py-3 px-4 font-medium text-adaptive-700">Asset</th>
                    <th className="text-center py-3 px-4 font-medium text-adaptive-700">Tipo</th>
                    <th className="text-right py-3 px-4 font-medium text-adaptive-700">Quantità</th>
                    <th className="text-right py-3 px-4 font-medium text-adaptive-700">Valore EUR</th>
                    <th className="text-right py-3 px-4 font-medium text-adaptive-700">Prezzo/Unità</th>
                    <th className="text-center py-3 px-4 font-medium text-adaptive-700">Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {groupTransactions(portfolio.transactions).map(item => {
                    // Se è un gruppo swap
                    if ('swapOut' in item) {
                      const isExpanded = expandedSwaps.has(item.id)
                      return (
                        <React.Fragment key={item.id}>
                          {/* Riga principale swap unificata */}
                          <tr className="border-b border-adaptive hover:bg-adaptive-50">
                            <td className="py-4 px-4 text-center">
                              {/* Swap non selezionabili per bulk delete */}
                              <span className="text-gray-400">-</span>
                            </td>
                            <td className="py-4 px-4 text-sm">
                              {new Date(item.date).toLocaleDateString('it-IT')}
                            </td>
                            <td className="py-4 px-4">
                              <div className="font-semibold">
                                {item.swapOut.asset.symbol} → {item.swapIn.asset.symbol}
                              </div>
                              <div className="text-xs text-adaptive-600">Swap crypto</div>
                            </td>
                            <td className="py-4 px-4 text-center">
                              <span className="px-2 py-1 rounded text-xs font-medium bg-orange-100 text-orange-600">
                                🔄 Swap
                              </span>
                            </td>
                            <td className="py-4 px-4 text-right font-mono">
                              <div>{formatCryptoSmart(item.swapOut.quantity, item.swapOut.asset.decimals)} → {formatCryptoSmart(item.swapIn.quantity, item.swapIn.asset.decimals)}</div>
                            </td>
                            <td className="py-4 px-4 text-right font-semibold">
                              {formatCurrencyWithUserCurrency(item.swapOut.eurValue)}
                            </td>
                            <td className="py-4 px-4 text-right">
                              -
                            </td>
                            <td className="py-4 px-4 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <button
                                  onClick={() => {
                                    const newExpanded = new Set(expandedSwaps)
                                    if (isExpanded) {
                                      newExpanded.delete(item.id)
                                    } else {
                                      newExpanded.add(item.id)
                                    }
                                    setExpandedSwaps(newExpanded)
                                  }}
                                  className="p-1 text-gray-600 hover:bg-gray-100 rounded"
                                  title={isExpanded ? "Nascondi dettagli" : "Mostra dettagli"}
                                >
                                  {isExpanded ? '▼' : '▶'}
                                </button>
                                <button
                                  onClick={() => handleEditSwap(item)}
                                  className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                                  title="Modifica Swap"
                                >
                                  <PencilIcon className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDeleteSwap(item)}
                                  className="p-1 text-red-600 hover:bg-red-100 rounded"
                                  title="Elimina Swap"
                                >
                                  <TrashIcon className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                          
                          {/* Righe dettaglio se espanse */}
                          {isExpanded && (
                            <>
                              <tr className="bg-gray-100 border-b border-adaptive">
                                <td className="py-2 px-8 text-center">
                                  <span className="text-gray-400">-</span>
                                </td>
                                <td className="py-2 px-8 text-xs text-gray-700">
                                  {new Date(item.swapOut.date).toLocaleDateString('it-IT')}
                                </td>
                                <td className="py-2 px-8">
                                  <div className="text-sm font-semibold text-gray-900">{item.swapOut.asset.symbol}</div>
                                  <div className="text-xs text-gray-600">{item.swapOut.asset.name}</div>
                                </td>
                                <td className="py-2 px-8 text-center">
                                  <span className="px-2 py-1 rounded text-xs font-medium bg-red-200 text-red-800">
                                    Swap Out
                                  </span>
                                </td>
                                <td className="py-2 px-8 text-right font-mono text-sm text-gray-900">
                                  -{formatCryptoSmart(item.swapOut.quantity, item.swapOut.asset.decimals)}
                                </td>
                                <td className="py-2 px-8 text-right text-sm font-medium text-gray-900">
                                  {formatCurrencyWithUserCurrency(item.swapOut.eurValue)}
                                </td>
                                <td className="py-2 px-8 text-right text-sm text-gray-800">
                                  {formatCurrencyWithUserCurrency(item.swapOut.pricePerUnit)}
                                </td>
                                <td className="py-2 px-8 text-center">
                                  <span className="text-xs text-gray-500">Parte del Swap</span>
                                </td>
                              </tr>
                              <tr className="bg-gray-100 border-b border-adaptive">
                                <td className="py-2 px-8 text-center">
                                  <span className="text-gray-400">-</span>
                                </td>
                                <td className="py-2 px-8 text-xs text-gray-700">
                                  {new Date(item.swapIn.date).toLocaleDateString('it-IT')}
                                </td>
                                <td className="py-2 px-8">
                                  <div className="text-sm font-semibold text-gray-900">{item.swapIn.asset.symbol}</div>
                                  <div className="text-xs text-gray-600">{item.swapIn.asset.name}</div>
                                </td>
                                <td className="py-2 px-8 text-center">
                                  <span className="px-2 py-1 rounded text-xs font-medium bg-green-200 text-green-800">
                                    Swap In
                                  </span>
                                </td>
                                <td className="py-2 px-8 text-right font-mono text-sm text-gray-900">
                                  +{formatCryptoSmart(item.swapIn.quantity, item.swapIn.asset.decimals)}
                                </td>
                                <td className="py-2 px-8 text-right text-sm font-medium text-gray-900">
                                  {formatCurrencyWithUserCurrency(item.swapIn.eurValue)}
                                </td>
                                <td className="py-2 px-8 text-right text-sm text-gray-800">
                                  {formatCurrencyWithUserCurrency(item.swapIn.pricePerUnit)}
                                </td>
                                <td className="py-2 px-8 text-center">
                                  <span className="text-xs text-gray-500">Parte del Swap</span>
                                </td>
                              </tr>
                            </>
                          )}
                        </React.Fragment>
                      )
                    } else {
                      // Transazione normale
                      const transaction = item as Transaction
                      return (
                        <tr key={transaction.id} className="border-b border-adaptive hover:bg-adaptive-50">
                      <td className="py-4 px-4 text-center">
                        {(transaction.type === 'trade_open' || transaction.type === 'trade_close') ? (
                          <span className="text-gray-400">-</span>
                        ) : (
                          <input
                            type="checkbox"
                            checked={selectedTransactions.includes(transaction.id)}
                            onChange={() => handleSelectTransaction(transaction.id)}
                            className="rounded"
                          />
                        )}
                      </td>
                      <td className="py-4 px-4 text-sm">
                        {new Date(transaction.date).toLocaleDateString('it-IT')}
                      </td>
                      <td className="py-4 px-4">
                        <div className="font-semibold">{transaction.asset.symbol}</div>
                        <div className="text-xs text-adaptive-600">{transaction.asset.name}</div>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className={`px-2 py-1 rounded text-xs font-medium ${
                          transaction.type === 'buy' 
                            ? 'bg-green-100 text-green-600' 
                            : transaction.type === 'sell'
                            ? 'bg-red-100 text-red-600'
                            : transaction.type === 'stake_reward'
                            ? 'bg-blue-100 text-blue-600'
                            : transaction.type === 'trade_open'
                            ? 'bg-purple-100 text-purple-600'
                            : transaction.type === 'trade_close'
                            ? 'bg-purple-100 text-purple-600'
                            : (transaction.type === 'swap_in' || transaction.type === 'swap_out')
                            ? 'bg-orange-100 text-orange-600'
                            : 'bg-gray-100 text-gray-600'
                        }`}>
                          {transaction.type === 'buy' ? 'Buy' 
                           : transaction.type === 'sell' ? 'Sell'
                           : transaction.type === 'stake_reward' ? 'Stake'
                           : transaction.type === 'trade_open' ? '🎯 Trade'
                           : transaction.type === 'trade_close' ? '✅ Trade'
                           : transaction.type === 'swap_in' ? 'Swap In'
                           : transaction.type === 'swap_out' ? 'Swap Out'
                           : transaction.type}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-right font-mono">
                        {formatCryptoSmart(transaction.quantity, transaction.asset.decimals)}
                      </td>
                      <td className="py-4 px-4 text-right font-semibold">
                        {formatCurrencyWithUserCurrency(transaction.eurValue)}
                      </td>
                      <td className="py-4 px-4 text-right">
                        {formatCurrencyWithUserCurrency(transaction.pricePerUnit)}
                      </td>
                      <td className="py-4 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {(transaction.type === 'trade_open' || transaction.type === 'trade_close') ? (
                            <span className="text-xs text-gray-500 italic">Solo da Trades</span>
                          ) : (
                            <>
                              <button
                                onClick={() => openEditTransaction(transaction)}
                                className="p-1 text-blue-600 hover:bg-blue-100 rounded"
                                title="Modifica"
                              >
                                <PencilIcon className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteTransaction(transaction.id)}
                                className="p-1 text-red-600 hover:bg-red-100 rounded"
                                title="Elimina"
                              >
                                <TrashIcon className="w-4 h-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                      )
                    }
                  })}
                </tbody>
              </table>
              </div>
              
              {/* Mobile Card View */}
              <div className="lg:hidden space-y-4">
                {/* Mobile Select All */}
                <div className="flex items-center gap-2 pb-2 border-b border-adaptive">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={handleSelectAll}
                    className="h-4 w-4 text-blue-600 border-adaptive rounded focus:ring-blue-500"
                  />
                  <span className="text-sm text-adaptive-600">Seleziona tutto</span>
                </div>
                
                {groupTransactions(portfolio.transactions).map(item => {
                  // Se è un gruppo swap
                  if ('swapOut' in item) {
                    const isExpanded = expandedSwaps.has(item.id)
                    return (
                      <div key={item.id} className="card-adaptive rounded-lg p-4 border border-adaptive">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-600">
                                🔄 Swap
                              </span>
                              <span className="text-sm text-adaptive-600">
                                {new Date(item.date).toLocaleDateString('it-IT')}
                              </span>
                            </div>
                            <h4 className="font-semibold text-adaptive-900 text-base mb-1">
                              {item.swapOut.asset.symbol} → {item.swapIn.asset.symbol}
                            </h4>
                            <p className="text-lg font-bold text-adaptive-900">
                              {formatCurrencyWithUserCurrency(item.swapOut.eurValue)}
                            </p>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-1 gap-2 mb-4">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 text-sm">🔄</span>
                            <div>
                              <span className="text-xs text-adaptive-600">Quantità</span>
                              <p className="text-sm font-medium text-adaptive-900 font-mono">
                                {formatCryptoSmart(item.swapOut.quantity, item.swapOut.asset.decimals)} → {formatCryptoSmart(item.swapIn.quantity, item.swapIn.asset.decimals)}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-3 border-t border-adaptive">
                          <button
                            onClick={() => {
                              const newExpanded = new Set(expandedSwaps)
                              if (isExpanded) {
                                newExpanded.delete(item.id)
                              } else {
                                newExpanded.add(item.id)
                              }
                              setExpandedSwaps(newExpanded)
                            }}
                            className="flex items-center gap-2 px-3 py-2 text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-sm sm:hidden"
                          >
                            <ChevronDownIcon className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </button>
                          <button
                            onClick={() => {
                              const newExpanded = new Set(expandedSwaps)
                              if (isExpanded) {
                                newExpanded.delete(item.id)
                              } else {
                                newExpanded.add(item.id)
                              }
                              setExpandedSwaps(newExpanded)
                            }}
                            className="hidden sm:flex items-center gap-2 px-3 py-2 text-gray-600 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-sm"
                          >
                            <ChevronDownIcon className={`w-4 h-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                            {isExpanded ? 'Nascondi' : 'Dettagli'}
                          </button>
                          <button
                            onClick={() => handleEditSwap(item)}
                            className="flex items-center gap-2 px-3 py-2 text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors text-sm"
                          >
                            <PencilIcon className="w-4 h-4" />
                            Modifica
                          </button>
                          <button
                            onClick={() => handleDeleteSwap(item)}
                            className="flex items-center gap-2 px-3 py-2 text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors text-sm"
                          >
                            <TrashIcon className="w-4 h-4" />
                            Elimina
                          </button>
                        </div>
                        
                        {/* Dettagli espansi */}
                        {isExpanded && (
                          <div className="mt-4 space-y-3 pt-3 border-t border-adaptive">
                            <div className="card-adaptive p-3 rounded border-l-4 border-red-500">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded">Swap Out</span>
                                <span className="text-sm font-medium">{item.swapOut.asset.symbol}</span>
                              </div>
                              <p className="text-sm text-adaptive-900 font-mono">
                                -{formatCryptoSmart(item.swapOut.quantity, item.swapOut.asset.decimals)}
                              </p>
                              <p className="text-sm text-adaptive-600">
                                {formatCurrencyWithUserCurrency(item.swapOut.eurValue)} ({formatCurrencyWithUserCurrency(item.swapOut.pricePerUnit)}/unità)
                              </p>
                            </div>
                            <div className="card-adaptive p-3 rounded border-l-4 border-green-500">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">Swap In</span>
                                <span className="text-sm font-medium">{item.swapIn.asset.symbol}</span>
                              </div>
                              <p className="text-sm text-adaptive-900 font-mono">
                                +{formatCryptoSmart(item.swapIn.quantity, item.swapIn.asset.decimals)}
                              </p>
                              <p className="text-sm text-adaptive-600">
                                {formatCurrencyWithUserCurrency(item.swapIn.eurValue)} ({formatCurrencyWithUserCurrency(item.swapIn.pricePerUnit)}/unità)
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  } else {
                    // Transazione normale
                    const transaction = item as Transaction
                    return (
                      <div key={transaction.id} className="card-adaptive rounded-lg p-4 border border-adaptive">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3 flex-1">
                            {(transaction.type === 'trade_open' || transaction.type === 'trade_close') ? (
                              <span className="w-4 h-4 mt-1"></span>
                            ) : (
                              <input
                                type="checkbox"
                                checked={selectedTransactions.includes(transaction.id)}
                                onChange={() => handleSelectTransaction(transaction.id)}
                                className="h-4 w-4 text-blue-600 border-adaptive rounded focus:ring-blue-500 mt-1"
                              />
                            )}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                  transaction.type === 'buy' 
                                    ? 'bg-green-100 text-green-600' 
                                    : transaction.type === 'sell'
                                    ? 'bg-red-100 text-red-600'
                                    : transaction.type === 'stake_reward'
                                    ? 'bg-blue-100 text-blue-600'
                                    : transaction.type === 'trade_open'
                                    ? 'bg-purple-100 text-purple-600'
                                    : transaction.type === 'trade_close'
                                    ? 'bg-purple-100 text-purple-600'
                                    : 'bg-gray-100 text-gray-600'
                                }`}>
                                  {transaction.type === 'buy' ? '💰 Buy' 
                                   : transaction.type === 'sell' ? '💸 Sell'
                                   : transaction.type === 'stake_reward' ? '🏆 Stake'
                                   : transaction.type === 'trade_open' ? '🎯 Trade Aperto'
                                   : transaction.type === 'trade_close' ? '✅ Trade Chiuso'
                                   : transaction.type}
                                </span>
                                <span className="text-sm text-adaptive-600">
                                  {new Date(transaction.date).toLocaleDateString('it-IT')}
                                </span>
                              </div>
                              <h4 className="font-semibold text-adaptive-900 text-base mb-1">
                                {transaction.asset.symbol}
                              </h4>
                              <p className="text-sm text-adaptive-600 mb-2">{transaction.asset.name}</p>
                              <p className="text-lg font-bold text-adaptive-900">
                                {formatCurrencyWithUserCurrency(transaction.eurValue)}
                              </p>
                            </div>
                          </div>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-3 mb-4">
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 text-sm">💰</span>
                            <div>
                              <span className="text-xs text-adaptive-600">Quantità</span>
                              <p className="text-sm font-medium text-adaptive-900 font-mono">
                                {formatCryptoSmart(transaction.quantity, transaction.asset.decimals)}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-gray-500 text-sm">📊</span>
                            <div>
                              <span className="text-xs text-adaptive-600">Prezzo/Unità</span>
                              <p className="text-sm font-medium text-adaptive-900">
                                {formatCurrencyWithUserCurrency(transaction.pricePerUnit)}
                              </p>
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-end gap-2 pt-3 border-t border-adaptive">
                          {(transaction.type === 'trade_open' || transaction.type === 'trade_close') ? (
                            <span className="text-xs text-gray-500 italic py-2">Gestibile solo da sezione Trades</span>
                          ) : (
                            <>
                              <button
                                onClick={() => openEditTransaction(transaction)}
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
                            </>
                          )}
                        </div>
                      </div>
                    )
                  }
                })}
              </div>
            </>
          )}
        </div>
      </div>

      {/* 🔧 MODAL AGGIUNGI TRANSAZIONE */}
      {showAddTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">➕ Nuova Transazione</h3>
              <button
                onClick={() => {
                  setShowAddTransaction(false)
                  resetTransactionForm()
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddTransaction} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTransactionForm(prev => ({ ...prev, type: 'buy' }))}
                    className={`flex-1 px-3 py-2 border rounded-md text-sm font-medium ${
                      transactionForm.type === 'buy'
                        ? 'bg-green-100 border-green-500 text-green-700'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    💰 Buy
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransactionForm(prev => ({ ...prev, type: 'sell' }))}
                    className={`flex-1 px-3 py-2 border rounded-md text-sm font-medium ${
                      transactionForm.type === 'sell'
                        ? 'bg-red-100 border-red-500 text-red-700'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    💸 Sell
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransactionForm(prev => ({ ...prev, type: 'stake_reward' }))}
                    className={`flex-1 px-3 py-2 border rounded-md text-sm font-medium ${
                      transactionForm.type === 'stake_reward'
                        ? 'bg-blue-100 border-blue-500 text-blue-700'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    🏆 Stake
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Asset (Ticker)
                  {fetchingPrice && <span className="text-blue-500 ml-2">🔍 Cercando prezzo...</span>}
                </label>
                <input
                  type="text"
                  value={transactionForm.ticker}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase()
                    setTransactionForm(prev => ({ ...prev, ticker: value }))
                    
                    if (value.length >= 3) {
                      debouncedFetchPrice(value)
                    } else {
                      setCurrentPrice(null)
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="es. BTC, ETH, SOL"
                  required
                />
                {currentPrice && (
                  <div className="text-xs text-green-600 mt-1">
                    💹 Prezzo corrente: {formatCurrencySmartWithUserCurrency(currentPrice)}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantità</label>
                <input
                  type="number"
                  step="any"
                  value={transactionForm.quantity}
                  onChange={(e) => {
                    setTransactionForm(prev => ({ ...prev, quantity: e.target.value }))
                    
                    if (currentPrice && e.target.value && !isNaN(parseFloat(e.target.value))) {
                      const quantity = parseFloat(e.target.value)
                      const calculatedValue = smartRoundPrice(quantity * currentPrice)
                      setTransactionForm(prev => ({ ...prev, eurValue: calculatedValue.toString() }))
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="es. 1.5"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valore EUR</label>
                <input
                  type="number"
                  step="0.01"
                  value={transactionForm.eurValue}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, eurValue: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="es. 100.00"
                  required
                />
                {currentPrice && transactionForm.quantity && !isNaN(parseFloat(transactionForm.quantity)) && (
                  <div className="text-xs text-gray-500 mt-1">
                    💡 {transactionForm.quantity} × {formatCurrencySmartWithUserCurrency(currentPrice)} = {formatCurrencyWithUserCurrency(parseFloat(transactionForm.quantity) * currentPrice)}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                <input
                  type="date"
                  value={transactionForm.date}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note (opzionale)</label>
                <input
                  type="text"
                  value={transactionForm.notes}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="es. Acquisto su Binance"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
                >
                  {submitLoading ? 'Aggiunta...' : 'Aggiungi Transazione'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddTransaction(false)
                    resetTransactionForm()
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Annulla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🔧 MODAL MODIFICA TRANSAZIONE */}
      {showEditTransaction && editingTransaction && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">✏️ Modifica Transazione</h3>
              <button
                onClick={() => {
                  setShowEditTransaction(false)
                  setEditingTransaction(null)
                  resetTransactionForm()
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditTransaction} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setTransactionForm(prev => ({ ...prev, type: 'buy' }))}
                    className={`flex-1 px-3 py-2 border rounded-md text-sm font-medium ${
                      transactionForm.type === 'buy'
                        ? 'bg-green-100 border-green-500 text-green-700'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    💰 Buy
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransactionForm(prev => ({ ...prev, type: 'sell' }))}
                    className={`flex-1 px-3 py-2 border rounded-md text-sm font-medium ${
                      transactionForm.type === 'sell'
                        ? 'bg-red-100 border-red-500 text-red-700'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    💸 Sell
                  </button>
                  <button
                    type="button"
                    onClick={() => setTransactionForm(prev => ({ ...prev, type: 'stake_reward' }))}
                    className={`flex-1 px-3 py-2 border rounded-md text-sm font-medium ${
                      transactionForm.type === 'stake_reward'
                        ? 'bg-blue-100 border-blue-500 text-blue-700'
                        : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    🏆 Stake
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Asset (Ticker)
                  {fetchingPrice && <span className="text-blue-500 ml-2">🔍 Cercando prezzo...</span>}
                </label>
                <input
                  type="text"
                  value={transactionForm.ticker}
                  onChange={(e) => {
                    const value = e.target.value.toUpperCase()
                    setTransactionForm(prev => ({ ...prev, ticker: value }))
                    
                    if (value.length >= 3) {
                      debouncedFetchPrice(value)
                    } else {
                      setCurrentPrice(null)
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="es. BTC, ETH, SOL"
                  required
                />
                {currentPrice && (
                  <div className="text-xs text-green-600 mt-1">
                    💹 Prezzo corrente: {formatCurrencySmartWithUserCurrency(currentPrice)}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantità</label>
                <input
                  type="number"
                  step="any"
                  value={transactionForm.quantity}
                  onChange={(e) => {
                    setTransactionForm(prev => ({ ...prev, quantity: e.target.value }))
                    
                    if (currentPrice && e.target.value && !isNaN(parseFloat(e.target.value))) {
                      const quantity = parseFloat(e.target.value)
                      const calculatedValue = smartRoundPrice(quantity * currentPrice)
                      setTransactionForm(prev => ({ ...prev, eurValue: calculatedValue.toString() }))
                    }
                  }}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="es. 1.5"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valore EUR</label>
                <input
                  type="number"
                  step="0.01"
                  value={transactionForm.eurValue}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, eurValue: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="es. 100.00"
                  required
                />
                {currentPrice && transactionForm.quantity && !isNaN(parseFloat(transactionForm.quantity)) && (
                  <div className="text-xs text-gray-500 mt-1">
                    💡 {transactionForm.quantity} × {formatCurrencySmartWithUserCurrency(currentPrice)} = {formatCurrencyWithUserCurrency(parseFloat(transactionForm.quantity) * currentPrice)}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                <input
                  type="date"
                  value={transactionForm.date}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note (opzionale)</label>
                <input
                  type="text"
                  value={transactionForm.notes}
                  onChange={(e) => setTransactionForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="es. Acquisto su Binance"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
                >
                  {submitLoading ? 'Modifica...' : 'Salva Modifiche'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowEditTransaction(false)
                    setEditingTransaction(null)
                    resetTransactionForm()
                  }}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Annulla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🔧 MODAL IMPOSTAZIONI PORTFOLIO */}
      {showEditPortfolio && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">⚙️ Impostazioni Portfolio</h3>
              <button
                onClick={() => setShowEditPortfolio(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditPortfolio} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nome Portfolio</label>
                <input
                  type="text"
                  value={portfolioForm.name}
                  onChange={(e) => setPortfolioForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="es. Main Crypto Wallet"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione (opzionale)</label>
                <textarea
                  value={portfolioForm.description}
                  onChange={(e) => setPortfolioForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="es. Portfolio principale per trading crypto"
                  rows={3}
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 font-medium"
                >
                  {submitLoading ? 'Salvataggio...' : 'Salva Modifiche'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditPortfolio(false)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Annulla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🔄 MODAL SWAP */}
      {showSwap && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">🔄 Swap Crypto</h3>
              <button
                onClick={() => {
                  setShowSwap(false)
                  resetSwapForm()
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSwap} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Da Asset</label>
                <select
                  value={swapForm.fromAsset}
                  onChange={(e) => setSwapForm(prev => ({ ...prev, fromAsset: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Seleziona asset...</option>
                  {portfolio.holdings.map(holding => (
                    <option key={holding.asset.symbol} value={holding.asset.symbol}>
                      {holding.asset.symbol} - {formatCryptoSmart(holding.quantity)} disponibili
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantità da vendere</label>
                <input
                  type="number"
                  step="any"
                  value={swapForm.fromQuantity}
                  onChange={(e) => setSwapForm(prev => ({ ...prev, fromQuantity: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="es. 1.5"
                  required
                />
              </div>

              <div className="text-center text-gray-500 py-2">
                ⬇️ SWAP ⬇️
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">A Asset</label>
                <input
                  type="text"
                  value={swapForm.toAsset}
                  onChange={(e) => setSwapForm(prev => ({ ...prev, toAsset: e.target.value.toUpperCase() }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="es. BTC, ETH, SOL"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantità ricevuta</label>
                <input
                  type="number"
                  step="any"
                  value={swapForm.toQuantity}
                  onChange={(e) => setSwapForm(prev => ({ ...prev, toQuantity: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="es. 0.002"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                <input
                  type="date"
                  value={swapForm.date}
                  onChange={(e) => setSwapForm(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Note (opzionale)</label>
                <input
                  type="text"
                  value={swapForm.notes}
                  onChange={(e) => setSwapForm(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="es. Swap su DEX"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="flex-1 px-4 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 disabled:opacity-50 font-medium"
                >
                  {submitLoading ? 'Swap...' : '🔄 Conferma Swap'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSwap(false)
                    resetSwapForm()
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 font-medium"
                >
                  Annulla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 🆕 MODAL AGGIUNGI NETWORK FEE */}
      {showAddFee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-xl font-bold text-white">🌐 Aggiungi Network Fee</h2>
              <button
                onClick={() => {
                  setShowAddFee(false)
                  resetFeeForm()
                }}
                className="text-gray-500 hover:text-gray-700"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddFee} className="space-y-4 p-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Asset</label>
                <select
                  value={feeForm.assetId}
                  onChange={(e) => setFeeForm(prev => ({ ...prev, assetId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                >
                  <option value="">Seleziona asset...</option>
                  {portfolio.holdings.map(holding => (
                    <option key={holding.asset.id} value={holding.asset.id}>
                      {holding.asset.symbol} - {holding.asset.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantità Fee</label>
                <input
                  type="number"
                  step="any"
                  value={feeForm.quantity}
                  onChange={(e) => setFeeForm(prev => ({ ...prev, quantity: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="es. 0.001"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Valore EUR (opzionale)</label>
                <input
                  type="number"
                  step="0.01"
                  value={feeForm.eurValue}
                  onChange={(e) => setFeeForm(prev => ({ ...prev, eurValue: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="es. 5.50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Data</label>
                <input
                  type="date"
                  value={feeForm.date}
                  onChange={(e) => setFeeForm(prev => ({ ...prev, date: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Descrizione</label>
                <input
                  type="text"
                  value={feeForm.description}
                  onChange={(e) => setFeeForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  placeholder="es. Transfer to cold wallet"
                />
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  type="submit"
                  disabled={submitLoading}
                  className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 font-medium"
                >
                  {submitLoading ? 'Aggiunta...' : '🌐 Aggiungi Fee'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddFee(false)
                    resetFeeForm()
                  }}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 font-medium"
                >
                  Annulla
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 📁 CSV IMPORT MODAL */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto border border-gray-300 dark:border-gray-600">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-white">Import CSV Transazioni Crypto</h2>
              <button
                onClick={resetImportModal}
                disabled={isImporting}
                className={`${isImporting ? 'text-gray-300 dark:text-gray-600 cursor-not-allowed' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}
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
                <h3 className="text-lg font-bold text-white">Import in corso...</h3>
                
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
                  
                  {/* Info processamento */}
                  <div className="text-sm text-adaptive-900 text-center">
                    <span className="font-semibold">Processando transazioni crypto...</span>
                    {importProgress.totalBatches > 1 && (
                      <div className="text-xs text-adaptive-600 mt-1">
                        Batch {importProgress.currentBatch} / {importProgress.totalBatches}
                      </div>
                    )}
                  </div>
                  
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
                    data,tipo,asset,asset_to,quantita,quantita_to,valore_eur,prezzo_unitario,broker,note
                  </div>
                  <ul className="text-sm text-blue-800 mt-2 space-y-1">
                    <li>• <strong>data:</strong> formato DD/MM/YYYY, DD-MM-YYYY, YYYY-MM-DD</li>
                    <li>• <strong>tipo:</strong> 'buy', 'sell', 'stake_reward', o 'swap'</li>
                    <li>• <strong>asset:</strong> simbolo asset (es. BTC, ETH, USDT)</li>
                    <li>• <strong>asset_to:</strong> solo per swap - asset di destinazione (lascia vuoto per buy/sell)</li>
                    <li>• <strong>quantita:</strong> quantità asset (es. 0.00123456)</li>
                    <li>• <strong>quantita_to:</strong> solo per swap - quantità asset destinazione (lascia vuoto per buy/sell)</li>
                    <li>• <strong>valore_eur:</strong> valore totale in Euro (es. 50.00) - per stake_reward può essere 0</li>
                    <li>• <strong>prezzo_unitario:</strong> prezzo per unità (opzionale, calcolato automaticamente)</li>
                    <li>• <strong>broker:</strong> nome del broker/exchange (es. Binance, Kraken) - OBBLIGATORIO</li>
                    <li>• <strong>note:</strong> note opzionali</li>
                  </ul>
                  
                  <div className="mt-3 p-3 bg-yellow-50 border border-yellow-200 rounded">
                    <h4 className="font-semibold text-yellow-800 mb-1">💡 Supporto formati:</h4>
                    <ul className="text-xs text-yellow-700 space-y-1">
                      <li>• <strong>Separatori:</strong> virgola (,) o punto e virgola (;) - rilevato automaticamente</li>
                      <li>• <strong>Virgolette:</strong> gestite automaticamente per campi con separatori</li>
                      <li>• <strong>Esempio BUY:</strong> 01/01/2024,buy,BTC,,0.001,,50.00,,Binance,DCA</li>
                      <li>• <strong>Esempio STAKE:</strong> 01/01/2024,stake_reward,ETH,,0.05,,0,,Binance,Reward gratuito</li>
                    </ul>
                  </div>
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
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asset</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Asset To</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantità</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qta To</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">EUR</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Broker</th>
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
                                : row.tipo.toLowerCase() === 'sell'
                                ? 'bg-red-100 text-red-800'
                                : row.tipo.toLowerCase() === 'stake_reward'
                                ? 'bg-blue-100 text-blue-800'
                                : row.tipo.toLowerCase() === 'swap'
                                ? 'bg-orange-100 text-orange-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {row.tipo}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-sm text-gray-900">{row.asset}</td>
                          <td className="px-3 py-2 text-sm text-gray-500">{row.asset_to || '-'}</td>
                          <td className="px-3 py-2 text-sm text-gray-900">{row.quantita}</td>
                          <td className="px-3 py-2 text-sm text-gray-500">{row.quantita_to || '-'}</td>
                          <td className="px-3 py-2 text-sm text-gray-900">€{row.valore_eur}</td>
                          <td className="px-3 py-2 text-sm text-gray-900">{row.broker}</td>
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
                    <p className={`${importResult.success ? 'text-green-800' : 'text-red-800'}`}>• <strong>Transazioni crypto importate:</strong> {importResult.imported}</p>
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

      {/* 🗑️ BULK DELETE CONFIRMATION MODAL */}
      {showBulkDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md mx-4 border border-gray-300 dark:border-gray-600">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">🗑️ Conferma Eliminazione</h3>
              <button
                onClick={() => setShowBulkDeleteModal(false)}
                disabled={isDeleting}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 disabled:opacity-50"
              >
                <XMarkIcon className="w-5 h-5" />
              </button>
            </div>

            {!isDeleting ? (
              <div className="space-y-4">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-red-600">⚠️</span>
                    <span className="font-medium text-red-800">Attenzione!</span>
                  </div>
                  <p className="text-red-700 text-sm">
                    Stai per eliminare <strong>{selectedTransactions.length} transazioni</strong>.
                    Questa azione non può essere annullata.
                  </p>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setShowBulkDeleteModal(false)}
                    className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 bg-white dark:bg-gray-800"
                  >
                    Annulla
                  </button>
                  <button
                    onClick={confirmBulkDelete}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
                  >
                    Elimina {selectedTransactions.length}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <h4 className="text-lg font-bold text-adaptive-900">Eliminazione in corso...</h4>
                
                <div className="space-y-3">
                  {/* Progress bar */}
                  <div className="w-full bg-gray-200 rounded-full h-4">
                    <div 
                      className="bg-red-600 h-4 rounded-full transition-all duration-300 ease-out"
                      style={{ 
                        width: `${deleteProgress.total > 0 ? (deleteProgress.current / deleteProgress.total) * 100 : 0}%` 
                      }}
                    ></div>
                  </div>
                  
                  {/* Stats */}
                  <div className="flex justify-between text-sm text-adaptive-900 font-medium">
                    <span>{deleteProgress.current} / {deleteProgress.total} transazioni eliminate</span>
                    <span className="font-medium">{deleteProgress.total > 0 ? Math.round((deleteProgress.current / deleteProgress.total) * 100) : 0}%</span>
                  </div>
                  
                  {/* Loading spinner */}
                  <div className="flex items-center justify-center space-x-2">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-red-600"></div>
                    <span className="text-sm text-adaptive-900 font-semibold">Eliminazione in corso...</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Modal Apri Trade */}
      {showOpenTrade && (
        <OpenTradeModal
          portfolio={portfolio}
          onClose={() => setShowOpenTrade(false)}
          onSubmit={handleOpenTrade}
        />
      )}
    </div>
  )

  // 🔧 FORM HANDLERS
  async function handleAddTransaction(e: React.FormEvent) {
    e.preventDefault()

    if (!transactionForm.ticker || !transactionForm.quantity || !transactionForm.eurValue) {
      await alert({
        title: 'Campi Obbligatori',
        message: 'Compila tutti i campi obbligatori',
        variant: 'warning'
      })
      return
    }

    setSubmitLoading(true)
    try {
      const response = await fetch(`/api/crypto-portfolios/${portfolioId}/transactions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: transactionForm.type,
          assetSymbol: transactionForm.ticker,
          quantity: parseFloat(transactionForm.quantity),
          eurValue: parseFloat(transactionForm.eurValue),
          date: transactionForm.date,
          notes: transactionForm.notes || null
        })
      })

      if (response.ok) {
        await fetchPortfolio()
        setShowAddTransaction(false)
        resetTransactionForm()
        await alert({
          title: 'Successo',
          message: 'Transazione aggiunta con successo!',
          variant: 'success'
        })
      } else {
        const error = await response.json()
        await alert({
          title: 'Errore',
          message: `Errore: ${error.error || 'Aggiunta transazione fallita'}`,
          variant: 'error'
        })
      }
    } catch (error) {
      console.error('Error adding transaction:', error)
      await alert({
        title: 'Errore',
        message: 'Errore durante l\'aggiunta della transazione',
        variant: 'error'
      })
    } finally {
      setSubmitLoading(false)
    }
  }

  async function handleEditTransaction(e: React.FormEvent) {
    e.preventDefault()

    if (!editingTransaction || !transactionForm.ticker || !transactionForm.quantity || !transactionForm.eurValue) {
      await alert({
        title: 'Campi Obbligatori',
        message: 'Compila tutti i campi obbligatori',
        variant: 'warning'
      })
      return
    }

    setSubmitLoading(true)
    try {
      const response = await fetch(`/api/crypto-portfolios/${portfolioId}/transactions/${editingTransaction.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: transactionForm.type,
          assetSymbol: transactionForm.ticker,
          quantity: parseFloat(transactionForm.quantity),
          eurValue: parseFloat(transactionForm.eurValue),
          date: transactionForm.date,
          notes: transactionForm.notes || null
        })
      })

      if (response.ok) {
        await fetchPortfolio()
        setShowEditTransaction(false)
        setEditingTransaction(null)
        resetTransactionForm()
        await alert({
          title: 'Successo',
          message: 'Transazione modificata con successo!',
          variant: 'success'
        })
      } else {
        const error = await response.json()
        await alert({
          title: 'Errore',
          message: `Errore: ${error.error || 'Modifica transazione fallita'}`,
          variant: 'error'
        })
      }
    } catch (error) {
      console.error('Error editing transaction:', error)
      await alert({
        title: 'Errore',
        message: 'Errore durante la modifica della transazione',
        variant: 'error'
      })
    } finally {
      setSubmitLoading(false)
    }
  }

  async function handleEditPortfolio(e: React.FormEvent) {
    e.preventDefault()

    if (!portfolioForm.name.trim()) {
      await alert({
        title: 'Campo Obbligatorio',
        message: 'Nome portfolio è obbligatorio',
        variant: 'warning'
      })
      return
    }

    setSubmitLoading(true)
    try {
      const response = await fetch(`/api/crypto-portfolios/${portfolioId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: portfolioForm.name.trim(),
          description: portfolioForm.description.trim() || null
        })
      })

      if (response.ok) {
        await fetchPortfolio()
        setShowEditPortfolio(false)
        await alert({
          title: 'Successo',
          message: 'Portfolio modificato con successo!',
          variant: 'success'
        })
      } else {
        const error = await response.json()
        await alert({
          title: 'Errore',
          message: `Errore: ${error.error || 'Modifica portfolio fallita'}`,
          variant: 'error'
        })
      }
    } catch (error) {
      console.error('Error editing portfolio:', error)
      await alert({
        title: 'Errore',
        message: 'Errore durante la modifica del portfolio',
        variant: 'error'
      })
    } finally {
      setSubmitLoading(false)
    }
  }

  async function handleDeleteTransaction(transactionId: number) {
    const confirmed = await confirm({
      title: 'Elimina Transazione',
      message: 'Sei sicuro di voler eliminare questa transazione?',
      confirmText: 'Elimina',
      cancelText: 'Annulla',
      variant: 'danger'
    })

    if (!confirmed) return

    try {
      const response = await fetch(`/api/crypto-portfolios/${portfolioId}/transactions/${transactionId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchPortfolio()
        // Pulisci lo state trades per evitare trades fantasma
        setTrades([])
        await alert({
          title: 'Successo',
          message: 'Transazione eliminata con successo!',
          variant: 'success'
        })
      } else {
        const error = await response.json()
        await alert({
          title: 'Errore',
          message: `Errore: ${error.error || 'Eliminazione transazione fallita'}`,
          variant: 'error'
        })
      }
    } catch (error) {
      console.error('Error deleting transaction:', error)
      await alert({
        title: 'Errore',
        message: 'Errore durante l\'eliminazione della transazione',
        variant: 'error'
      })
    }
  }
}

// Modal Apri Trade Component
function OpenTradeModal({ 
  portfolio, 
  onClose, 
  onSubmit 
}: { 
  portfolio: CryptoPortfolio | null
  onClose: () => void
  onSubmit: (fromAssetId: number, toAssetSymbol: string, fromQuantity: number, toQuantity: number, notes?: string) => void
}) {
  const [fromAssetId, setFromAssetId] = useState<number | null>(null)
  const [toAssetSymbol, setToAssetSymbol] = useState('')
  const [fromQuantity, setFromQuantity] = useState('')
  const [toQuantity, setToQuantity] = useState('')
  const [notes, setNotes] = useState('')


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!fromAssetId || !toAssetSymbol.trim() || !fromQuantity || !toQuantity) {
      await alert({
        title: 'Campi Obbligatori',
        message: 'Compila tutti i campi obbligatori',
        variant: 'warning'
      })
      return
    }

    const fromQty = parseFloat(fromQuantity)
    const toQty = parseFloat(toQuantity)

    if (fromQty <= 0 || toQty <= 0) {
      await alert({
        title: 'Quantità Non Valide',
        message: 'Le quantità devono essere positive',
        variant: 'warning'
      })
      return
    }

    // Verifica che il simbolo di destinazione non sia uguale all'asset di origine
    const fromAsset = portfolio?.holdings.find(h => h.asset.id === fromAssetId)
    if (fromAsset && fromAsset.asset.symbol.toUpperCase() === toAssetSymbol.toUpperCase()) {
      await alert({
        title: 'Asset Duplicati',
        message: 'Asset di origine e destinazione devono essere diversi',
        variant: 'warning'
      })
      return
    }

    onSubmit(fromAssetId, toAssetSymbol.trim(), fromQty, toQty, notes.trim() || undefined)
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg p-6 w-full max-w-md">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-medium">🚀 Apri Trade</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <XMarkIcon className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Asset FROM */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Da quale asset *
            </label>
            <select
              value={fromAssetId || ''}
              onChange={(e) => setFromAssetId(parseInt(e.target.value) || null)}
              className="w-full p-2 border border-gray-300 rounded-md"
              required
            >
              <option value="">Seleziona asset...</option>
              {portfolio?.holdings.map(holding => (
                <option key={holding.asset.id} value={holding.asset.id}>
                  {holding.asset.symbol} ({formatCryptoSmart(holding.quantity)} disponibili)
                </option>
              ))}
            </select>
          </div>

          {/* Quantità FROM */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantità da vendere *
            </label>
            <input
              type="number"
              step="any"
              value={fromQuantity}
              onChange={(e) => setFromQuantity(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
              placeholder="0.001"
              required
            />
          </div>

          {/* Asset TO */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              A quale asset * (simbolo)
            </label>
            <input
              type="text"
              value={toAssetSymbol}
              onChange={(e) => setToAssetSymbol(e.target.value.toUpperCase())}
              className="w-full p-2 border border-gray-300 rounded-md"
              placeholder="ETH"
              required
            />
          </div>

          {/* Quantità TO */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantità che riceverai *
            </label>
            <input
              type="number"
              step="any"
              value={toQuantity}
              onChange={(e) => setToQuantity(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
              placeholder="0.5"
              required
            />
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Note (opzionali)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full p-2 border border-gray-300 rounded-md"
              placeholder="Trade BTC → ETH"
            />
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
            >
              Annulla
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              🚀 Apri Trade
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Componente TradeCard per visualizzare i trade
function TradeCard({ 
  trade, 
  onClose,
  onCloseTrade,
  portfolioId
}: { 
  trade: any
  onClose: () => void
  onCloseTrade: (trade: any) => void
  portfolioId: string
}) {
  const { alert, confirm } = useNotifications()
  const isProfit = trade.quantityGain ? trade.quantityGain >= 0 : false
  const pnlColor = isProfit ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
  const bgColor = isProfit ? 'bg-green-100 dark:bg-green-900/20' : 'bg-red-100 dark:bg-red-900/20'
  const borderColor = isProfit ? 'border-green-300 dark:border-green-700' : 'border-red-300 dark:border-red-700'
  
  const daysSinceOpen = Math.floor((new Date().getTime() - new Date(trade.openDate).getTime()) / (1000 * 60 * 60 * 24))

  const handleDeleteTrade = async () => {
    const confirmed = await confirm({
      title: 'Eliminare questo trade?',
      message: `Questo eliminerà il trade ${trade.fromAsset.symbol} → ${trade.toAsset.symbol} e ripristinerà i holdings originali. L'operazione non può essere annullata.`,
      confirmText: 'Elimina',
      cancelText: 'Annulla',
      variant: 'warning'
    })

    if (!confirmed) return

    try {
      const response = await fetch(`/api/crypto-portfolios/${portfolioId}/trades/${trade.id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        throw new Error('Errore eliminazione trade')
      }

      await alert({
        title: 'Trade eliminato con successo',
        message: 'Holdings ripristinati',
        variant: 'success'
      })
      window.location.reload() // Refresh per aggiornare dati
    } catch (error) {
      console.error('Error deleting trade:', error)
      await alert({
        title: 'Errore',
        message: 'Impossibile eliminare il trade',
        variant: 'error'
      })
    }
  }

  return (
    <div className={`p-4 rounded-lg border ${bgColor} ${borderColor}`}>
      <div className="flex justify-between items-start mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg font-semibold text-adaptive-900">
              🎯 {trade.fromAsset.symbol} → {trade.toAsset.symbol}
            </span>
            <span className="text-sm bg-purple-100 dark:bg-purple-900/50 text-purple-600 dark:text-purple-400 px-2 py-1 rounded">
              Trade #{trade.id}
            </span>
          </div>
          
          <div className="text-sm text-adaptive-600">
            Aperto: {new Date(trade.openDate).toLocaleDateString('it-IT', { 
              day: '2-digit', 
              month: 'short', 
              hour: '2-digit', 
              minute: '2-digit' 
            })} ({daysSinceOpen} giorni fa)
          </div>
        </div>
        
        <div className="flex gap-2">
          {trade.status === 'open' && (
            <button
              onClick={() => onCloseTrade(trade)}
              className="px-3 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 text-sm font-medium shadow-md hover:shadow-lg transition-shadow"
            >
              ✅ Chiudi
            </button>
          )}
          <button
            onClick={handleDeleteTrade}
            className="px-3 py-1 bg-gray-600 text-white rounded-md hover:bg-gray-700 text-sm font-medium shadow-md hover:shadow-lg transition-shadow"
          >
            🗑️ Elimina
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mt-3">
        <div>
          <div className="text-xs text-adaptive-600">Valore Iniziale</div>
          <div className="font-mono text-adaptive-900">{formatCurrencySmart(trade.initialValue)}</div>
        </div>
        
        <div>
          <div className="text-xs text-adaptive-600">Valore Attuale</div>
          <div className="font-mono text-adaptive-900">
            {trade.currentValue ? formatCurrencySmart(trade.currentValue) : '...'}
          </div>
        </div>
      </div>

      {trade.quantityGain !== undefined && (
        <div className="mt-3 pt-3 border-t border-gray-300 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <span className="text-sm font-medium text-adaptive-900">Performance:</span>
            <div className={`text-right ${pnlColor}`}>
              <div className="font-semibold">
                {trade.quantityGain >= 0 ? '+' : ''}{formatCryptoSmart(trade.quantityGain, trade.fromAsset.decimals)} {trade.fromAsset.symbol}
              </div>
              <div className="text-sm">
                {trade.livePnLPercentage >= 0 ? '+' : ''}{trade.livePnLPercentage.toFixed(2)}%
              </div>
            </div>
          </div>
          
          {/* Info aggiuntiva: quantità che si potrebbe ricomprare */}
          <div className="mt-2 text-xs text-adaptive-600">
            Ricomprabile: {formatCryptoSmart(trade.potentialFromQuantity || 0, trade.fromAsset.decimals)} {trade.fromAsset.symbol}
          </div>
        </div>
      )}

      {trade.notes && (
        <div className="mt-3 text-sm text-adaptive-600 italic">
          "{trade.notes}"
        </div>
      )}
    </div>
  )
}