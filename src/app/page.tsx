'use client'

import { useState } from 'react'

export default function Home() {
  const [transactions, setTransactions] = useState([
    { id: 1, description: 'Stipendio', amount: 2500, date: '2024-06-01' },
    { id: 2, description: 'Spesa supermercato', amount: -85.50, date: '2024-06-15' },
    { id: 3, description: 'Bolletta luce', amount: -120, date: '2024-06-10' }
  ])

  const [newTransaction, setNewTransaction] = useState({
    description: '',
    amount: '',
    date: ''
  })

  const addTransaction = () => {
    if (newTransaction.description && newTransaction.amount) {
      const transaction = {
        id: Date.now(),
        description: newTransaction.description,
        amount: parseFloat(newTransaction.amount),
        date: newTransaction.date || new Date().toISOString().split('T')[0]
      }
      setTransactions([transaction, ...transactions])
      setNewTransaction({ description: '', amount: '', date: '' })
    }
  }

  const balance = transactions.reduce((sum, t) => sum + t.amount, 0)

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        {/* Header */}
        <h1 className="text-3xl font-bold text-gray-900 mb-8">SNP Finance</h1>
        
        {/* Balance Card */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold text-gray-700 mb-2">Saldo Attuale</h2>
          <p className={`text-3xl font-bold ${balance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            €{balance.toFixed(2)}
          </p>
        </div>

        {/* Add Transaction Form */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h3 className="text-lg font-semibold text-gray-700 mb-4">Aggiungi Transazione</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <input
              type="text"
              placeholder="Descrizione"
              value={newTransaction.description}
              onChange={(e) => setNewTransaction({...newTransaction, description: e.target.value})}
              className="border border-gray-300 rounded-md px-3 py-2"
            />
            <input
              type="number"
              step="0.01"
              placeholder="Importo (- per spese)"
              value={newTransaction.amount}
              onChange={(e) => setNewTransaction({...newTransaction, amount: e.target.value})}
              className="border border-gray-300 rounded-md px-3 py-2"
            />
            <input
              type="date"
              value={newTransaction.date}
              onChange={(e) => setNewTransaction({...newTransaction, date: e.target.value})}
              className="border border-gray-300 rounded-md px-3 py-2"
            />
            <button
              onClick={addTransaction}
              className="bg-blue-600 text-white rounded-md px-4 py-2 hover:bg-blue-700"
            >
              Aggiungi
            </button>
          </div>
        </div>

        {/* Transactions List */}
        <div className="bg-white rounded-lg shadow-md">
          <div className="p-6 border-b">
            <h3 className="text-lg font-semibold text-gray-700">Transazioni Recenti</h3>
          </div>
          <div className="divide-y">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="p-4 flex justify-between items-center">
                <div>
                  <p className="font-medium text-gray-900">{transaction.description}</p>
                  <p className="text-sm text-gray-500">{transaction.date}</p>
                </div>
                <p className={`font-semibold ${transaction.amount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  €{transaction.amount.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}