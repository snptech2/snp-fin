'use client'

export default function OtherPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Altro</h1>
        <p className="text-gray-600">Beni non correnti e crediti</p>
      </div>

      <div className="bg-white p-8 rounded-lg shadow-sm border">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Funzionalità da sviluppare in futuro:</h2>
        <ul className="space-y-2 text-gray-700">
          <li>• Gestione beni non correnti</li>
          <li>• Tracking crediti</li>
          <li>• Altre funzionalità finanziarie</li>
        </ul>
      </div>
    </div>
  )
}