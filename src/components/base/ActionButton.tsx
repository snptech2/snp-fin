// src/components/base/ActionButton.tsx
interface ActionButtonProps {
  onClick: () => void
  variant: 'edit' | 'delete' | 'view'
  disabled?: boolean
}

export const ActionButton = ({ onClick, variant, disabled }: ActionButtonProps) => {
  const variants = {
    edit: { icon: '✏️', className: 'text-blue-600 hover:text-blue-800' },
    delete: { icon: '🗑️', className: 'text-red-600 hover:text-red-800' },
    view: { icon: '👁️', className: 'text-gray-600 hover:text-gray-800' }
  }

  const config = variants[variant]

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`p-1 ${config.className} disabled:opacity-50`}
    >
      {config.icon}
    </button>
  )
}