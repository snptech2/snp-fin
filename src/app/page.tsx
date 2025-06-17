'use client'

export default function Dashboard() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-adaptive-900">Dashboard</h1>
        <p className="text-adaptive-600">Panoramica generale delle tue finanze</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="card-adaptive p-6 rounded-lg shadow-sm border-adaptive">
          <h3 className="text-sm font-medium text-adaptive-500">Saldo Totale</h3>
          <p className="text-2xl font-bold text-adaptive-900">€ 0,00</p>
        </div>
        
        <div className="card-adaptive p-6 rounded-lg shadow-sm border-adaptive">
          <h3 className="text-sm font-medium text-adaptive-600">Entrate Mese</h3>
          <p className="text-2xl font-bold text-green-600">€ 0,00</p>
        </div>
        
        <div className="card-adaptive p-6 rounded-lg shadow-sm border-adaptive">
          <h3 className="text-sm font-medium text-adaptive-600">Uscite Mese</h3>
          <p className="text-2xl font-bold text-red-600">€ 0,00</p>
        </div>
        
        <div className="card-adaptive p-6 rounded-lg shadow-sm border-adaptive">
          <h3 className="text-sm font-medium text-adaptive-600">Budget Utilizzato</h3>
          <p className="text-2xl font-bold text-blue-600">0%</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="card-adaptive p-6 rounded-lg shadow-sm border-adaptive">
          <h3 className="text-lg font-semibold text-adaptive-900 mb-4">Entrate per Categoria</h3>
          <div className="h-64 flex items-center justify-center text-adaptive-600">
            Grafico entrate (da implementare)
          </div>
        </div>
        
        <div className="card-adaptive p-6 rounded-lg shadow-sm border-adaptive">
          <h3 className="text-lg font-semibold text-adaptive-900 mb-4">Uscite per Categoria</h3>
          <div className="h-64 flex items-center justify-center text-adaptive-500">
            Grafico uscite (da implementare)
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="card-adaptive rounded-lg shadow-sm border-adaptive">
        <div className="p-6 border-b border-adaptive">
          <h3 className="text-lg font-semibold text-adaptive-900">Transazioni Recenti</h3>
        </div>
        <div className="p-6">
          <div className="text-center text-adaptive-600 py-8">
            Nessuna transazione da mostrare
          </div>
        </div>
      </div>
    </div>
  )
}