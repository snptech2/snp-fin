// src/components/base/ContentCard.tsx
import { ReactNode } from 'react'

interface ContentCardProps {
  title: string
  children: ReactNode
  action?: {
    label: string
    onClick: () => void
    variant?: 'primary' | 'secondary' | 'danger'
  }
}

export const ContentCard = ({ title, children, action }: ContentCardProps) => {
  const getActionClasses = (variant: string = 'primary') => {
    const variants = {
      primary: 'bg-blue-600 text-white hover:bg-blue-700',
      secondary: 'border border-adaptive text-adaptive-700 hover:bg-gray-50',
      danger: 'bg-red-600 text-white hover:bg-red-700'
    }
    return `px-3 py-1 text-sm rounded-lg ${variants[variant as keyof typeof variants]}`
  }

  return (
    <div className="card-adaptive rounded-lg shadow-sm border-adaptive">
      <div className="p-6 border-b border-adaptive">
        <div className="flex justify-between items-center">
          <h3 className="text-lg font-medium text-adaptive-900">{title}</h3>
          {action && (
            <button 
              onClick={action.onClick}
              className={getActionClasses(action.variant)}
            >
              {action.label}
            </button>
          )}
        </div>
      </div>
      <div className="p-6">
        {children}
      </div>
    </div>
  )
}