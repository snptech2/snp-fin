'use client'

import { useState, useEffect, useMemo } from 'react'
import { formatCurrency } from '@/utils/formatters'
import { 
  DocumentTextIcon, CurrencyEuroIcon, CalendarIcon, 
  PlusIcon, PencilIcon, TrashIcon, CogIcon, BanknotesIcon
} from '@heroicons/react/24/outline'
import ProtectedRoute from '@/components/ProtectedRoute'

interface Account {
  id: number
  name: string
  balance: number
  isDefault: boolean
}

interface PartitaIVAConfig {
  id: number
  anno: number
  percentualeImponibile: number
  percentualeImposta: number
  percentualeContributi: number
}

interface PartitaIVAIncome {
  id: number
  dataIncasso: string
  dataEmissione: string
  riferimento: string
  entrata: number
  imponibile: number
  imposta: number
  contributi: number
  totaleTasse: number
  config: PartitaIVAConfig
  account?: { id: number; name: string }
}

interface PartitaIVATaxPayment {
  id: number
  data: string
  descrizione: string
  importo: number
  tipo: string
  account?: { id: number; name: string }
}

interface PartitaIVAStats {
  anno: number
  config?: PartitaIVAConfig
  totali: {
    entrate: number
    tasseDovute: number
    tassePagate: number
    saldoTasse: number
    percentualeTasse: number
  }
  conteggi: {
    numeroFatture: number
    numeroPagamenti: number
  }
  riepilogo: {
    haEntrate: boolean
    haPagamenti: boolean
    inRegola: boolean
    importoDaRiservare: number
  }
}

interface PartitaIVAGlobalStats {
  totali: {
    entrate: number
    imponibile: number
    imposta: number
    contributi: number
    tasseDovute: number
    tassePagate: number
    saldoTasse: number
    percentualeTasse: number
  }
  conteggi: {
    numeroFatture: number
    numeroPagamenti: number
    anniAttivi: number
  }
  perAnno: Record<string, {
    entrate: number
    tasseDovute: number
    tassePagate: number
    numeroFatture: number
    numeroPagamenti: number
  }>
  riepilogo: {
    haEntrate: boolean
    haPagamenti: boolean
    inRegola: boolean
    importoDaRiservare: number
  }
}

