// src/components/transactions/TransactionFormModal.tsx
import React, { useCallback } from 'react'
import { FormModal } from '@/components/base/FormModal'

interface Account {
  id: number
  name: string
  isDefault: boolean
  type: string
}

interface Category {
  id: number
  name: string
}

interface Transaction {
  id: number
  description?: string
  amount: number
  date: string
  account: { id: number; name: string }
  category: { id: number; name: string }
}

interface TransactionForm {
  description: string
  amount: string
  date: string
  accountId: string
  categoryId: string
}

interface TransactionFormModalProps {
  isOpen: boolean
  onClose: () => void
  transactionType: 'income' | 'expense'
  editingTransaction: Transaction | null
  transactionForm: TransactionForm
  onFormChange: (form: TransactionForm) => void
  onSubmit: (e: React.FormEvent) => void
  accounts: Account[]
  categories: Category[]
  onNewCategory: () => void
  error?: string
  isSubmitting?: boolean
}

export const TransactionFormModal = ({
  isOpen,
  onClose,
  transactionType,
  editingTransaction,
  transactionForm,
  onFormChange,
  onSubmit,
  accounts,
  categories,
  onNewCategory,
  error,
  isSubmitting = false
}: TransactionFormModalProps) => {
  
  const title = editingTransaction 
    ? `Modifica ${transactionType === 'income' ? 'Entrata' : 'Uscita'}`
    : `Nuova ${transactionType === 'income' ? 'Entrata' : 'Uscita'}`

  const handleSubmit = async () => {
    const event = new Event('submit') as any
    event.preventDefault = () => {}
    await onSubmit(event)
  }

  // Memoize change handlers to prevent re-renders
  const handleDescriptionChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onFormChange({ description: e.target.value })
  }, [onFormChange])

  const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onFormChange({ amount: e.target.value })
  }, [onFormChange])

  const handleDateChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onFormChange({ date: e.target.value })
  }, [onFormChange])

  const handleAccountChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onFormChange({ accountId: e.target.value })
  }, [onFormChange])

  const handleCategoryChange = useCallback((e: React.ChangeEvent<HTMLSelectElement>) => {
    onFormChange({ categoryId: e.target.value })
  }, [onFormChange])

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      onSubmit={handleSubmit}
      onCancel={onClose}
      submitText={isSubmitting ? 'Salvando...' : editingTransaction ? 'Aggiorna' : 'Crea'}
      isSubmitting={isSubmitting}
      size="md"
    >
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-1 text-adaptive-700">
            Descrizione
          </label>
          <input
            type="text"
            value={transactionForm.description}
            onChange={handleDescriptionChange}
            placeholder={`Es: ${transactionType === 'income' ? 'Stipendio' : 'Spesa supermercato'}`}
            className="w-full px-3 py-2 border border-adaptive rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-adaptive-700">
            Importo (EUR) *
          </label>
          <input
            type="number"
            step="0.01"
            min="0.01"
            value={transactionForm.amount}
            onChange={handleAmountChange}
            required
            className="w-full px-3 py-2 border border-adaptive rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-adaptive-700">
            Data *
          </label>
          <input
            type="date"
            value={transactionForm.date}
            onChange={handleDateChange}
            required
            className="w-full px-3 py-2 border border-adaptive rounded-md focus:ring-blue-500 focus:border-blue-500"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-adaptive-700">
            Conto *
          </label>
          <select
            value={transactionForm.accountId}
            onChange={handleAccountChange}
            required
            className="w-full px-3 py-2 border border-adaptive rounded-md focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Seleziona conto</option>
            {accounts.filter(account => account.type === 'bank').map(account => (
              <option key={account.id} value={account.id.toString()}>
                {account.name}{account.isDefault ? ' (Predefinito)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium mb-1 text-adaptive-700">
            Categoria *
          </label>
          <div className="flex gap-2">
            <select
              value={transactionForm.categoryId}
              onChange={handleCategoryChange}
              required
              className="flex-1 px-3 py-2 border border-adaptive rounded-md focus:ring-blue-500 focus:border-blue-500"
            >
              <option value="">Seleziona categoria</option>
              {categories.map(category => (
                <option key={category.id} value={category.id.toString()}>
                  {category.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={onNewCategory}
              className="px-3 py-2 text-sm bg-adaptive-100 hover:bg-adaptive-200 border border-adaptive rounded-md transition-colors"
              title="Aggiungi nuova categoria"
            >
              +
            </button>
          </div>
        </div>
      </div>
    </FormModal>
  )
}