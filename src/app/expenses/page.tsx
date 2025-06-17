'use client'

export default function ExpensesPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Uscite</h1>
        <p className="text-gray-600">Gestisci le tue uscite e categorie</p>
      </div>

      <div className="bg-white p-8 rounded-lg shadow-sm border">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Funzionalità da implementare:</h2>
        <ul className="space-y-2 text-gray-600">
          <li>• Aggiungere transazioni in uscita</li>
          <li>• Gestire categorie uscite</li>
          <li>• Riepilogo mensile e grafici</li>
          <li>• Lista transazioni con filtri</li>
        </ul>
      </div>
    </div>
  )
}