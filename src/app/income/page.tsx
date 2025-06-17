'use client'

export default function IncomePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Entrate</h1>
        <p className="text-gray-600">Gestisci le tue entrate e categorie</p>
      </div>

      <div className="bg-white p-8 rounded-lg shadow-sm border">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Funzionalità da implementare:</h2>
        <ul className="space-y-2 text-gray-600">
          <li>• Aggiungere transazioni in entrata</li>
          <li>• Gestire categorie entrate</li>
          <li>• Riepilogo mensile e grafici</li>
          <li>• Lista transazioni con filtri</li>
        </ul>
      </div>
    </div>
  )
}