'use client'

export default function BudgetPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Budget</h1>
        <p className="text-gray-600">Gestisci i tuoi budget e obiettivi finanziari</p>
      </div>

      <div className="bg-white p-8 rounded-lg shadow-sm border">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Funzionalità da implementare:</h2>
        <ul className="space-y-2 text-gray-600">
          <li>• Creare budget personalizzati</li>
          <li>• Fondo Emergenza (importo fisso)</li>
          <li>• Fondo Spese (importo fisso)</li>
          <li>• Fondo Investimenti (resto della liquidità)</li>
          <li>• Monitoraggio utilizzo budget</li>
        </ul>
      </div>
    </div>
  )
}