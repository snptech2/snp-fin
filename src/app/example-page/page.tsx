// Pagina Risparmi - Esempio seguendo lo stile Income/Expenses
'use client'
import { useState } from 'react'
import { 
  PlusIcon, PencilIcon, TrashIcon, BanknotesIcon, 
  FunnelIcon, MagnifyingGlassIcon, ChevronLeftIcon, ChevronRightIcon,
  CalendarIcon, CheckIcon, CurrencyEuroIcon
} from '@heroicons/react/24/outline'

interface SavingsGoal {
  id: number
  name: string
  targetAmount: number
  currentAmount: number
  category: string
  deadline: string
  color: string
}

export default function SavingsPage() {
  const [savingsGoals] = useState<SavingsGoal[]>([
    {
      id: 1,
      name: "Vacanze Estive 2025",
      targetAmount: 3000,
      currentAmount: 1250,
      category: "Viaggi",
      deadline: "2025-07-01",
      color: "#3B82F6"
    },
    {
      id: 2,
      name: "Fondo Emergenza",
      targetAmount: 15000,
      currentAmount: 8500,
      category: "Sicurezza",
      deadline: "2025-12-31",
      color: "#10B981"
    },
    {
      id: 3,
      name: "Nuovo Laptop",
      targetAmount: 2500,
      currentAmount: 2100,
      category: "Tecnologia",
      deadline: "2025-09-01",
      color: "#F59E0B"
    }
  ])

  const [showGoalForm, setShowGoalForm] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedGoals, setSelectedGoals] = useState<number[]>([])

  // Statistiche calcolate
  const statistics = {
    totalTarget: savingsGoals.reduce((sum, goal) => sum + goal.targetAmount, 0),
    totalSaved: savingsGoals.reduce((sum, goal) => sum + goal.currentAmount, 0),
    totalGoals: savingsGoals.length,
    completedGoals: savingsGoals.filter(goal => goal.currentAmount >= goal.targetAmount).length
  }

  const overallProgress = statistics.totalTarget > 0 ? (statistics.totalSaved / statistics.totalTarget) * 100 : 0

  // Filtro ricerca
  const filteredGoals = savingsGoals.filter(goal =>
    goal.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    goal.category.toLowerCase().includes(searchTerm.toLowerCase())
  )

  // Funzione per calcolare la percentuale di completamento
  const getProgress = (current: number, target: number) => {
    return target > 0 ? Math.min((current / target) * 100, 100) : 0
  }

  // Funzione per determinare il colore della barra di progresso
  const getProgressColor = (progress: number) => {
    if (progress >= 100) return 'bg-green-500'
    if (progress >= 75) return 'bg-blue-500'
    if (progress >= 50) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('it-IT', {
      style: 'currency',
      currency: 'EUR'
    }).format(amount)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Risparmi</h1>
          <p className="text-white opacity-80">Gestisci i tuoi obiettivi di risparmio</p>
        </div>
        <button
          onClick={() => setShowGoalForm(true)}
          className="btn-primary px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <PlusIcon className="w-5 h-5" />
          Nuovo Obiettivo
        </button>
      </div>

      {/* Statistiche */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="card-adaptive p-4 rounded-lg border-adaptive">
          <h3 className="text-sm font-medium text-adaptive-500">Totale Obiettivi</h3>
          <p className="text-2xl font-bold text-blue-600">{formatCurrency(statistics.totalTarget)}</p>
          <p className="text-sm text-adaptive-600">{statistics.totalGoals} obiettivi</p>
        </div>
        
        <div className="card-adaptive p-4 rounded-lg border-adaptive">
          <h3 className="text-sm font-medium text-adaptive-500">Totale Risparmiato</h3>
          <p className="text-2xl font-bold text-green-600">{formatCurrency(statistics.totalSaved)}</p>
          <p className="text-sm text-adaptive-600">{overallProgress.toFixed(1)}% completato</p>
        </div>
        
        <div className="card-adaptive p-4 rounded-lg border-adaptive">
          <h3 className="text-sm font-medium text-adaptive-500">Mancano</h3>
          <p className="text-2xl font-bold text-orange-600">
            {formatCurrency(statistics.totalTarget - statistics.totalSaved)}
          </p>
          <p className="text-sm text-adaptive-600">per completare tutto</p>
        </div>
        
        <div className="card-adaptive p-4 rounded-lg border-adaptive">
          <h3 className="text-sm font-medium text-adaptive-500">Obiettivi Completati</h3>
          <p className="text-2xl font-bold text-purple-600">{statistics.completedGoals}</p>
          <p className="text-sm text-adaptive-600">su {statistics.totalGoals} totali</p>
        </div>
      </div>

      {/* Barra di ricerca e filtri */}
      <div className="card-adaptive rounded-lg shadow-sm border-adaptive">
        <div className="p-6 border-b border-adaptive">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <h3 className="text-lg font-medium text-adaptive-900">I Tuoi Obiettivi</h3>
            
            <div className="flex flex-col md:flex-row gap-3">
              {/* Ricerca */}
              <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-adaptive-400" />
                <input
                  type="text"
                  placeholder="Cerca obiettivi..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-9 pr-3 py-2 border border-adaptive rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 min-w-[200px]"
                />
              </div>
              
              {/* Filtri */}
              <button className="flex items-center gap-2 px-3 py-2 border border-adaptive rounded-md text-sm text-adaptive-600 hover:bg-gray-50">
                <FunnelIcon className="w-4 h-4" />
                Filtri
              </button>
            </div>
          </div>
        </div>

        <div className="p-6">
          {filteredGoals.length > 0 ? (
            <div className="space-y-4">
              {filteredGoals.map((goal) => {
                const progress = getProgress(goal.currentAmount, goal.targetAmount)
                const isCompleted = progress >= 100
                
                return (
                  <div key={goal.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                    <div className="flex items-center gap-4 flex-1">
                      {/* Checkbox per selezione multipla */}
                      <input
                        type="checkbox"
                        checked={selectedGoals.includes(goal.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedGoals([...selectedGoals, goal.id])
                          } else {
                            setSelectedGoals(selectedGoals.filter(id => id !== goal.id))
                          }
                        }}
                        className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                      />

                      {/* Indicatore colore */}
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: goal.color }}
                      />

                      {/* Info obiettivo */}
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-adaptive-900">{goal.name}</h4>
                          <span className="text-sm text-adaptive-500">{goal.category}</span>
                        </div>
                        
                        {/* Barra di progresso */}
                        <div className="w-full bg-gray-200 rounded-full h-2 mb-2">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${getProgressColor(progress)}`}
                            style={{ width: `${progress}%` }}
                          />
                        </div>
                        
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-adaptive-600">
                            {formatCurrency(goal.currentAmount)} / {formatCurrency(goal.targetAmount)}
                          </span>
                          <span className={`font-medium ${isCompleted ? 'text-green-600' : 'text-adaptive-600'}`}>
                            {progress.toFixed(1)}%
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Azioni */}
                    <div className="flex items-center gap-2 ml-4">
                      <button className="text-blue-600 hover:text-blue-800 p-1" title="Modifica">
                        <PencilIcon className="w-4 h-4" />
                      </button>
                      <button className="text-green-600 hover:text-green-800 p-1" title="Aggiungi fondi">
                        <CurrencyEuroIcon className="w-4 h-4" />
                      </button>
                      <button className="text-red-600 hover:text-red-800 p-1" title="Elimina">
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <BanknotesIcon className="w-12 h-12 text-adaptive-400 mx-auto mb-4" />
              <p className="text-adaptive-600">
                {searchTerm ? 'Nessun obiettivo trovato per la ricerca.' : 'Non hai ancora obiettivi di risparmio.'}
              </p>
              <p className="text-sm text-adaptive-500 mt-2">
                Inizia creando il tuo primo obiettivo di risparmio!
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Selezione multipla azioni */}
      {selectedGoals.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white rounded-lg shadow-lg border border-adaptive p-4 flex items-center gap-4">
          <span className="text-sm text-adaptive-600">
            {selectedGoals.length} obiettivi selezionati
          </span>
          <button className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700">
            Elimina selezionati
          </button>
          <button 
            onClick={() => setSelectedGoals([])}
            className="px-3 py-1 border border-adaptive rounded text-sm text-adaptive-600 hover:bg-gray-50"
          >
            Deseleziona
          </button>
        </div>
      )}

      {/* Modal Form Nuovo Obiettivo */}
      {showGoalForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="modal-content rounded-lg p-6 w-full max-w-md mx-4">
            <h3 className="text-lg font-semibold text-adaptive-900 mb-4">
              Nuovo Obiettivo di Risparmio
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-2">
                  Nome Obiettivo *
                </label>
                <input
                  type="text"
                  placeholder="es. Vacanze Estate 2025"
                  className="w-full px-3 py-2 border border-adaptive rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-2">
                  Importo Obiettivo *
                </label>
                <input
                  type="number"
                  placeholder="0.00"
                  className="w-full px-3 py-2 border border-adaptive rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-2">
                  Categoria
                </label>
                <select className="w-full px-3 py-2 border border-adaptive rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">Seleziona categoria</option>
                  <option value="viaggi">Viaggi</option>
                  <option value="tecnologia">Tecnologia</option>
                  <option value="sicurezza">Sicurezza</option>
                  <option value="casa">Casa</option>
                  <option value="altro">Altro</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-adaptive-700 mb-2">
                  Scadenza
                </label>
                <input
                  type="date"
                  className="w-full px-3 py-2 border border-adaptive rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              
              <div className="flex justify-end space-x-3 pt-4">
                <button 
                  onClick={() => setShowGoalForm(false)}
                  className="px-4 py-2 text-adaptive-600 hover:text-adaptive-800"
                >
                  Annulla
                </button>
                <button className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700">
                  Crea Obiettivo
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}