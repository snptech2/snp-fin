'use client'

export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-600">Panoramica generale delle tue finanze</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-gray-500">Saldo Totale</h3>
          <p className="text-2xl font-bold text-gray-900">€ 0,00</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-gray-500">Entrate Mese</h3>
          <p className="text-2xl font-bold text-green-600">€ 0,00</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-gray-500">Uscite Mese</h3>
          <p className="text-2xl font-bold text-red-600">€ 0,00</p>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-sm font-medium text-gray-500">Budget Utilizzato</h3>
          <p className="text-2xl font-bold text-blue-600">0%</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Entrate per Categoria</h3>
          <div className="h-64 flex items-center justify-center text-gray-500">
            Grafico entrate (da implementare)
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Uscite per Categoria</h3>
          <div className="h-64 flex items-center justify-center text-gray-500">
            Grafico uscite (da implementare)
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-white rounded-lg shadow-sm border">
        <div className="p-6 border-b">
          <h3 className="text-lg font-semibold text-gray-900">Transazioni Recenti</h3>
        </div>
        <div className="p-6">
          <div className="text-center text-gray-500 py-8">
            Nessuna transazione da mostrare
          </div>
        </div>
      </div>
    </div>
  )
}