export default function PartitaIVAPage() {
  const [currentYear, setCurrentYear] = useState(new Date().getFullYear())
  const [availableYears, setAvailableYears] = useState<number[]>([])
  const [accounts, setAccounts] = useState<Account[]>([])
  const [config, setConfig] = useState<PartitaIVAConfig | null>(null)
  const [incomes, setIncomes] = useState<PartitaIVAIncome[]>([])
  const [payments, setPayments] = useState<PartitaIVATaxPayment[]>([])
  const [stats, setStats] = useState<PartitaIVAStats | null>(null)
  const [globalStats, setGlobalStats] = useState<PartitaIVAGlobalStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [showYearForm, setShowYearForm] = useState(false)
  const [newYear, setNewYear] = useState('')
  
  // Stati per modifica
  const [editingIncome, setEditingIncome] = useState<PartitaIVAIncome | null>(null)
  const [editingPayment, setEditingPayment] = useState<PartitaIVATaxPayment | null>(null)

  // Stati form configurazione
  const [showConfigForm, setShowConfigForm] = useState(false)
  const [configForm, setConfigForm] = useState({
    percentualeImponibile: 78,
    percentualeImposta: 5,
    percentualeContributi: 26.23
  })

  // Stati form entrata
  const [showIncomeForm, setShowIncomeForm] = useState(false)
  const [incomeForm, setIncomeForm] = useState({
    dataIncasso: new Date().toISOString().split('T')[0],
    dataEmissione: new Date().toISOString().split('T')[0],
    riferimento: '',
    entrata: '',
    accountId: ''
  })

  // Stati form pagamento
  const [showPaymentForm, setShowPaymentForm] = useState(false)
  const [paymentForm, setPaymentForm] = useState({
    data: new Date().toISOString().split('T')[0],
    descrizione: '',
    importo: '',
    tipo: 'generico',
    accountId: ''
  })

  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Caricamento dati
  useEffect(() => {
    fetchData()
  }, [])

  // Ricarica dati quando cambia anno
  useEffect(() => {
    if (availableYears.length > 0) {
      fetchYearData(currentYear)
    }
  }, [currentYear])

  // Imposta account default quando cambia la lista
  useEffect(() => {
    if (accounts.length > 0) {
      const defaultAccount = accounts.find(acc => acc.isDefault && acc.type === 'bank') ||
                              accounts.find(acc => acc.type === 'bank')
      if (defaultAccount) {
        setIncomeForm(prev => ({ ...prev, accountId: defaultAccount.id.toString() }))
        setPaymentForm(prev => ({ ...prev, accountId: defaultAccount.id.toString() }))
      }
    }
  }, [accounts])

  const fetchYears = async () => {
    try {
      const yearsRes = await fetch('/api/partita-iva/config', { method: 'POST' })
      if (yearsRes.ok) {
        const configs = await yearsRes.json()
        const years = configs.map((c: PartitaIVAConfig) => c.anno)
        
        if (years.length > 0) {
          setAvailableYears(years.sort((a, b) => b - a))
        } else {
          // Solo se non ci sono proprio configurazioni E non abbiamo già degli anni settati
          if (availableYears.length === 0) {
            const currentYear = new Date().getFullYear()
            setAvailableYears([currentYear])
          }
        }
      }
    } catch (error) {
      console.error('Errore nel caricamento anni:', error)
    }
  }

  const fetchYearData = async (year: number) => {
    try {
      const [accountsRes, configRes, incomesRes, paymentsRes, statsRes, globalStatsRes] = await Promise.all([
        fetch('/api/accounts'),
        fetch(`/api/partita-iva/config?anno=${year}`),
        fetch(`/api/partita-iva/income?anno=${year}`),
        fetch(`/api/partita-iva/tax-payments?anno=${year}`),
        fetch(`/api/partita-iva/stats?anno=${year}`),
        fetch('/api/partita-iva/stats-global')
      ])

      if (accountsRes.ok) {
        const accountsData = await accountsRes.json()
        setAccounts(accountsData.filter(acc => acc.type === 'bank'))
      }
      if (configRes.ok) setConfig(await configRes.json())
      if (incomesRes.ok) setIncomes(await incomesRes.json())
      if (paymentsRes.ok) setPayments(await paymentsRes.json())
      if (statsRes.ok) setStats(await statsRes.json())
      if (globalStatsRes.ok) setGlobalStats(await globalStatsRes.json())
    } catch (error) {
      setError('Errore nel caricamento dei dati')
    }
  }

  const fetchData = async () => {
    setLoading(true)
    try {
      await Promise.all([
        fetchYears(),
        fetchYearData(currentYear)
      ])
    } catch (error) {
      setError('Errore nel caricamento dei dati')
    } finally {
      setLoading(false)
    }
  }

  // Reset form configurazione
  const resetConfigForm = () => {
    setConfigForm({
      percentualeImponibile: config?.percentualeImponibile || 78,
      percentualeImposta: config?.percentualeImposta || 5,
      percentualeContributi: config?.percentualeContributi || 26.23
    })
    setShowConfigForm(false)
    setError('')
  }

  // Submit configurazione
  const handleConfigSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      const response = await fetch('/api/partita-iva/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anno: currentYear,
          ...configForm
        })
      })

      if (response.ok) {
        resetConfigForm()
        await fetchYearData(currentYear)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Errore nel salvataggio della configurazione')
      }
    } catch (error) {
      setError('Errore di rete')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Reset form entrata
  const resetIncomeForm = () => {
    const defaultAccount = accounts.find(acc => acc.isDefault && acc.type === 'bank') ||
                           accounts.find(acc => acc.type === 'bank')
    setIncomeForm({
      dataIncasso: new Date().toISOString().split('T')[0],
      dataEmissione: new Date().toISOString().split('T')[0],
      riferimento: '',
      entrata: '',
      accountId: defaultAccount ? defaultAccount.id.toString() : ''
    })
    setShowIncomeForm(false)
    setEditingIncome(null)
    setError('')
  }

  // Submit entrata
  const handleIncomeSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      const url = editingIncome 
        ? `/api/partita-iva/income/${editingIncome.id}`
        : '/api/partita-iva/income'
      
      const method = editingIncome ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...incomeForm,
          anno: currentYear
        })
      })

      if (response.ok) {
        resetIncomeForm()
        await fetchYearData(currentYear)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Errore nel salvataggio dell\'entrata')
      }
    } catch (error) {
      setError('Errore di rete')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Modifica entrata
  const handleEditIncome = (income: PartitaIVAIncome) => {
    setEditingIncome(income)
    setIncomeForm({
      dataIncasso: income.dataIncasso.split('T')[0],
      dataEmissione: income.dataEmissione.split('T')[0],
      riferimento: income.riferimento,
      entrata: income.entrata.toString(),
      accountId: income.account?.id.toString() || ''
    })
    setShowIncomeForm(true)
  }

  // Elimina entrata
  const handleDeleteIncome = async (incomeId: number) => {
    if (!confirm('Sei sicuro di voler eliminare questa entrata?')) return

    try {
      const response = await fetch(`/api/partita-iva/income/${incomeId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchYearData(currentYear)
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Errore nell\'eliminazione')
      }
    } catch (error) {
      alert('Errore di rete nell\'eliminazione')
    }
  }

  // Modifica pagamento
  const handleEditPayment = (payment: PartitaIVATaxPayment) => {
    setEditingPayment(payment)
    setPaymentForm({
      data: payment.data.split('T')[0],
      descrizione: payment.descrizione,
      importo: payment.importo.toString(),
      tipo: payment.tipo,
      accountId: payment.account?.id.toString() || ''
    })
    setShowPaymentForm(true)
  }

  // Elimina pagamento
  const handleDeletePayment = async (paymentId: number) => {
    if (!confirm('Sei sicuro di voler eliminare questo pagamento?')) return

    try {
      const response = await fetch(`/api/partita-iva/tax-payments/${paymentId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchYearData(currentYear)
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Errore nell\'eliminazione')
      }
    } catch (error) {
      alert('Errore di rete nell\'eliminazione')
    }
  }

  // Reset form pagamento
  const resetPaymentForm = () => {
    const defaultAccount = accounts.find(acc => acc.isDefault && acc.type === 'bank') ||
                           accounts.find(acc => acc.type === 'bank')
    setPaymentForm({
      data: new Date().toISOString().split('T')[0],
      descrizione: '',
      importo: '',
      tipo: 'generico',
      accountId: defaultAccount ? defaultAccount.id.toString() : ''
    })
    setShowPaymentForm(false)
    setEditingPayment(null)
    setError('')
  }

  // Submit pagamento
  const handlePaymentSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      const url = editingPayment 
        ? `/api/partita-iva/tax-payments/${editingPayment.id}`
        : '/api/partita-iva/tax-payments'
      
      const method = editingPayment ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(paymentForm)
      })

      if (response.ok) {
        resetPaymentForm()
        setEditingPayment(null)
        await fetchYearData(currentYear)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Errore nel salvataggio del pagamento')
      }
    } catch (error) {
      setError('Errore di rete')
    } finally {
      setIsSubmitting(false)
    }
  }

  // Gestione nuovo anno
  const handleAddYear = async () => {
    const year = parseInt(newYear)
    const currentYear = new Date().getFullYear()
    if (!year || year < 2000 || year > currentYear + 10) {
      setError(`Anno non valido (2000-${currentYear + 10})`)
      return
    }
    
    if (availableYears.includes(year)) {
      setError('Anno già presente')
      return
    }
    
    try {
      // Crea configurazione per il nuovo anno
      const response = await fetch('/api/partita-iva/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          anno: year,
          percentualeImponibile: 78,
          percentualeImposta: 5,
          percentualeContributi: 26.23
        })
      })
      
      if (response.ok) {
        setAvailableYears(prev => [...prev, year].sort((a, b) => b - a))
        setCurrentYear(year)
        setNewYear('')
        setShowYearForm(false)
        setError('')
        await fetchYearData(year)
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Errore nella creazione dell\'anno')
      }
    } catch (error) {
      setError('Errore di rete')
    }
  }

  // Gestione eliminazione anno
  const handleDeleteYear = async (year: number) => {
    if (!confirm(`Sei sicuro di voler eliminare l'anno ${year}? Questa azione è irreversibile.`)) {
      return
    }

    // Verifica che l'anno sia vuoto (nessuna entrata o pagamento)
    if (incomes.length > 0 || payments.length > 0) {
      alert('Non puoi eliminare un anno che contiene entrate o pagamenti')
      return
    }

    try {
      // Elimina la configurazione dell'anno
      const response = await fetch(`/api/partita-iva/config?anno=${year}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        const newAvailableYears = availableYears.filter(y => y !== year)
        
        // Se non ci sono più anni, crea automaticamente l'anno corrente
        if (newAvailableYears.length === 0) {
          const currentYear = new Date().getFullYear()
          setCurrentYear(currentYear)
          
          // Crea configurazione per l'anno corrente
          const createResponse = await fetch('/api/partita-iva/config', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              anno: currentYear,
              percentualeImponibile: 78,
              percentualeImposta: 5,
              percentualeContributi: 26.23
            })
          })
          
          if (createResponse.ok) {
            setAvailableYears([currentYear])
            await fetchYearData(currentYear)
          }
        } else {
          // Aggiorna solo la lista degli anni disponibili
          setAvailableYears(newAvailableYears)
          setCurrentYear(newAvailableYears[0])
          await fetchYearData(newAvailableYears[0])
        }
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Errore nell\'eliminazione dell\'anno')
      }
    } catch (error) {
      alert('Errore di rete nell\'eliminazione dell\'anno')
    }
  }

  // Calcoli per anteprima entrata
  const incomePreview = useMemo(() => {
    if (!incomeForm.entrata || !config) return null
    
    const entrata = parseFloat(incomeForm.entrata)
    if (isNaN(entrata) || entrata <= 0) return null
    
    const imponibile = (entrata * config.percentualeImponibile) / 100
    const imposta = (imponibile * config.percentualeImposta) / 100
    const contributi = (imponibile * config.percentualeContributi) / 100
    const totaleTasse = imposta + contributi
    
    return { entrata, imponibile, imposta, contributi, totaleTasse }
  }, [incomeForm.entrata, config])

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-adaptive-900">Partita IVA</h1>
            <p className="text-adaptive-600">Gestione entrate e tasse</p>
          </div>
          <div className="flex justify-center items-center h-64">
            <div className="text-adaptive-600">Caricamento...</div>
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
            <h1 className="text-3xl font-bold text-adaptive-900">📋 Partita IVA</h1>
            <p className="text-adaptive-600">Gestione entrate e pagamenti tasse</p>
          </div>
          <div className="flex items-center gap-4">
            {/* Selettore Anno */}
            <div className="flex items-center gap-2">
              <select
                value={currentYear}
                onChange={(e) => setCurrentYear(parseInt(e.target.value))}
                className="px-3 py-2 border border-adaptive rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                {availableYears.map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
              <button
                onClick={() => setShowYearForm(true)}
                className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
                title="Aggiungi nuovo anno"
              >
                <PlusIcon className="w-5 h-5" />
              </button>
              {availableYears.length > 1 && !incomes.length && !payments.length && stats && !stats.riepilogo.haEntrate && !stats.riepilogo.haPagamenti && (
                <button
                  onClick={() => handleDeleteYear(currentYear)}
                  className="px-3 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
                  title="Elimina anno vuoto"
                >
                  <TrashIcon className="w-5 h-5" />
                </button>
              )}
            </div>
            <button
              onClick={() => setShowConfigForm(true)}
              className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 flex items-center gap-2"
            >
              <CogIcon className="w-5 h-5" />
              Configurazione
            </button>
          </div>
        </div>

        {/* Statistiche Globali */}
        {globalStats && (
          <div className="card-adaptive rounded-lg shadow-sm border-adaptive mb-6">
            <div className="p-6 border-b border-adaptive">
              <h3 className="text-lg font-medium text-adaptive-900 flex items-center gap-2">
                🌍 Totali Multi-Anno
              </h3>
              <p className="text-sm text-adaptive-600">
                Riepilogo complessivo di tutti gli anni ({globalStats.conteggi.anniAttivi} anni attivi)
              </p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-green-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-green-600">💰 Entrate Totali</h4>
                  <p className="text-2xl font-bold text-green-700">
                    {formatCurrency(globalStats.totali.entrate)}
                  </p>
                  <p className="text-sm text-green-600">{globalStats.conteggi.numeroFatture} fatture</p>
                </div>
                
                <div className="bg-orange-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-orange-600">🏛️ Tasse Dovute</h4>
                  <p className="text-2xl font-bold text-orange-700">
                    {formatCurrency(globalStats.totali.tasseDovute)}
                  </p>
                  <p className="text-sm text-orange-600">
                    {globalStats.totali.percentualeTasse.toFixed(1)}% delle entrate
                  </p>
                </div>
                
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h4 className="text-sm font-medium text-blue-600">💸 Tasse Pagate</h4>
                  <p className="text-2xl font-bold text-blue-700">
                    {formatCurrency(globalStats.totali.tassePagate)}
                  </p>
                  <p className="text-sm text-blue-600">{globalStats.conteggi.numeroPagamenti} pagamenti</p>
                </div>
                
                <div className={`p-4 rounded-lg ${
                  globalStats.riepilogo.inRegola ? 'bg-green-50' : 'bg-red-50'
                }`}>
                  <h4 className={`text-sm font-medium ${
                    globalStats.riepilogo.inRegola ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {globalStats.riepilogo.inRegola ? '✅' : '⚠️'} Saldo Globale
                  </h4>
                  <p className={`text-2xl font-bold ${
                    globalStats.riepilogo.inRegola ? 'text-green-700' : 'text-red-700'
                  }`}>
                    {formatCurrency(globalStats.totali.saldoTasse)}
                  </p>
                  <p className={`text-sm ${
                    globalStats.riepilogo.inRegola ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {globalStats.riepilogo.inRegola ? 'In regola' : 'Da riservare'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Statistiche Anno Corrente */}
        {stats && (
          <div className="card-adaptive rounded-lg shadow-sm border-adaptive mb-6">
            <div className="p-6 border-b border-adaptive">
              <h3 className="text-lg font-medium text-adaptive-900 flex items-center gap-2">
                📊 Statistiche {currentYear}
              </h3>
              <p className="text-sm text-adaptive-600">
                Dati specifici per l'anno selezionato
              </p>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="card-adaptive p-4 rounded-lg border-adaptive">
                  <h4 className="text-sm font-medium text-adaptive-500">💰 Entrate {currentYear}</h4>
                  <p className="text-2xl font-bold text-green-600">
                    {formatCurrency(stats.totali.entrate)}
                  </p>
                  <p className="text-sm text-adaptive-600">{stats.conteggi.numeroFatture} fatture</p>
                </div>
                
                <div className="card-adaptive p-4 rounded-lg border-adaptive">
                  <h4 className="text-sm font-medium text-adaptive-500">🏛️ Tasse Dovute</h4>
                  <p className="text-2xl font-bold text-orange-600">
                    {formatCurrency(stats.totali.tasseDovute)}
                  </p>
                  <p className="text-sm text-adaptive-600">
                    {stats.totali.percentualeTasse.toFixed(1)}% delle entrate
                  </p>
                </div>
                
                <div className="card-adaptive p-4 rounded-lg border-adaptive">
                  <h4 className="text-sm font-medium text-adaptive-500">💸 Tasse Pagate</h4>
                  <p className="text-2xl font-bold text-blue-600">
                    {formatCurrency(stats.totali.tassePagate)}
                  </p>
                  <p className="text-sm text-adaptive-600">{stats.conteggi.numeroPagamenti} pagamenti</p>
                </div>
                
                <div className="card-adaptive p-4 rounded-lg border-adaptive">
                  <h4 className="text-sm font-medium text-adaptive-500">
                    {stats.riepilogo.inRegola ? '✅' : '⚠️'} Saldo Anno
                  </h4>
                  <p className={`text-2xl font-bold ${
                    stats.riepilogo.inRegola ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {formatCurrency(stats.totali.saldoTasse)}
                  </p>
                  <p className="text-sm text-adaptive-600">
                    {stats.riepilogo.inRegola ? 'In regola' : 'Da pagare'}
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Configurazione corrente */}
        {config && (
          <div className="card-adaptive p-4 rounded-lg border-adaptive bg-blue-50">
            <h3 className="text-lg font-medium text-adaptive-900 mb-2">
              ⚙️ Configurazione {currentYear}
            </h3>
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div>
                <span className="text-adaptive-600">Imponibile:</span>
                <span className="ml-2 font-semibold">{config.percentualeImponibile}%</span>
              </div>
              <div>
                <span className="text-adaptive-600">Imposta:</span>
                <span className="ml-2 font-semibold">{config.percentualeImposta}%</span>
              </div>
              <div>
                <span className="text-adaptive-600">Contributi:</span>
                <span className="ml-2 font-semibold">{config.percentualeContributi}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Sezione Entrate */}
        <div className="card-adaptive rounded-lg shadow-sm border-adaptive">
          <div className="p-6 border-b border-adaptive">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-adaptive-900 flex items-center gap-2">
                <DocumentTextIcon className="w-5 h-5" />
                Entrate P.IVA ({incomes.length})
              </h3>
              <button
                onClick={() => setShowIncomeForm(true)}
                className="btn-primary px-4 py-2 rounded-lg flex items-center gap-2"
              >
                <PlusIcon className="w-5 h-5" />
                Nuova Entrata
              </button>
            </div>
          </div>
          
          <div className="p-6">
            {incomes.length === 0 ? (
              <div className="text-center py-8">
                <DocumentTextIcon className="w-12 h-12 text-adaptive-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-adaptive-900 mb-2">Nessuna Entrata</h3>
                <p className="text-adaptive-600 mb-4">
                  Non hai ancora registrato entrate per il {currentYear}
                </p>
                <button
                  onClick={() => setShowIncomeForm(true)}
                  className="btn-primary px-4 py-2 rounded-lg"
                >
                  Aggiungi Prima Entrata
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {incomes.map(income => (
                  <div key={income.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-adaptive-900">{income.riferimento}</h4>
                          <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
                            Entrata
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm text-adaptive-600 mb-3">
                          <div>
                            <span className="font-medium">Incasso:</span> {new Date(income.dataIncasso).toLocaleDateString('it-IT')}
                          </div>
                          <div>
                            <span className="font-medium">Emissione:</span> {new Date(income.dataEmissione).toLocaleDateString('it-IT')}
                          </div>
                          {income.account && (
                            <div className="col-span-2">
                              <span className="font-medium">Conto:</span> {income.account.name}
                            </div>
                          )}
                        </div>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
                          <div className="bg-green-50 p-2 rounded">
                            <div className="text-xs text-green-600 font-medium">Entrata</div>
                            <div className="text-green-700 font-semibold">{formatCurrency(income.entrata)}</div>
                          </div>
                          <div className="bg-blue-50 p-2 rounded">
                            <div className="text-xs text-blue-600 font-medium">Imponibile</div>
                            <div className="text-blue-700 font-semibold">{formatCurrency(income.imponibile)}</div>
                          </div>
                          <div className="bg-orange-50 p-2 rounded">
                            <div className="text-xs text-orange-600 font-medium">Imposta</div>
                            <div className="text-orange-700 font-semibold">{formatCurrency(income.imposta)}</div>
                          </div>
                          <div className="bg-red-50 p-2 rounded">
                            <div className="text-xs text-red-600 font-medium">Tot. Tasse</div>
                            <div className="text-red-700 font-semibold">{formatCurrency(income.totaleTasse)}</div>
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 ml-4">
                        <button
                          onClick={() => handleEditIncome(income)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="Modifica entrata"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteIncome(income.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="Elimina entrata"
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

        {/* Sezione Pagamenti Tasse */}
        <div className="card-adaptive rounded-lg shadow-sm border-adaptive">
          <div className="p-6 border-b border-adaptive">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium text-adaptive-900 flex items-center gap-2">
                <BanknotesIcon className="w-5 h-5" />
                Pagamenti Tasse ({payments.length})
              </h3>
              <button
                onClick={() => setShowPaymentForm(true)}
                className="btn-primary px-4 py-2 rounded-lg flex items-center gap-2"
              >
                <PlusIcon className="w-5 h-5" />
                Nuovo Pagamento
              </button>
            </div>
          </div>
          
          <div className="p-6">
            {payments.length === 0 ? (
              <div className="text-center py-8">
                <BanknotesIcon className="w-12 h-12 text-adaptive-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-adaptive-900 mb-2">Nessun Pagamento</h3>
                <p className="text-adaptive-600 mb-4">
                  Non hai ancora registrato pagamenti tasse per il {currentYear}
                </p>
                <button
                  onClick={() => setShowPaymentForm(true)}
                  className="btn-primary px-4 py-2 rounded-lg"
                >
                  Aggiungi Primo Pagamento
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {payments.map(payment => (
                  <div key={payment.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-adaptive-900">{payment.descrizione}</h4>
                          <span className="text-xs px-2 py-1 bg-red-100 text-red-800 rounded-full">
                            {payment.tipo}
                          </span>
                        </div>
                        <div className="grid grid-cols-2 gap-4 text-sm text-adaptive-600 mb-3">
                          <div>
                            <span className="font-medium">Data:</span> {new Date(payment.data).toLocaleDateString('it-IT')}
                          </div>
                          {payment.account && (
                            <div>
                              <span className="font-medium">Conto:</span> {payment.account.name}
                            </div>
                          )}
                        </div>
                        <div className="bg-red-50 p-3 rounded">
                          <div className="text-xs text-red-600 font-medium mb-1">Importo Pagato</div>
                          <div className="text-xl font-bold text-red-700">-{formatCurrency(payment.importo)}</div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 ml-4">
                        <button
                          onClick={() => handleEditPayment(payment)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="Modifica pagamento"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeletePayment(payment.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="Elimina pagamento"
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

        {/* Modal Configurazione */}
        {showConfigForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="modal-content rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">
                ⚙️ Configurazione {currentYear}
              </h3>
              
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}
              
              <form onSubmit={handleConfigSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Percentuale Imponibile (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={configForm.percentualeImponibile}
                    onChange={(e) => setConfigForm(prev => ({ 
                      ...prev, 
                      percentualeImponibile: parseFloat(e.target.value) || 0 
                    }))}
                    className="w-full px-3 py-2 border border-adaptive rounded-md focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Percentuale Imposta (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={configForm.percentualeImposta}
                    onChange={(e) => setConfigForm(prev => ({ 
                      ...prev, 
                      percentualeImposta: parseFloat(e.target.value) || 0 
                    }))}
                    className="w-full px-3 py-2 border border-adaptive rounded-md focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Percentuale Contributi (%)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max="100"
                    value={configForm.percentualeContributi}
                    onChange={(e) => setConfigForm(prev => ({ 
                      ...prev, 
                      percentualeContributi: parseFloat(e.target.value) || 0 
                    }))}
                    className="w-full px-3 py-2 border border-adaptive rounded-md focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={resetConfigForm}
                    className="flex-1 btn-secondary px-4 py-2 rounded-lg"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 btn-primary px-4 py-2 rounded-lg disabled:opacity-50"
                  >
                    {isSubmitting ? 'Salvando...' : 'Salva'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Entrata */}
        {showIncomeForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="modal-content rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">
                📋 {editingIncome ? 'Modifica Entrata' : 'Nuova Entrata'} P.IVA
              </h3>
              
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}
              
              <form onSubmit={handleIncomeSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Data Incasso *
                  </label>
                  <input
                    type="date"
                    value={incomeForm.dataIncasso}
                    onChange={(e) => setIncomeForm(prev => ({ ...prev, dataIncasso: e.target.value }))}
                    className="w-full px-3 py-2 border border-adaptive rounded-md focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Data Emissione *
                  </label>
                  <input
                    type="date"
                    value={incomeForm.dataEmissione}
                    onChange={(e) => setIncomeForm(prev => ({ ...prev, dataEmissione: e.target.value }))}
                    className="w-full px-3 py-2 border border-adaptive rounded-md focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Riferimento *
                  </label>
                  <input
                    type="text"
                    value={incomeForm.riferimento}
                    onChange={(e) => setIncomeForm(prev => ({ ...prev, riferimento: e.target.value }))}
                    placeholder="Es: Fattura 2024/001"
                    className="w-full px-3 py-2 border border-adaptive rounded-md focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Entrata (EUR) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={incomeForm.entrata}
                    onChange={(e) => setIncomeForm(prev => ({ ...prev, entrata: e.target.value }))}
                    className="w-full px-3 py-2 border border-adaptive rounded-md focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Conto Bancario
                  </label>
                  <select
                    value={incomeForm.accountId}
                    onChange={(e) => setIncomeForm(prev => ({ ...prev, accountId: e.target.value }))}
                    className="w-full px-3 py-2 border border-adaptive rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Nessun conto (solo registrazione)</option>
                    {accounts.map(account => (
                      <option key={account.id} value={account.id.toString()}>
                        {account.name}{account.isDefault ? ' (Predefinito)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Anteprima calcoli */}
                {incomePreview && (
                  <div className="p-3 bg-blue-50 rounded-lg">
                    <h4 className="text-sm font-medium text-blue-900 mb-2">📊 Anteprima Calcoli</h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div>Imponibile: {formatCurrency(incomePreview.imponibile)}</div>
                      <div>Imposta: {formatCurrency(incomePreview.imposta)}</div>
                      <div>Contributi: {formatCurrency(incomePreview.contributi)}</div>
                      <div className="font-semibold text-red-600">
                        Totale Tasse: {formatCurrency(incomePreview.totaleTasse)}
                      </div>
                    </div>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={resetIncomeForm}
                    className="flex-1 btn-secondary px-4 py-2 rounded-lg"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 btn-primary px-4 py-2 rounded-lg disabled:opacity-50"
                  >
                    {isSubmitting ? 'Salvando...' : 'Salva'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Pagamento */}
        {showPaymentForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="modal-content rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">
                💸 {editingPayment ? 'Modifica Pagamento' : 'Nuovo Pagamento'} Tasse
              </h3>
              
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}
              
              <form onSubmit={handlePaymentSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Data Pagamento *
                  </label>
                  <input
                    type="date"
                    value={paymentForm.data}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, data: e.target.value }))}
                    className="w-full px-3 py-2 border border-adaptive rounded-md focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Descrizione *
                  </label>
                  <input
                    type="text"
                    value={paymentForm.descrizione}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, descrizione: e.target.value }))}
                    placeholder="Es: F24 I trimestre 2024"
                    className="w-full px-3 py-2 border border-adaptive rounded-md focus:ring-blue-500 focus:border-blue-500"
                    required
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
                    value={paymentForm.importo}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, importo: e.target.value }))}
                    className="w-full px-3 py-2 border border-adaptive rounded-md focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Tipo Pagamento
                  </label>
                  <select
                    value={paymentForm.tipo}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, tipo: e.target.value }))}
                    className="w-full px-3 py-2 border border-adaptive rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="generico">Generico</option>
                    <option value="imposta">Imposta</option>
                    <option value="contributi">Contributi</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">
                    Conto Bancario
                  </label>
                  <select
                    value={paymentForm.accountId}
                    onChange={(e) => setPaymentForm(prev => ({ ...prev, accountId: e.target.value }))}
                    className="w-full px-3 py-2 border border-adaptive rounded-md focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Nessun conto (solo registrazione)</option>
                    {accounts.map(account => (
                      <option key={account.id} value={account.id.toString()}>
                        {account.name}{account.isDefault ? ' (Predefinito)' : ''}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={resetPaymentForm}
                    className="flex-1 btn-secondary px-4 py-2 rounded-lg"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 btn-primary px-4 py-2 rounded-lg disabled:opacity-50"
                  >
                    {isSubmitting ? 'Salvando...' : 'Salva'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal Nuovo Anno */}
        {showYearForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="modal-content rounded-lg p-6 w-full max-w-md">
              <h3 className="text-lg font-semibold mb-4">
                📅 Aggiungi Nuovo Anno
              </h3>
              
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">
                    Anno *
                  </label>
                  <input
                    type="number"
                    min="2000"
                    max={new Date().getFullYear() + 10}
                    value={newYear}
                    onChange={(e) => setNewYear(e.target.value)}
                    placeholder={`es. ${new Date().getFullYear()}`}
                    className="w-full px-3 py-2 border border-adaptive rounded-md focus:ring-blue-500 focus:border-blue-500"
                    required
                  />
                  <p className="text-xs text-adaptive-600 mt-1">
                    Verrà creato con le percentuali default (78%, 5%, 26.23%). Range: 2000-{new Date().getFullYear() + 10}
                  </p>
                </div>

                <div className="flex gap-3 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowYearForm(false)
                      setNewYear('')
                      setError('')
                    }}
                    className="flex-1 btn-secondary px-4 py-2 rounded-lg"
                  >
                    Annulla
                  </button>
                  <button
                    type="button"
                    onClick={handleAddYear}
                    disabled={!newYear}
                    className="flex-1 btn-primary px-4 py-2 rounded-lg disabled:opacity-50"
                  >
                    Aggiungi Anno
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}