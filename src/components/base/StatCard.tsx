// src/components/base/StatCard.tsx
interface StatCardProps {
  title: string
  value: string | number
  detail?: string
  color?: string
  icon?: string
}

export const StatCard = ({ 
  title, 
  value, 
  detail, 
  color = "text-adaptive-900", 
  icon 
}: StatCardProps) => (
  <div className="card-adaptive p-4 rounded-lg border-adaptive">
    <div className="flex items-center justify-between mb-1">
      <h3 className="text-sm font-medium text-adaptive-500">{title}</h3>
      {icon && <span className="text-lg">{icon}</span>}
    </div>
    <p className={`text-2xl font-bold ${color}`}>{value}</p>
    {detail && <p className="text-sm text-adaptive-600">{detail}</p>}
  </div>
)