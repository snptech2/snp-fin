'use client'

export default function AccountsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Conti Bancari</h1>
        <p className="text-gray-600">Gestisci i tuoi conti bancari e trasferimenti</p>
      </div>

      <div className="bg-white p-8 rounded-lg shadow-sm border">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Funzionalità da implementare:</h2>
        <ul className="space-y-2 text-gray-600">
          <li>• Creare, modificare, cancellare conti bancari</li>
          <li>• Impostare conto predefinito</li>
          <li>• Trasferimenti tra conti</li>
          <li>• Visualizzazione saldi</li>
        </ul>
      </div>
    </div>
  )
}