'use client'

import { useState, useEffect } from 'react'

interface Budget {
  id: number
  name: string
  targetAmount: number
  type: string
  order: number
  color: string // 🎨 NUOVO: Campo colore
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
  availableColors: string[] // 🎨 NUOVO: Colori disponibili dall'API
}

interface FormData {
  name: string
  targetAmount: string
  type: 'fixed' | 'unlimited'
  order: string
  color: string // 🎨 NUOVO: Colore nel form
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
    color: '#3B82F6' // 🎨 Colore default
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
      color: budgetData?.availableColors?.[0] || '#3B82F6' // 🎨 Usa primo colore disponibile
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
    setFormData(prev => ({ 
      ...prev, 
      order: (maxOrder + 1).toString(),
      color: budgetData?.availableColors?.[0] || '#3B82F6' // 🎨 Primo colore disponibile
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
      color: budget.color || '#3B82F6' // 🎨 Usa colore esistente o default
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
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData), // 🎨 Include anche il colore
      })

      if (response.ok) {
        resetForm()
        loadBudgets() // Ricarica la lista
      } else {
        const error = await response.json()
        alert(error.error || 'Errore nel salvataggio del budget')
      }
    } catch (error) {
      console.error('Errore nel salvataggio:', error)
      alert('Errore nel salvataggio del budget')
    } finally {
      setSubmitting(false)
    }
  }

  // Cancella budget
  const deleteBudget = async (id: number, name: string) => {
    if (!confirm(`Sei sicuro di voler cancellare il budget "${name}"?`)) {
      return
    }

    try {
      const response = await fetch(`/api/budgets/${id}`, {
        method: 'DELETE',
      })

      if (response.ok) {
        loadBudgets() // Ricarica la lista
      } else {
        const error = await response.json()
        alert(error.error || 'Errore nella cancellazione del budget')
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
          <h1 className="text-3xl font-bold text-white">Budget</h1>
          <p className="text-white opacity-80">Caricamento budget...</p>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-32 bg-gray-700 rounded-lg"></div>
          <div className="h-48 bg-gray-700 rounded-lg"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">💰 Budget</h1>
          <p className="text-white opacity-80">Gestisci i tuoi budget e allocazioni</p>
        </div>
        <button
          onClick={openCreateForm}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
        >
          + Nuovo Budget
        </button>
      </div>

      {/* Dashboard Liquidità */}
      <div className="border border-gray-600 rounded-lg p-6 shadow-sm" style={{backgroundColor: '#1A1A1A'}}>
        <h2 className="text-xl font-semibold text-white mb-4">💰 Panoramica Liquidità</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center">
            <div className="text-3xl font-bold text-blue-400">
              {formatCurrency(budgetData?.totalLiquidity || 0)}
            </div>
            <div className="text-gray-300">Liquidità Totale</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-green-400">
              {formatCurrency((budgetData?.totalLiquidity || 0) - (budgetData?.unallocated || 0))}
            </div>
            <div className="text-gray-300">Allocato</div>
          </div>
          <div className="text-center">
            <div className="text-3xl font-bold text-orange-400">
              {formatCurrency(budgetData?.unallocated || 0)}
            </div>
            <div className="text-gray-300">Non Allocato</div>
          </div>
        </div>
      </div>

      {/* Lista Budget */}
      {budgetData?.budgets && budgetData.budgets.length > 0 ? (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-white">📊 Allocazione Budget (per priorità)</h2>
          
          {budgetData.budgets.map((budget, index) => (
            <div key={budget.id} style={{backgroundColor: '#1A1A1A'}} className="border border-gray-600 rounded-lg p-6 shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="flex items-center space-x-3">
                  <div className="bg-gray-800 text-white px-2 py-1 rounded text-sm font-medium border border-gray-600">
                    #{budget.order}
                  </div>
                  {/* 🎨 NUOVO: Cerchio colorato per identificare il budget */}
                  <div 
                    className="w-4 h-4 rounded-full border-2 border-gray-400"
                    style={{ backgroundColor: budget.color }}
                    title={`Colore: ${budget.color}`}
                  />
                  <div>
                    <h3 className="font-semibold text-white">{budget.name}</h3>
                    <div className="text-sm text-gray-300">
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
                    className="text-blue-400 hover:bg-gray-800 px-3 py-1 rounded transition-colors"
                  >
                    Modifica
                  </button>
                  <button
                    onClick={() => deleteBudget(budget.id, budget.name)}
                    className="text-red-400 hover:bg-gray-800 px-3 py-1 rounded transition-colors"
                  >
                    Cancella
                  </button>
                </div>
              </div>

              {/* Barra di Progresso con Colore Dinamico */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="font-medium text-gray-200">
                    Allocato: {formatCurrency(budget.allocatedAmount || 0)}
                  </span>
                  {budget.type === 'fixed' && (
                    <span className={`font-medium ${budget.isCompleted ? 'text-green-400' : 'text-orange-400'}`}>
                      {budget.progress?.toFixed(1)}%
                    </span>
                  )}
                </div>
                
                {budget.type === 'fixed' && (
                  <div className="w-full bg-gray-700 rounded-full h-3">
                    <div
                      className="h-3 rounded-full transition-all duration-300"
                      style={{ 
                        width: `${Math.min(100, budget.progress || 0)}%`,
                        backgroundColor: budget.color // 🎨 Usa colore dinamico!
                      }}
                    />
                  </div>
                )}

                {budget.deficit && budget.deficit > 0 && (
                  <div className="text-sm text-red-400 font-medium">
                    ⚠️ Deficit: {formatCurrency(budget.deficit)}
                  </div>
                )}

                {budget.isCompleted && budget.type === 'fixed' && (
                  <div className="text-sm text-green-400 font-medium">
                    ✅ Obiettivo raggiunto!
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12 border border-gray-600 rounded-lg" style={{backgroundColor: '#1A1A1A'}}>
          <div className="text-gray-300 text-lg mb-4">📊 Nessun budget configurato</div>
          <div className="text-gray-400 mb-6">Crea il tuo primo budget per iniziare ad allocare i fondi</div>
          <button
            onClick={openCreateForm}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg transition-colors"
          >
            Crea Primo Budget
          </button>
        </div>
      )}

      {/* Form Modal con Selettore Colore */}
      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md" style={{backgroundColor: '#1A1A1A', border: '1px solid #404040'}}>
            <h3 className="text-lg font-semibold text-white mb-4">
              {editingBudget ? 'Modifica Budget' : 'Nuovo Budget'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Nome Budget
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full border border-gray-600 rounded-lg px-3 py-2 focus:outline-none bg-gray-800 text-white"
                  placeholder="es. Fondo Emergenza"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Tipo Budget
                </label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData(prev => ({ 
                    ...prev, 
                    type: e.target.value as 'fixed' | 'unlimited',
                    targetAmount: e.target.value === 'unlimited' ? '0' : prev.targetAmount
                  }))}
                  className="w-full border border-gray-600 rounded-lg px-3 py-2 focus:outline-none bg-gray-800 text-white"
                >
                  <option value="fixed">Budget Fisso (con target)</option>
                  <option value="unlimited">Budget Illimitato (tutto il resto)</option>
                </select>
              </div>

              {formData.type === 'fixed' && (
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Target Amount (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.targetAmount}
                    onChange={(e) => setFormData(prev => ({ ...prev, targetAmount: e.target.value }))}
                    className="w-full border border-gray-600 rounded-lg px-3 py-2 focus:outline-none bg-gray-800 text-white"
                    placeholder="15000.00"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Priorità (1 = massima priorità)
                </label>
                <input
                  type="number"
                  min="1"
                  value={formData.order}
                  onChange={(e) => setFormData(prev => ({ ...prev, order: e.target.value }))}
                  className="w-full border border-gray-600 rounded-lg px-3 py-2 focus:outline-none bg-gray-800 text-white"
                  placeholder="1"
                />
              </div>

              {/* 🎨 NUOVO: Selettore Colore */}
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">
                  🎨 Colore Budget
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {(budgetData?.availableColors || [
                    '#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6',
                    '#06B6D4', '#F97316', '#84CC16', '#EC4899', '#6366F1'
                  ]).map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, color }))}
                      className={`w-10 h-10 rounded-lg border-2 transition-all ${
                        formData.color === color 
                          ? 'border-white scale-110' 
                          : 'border-gray-600 hover:border-gray-400'
                      }`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
                <div className="mt-2 text-xs text-gray-400">
                  Scelto: <span style={{color: formData.color}}>{formData.color}</span>
                </div>
              </div>
            </div>
            
            <div className="flex gap-2 mt-6">
              <button
                onClick={resetForm}
                className="bg-gray-600 hover:bg-gray-700 text-white flex-1 py-2 rounded-lg transition-colors"
                disabled={submitting}
              >
                Annulla
              </button>
              <button
                onClick={handleSubmit}
                className="bg-blue-600 hover:bg-blue-700 text-white flex-1 py-2 rounded-lg disabled:opacity-50 transition-colors"
                disabled={submitting || !formData.name.trim() || !formData.order}
              >
                {submitting ? 'Salvando...' : 'Salva'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}