// src/components/base/DataList.tsx
import { ReactNode } from 'react'

interface DataItem {
  id: number | string
  [key: string]: any
}

interface DataListProps<T extends DataItem> {
  items: T[]
  renderItem: (item: T) => ReactNode
  emptyMessage?: string
  actions?: (item: T) => ReactNode
}

export function DataList<T extends DataItem>({ 
  items, 
  renderItem, 
  emptyMessage = "Nessun elemento trovato.",
  actions 
}: DataListProps<T>) {
  if (items.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-adaptive-600">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {items.map((item) => (
        <div key={item.id} className="flex items-center justify-between p-4 card-adaptive rounded-lg hover:bg-adaptive-50 transition-colors border border-adaptive">
          <div className="flex items-center gap-4 flex-1">
            {renderItem(item)}
          </div>
          {actions && (
            <div className="flex items-center gap-2 ml-4">
              {actions(item)}
            </div>
          )}
        </div>
      ))}
    </div>
  )
}