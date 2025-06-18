// src/components/base/EmptyState.tsx
interface EmptyStateProps {
  message: string
  actionLabel?: string
  onAction?: () => void
  icon?: string
}

export const EmptyState = ({ 
  message, 
  actionLabel, 
  onAction, 
  icon = "📄" 
}: EmptyStateProps) => (
  <div className="text-center py-12">
    <div className="text-6xl mb-4">{icon}</div>
    <p className="text-adaptive-600 mb-4">{message}</p>
    {actionLabel && onAction && (
      <button
        onClick={onAction}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
      >
        {actionLabel}
      </button>
    )}
  </div>
)