'use client'

export default function InvestmentsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-adaptive-900">Investimenti</h1>
        <p className="text-adaptive-600">Gestione portafoglio investimenti</p>
      </div>

      <div className="card-adaptive p-8 rounded-lg shadow-sm border-adaptive">
        <h2 className="text-xl font-semibold text-adaptive-900 mb-4">Sezione complessa da sviluppare in futuro:</h2>
        <ul className="space-y-2 text-adaptive-700">
          <li>• Tracking portafoglio investimenti</li>
          <li>• Performance e analisi</li>
          <li>• Diversificazione asset</li>
          <li>• Grafici e statistiche avanzate</li>
        </ul>
      </div>
    </div>
  )
}