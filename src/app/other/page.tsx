'use client'

export default function OtherPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-adaptive-900">Altro</h1>
        <p className="text-adaptive-600">Beni non correnti e crediti</p>
      </div>

      <div className="card-adaptive p-8 rounded-lg shadow-sm border-adaptive">
        <h2 className="text-xl font-semibold text-adaptive-900 mb-4">Funzionalità da sviluppare in futuro:</h2>
        <ul className="space-y-2 text-adaptive-700">
          <li>• Gestione beni non correnti</li>
          <li>• Tracking crediti</li>
          <li>• Altre funzionalità finanziarie</li>
        </ul>
      </div>
    </div>
  )
}