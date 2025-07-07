'use client'

import { useState, useEffect } from 'react'
import { formatCurrency } from '@/utils/formatters'
import { 
  HomeIcon, PlusIcon, PencilIcon, TrashIcon
} from '@heroicons/react/24/outline'
import ProtectedRoute from '@/components/ProtectedRoute'

interface NonCurrentAsset {
  id: number
  name: string
  description?: string
  value: number
  createdAt: string
  updatedAt: string
}

export default function BeniNonCorrentiPage() {
  const [assets, setAssets] = useState<NonCurrentAsset[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingAsset, setEditingAsset] = useState<NonCurrentAsset | null>(null)
  
  // Form state
  const [assetForm, setAssetForm] = useState({
    name: '',
    description: '',
    value: ''
  })
  
  const [error, setError] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)

  useEffect(() => {
    fetchAssets()
  }, [])

  const fetchAssets = async () => {
    try {
      const response = await fetch('/api/non-current-assets')
      if (response.ok) {
        const data = await response.json()
        setAssets(data)
      }
    } catch (error) {
      console.error('Errore nel caricamento beni non correnti:', error)
    } finally {
      setLoading(false)
    }
  }

  const resetForm = () => {
    setAssetForm({
      name: '',
      description: '',
      value: ''
    })
    setShowForm(false)
    setEditingAsset(null)
    setError('')
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError('')

    try {
      const url = editingAsset 
        ? `/api/non-current-assets/${editingAsset.id}`
        : '/api/non-current-assets'
      
      const method = editingAsset ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(assetForm)
      })

      if (response.ok) {
        resetForm()
        await fetchAssets()
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

  const handleEdit = (asset: NonCurrentAsset) => {
    setEditingAsset(asset)
    setAssetForm({
      name: asset.name,
      description: asset.description || '',
      value: asset.value.toString()
    })
    setShowForm(true)
  }

  const handleDelete = async (assetId: number) => {
    if (!confirm('Sei sicuro di voler eliminare questo bene?')) return

    try {
      const response = await fetch(`/api/non-current-assets/${assetId}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        await fetchAssets()
      } else {
        const errorData = await response.json()
        alert(errorData.error || 'Errore nell\'eliminazione')
      }
    } catch (error) {
      alert('Errore di rete nell\'eliminazione')
    }
  }

  const totalValue = assets.reduce((sum, asset) => sum + asset.value, 0)

  if (loading) {
    return (
      <ProtectedRoute>
        <div className="space-y-6">
          <div>
            <h1 className="text-3xl font-bold text-adaptive-900">Beni Non Correnti</h1>
            <p className="text-adaptive-600">Casa, auto, terreni e altri beni immobilizzati</p>
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
            <h1 className="text-3xl font-bold text-adaptive-900">🏠 Beni Non Correnti</h1>
            <p className="text-adaptive-600">Casa, auto, terreni e altri beni immobilizzati</p>
          </div>
          <button
            onClick={() => setShowForm(true)}
            className="btn-primary px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <PlusIcon className="w-5 h-5" />
            Nuovo Bene
          </button>
        </div>

        {/* Totale */}
        <div className="card-adaptive p-6 rounded-lg border-adaptive bg-green-50">
          <div className="flex items-center gap-4">
            <HomeIcon className="w-8 h-8 text-green-600" />
            <div>
              <h3 className="text-lg font-medium text-adaptive-900">Totale Beni Non Correnti</h3>
              <p className="text-3xl font-bold text-green-600">
                {formatCurrency(totalValue)}
              </p>
              <p className="text-sm text-adaptive-600">{assets.length} beni registrati</p>
            </div>
          </div>
        </div>

        {/* Lista Beni */}
        <div className="card-adaptive rounded-lg shadow-sm border-adaptive">
          <div className="p-6 border-b border-adaptive">
            <h3 className="text-lg font-medium text-adaptive-900 flex items-center gap-2">
              <HomeIcon className="w-5 h-5" />
              Beni Non Correnti ({assets.length})
            </h3>
          </div>
          
          <div className="p-6">
            {assets.length === 0 ? (
              <div className="text-center py-8">
                <HomeIcon className="w-12 h-12 text-adaptive-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-adaptive-900 mb-2">Nessun Bene</h3>
                <p className="text-adaptive-600 mb-4">
                  Non hai ancora registrato beni non correnti
                </p>
                <button
                  onClick={() => setShowForm(true)}
                  className="btn-primary px-4 py-2 rounded-lg"
                >
                  Aggiungi Primo Bene
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {assets.map(asset => (
                  <div key={asset.id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h4 className="font-semibold text-adaptive-900">{asset.name}</h4>
                          <span className="text-xs px-2 py-1 bg-green-100 text-green-800 rounded-full">
                            Bene Non Corrente
                          </span>
                        </div>
                        {asset.description && (
                          <p className="text-sm text-adaptive-600 mb-2">{asset.description}</p>
                        )}
                        <div className="bg-green-50 p-3 rounded">
                          <div className="text-xs text-green-600 font-medium mb-1">Valore Stimato</div>
                          <div className="text-xl font-bold text-green-700">{formatCurrency(asset.value)}</div>
                        </div>
                      </div>
                      <div className="flex flex-col gap-2 ml-4">
                        <button
                          onClick={() => handleEdit(asset)}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                          title="Modifica bene"
                        >
                          <PencilIcon className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(asset.id)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="Elimina bene"
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
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
                🏠 {editingAsset ? 'Modifica Bene' : 'Nuovo Bene'} Non Corrente
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
                    value={assetForm.name}
                    onChange={(e) => setAssetForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Es: Casa principale, Auto, Terreno"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                    Descrizione
                  </label>
                  <textarea
                    value={assetForm.description}
                    onChange={(e) => setAssetForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Descrizione dettagliata (opzionale)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 bg-white"
                    rows={3}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1 text-gray-700 dark:text-gray-300">
                    Valore Stimato (EUR) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={assetForm.value}
                    onChange={(e) => setAssetForm(prev => ({ ...prev, value: e.target.value }))}
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