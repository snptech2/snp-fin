// src/components/layout/PageLayout.tsx
import { ReactNode } from 'react'

interface PageLayoutProps {
  title: string
  subtitle?: string
  actionButton?: ReactNode
  children: ReactNode
}

export default function PageLayout({ 
  title, 
  subtitle, 
  actionButton, 
  children 
}: PageLayoutProps) {
  return (
    <div className="space-y-6">
      {/* Header Standardizzato */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="title-primary">{title}</h1>
          {subtitle && <p className="subtitle-standard">{subtitle}</p>}
        </div>
        {actionButton && (
          <div className="flex-shrink-0">
            {actionButton}
          </div>
        )}
      </div>

      {/* Contenuto */}
      {children}
    </div>
  )
}