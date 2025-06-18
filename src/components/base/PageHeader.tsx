// src/components/base/PageHeader.tsx
interface PageHeaderProps {
  title: string
  subtitle: string
  actionLabel?: string
  onAction?: () => void
  actionIcon?: string
}

export const PageHeader = ({ 
  title, 
  subtitle, 
  actionLabel, 
  onAction, 
  actionIcon = "➕" 
}: PageHeaderProps) => (
  <div className="flex justify-between items-center">
    <div>
      <h1 className="text-3xl font-bold text-adaptive-900">{title}</h1>
      <p className="text-adaptive-600">{subtitle}</p>
    </div>
    {actionLabel && onAction && (
      <button 
        onClick={onAction}
        className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 flex items-center gap-2"
      >
        <span>{actionIcon}</span>
        {actionLabel}
      </button>
    )}
  </div>
)