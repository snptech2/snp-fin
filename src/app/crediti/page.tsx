'use client'

import { useState, useEffect } from 'react'
import { formatCurrency } from '@/utils/formatters'
import { 
  CurrencyEuroIcon, PlusIcon, PencilIcon, TrashIcon
} from '@heroicons/react/24/outline'
import ProtectedRoute from '@/components/ProtectedRoute'

interface Credit {
  id: number
  name: string
  description?: string
  amount: number
  createdAt: string
  updatedAt: string
}

export default function CreditiPage() {
  const [credits, setCredits] = useState<Credit[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingCredit, setEditingCredit] = useState<Credit | null>(null)
  
  // Form state
  const [creditForm, setCreditForm] = useState({
    name: '',
    description: '',
    amount: ''
  })
  
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchCredits()
  }, [])

  const fetchCredits = async () => {
    try {
      const response = await fetch('/api/credits')
      if (response.ok) {
        const data = await response.json()
        setCredits(data)
      }
    } catch (error) {
      console.error('Errore nel caricamento crediti:', error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setCreditForm({
      name: '',
      description: '',
      amount: ''
    })
    setShowForm(false)
    setEditingCredit(null)
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      const url = editingCredit 
        ? `/api/credits/${editingCredit.id}`
        : '/api/credits'
      
      const method = editingCredit ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(creditForm)
      })

      if (response.ok) {
        resetForm()
        await fetchCredits()
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Errore nel salvataggio')
      }
    } catch (error) {
      setError('Errore di rete')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = (credit: Credit) => {
    setEditingCredit(credit)
    setCreditForm({
      name: credit.name,
      description: credit.description || '',
      amount: credit.amount.toString()
    })
    setShowForm(true)
  }

  const handleDelete = async (creditId: number) => {
    if (!confirm('Sei sicuro di voler eliminare questo credito?')) return

    try {
      const response = await fetch(`/api/credits/${creditId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchCredits()
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Errore nell\'eliminazione')
      }
    } catch (error) {
      alert('Errore di rete nell\'eliminazione')
    }
  }

  const totalAmount = credits.reduce((sum, credit) => sum + credit.amount, 0)

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-adaptive-900">Crediti</h1>
            <p className="text-adaptive-600">Prestiti e crediti verso terzi</p>
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
            <h1 className="text-3xl font-bold text-adaptive-900">💰 Crediti</h1>
            <p className="text-adaptive-600">Prestiti e crediti verso terzi</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            Nuovo Credito
          </button>
        </div>

        {/* Totale */}
        <div className="card-adaptive p-6 rounded-lg border-adaptive bg-blue-50">
          <div className="flex items-center gap-4">
            <CurrencyEuroIcon className="w-8 h-8 text-blue-600" />
            <div>
              <h3 className="text-lg font-medium text-adaptive-900">Totale Crediti</h3>
              <p className="text-3xl font-bold text-blue-600">
                {formatCurrency(totalAmount)}
              </p>
              <p className="text-sm text-adaptive-600">{credits.length} crediti registrati</p>
            </div>
          </div>
        </div>

        {/* Lista Crediti */}
        <div className="card-adaptive rounded-lg shadow-sm border-adaptive">
          <div className="p-6 border-b border-adaptive">
            <h3 className="text-lg font-medium text-adaptive-900 flex items-center gap-2">
              <CurrencyEuroIcon className="w-5 h-5" />
              Crediti ({credits.length})
            </h3>
          </div>
          
          <div className="p-6">
            {credits.length === 0 ? (
              <div className="text-center py-8">
                <CurrencyEuroIcon className="w-12 h-12 text-adaptive-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-adaptive-900 mb-2">Nessun Credito</h3>
                <p className="text-adaptive-600 mb-4">
                  Non hai ancora registrato crediti
                </p>
                <button
                  onClick={() => setShowForm(true)}
                  className="btn-primary px-4 py-2 rounded-lg"
                >
                  Aggiungi Primo Credito
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {credits.map(credit => (
                  <div key={credit.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-adaptive-900">{credit.name}</h4>
                          <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded-full">
                            Credito
                          </span>
                        </div>
                        {credit.description && (
                          <p className="text-sm text-adaptive-600 mb-2">{credit.description}</p>
                        )}
                        <div className="bg-blue-50 p-3 rounded">
                          <div className="text-xs text-blue-600 font-medium mb-1">Importo Credito</div>
                          <div className="text-xl font-bold text-blue-700">{formatCurrency(credit.amount)}</div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 ml-4">
                        <button
                          onClick={() => handleEdit(credit)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="Modifica credito"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(credit.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="Elimina credito"
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

        {/* Modal Form */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md border border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold mb-4 text-white">
                💰 {editingCredit ? 'Modifica Credito' : 'Nuovo Credito'}
              </h3>
              
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}
              
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                    Nome *
                  </label>
                  <input
                    type="text"
                    value={creditForm.name}
                    onChange={(e) => setCreditForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Es: Prestito a Mario, Credito vs Azienda X"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                    Descrizione
                  </label>
                  <textarea
                    value={creditForm.description}
                    onChange={(e) => setCreditForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descrizione dettagliata (opzionale)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                    Importo (EUR) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={creditForm.amount}
                    onChange={(e) => setCreditForm(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white"
                    required
                  />
                </div>

                <div className="flex gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={resetForm}
                    className="flex-1 px-4 py-2 text-gray-700 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Annulla
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  >
                    {isSubmitting ? 'Salvando...' : 'Salva'}
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