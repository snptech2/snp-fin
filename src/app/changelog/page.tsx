'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import ProtectedRoute from '@/components/ProtectedRoute'

interface ChangelogData {
  id: number
  content: string
  createdAt: string
  updatedAt: string
  user: {
    name: string
    email: string
  }
}

export default function ChangelogPage() {
  const { user } = useAuth()
  const [changelog, setChangelog] = useState<ChangelogData | null>(null)
  const [changes, setChanges] = useState('')
  const [isEditing, setIsEditing] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // 🔐 CONTROLLO ADMIN - Sostituisci con la tua email
  const isAdmin = user?.email === 'snp@snp.snp'

  // Carica changelog dal database
  useEffect(() => {
    fetchChangelog()
  }, [])

  const fetchChangelog = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/changelog')
      const data = await response.json()

      if (response.ok) {
        setChangelog(data.changelog)
        setChanges(data.changelog?.content || '')
      } else {
        setError('Errore nel caricamento del changelog')
      }
    } catch (error) {
      console.error('Errore nel fetch changelog:', error)
      setError('Errore di connessione')
    } finally {
      setLoading(false)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)

      const response = await fetch('/api/changelog', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ content: changes }),
      })

      const data = await response.json()

      if (response.ok) {
        setChangelog(data.changelog)
        setIsEditing(false)
      } else {
        setError(data.error || 'Errore nel salvataggio')
      }
    } catch (error) {
      console.error('Errore nel salvataggio:', error)
      setError('Errore di connessione')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    // Ripristina il contenuto dal database
    setChanges(changelog?.content || '')
    setIsEditing(false)
    setError(null)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  // Loading state
  if (loading) {
    return (
      <ProtectedRoute>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-2 text-adaptive-600">Caricamento changelog...</p>
          </div>
        </div>
      </ProtectedRoute>
    )
  }

  return (
    <ProtectedRoute>
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-adaptive-900">📝 Changelog</h1>
          <p className="text-adaptive-600">Ultime modifiche apportate all'applicazione</p>
          {changelog && (
            <p className="text-sm text-adaptive-500 mt-1">
              Ultimo aggiornamento: {formatDate(changelog.updatedAt)} da {changelog.user.name}
            </p>
          )}
        </div>

        {/* Messaggio di errore */}
        {error && (
          <div className="card-adaptive rounded-lg p-4 bg-red-50 border border-red-200">
            <p className="text-red-600">⚠️ {error}</p>
          </div>
        )}

        {/* Contenuto Principale */}
        <div className="card-adaptive p-8 rounded-lg shadow-sm border-adaptive">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-semibold text-adaptive-900">
              🚀 Note di Rilascio
            </h2>
            
            {/* Bottoni visibili SOLO agli admin */}
            {isAdmin && (
              !isEditing ? (
                <button
                  onClick={() => setIsEditing(true)}
                  className="btn-primary px-4 py-2 rounded-lg text-sm"
                >
                  ✏️ Modifica
                </button>
              ) : (
                <div className="flex gap-2">
                  <button
                    onClick={handleSave}
                    disabled={saving}
                    className="btn-primary px-4 py-2 rounded-lg text-sm disabled:opacity-50"
                  >
                    {saving ? '💾 Salvando...' : '💾 Salva'}
                  </button>
                  <button
                    onClick={handleCancel}
                    disabled={saving}
                    className="btn-secondary px-4 py-2 rounded-lg text-sm disabled:opacity-50"
                  >
                    ❌ Annulla
                  </button>
                </div>
              )
            )}
          </div>

          {!isEditing ? (
            // Modalità visualizzazione
            <div className="space-y-4">
              {changelog?.content ? (
                <div className="prose max-w-none">
                  <div 
                    className="text-adaptive-700 whitespace-pre-wrap bg-gray-50 p-4 rounded-lg border border-adaptive"
                    style={{ fontFamily: 'inherit' }}
                  >
                    {changelog.content}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">📝</div>
                  <h3 className="text-lg font-medium text-adaptive-900 mb-2">
                    Nessuna modifica registrata
                  </h3>
                  <p className="text-adaptive-600 mb-4">
                    {isAdmin 
                      ? 'Clicca su "Modifica" per aggiungere le ultime modifiche all\'app'
                      : 'Le note delle modifiche verranno pubblicate qui quando disponibili'
                    }
                  </p>
                  {isAdmin && (
                    <button
                      onClick={() => setIsEditing(true)}
                      className="btn-primary px-6 py-2 rounded-lg"
                    >
                      ✏️ Inizia a scrivere
                    </button>
                  )}
                </div>
              )}
            </div>
          ) : isAdmin ? (
            // Modalità modifica - SOLO PER ADMIN
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-2">
                  📋 Incolla qui le ultime modifiche:
                </label>
                <textarea
                  value={changes}
                  onChange={(e) => setChanges(e.target.value)}
                  placeholder="Incolla qui le note delle ultime modifiche apportate all'applicazione...

Esempio:
🔧 Versione 2.1.0 - 30/06/2025
• Aggiunta pagina changelog
• Migliorata interfaccia sidebar
• Correzioni bug minori

🆕 Versione 2.0.5 - 28/06/2025  
• Ottimizzate performance
• Aggiornata gestione investimenti"
                  className="w-full h-96 p-4 rounded-lg border border-adaptive resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  style={{
                    backgroundColor: 'var(--input-bg)',
                    color: 'var(--input-text)'
                  }}
                  disabled={saving}
                />
              </div>
              
              <div className="text-sm text-adaptive-600">
                💡 <strong>Suggerimento:</strong> Usa emoji per rendere più leggibili le note (🔧 per correzioni, 🆕 per nuove funzionalità, 🐛 per bug fix, ecc.)
              </div>
            </div>
          ) : (
            // Messaggio di errore se non admin ma in modalità modifica
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔒</div>
              <h3 className="text-lg font-medium text-adaptive-900 mb-2">
                Accesso Negato
              </h3>
              <p className="text-adaptive-600">
                Solo gli amministratori possono modificare il changelog.
              </p>
            </div>
          )}
        </div>

        {/* Info Box */}
        <div className="card-adaptive rounded-lg p-6 bg-blue-50 border border-blue-200">
          <div className="flex items-start gap-3">
            <div className="text-blue-600 text-xl">ℹ️</div>
            <div>
              <h3 className="text-lg font-medium text-blue-900 mb-1">
                {isAdmin ? 'Come utilizzare questa pagina' : 'Informazioni'}
              </h3>
              {isAdmin ? (
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Clicca "Modifica" per aggiornare le note di rilascio</li>
                  <li>• Copia e incolla le modifiche dal tuo documento di lavoro</li>
                  <li>• Le modifiche vengono salvate automaticamente nel database</li>
                  <li>• Usa emoji e formattazione per rendere più leggibili le note</li>
                  <li>• Il sistema traccia automaticamente chi ha fatto l'ultimo aggiornamento</li>
                </ul>
              ) : (
                <p className="text-sm text-blue-700">
                  Questa pagina mostra le ultime modifiche e aggiornamenti dell'applicazione. 
                  Solo gli amministratori possono modificare il contenuto.
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    </ProtectedRoute>
  )
}