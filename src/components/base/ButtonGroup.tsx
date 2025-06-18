// src/components/base/ButtonGroup.tsx
interface ButtonGroupProps {
  onCancel: () => void
  onConfirm: () => void
  cancelLabel?: string
  confirmLabel?: string
  loading?: boolean
  confirmDisabled?: boolean
}

export const ButtonGroup = ({ 
  onCancel, 
  onConfirm, 
  cancelLabel = 'Annulla',
  confirmLabel = 'Conferma',
  loading = false,
  confirmDisabled = false
}: ButtonGroupProps) => (
  <div className="flex justify-end space-x-3">
    <button
      onClick={onCancel}
      disabled={loading}
      className="px-4 py-2 text-adaptive-600 hover:text-adaptive-800 disabled:opacity-50"
    >
      {cancelLabel}
    </button>
    <button
      onClick={onConfirm}
      disabled={loading || confirmDisabled}
      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
    >
      {loading ? 'Caricamento...' : confirmLabel}
    </button>
  </div>
)