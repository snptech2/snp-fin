'use client'

import { useState, useEffect } from 'react'

interface Budget {
  id: number
  name: string
  targetAmount: number
  type: string
  order: number
  allocatedAmount?: number
  progress?: number
  isCompleted?: boolean
  deficit?: number
  createdAt: string
  updatedAt: string
}

interface BudgetData {
  budgets: Budget[]
  totalLiquidity: number
  unallocated: number
}

interface FormData {
  name: string
  targetAmount: string
  type: 'fixed' | 'unlimited'
  order: string
}

export default function BudgetPage() {
  const [budgetData, setBudgetData] = useState<BudgetData | null>(null)
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingBudget, setEditingBudget] = useState<Budget | null>(null)
  const [formData, setFormData] = useState<FormData>({
    name: '',
    targetAmount: '',
    type: 'fixed',
    order: ''
  })
  const [submitting, setSubmitting] = useState(false)

  // Carica budget
  const loadBudgets = async () => {
    try {
      const response = await fetch('/api/budgets')
      if (response.ok) {
        const data = await response.json()
        setBudgetData(data)
      }
    } catch (error) {
      console.error('Errore nel caricamento budget:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBudgets()
  }, [])

  // Reset form
  const resetForm = () => {
    setFormData({
      name: '',
      targetAmount: '',
      type: 'fixed',
      order: ''
    })
    setEditingBudget(null)
    setShowForm(false)
  }

  // Apri form per nuovo budget
  const openCreateForm = () => {
    resetForm()
    setShowForm(true)
    // Suggerisci prossima priorità disponibile
    const maxOrder = budgetData?.budgets.reduce((max, b) => Math.max(max, b.order), 0) || 0
    setFormData(prev => ({ ...prev, order: (maxOrder + 1).toString() }))
  }

  // Apri form per modifica
  const openEditForm = (budget: Budget) => {
    setEditingBudget(budget)
    setFormData({
      name: budget.name,
      targetAmount: budget.targetAmount.toString(),
      type: budget.type as 'fixed' | 'unlimited',
      order: budget.order.toString()
    })
    setShowForm(true)
  }

  // Submit form
  const handleSubmit = async () => {
    setSubmitting(true)

    try {
      const url = editingBudget ? `/api/budgets/${editingBudget.id}` : '/api/budgets'
      const method = editingBudget ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        await loadBudgets()
        resetForm()
      } else {
        const error = await response.json()
        alert(error.error || 'Errore nella gestione del budget')
      }
    } catch (error) {
      console.error('Errore:', error)
      alert('Errore nella connessione')
    } finally {
      setSubmitting(false)
    }
  }

  // Cancella budget
  const deleteBudget = async (id: number, name: string) => {
    if (!confirm(`Sei sicuro di voler cancellare il budget "${name}"?`)) return

    try {
      const response = await fetch(`/api/budgets/${id}`, { method: 'DELETE' })
      if (response.ok) {
        await loadBudgets()
      } else {
        const error = await response.json()
        alert(error.error || 'Errore nella cancellazione')
      }
    } catch (error) {
      console.error('Errore:', error)
      alert('Errore nella connessione')
    }
  }

  // Formatta valuta
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Caricamento budget...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Budget</h1>
          <p className="text-gray-600">Gestione allocazione fondi</p>
        </div>
        <button
          onClick={openCreateForm}
          className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
        >
          + Nuovo Budget
        </button>
      </div>

      {/* Dashboard Liquidità */}
      <div className="bg-gradient-to-r from-blue-50 to-green-50 p-6 rounded-lg border">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">💰 Panoramica Liquidità</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-600">
              {formatCurrency(budgetData?.totalLiquidity || 0)}
            </div>
            <div className="text-gray-600">Liquidità Totale</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-600">
              {formatCurrency((budgetData?.totalLiquidity || 0) - (budgetData?.unallocated || 0))}
            </div>
            <div className="text-gray-600">Allocato</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-600">
              {formatCurrency(budgetData?.unallocated || 0)}
            </div>
            <div className="text-gray-600">Non Allocato</div>
          </div>
        </div>
      </div>

      {/* Lista Budget */}
      {budgetData?.budgets && budgetData.budgets.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-gray-800">📊 Allocazione Budget (per priorità)</h2>
          
          {budgetData.budgets.map((budget, index) => (
            <div key={budget.id} className="bg-white border rounded-lg p-6 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-medium">
                    #{budget.order}
                  </div>
                  <div>
                    <h3 className="font-semibold text-gray-900">{budget.name}</h3>
                    <div className="text-sm text-gray-600">
                      {budget.type === 'fixed' 
                        ? `Target: ${formatCurrency(budget.targetAmount)}`
                        : 'Budget Illimitato (tutto il resto)'
                      }
                    </div>
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <button
                    onClick={() => openEditForm(budget)}
                    className="text-blue-600 hover:bg-blue-50 px-3 py-1 rounded transition-colors"
                  >
                    Modifica
                  </button>
                  <button
                    onClick={() => deleteBudget(budget.id, budget.name)}
                    className="text-red-600 hover:bg-red-50 px-3 py-1 rounded transition-colors"
                  >
                    Cancella
                  </button>
                </div>
              </div>

              {/* Barra di Progresso */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-700">
                    Allocato: {formatCurrency(budget.allocatedAmount || 0)}
                  </span>
                  {budget.type === 'fixed' && (
                    <span className={`font-medium ${budget.isCompleted ? 'text-green-600' : 'text-orange-600'}`}>
                      {budget.progress?.toFixed(1)}%
                    </span>
                  )}
                </div>
                
                {budget.type === 'fixed' && (
                  <div className="w-full bg-gray-200 rounded-full h-3">
                    <div
                      className={`h-3 rounded-full transition-all duration-300 ${
                        budget.isCompleted ? 'bg-green-500' : 'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min(100, budget.progress || 0)}%` }}
                    />
                  </div>
                )}

                {budget.deficit && budget.deficit > 0 && (
                  <div className="text-sm text-red-600 font-medium">
                    ⚠️ Deficit: {formatCurrency(budget.deficit)}
                  </div>
                )}

                {budget.isCompleted && budget.type === 'fixed' && (
                  <div className="text-sm text-green-600 font-medium">
                    ✅ Obiettivo raggiunto!
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <div className="text-gray-500 text-lg mb-4">📊 Nessun budget configurato</div>
          <div className="text-gray-400 mb-6">Crea il tuo primo budget per iniziare ad allocare i fondi</div>
          <button
            onClick={openCreateForm}
            className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Crea Primo Budget
          </button>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {editingBudget ? 'Modifica Budget' : 'Nuovo Budget'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome Budget
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  placeholder="es. Fondo Emergenza"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Tipo Budget
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    type: e.target.value as 'fixed' | 'unlimited',
                    targetAmount: e.target.value === 'unlimited' ? '0' : prev.targetAmount
                  }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                >
                  <option value="fixed">Importo Fisso</option>
                  <option value="unlimited">Illimitato (tutto il resto)</option>
                </select>
              </div>

              {formData.type === 'fixed' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Importo Target (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={formData.targetAmount}
                    onChange={(e) => setFormData(prev => ({ ...prev, targetAmount: e.target.value }))}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                    placeholder="15000.00"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Priorità
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.order}
                  onChange={(e) => setFormData(prev => ({ ...prev, order: e.target.value }))}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:border-blue-500"
                  placeholder="1"
                />
                <div className="text-xs text-gray-500 mt-1">
                  1 = priorità massima, 2 = seconda priorità, ecc.
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={resetForm}
                  className="flex-1 border border-gray-300 text-gray-700 py-2 rounded-lg hover:bg-gray-50 transition-colors"
                  disabled={submitting}
                >
                  Annulla
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  className="flex-1 bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                  disabled={submitting}
                >
                  {submitting ? 'Salvando...' : editingBudget ? 'Aggiorna' : 'Crea'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}