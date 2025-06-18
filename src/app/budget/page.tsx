'use client'

import { useState, useEffect } from 'react'

interface Budget {
  id: number
  name: string
  targetAmount: number
  type: string
  order: number
  color: string
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
  availableColors: string[]
}

interface FormData {
  name: string
  targetAmount: string
  type: 'fixed' | 'unlimited'
  order: string
  color: string
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
    order: '',
    color: '#3B82F6'
  })
  const [submitting, setSubmitting] = useState(false)

  // Formato valuta
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

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
      order: '',
      color: budgetData?.availableColors?.[0] || '#3B82F6'
    })
    setEditingBudget(null)
    setShowForm(false)
  }

  // Apri form per nuovo budget
  const openCreateForm = () => {
    resetForm()
    setShowForm(true)
    const maxOrder = budgetData?.budgets.reduce((max, b) => Math.max(max, b.order), 0) || 0
    setFormData(prev => ({ 
      ...prev, 
      order: (maxOrder + 1).toString(),
      color: budgetData?.availableColors?.[0] || '#3B82F6'
    }))
  }

  // Apri form per modifica
  const openEditForm = (budget: Budget) => {
    setEditingBudget(budget)
    setFormData({
      name: budget.name,
      targetAmount: budget.targetAmount.toString(),
      type: budget.type as 'fixed' | 'unlimited',
      order: budget.order.toString(),
      color: budget.color || '#3B82F6'
    })
    setShowForm(true)
  }

  // Submit form
  const handleSubmit = async () => {
    setSubmitting(true)

    try {
      const url = editingBudget 
        ? `/api/budgets/${editingBudget.id}`
        : '/api/budgets'
      
      const method = editingBudget ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          targetAmount: parseFloat(formData.targetAmount),
          type: formData.type,
          order: parseInt(formData.order),
          color: formData.color
        })
      })

      if (response.ok) {
        await loadBudgets()
        resetForm()
      } else {
        const error = await response.json()
        alert(`Errore: ${error.error}`)
      }
    } catch (error) {
      console.error('Errore nel salvataggio:', error)
      alert('Errore nel salvataggio del budget')
    } finally {
      setSubmitting(false)
    }
  }

  // Cancella budget
  const deleteBudget = async (id: number) => {
    if (!confirm('Sei sicuro di voler cancellare questo budget?')) return

    try {
      const response = await fetch(`/api/budgets/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await loadBudgets()
      } else {
        const error = await response.json()
        alert(`Errore: ${error.error}`)
      }
    } catch (error) {
      console.error('Errore nella cancellazione:', error)
      alert('Errore nella cancellazione del budget')
    }
  }

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-adaptive-900">Budget</h1>
          <p className="text-adaptive-600">Gestione allocazione fondi</p>
        </div>
        <div className="flex justify-center items-center h-64">
          <div className="text-adaptive-600">Caricamento...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Standard */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-adaptive-900">Budget</h1>
          <p className="text-adaptive-600">Gestione allocazione fondi per priorità</p>
        </div>
        <button
          onClick={openCreateForm}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
        >
          ➕ Nuovo Budget
        </button>
      </div>

      {/* Statistiche Standard */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="card-adaptive p-4 rounded-lg border-adaptive">
          <h3 className="text-sm font-medium text-adaptive-500">Liquidità Totale</h3>
          <p className="text-2xl font-bold text-blue-600">
            {formatCurrency(budgetData?.totalLiquidity || 0)}
          </p>
          <p className="text-sm text-adaptive-600">Da tutti i conti</p>
        </div>
        
        <div className="card-adaptive p-4 rounded-lg border-adaptive">
          <h3 className="text-sm font-medium text-adaptive-500">Allocato</h3>
          <p className="text-2xl font-bold text-green-600">
            {formatCurrency((budgetData?.totalLiquidity || 0) - (budgetData?.unallocated || 0))}
          </p>
          <p className="text-sm text-adaptive-600">Budget assegnati</p>
        </div>
        
        <div className="card-adaptive p-4 rounded-lg border-adaptive">
          <h3 className="text-sm font-medium text-adaptive-500">Non Allocato</h3>
          <p className="text-2xl font-bold text-orange-600">
            {formatCurrency(budgetData?.unallocated || 0)}
          </p>
          <p className="text-sm text-adaptive-600">Fondi liberi</p>
        </div>
      </div>

      {/* Lista Budget Standard */}
      <div className="card-adaptive rounded-lg shadow-sm border-adaptive">
        <div className="p-6 border-b border-adaptive">
          <h3 className="text-lg font-medium text-adaptive-900">
            Allocazione Budget ({budgetData?.budgets.length || 0})
          </h3>
        </div>
        <div className="p-6">
          {budgetData?.budgets && budgetData.budgets.length > 0 ? (
            <div className="space-y-3">
              {budgetData.budgets.map((budget) => (
                <div key={budget.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                  <div className="flex items-center gap-4 flex-1">
                    {/* Priorità */}
                    <div className="bg-gray-200 text-gray-700 px-2 py-1 rounded text-sm font-medium min-w-[40px] text-center">
                      #{budget.order}
                    </div>
                    
                    {/* Colore */}
                    <div 
                      className="w-4 h-4 rounded-full border-2 border-gray-300"
                      style={{ backgroundColor: budget.color }}
                      title={`Colore: ${budget.color}`}
                    />
                    
                    {/* Info Budget */}
                    <div className="flex-1 min-w-[200px]">
                      <h4 className="font-semibold text-adaptive-900">{budget.name}</h4>
                      <p className="text-sm text-adaptive-600">
                        {budget.type === 'fixed' 
                          ? `Target: ${formatCurrency(budget.targetAmount)}`
                          : 'Budget illimitato (tutto il resto)'
                        }
                      </p>
                    </div>
                    
                    {/* Importo Allocato */}
                    <div className="text-right min-w-[120px]">
                      <div className="text-lg font-bold text-adaptive-900">
                        {formatCurrency(budget.allocatedAmount || 0)}
                      </div>
                      {budget.type === 'fixed' && (
                        <div className="text-sm text-adaptive-600">
                          {((budget.allocatedAmount || 0) / budget.targetAmount * 100).toFixed(1)}%
                        </div>
                      )}
                    </div>
                    
                    {/* Barra di Progresso */}
                    <div className="min-w-[200px]">
                      {budget.type === 'fixed' ? (
                        <div className="space-y-1">
                          <div className="flex justify-between text-xs text-adaptive-600">
                            <span>Progresso</span>
                            <span>{((budget.allocatedAmount || 0) / budget.targetAmount * 100).toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div 
                              className="h-3 rounded-full transition-all duration-300"
                              style={{ 
                                width: `${Math.min(((budget.allocatedAmount || 0) / budget.targetAmount) * 100, 100)}%`,
                                backgroundColor: budget.color 
                              }}
                            />
                          </div>
                          {budget.deficit && budget.deficit > 0 && (
                            <div className="text-xs text-red-600 font-medium">
                              ⚠️ Deficit: {formatCurrency(budget.deficit)}
                            </div>
                          )}
                          {budget.isCompleted && (
                            <div className="text-xs text-green-600 font-medium">
                              ✅ Obiettivo raggiunto!
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="text-xs text-adaptive-600">Budget Illimitato</div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div 
                              className="h-3 rounded-full"
                              style={{ 
                                width: '100%',
                                backgroundColor: budget.color 
                              }}
                            />
                          </div>
                          <div className="text-xs text-adaptive-600">
                            Riceve tutti i fondi rimanenti
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {/* Azioni */}
                  <div className="flex items-center gap-2 ml-4">
                    <button
                      onClick={() => openEditForm(budget)}
                      className="text-blue-600 hover:text-blue-800 p-1"
                    >
                      ✏️
                    </button>
                    <button
                      onClick={() => deleteBudget(budget.id)}
                      className="text-red-600 hover:text-red-800 p-1"
                    >
                      🗑️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8">
              <p className="text-adaptive-600 mb-4">📊 Nessun budget configurato</p>
              <p className="text-adaptive-500 mb-6">Crea il tuo primo budget per iniziare ad allocare i fondi</p>
              <button
                onClick={openCreateForm}
                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Crea Primo Budget
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Modal Standard */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="modal-content rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-adaptive-900 mb-4">
              {editingBudget ? 'Modifica Budget' : 'Nuovo Budget'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">
                  Nome Budget
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full border border-adaptive rounded-lg px-3 py-2 text-adaptive-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="es. Fondo Emergenza"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">
                  Tipo Budget
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    type: e.target.value as 'fixed' | 'unlimited',
                    targetAmount: e.target.value === 'unlimited' ? '0' : prev.targetAmount
                  }))}
                  className="w-full border border-adaptive rounded-lg px-3 py-2 text-adaptive-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="fixed">Fisso (target specifico)</option>
                  <option value="unlimited">Illimitato (tutto il resto)</option>
                </select>
              </div>

              {formData.type === 'fixed' && (
                <div>
                  <label className="block text-sm font-medium text-adaptive-700 mb-1">
                    Importo Target (€)
                  </label>
                  <input
                    type="number"
                    value={formData.targetAmount}
                    onChange={(e) => setFormData(prev => ({ ...prev, targetAmount: e.target.value }))}
                    className="w-full border border-adaptive rounded-lg px-3 py-2 text-adaptive-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="15000"
                    min="0"
                    step="100"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">
                  Priorità
                </label>
                <input
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData(prev => ({ ...prev, order: e.target.value }))}
                  className="w-full border border-adaptive rounded-lg px-3 py-2 text-adaptive-900 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder="1"
                  min="1"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-1">
                  Colore
                </label>
                <div className="flex gap-2 flex-wrap">
                  {budgetData?.availableColors?.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, color }))}
                      className={`w-8 h-8 rounded-full border-2 ${
                        formData.color === color ? 'border-gray-800' : 'border-gray-300'
                      }`}
                      style={{ backgroundColor: color }}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                onClick={resetForm}
                className="px-4 py-2 border border-adaptive rounded-md text-adaptive-700 hover:bg-gray-50"
              >
                Annulla
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !formData.name || (formData.type === 'fixed' && !formData.targetAmount)}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {submitting ? 'Salvataggio...' : editingBudget ? 'Aggiorna' : 'Crea'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}