'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeftIcon, PhotoIcon, TrashIcon, DocumentArrowDownIcon, DocumentArrowUpIcon, Cog6ToothIcon } from '@heroicons/react/24/outline'
import ProtectedRoute from '@/components/ProtectedRoute'
import { useAuth } from '@/contexts/AuthContext'
import { useNotifications } from '@/contexts/NotificationContext'
import { formatCurrency } from '@/utils/formatters'

interface HoldingsSnapshot {
  id: number
  date: string
  btcUsd: number
  dirtyDollars: number
  dirtyEuro: number
  btc: number
  cryptoValue?: number
  dcaValue?: number
  isAutomatic: boolean
  note?: string
}

interface SnapshotSettings {
  id: number
  autoSnapshotEnabled: boolean
  frequency: string
  preferredHour?: number
  lastSnapshot?: string
}

export default function TrackingPage() {
  const router = useRouter()
  const { user } = useAuth()
  const { alert } = useNotifications()
  
  const [snapshots, setSnapshots] = useState<HoldingsSnapshot[]>([])
  const [settings, setSettings] = useState<SnapshotSettings | null>(null)
  const [totalSnapshots, setTotalSnapshots] = useState(0)
  const [loading, setLoading] = useState(true)
  const [createLoading, setCreateLoading] = useState(false)
  const [, setShowingAll] = useState(false)
  const [itemsPerPage, setItemsPerPage] = useState(50)
  const [selectedSnapshots, setSelectedSnapshots] = useState<Set<number>>(new Set())
  const [bulkDeleteLoading, setBulkDeleteLoading] = useState(false)
  
  // Modal states
  const [showImportModal, setShowImportModal] = useState(false)
  const [showSettingsModal, setShowSettingsModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState<number | null>(null)
  const [showBulkDeleteModal, setShowBulkDeleteModal] = useState(false)
  
  // Form states
  const [snapshotNote, setSnapshotNote] = useState('')
  const [csvData, setCsvData] = useState('')
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [importLoading, setImportLoading] = useState(false)
  const [forceReimport, setForceReimport] = useState(false)
  
  // Settings form states
  const [settingsForm, setSettingsForm] = useState({
    autoSnapshotEnabled: false,
    frequency: 'daily',
    preferredHour: 12
  })
  const [settingsLoading, setSettingsLoading] = useState(false)

  const fetchData = useCallback(async () => {
    try {
      // Per "tutti" usa 999999 come limite invece di totalSnapshots per evitare dipendenze circolari
      const limit = itemsPerPage === -1 ? 999999 : itemsPerPage
      
      const [snapshotsRes, settingsRes] = await Promise.all([
        fetch(`/api/holdings-snapshots?limit=${limit}`),
        fetch('/api/holdings-snapshots/settings')
      ])

      if (snapshotsRes.ok) {
        const snapshotsData = await snapshotsRes.json()
        setSnapshots(snapshotsData.snapshots || [])
        
        // Aggiorna totalSnapshots solo se è diverso per evitare loop
        const newTotal = snapshotsData.pagination?.total || 0
        setTotalSnapshots(prevTotal => {
          return prevTotal !== newTotal ? newTotal : prevTotal
        })
        
        // Determina se stiamo mostrando tutti
        setShowingAll(snapshotsData.snapshots.length === newTotal)
      }

      if (settingsRes.ok) {
        const settingsData = await settingsRes.json()
        setSettings(settingsData)
      }
    } catch (error) {
      console.error('Error fetching data:', error)
      alert({ title: 'Errore', message: 'Errore nel caricamento dei dati', variant: 'error' })
    } finally {
      setLoading(false)
    }
  }, [itemsPerPage, alert])

  useEffect(() => {
    fetchData()
  }, [itemsPerPage, fetchData])

  // Popola il form quando caricano le impostazioni
  useEffect(() => {
    if (settings) {
      setSettingsForm({
        autoSnapshotEnabled: settings.autoSnapshotEnabled,
        frequency: settings.frequency,
        preferredHour: settings.preferredHour || 12
      })
    }
  }, [settings])

  const createSnapshot = useCallback(async () => {
    try {
      setCreateLoading(true)
      
      const response = await fetch('/api/holdings-snapshots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          note: snapshotNote || undefined
        })
      })

      if (response.ok) {
        await response.json()
        alert({ title: 'Successo', message: 'Snapshot creato con successo!', variant: 'success' })
        setSnapshotNote('')
        // Ricarica i dati direttamente
        fetchData()
      } else {
        const errorData = await response.json()
        alert({ title: 'Errore', message: errorData.error || 'Errore nella creazione dello snapshot', variant: 'error' })
      }
    } catch (error) {
      console.error('Error creating snapshot:', error)
      alert({ title: 'Errore', message: 'Errore nella creazione dello snapshot', variant: 'error' })
    } finally {
      setCreateLoading(false)
    }
  }, [snapshotNote])

  const deleteSnapshot = useCallback(async (id: number) => {
    try {
      const response = await fetch(`/api/holdings-snapshots/${id}`, {
        method: 'DELETE'
      })

      if (response.ok) {
        alert({ title: 'Successo', message: 'Snapshot eliminato con successo', variant: 'success' })
        setShowDeleteModal(null)
        // Ricarica i dati dal server invece di modificare lo state direttamente
        fetchData()
      } else {
        const errorData = await response.json()
        alert({ title: 'Errore', message: errorData.error || 'Errore nell\'eliminazione', variant: 'error' })
      }
    } catch (error) {
      console.error('Error deleting snapshot:', error)
      alert({ title: 'Errore', message: 'Errore nell\'eliminazione dello snapshot', variant: 'error' })
    }
  }, [])

  const exportCSV = useCallback(async () => {
    try {
      const response = await fetch('/api/holdings-snapshots/export?format=excel')
      
      if (response.ok) {
        const blob = await response.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `holdings-tracking-${new Date().toISOString().split('T')[0]}.csv`
        document.body.appendChild(a)
        a.click()
        document.body.removeChild(a)
        window.URL.revokeObjectURL(url)
        alert({ title: 'Successo', message: 'Export completato!', variant: 'success' })
      } else {
        alert({ title: 'Errore', message: 'Errore nell\'export', variant: 'error' })
      }
    } catch (error) {
      console.error('Error exporting:', error)
      alert({ title: 'Errore', message: 'Errore nell\'export', variant: 'error' })
    }
  }, [])

  const processFile = (file: File) => {
    if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
      alert({ title: 'Errore', message: 'Seleziona un file CSV valido', variant: 'error' })
      return
    }
    
    setCsvFile(file)
    
    // Leggi il contenuto del file
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target?.result as string
      setCsvData(content)
    }
    reader.readAsText(file)
  }

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      processFile(file)
    }
  }

  const handleDragOver = (event: React.DragEvent) => {
    event.preventDefault()
  }

  const handleDrop = (event: React.DragEvent) => {
    event.preventDefault()
    const file = event.dataTransfer.files?.[0]
    if (file) {
      processFile(file)
    }
  }


  const toggleSelectSnapshot = useCallback((id: number) => {
    const newSelected = new Set(selectedSnapshots)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedSnapshots(newSelected)
  }, [selectedSnapshots])

  const toggleSelectAll = useCallback(() => {
    if (selectedSnapshots.size === snapshots.length) {
      setSelectedSnapshots(new Set())
    } else {
      setSelectedSnapshots(new Set(snapshots.map(s => s.id)))
    }
  }, [selectedSnapshots, snapshots])

  const bulkDeleteSnapshots = async () => {
    if (selectedSnapshots.size === 0) {
      alert({ title: 'Errore', message: 'Nessun snapshot selezionato', variant: 'error' })
      return
    }

    setShowBulkDeleteModal(true)
  }

  const confirmBulkDelete = useCallback(async () => {
    setShowBulkDeleteModal(false)
    
    try {
      setBulkDeleteLoading(true)
      const ids = Array.from(selectedSnapshots)
      
      const response = await fetch('/api/holdings-snapshots/bulk-delete', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ ids })
      })
      
      if (response.ok) {
        const data = await response.json()
        alert({ title: 'Successo', message: `Eliminati ${data.deleted} snapshot con successo`, variant: 'success' })
        setSelectedSnapshots(new Set())
        // Ricarica i dati dopo la cancellazione
        fetchData()
      } else {
        const errorData = await response.json()
        alert({ title: 'Errore', message: errorData.error || 'Errore nell\'eliminazione degli snapshot', variant: 'error' })
      }
    } catch (error) {
      console.error('Error bulk deleting snapshots:', error)
      alert({ title: 'Errore', message: 'Errore nell\'eliminazione degli snapshot', variant: 'error' })
    } finally {
      setBulkDeleteLoading(false)
    }
  }, [selectedSnapshots])

  const updateSettings = useCallback(async () => {
    try {
      setSettingsLoading(true)
      
      const response = await fetch('/api/holdings-snapshots/settings', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(settingsForm)
      })

      if (response.ok) {
        const data = await response.json()
        setSettings(data.settings)
        alert({ title: 'Successo', message: 'Impostazioni aggiornate con successo!', variant: 'success' })
        setShowSettingsModal(false)
      } else {
        const errorData = await response.json()
        alert({ title: 'Errore', message: errorData.error || 'Errore nell\'aggiornamento delle impostazioni', variant: 'error' })
      }
    } catch (error) {
      console.error('Error updating settings:', error)
      alert({ title: 'Errore', message: 'Errore nell\'aggiornamento delle impostazioni', variant: 'error' })
    } finally {
      setSettingsLoading(false)
    }
  }, [settingsForm])

  const importCSV = useCallback(async () => {
    try {
      setImportLoading(true)
      
      const response = await fetch('/api/holdings-snapshots/import', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          csvData,
          skipDuplicates: !forceReimport
        })
      })

      if (response.ok) {
        const data = await response.json()
        alert({ title: 'Successo', message: data.message, variant: 'success' })
        setCsvData('')
        setCsvFile(null)
        setForceReimport(false)
        setShowImportModal(false)
        fetchData()
      } else {
        const errorData = await response.json()
        alert({ title: 'Errore', message: errorData.error || 'Errore nell\'import', variant: 'error' })
      }
    } catch (error) {
      console.error('Error importing:', error)
      alert({ title: 'Errore', message: 'Errore nell\'import', variant: 'error' })
    } finally {
      setImportLoading(false)
    }
  }, [csvData, forceReimport])

  // Funzioni helper - non sono hooks, quindi possono essere definite ovunque
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
  }

  const formatTime = (dateStr: string) => {
    const date = new Date(dateStr)
    return date.toLocaleTimeString('it-IT', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }
  
  if (loading) {
    return (
      <ProtectedRoute>
        <div className="p-6">
          <div className="flex items-center gap-4 mb-6">
            <button 
              onClick={() => router.back()}
              className="p-2 hover:bg-adaptive-50 rounded-lg"
            >
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <h1 className="text-2xl font-bold">📊 Tracking Avanzato</h1>
          </div>
          <div className="text-center py-8">Caricamento...</div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="p-4 sm:p-6">
        {/* Header */}
        <div className="flex items-center gap-4 mb-6">
          <button 
            onClick={() => router.back()}
            className="p-2 hover:bg-adaptive-50 rounded-lg"
          >
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <h1 className="text-xl sm:text-2xl font-bold">📊 Tracking Avanzato</h1>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Create Snapshot */}
          <div className="card-adaptive p-4 sm:p-6">
            <h3 className="font-medium mb-3">📸 Nuovo Snapshot</h3>
            <div className="space-y-3">
              <input
                type="text"
                placeholder="Note opzionali..."
                value={snapshotNote}
                onChange={(e) => setSnapshotNote(e.target.value)}
                className="w-full px-3 py-2 border border-adaptive rounded-md text-sm bg-adaptive-50 text-adaptive-900"
              />
              <button
                onClick={createSnapshot}
                disabled={createLoading}
                className="w-full bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 disabled:opacity-50 text-sm font-medium"
              >
                {createLoading ? 'Creando...' : 'Crea Snapshot'}
              </button>
            </div>
          </div>

          {/* Last Snapshot */}
          {snapshots.length > 0 && (
            <div className="card-adaptive p-4 sm:p-6">
              <h3 className="font-medium mb-3">🕒 Ultimo Snapshot</h3>
              <div className="space-y-1 text-sm">
                <p className="font-medium">{formatDate(snapshots[0].date)}</p>
                <p className="text-adaptive-600">{formatTime(snapshots[0].date)}</p>
                <p className="font-medium text-green-600">
                  {formatCurrency(snapshots[0].dirtyEuro, user?.currency)}
                </p>
                <p className="text-xs text-adaptive-500">
                  {snapshots[0].btc.toFixed(8)} BTC
                </p>
              </div>
            </div>
          )}

          {/* Import/Export */}
          <div className="card-adaptive p-4 sm:p-6">
            <h3 className="font-medium mb-3">📁 Import/Export</h3>
            <div className="space-y-2">
              <button
                onClick={() => setShowImportModal(true)}
                className="w-full bg-blue-600 text-white py-2 px-3 rounded-md hover:bg-blue-700 text-sm flex items-center justify-center gap-2"
              >
                <DocumentArrowUpIcon className="h-4 w-4" />
                Import CSV
              </button>
              <button
                onClick={exportCSV}
                className="w-full bg-green-600 text-white py-2 px-3 rounded-md hover:bg-green-700 text-sm flex items-center justify-center gap-2"
              >
                <DocumentArrowDownIcon className="h-4 w-4" />
                Export CSV
              </button>
            </div>
          </div>

          {/* Settings */}
          <div className="card-adaptive p-4 sm:p-6">
            <h3 className="font-medium mb-3">⚙️ Automazione</h3>
            <div className="space-y-2">
              <p className="text-sm text-adaptive-600">
                Auto-snapshot: {settings?.autoSnapshotEnabled ? 
                  <span className="text-green-600 font-medium">Attivo</span> : 
                  <span className="text-gray-500">Disattivo</span>
                }
              </p>
              {settings?.autoSnapshotEnabled && (
                <p className="text-xs text-adaptive-500">
                  Frequenza: {settings.frequency}
                </p>
              )}
              <button
                onClick={() => setShowSettingsModal(true)}
                className="w-full bg-gray-600 text-white py-2 px-3 rounded-md hover:bg-gray-700 text-sm flex items-center justify-center gap-2"
              >
                <Cog6ToothIcon className="h-4 w-4" />
                Configura
              </button>
            </div>
          </div>
        </div>

        {/* Snapshots Table */}
        <div className="card-adaptive">
          <div className="px-4 sm:px-6 py-4 border-b border-adaptive">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-medium">📋 Storico Snapshot</h2>
                <p className="text-sm text-adaptive-600 mt-1">
                  {totalSnapshots} snapshot totali {snapshots.length < totalSnapshots && `(mostrando ${snapshots.length})`}
                </p>
              </div>
              
              <div className="flex flex-col sm:flex-row gap-2 mt-4 sm:mt-0">
                {/* Items Per Page Dropdown */}
                <div className="flex items-center gap-2">
                  <label className="text-sm text-adaptive-600">Mostra:</label>
                  <select
                    value={itemsPerPage}
                    onChange={(e) => setItemsPerPage(Number(e.target.value))}
                    className="px-2 py-1 border border-adaptive rounded text-sm bg-adaptive-50 text-adaptive-900"
                  >
                    <option value={25}>25</option>
                    <option value={50}>50</option>
                    <option value={100}>100</option>
                    <option value={-1}>Tutti</option>
                  </select>
                </div>
                
                {/* Selection Controls */}
                {snapshots.length > 0 && (
                  <>
                    <button
                      onClick={toggleSelectAll}
                      className="px-3 py-1 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
                    >
                      {selectedSnapshots.size === snapshots.length ? 'Deseleziona tutti' : 'Seleziona tutti'}
                    </button>
                    
                    {selectedSnapshots.size > 0 && (
                      <button
                        onClick={bulkDeleteSnapshots}
                        disabled={bulkDeleteLoading}
                        className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700 disabled:opacity-50"
                      >
                        {bulkDeleteLoading ? 'Eliminando...' : `Elimina ${selectedSnapshots.size}`}
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          </div>

          {snapshots.length === 0 ? (
            <div className="p-8 text-center text-adaptive-500">
              <PhotoIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nessun snapshot ancora creato</p>
              <p className="text-sm mt-1">Crea il primo snapshot per iniziare il tracking!</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-adaptive-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-adaptive-500 uppercase tracking-wider">
                      <input
                        type="checkbox"
                        checked={selectedSnapshots.size === snapshots.length && snapshots.length > 0}
                        onChange={toggleSelectAll}
                        className="rounded"
                      />
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-adaptive-500 uppercase tracking-wider">
                      Data/Ora
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-adaptive-500 uppercase tracking-wider">
                      BTC/USD
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-adaptive-500 uppercase tracking-wider">
                      EUR
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-adaptive-500 uppercase tracking-wider">
                      USD
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-adaptive-500 uppercase tracking-wider">
                      BTC
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-adaptive-500 uppercase tracking-wider">
                      Tipo
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-adaptive-500 uppercase tracking-wider">
                      Azioni
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-adaptive-200">
                  {snapshots.map((snapshot) => (
                    <tr key={snapshot.id} className="hover:bg-adaptive-50">
                      <td className="px-4 py-4">
                        <input
                          type="checkbox"
                          checked={selectedSnapshots.has(snapshot.id)}
                          onChange={() => toggleSelectSnapshot(snapshot.id)}
                          className="rounded"
                        />
                      </td>
                      <td className="px-4 py-4">
                        <div className="text-sm">
                          <div className="font-medium text-adaptive-900">
                            {formatDate(snapshot.date)}
                          </div>
                          <div className="text-adaptive-500">
                            {formatTime(snapshot.date)}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-adaptive-900">
                        ${snapshot.btcUsd.toLocaleString()}
                      </td>
                      <td className="px-4 py-4 text-sm font-medium text-adaptive-900">
                        {formatCurrency(snapshot.dirtyEuro, 'EUR')}
                      </td>
                      <td className="px-4 py-4 text-sm text-adaptive-900">
                        ${snapshot.dirtyDollars.toLocaleString()}
                      </td>
                      <td className="px-4 py-4 text-sm text-adaptive-900">
                        {snapshot.btc.toFixed(8)}
                      </td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                          snapshot.isAutomatic 
                            ? 'bg-blue-100 text-blue-800' 
                            : 'bg-gray-100 text-gray-800'
                        }`}>
                          {snapshot.isAutomatic ? 'Auto' : 'Manuale'}
                        </span>
                        {snapshot.note && (
                          <div className="text-xs text-adaptive-500 mt-1 truncate">
                            {snapshot.note}
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4 text-right">
                        <button
                          onClick={() => setShowDeleteModal(snapshot.id)}
                          className="text-red-600 hover:text-red-900 p-1"
                          title="Elimina snapshot"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Import Modal */}
        {showImportModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="card-adaptive rounded-lg p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto">
              <h3 className="text-lg font-medium mb-4">📁 Import CSV</h3>
              <p className="text-sm text-adaptive-600 mb-4">
                Seleziona il file CSV con il formato: Date,Time,BTCUSD,Dirty Dollars,Dirty Euro,BTC
              </p>
              
              {/* File Upload Area */}
              <div 
                className="border-2 border-dashed border-adaptive rounded-lg p-8 text-center mb-4 hover:opacity-80 transition-colors"
                onDragOver={handleDragOver}
                onDrop={handleDrop}
              >
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="csv-upload"
                />
                <label
                  htmlFor="csv-upload"
                  className="cursor-pointer flex flex-col items-center"
                >
                  <svg className="w-12 h-12 text-adaptive-500 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                  <p className="text-lg font-medium text-adaptive-700">
                    {csvFile ? csvFile.name : 'Clicca per selezionare il file CSV'}
                  </p>
                  <p className="text-sm text-adaptive-500 mt-2">
                    Oppure trascina il file qui
                  </p>
                </label>
              </div>

              {/* Preview se il file è caricato */}
              {csvData && (
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-adaptive-700 mb-2">Anteprima:</h4>
                  <div className="bg-adaptive-50 p-3 rounded-md max-h-32 overflow-y-auto">
                    <pre className="text-xs text-adaptive-600 whitespace-pre-wrap">
                      {csvData.split('\n').slice(0, 5).join('\n')}
                      {csvData.split('\n').length > 5 && '\n...'}
                    </pre>
                  </div>
                </div>
              )}

              {/* Force Reimport Option */}
              <div className="mb-4">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={forceReimport}
                    onChange={(e) => setForceReimport(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm">
                    <strong>Forza reimport</strong> - Ignora duplicati e importa tutti i record
                  </span>
                </label>
                <p className="text-xs text-adaptive-500 mt-1">
                  ⚠️ Attenzione: Questa opzione può creare duplicati nel database
                </p>
              </div>

              <div className="flex gap-3 mt-4">
                <button
                  onClick={importCSV}
                  disabled={importLoading || !csvData.trim()}
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 disabled:opacity-50"
                >
                  {importLoading ? 'Importando...' : 'Importa'}
                </button>
                <button
                  onClick={() => {
                    setShowImportModal(false)
                    setCsvData('')
                    setCsvFile(null)
                    setForceReimport(false)
                  }}
                  className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600"
                >
                  Annulla
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="card-adaptive rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-medium mb-4">🗑️ Elimina Snapshot</h3>
              <p className="text-sm text-adaptive-600 mb-6">
                Sei sicuro di voler eliminare questo snapshot? Questa azione non può essere annullata.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => deleteSnapshot(showDeleteModal)}
                  className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700"
                >
                  Elimina
                </button>
                <button
                  onClick={() => setShowDeleteModal(null)}
                  className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600"
                >
                  Annulla
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Settings Modal */}
        {showSettingsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="card-adaptive rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-medium mb-4">⚙️ Configurazione Automazione</h3>
              
              <div className="space-y-4">
                {/* Toggle Automazione */}
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Abilita Snapshot Automatici</span>
                  <button
                    onClick={() => setSettingsForm(prev => ({ ...prev, autoSnapshotEnabled: !prev.autoSnapshotEnabled }))}
                    className={`w-12 h-6 rounded-full relative transition-colors ${
                      settingsForm.autoSnapshotEnabled ? 'bg-green-500' : 'bg-adaptive-50 border border-adaptive'
                    }`}
                  >
                    <div className={`w-5 h-5 bg-white rounded-full absolute top-0.5 transition-transform ${
                      settingsForm.autoSnapshotEnabled ? 'translate-x-6' : 'translate-x-0.5'
                    }`} />
                  </button>
                </div>

                {/* Frequenza */}
                <div>
                  <label className="block text-sm font-medium mb-2">Frequenza</label>
                  <select
                    value={settingsForm.frequency}
                    onChange={(e) => setSettingsForm(prev => ({ ...prev, frequency: e.target.value }))}
                    disabled={!settingsForm.autoSnapshotEnabled}
                    className="w-full px-3 py-2 border border-adaptive rounded-md disabled:bg-adaptive-50 disabled:text-adaptive-500 bg-adaptive-50 text-adaptive-900"
                  >
                    <option value="6hours">Ogni 6 ore</option>
                    <option value="daily">Giornaliero</option>
                    <option value="weekly">Settimanale</option>
                    <option value="monthly">Mensile</option>
                  </select>
                </div>

                {/* Ora Preferita (solo se giornaliero) */}
                {settingsForm.frequency === 'daily' && settingsForm.autoSnapshotEnabled && (
                  <div>
                    <label className="block text-sm font-medium mb-2">Ora Preferita (0-23)</label>
                    <input
                      type="number"
                      min="0"
                      max="23"
                      value={settingsForm.preferredHour}
                      onChange={(e) => setSettingsForm(prev => ({ ...prev, preferredHour: parseInt(e.target.value) || 0 }))}
                      className="w-full px-3 py-2 border border-adaptive rounded-md bg-adaptive-50 text-adaptive-900"
                    />
                    <p className="text-xs text-adaptive-500 mt-1">
                      Ora: {settingsForm.preferredHour}:00
                    </p>
                  </div>
                )}

                {/* Info ultimo snapshot */}
                {settings?.lastSnapshot && (
                  <div className="text-xs text-adaptive-500 bg-adaptive-50 p-2 rounded">
                    Ultimo snapshot automatico: {new Date(settings.lastSnapshot).toLocaleString('it-IT')}
                  </div>
                )}
              </div>

              <div className="flex gap-3 mt-6">
                <button
                  onClick={updateSettings}
                  disabled={settingsLoading}
                  className="flex-1 bg-purple-600 text-white py-2 px-4 rounded-md hover:bg-purple-700 disabled:opacity-50"
                >
                  {settingsLoading ? 'Salvando...' : 'Salva'}
                </button>
                <button
                  onClick={() => {
                    setShowSettingsModal(false)
                    // Reset form ai valori originali
                    if (settings) {
                      setSettingsForm({
                        autoSnapshotEnabled: settings.autoSnapshotEnabled,
                        frequency: settings.frequency,
                        preferredHour: settings.preferredHour || 12
                      })
                    }
                  }}
                  className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600"
                >
                  Annulla
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Bulk Delete Confirmation Modal */}
        {showBulkDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="card-adaptive rounded-lg p-6 max-w-md w-full">
              <h3 className="text-lg font-medium mb-4">🗑️ Elimina Snapshot</h3>
              <p className="text-sm text-adaptive-600 mb-6">
                Sei sicuro di voler eliminare {selectedSnapshots.size} snapshot? Questa azione non può essere annullata.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={confirmBulkDelete}
                  disabled={bulkDeleteLoading}
                  className="flex-1 bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 disabled:opacity-50"
                >
                  {bulkDeleteLoading ? 'Eliminando...' : 'Elimina'}
                </button>
                <button
                  onClick={() => setShowBulkDeleteModal(false)}
                  className="flex-1 bg-gray-500 text-white py-2 px-4 rounded-md hover:bg-gray-600"
                >
                  Annulla
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  )
}