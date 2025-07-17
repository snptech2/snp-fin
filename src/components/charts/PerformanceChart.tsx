import React, { useState, useMemo } from 'react'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

interface DataPoint {
  date: string
  fiatValue: number
  btcValue: number
}

interface PerformanceChartProps {
  data: DataPoint[]
  currency: string
  type: 'fiat' | 'btc'
  title: string
  height?: number
}

export default function PerformanceChart({ data, currency, type, title, height = 300 }: PerformanceChartProps) {
  // Chart controls state
  const [autoScale, setAutoScale] = useState(true)
  const [showPoints, setShowPoints] = useState(false)
  const [smoothLine, setSmoothLine] = useState(true)

  if (!data || data.length === 0) {
    return (
      <div className="card-adaptive rounded-lg p-6 border border-adaptive">
        <h3 className="text-lg font-semibold text-adaptive-900 mb-4">{title}</h3>
        <div className="flex items-center justify-center h-64 text-adaptive-600">
          <div className="text-center">
            <p>📈</p>
            <p className="mt-2">Nessun dato disponibile</p>
            <p className="text-sm">Crea alcuni snapshot per vedere i grafici</p>
          </div>
        </div>
      </div>
    )
  }

  // Prepare data for recharts
  const chartData = data.map(point => ({
    date: new Date(point.date).toLocaleDateString('it-IT', {
      day: '2-digit',
      month: '2-digit',
      year: '2-digit'
    }),
    value: type === 'fiat' ? point.fiatValue : point.btcValue,
    fullDate: point.date
  }))

  // Calculate smart Y-axis domain
  const yAxisDomain = useMemo(() => {
    if (!autoScale) return undefined // Let recharts handle it automatically
    
    const values = chartData.map(d => d.value)
    const minValue = Math.min(...values)
    const maxValue = Math.max(...values)
    const padding = (maxValue - minValue) * 0.1 // 10% padding
    
    return [
      Math.max(0, minValue - padding), // Don't go below 0
      maxValue + padding
    ]
  }, [chartData, autoScale])

  const formatTooltipValue = (value: number) => {
    if (type === 'fiat') {
      return `${currency === 'USD' ? '$' : '€'}${value.toLocaleString('it-IT', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
    } else {
      return `₿${value.toLocaleString('it-IT', { minimumFractionDigits: 8, maximumFractionDigits: 8 })}`
    }
  }

  const formatYAxisValue = (value: number) => {
    if (type === 'fiat') {
      return `${currency === 'USD' ? '$' : '€'}${value.toLocaleString('it-IT', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}`
    } else {
      return `₿${value.toFixed(4)}`
    }
  }

  const strokeColor = type === 'fiat' ? '#16a34a' : '#ea580c' // Slightly more subtle colors
  const fillColor = type === 'fiat' ? 'rgba(34, 197, 94, 0.05)' : 'rgba(249, 115, 22, 0.05)' // Much more subtle fill

  return (
    <div className="card-adaptive rounded-lg p-6 border border-adaptive">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-adaptive-900">{title}</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setAutoScale(!autoScale)}
            className={`px-2 py-1 text-xs rounded-md border ${
              autoScale 
                ? 'bg-blue-100 text-blue-700 border-blue-300' 
                : 'bg-gray-100 text-gray-700 border-gray-300'
            }`}
          >
            {autoScale ? 'Smart' : 'Full'}
          </button>
          <button
            onClick={() => setShowPoints(!showPoints)}
            className={`px-2 py-1 text-xs rounded-md border ${
              showPoints 
                ? 'bg-green-100 text-green-700 border-green-300' 
                : 'bg-gray-100 text-gray-700 border-gray-300'
            }`}
          >
            •
          </button>
        </div>
      </div>
      <div style={{ height: `${height}px` }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(107, 114, 128, 0.06)" />
            <XAxis 
              dataKey="date" 
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
            />
            <YAxis 
              stroke="#6b7280"
              fontSize={12}
              tickLine={false}
              axisLine={false}
              tickFormatter={formatYAxisValue}
              domain={yAxisDomain}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(0, 0, 0, 0.85)',
                border: `1px solid ${strokeColor}`,
                borderRadius: '8px',
                color: '#fff',
                fontSize: '12px'
              }}
              formatter={(value: number) => [formatTooltipValue(value), type === 'fiat' ? `Portfolio (${currency})` : 'Portfolio (BTC)']}
              labelFormatter={(label) => `Data: ${label}`}
            />
            <Line 
              type={smoothLine ? "monotone" : "linear"} 
              dataKey="value" 
              stroke={strokeColor}
              strokeWidth={1}
              dot={showPoints ? { fill: strokeColor, strokeWidth: 1, r: 2 } : false}
              activeDot={{ r: 4, fill: strokeColor, strokeWidth: 2 }}
              fill={fillColor}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <div className="mt-4 text-sm text-adaptive-600 text-center">
        {data.length} snapshot • Ultimo aggiornamento: {new Date(data[data.length - 1]?.date).toLocaleDateString('it-IT')}
      </div>
    </div>
  )
}