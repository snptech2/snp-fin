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

type TimeRange = 'full' | '1y' | '1m' | '1w'

export default function PerformanceChart({ data, currency, type, title, height = 300 }: PerformanceChartProps) {
  // Chart controls state
  const [logScale, setLogScale] = useState(false)
  const [timeRange, setTimeRange] = useState<TimeRange>('full')

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
  const chartData = useMemo(() => {
    // Filtra i dati in base al time range selezionato
    const now = new Date()
    let filteredData = data

    if (timeRange !== 'full') {
      const cutoffDate = new Date()
      switch (timeRange) {
        case '1y':
          cutoffDate.setFullYear(now.getFullYear() - 1)
          break
        case '1m':
          cutoffDate.setMonth(now.getMonth() - 1)
          break
        case '1w':
          cutoffDate.setDate(now.getDate() - 7)
          break
      }

      filteredData = data.filter(point => new Date(point.date) >= cutoffDate)
    }

    return filteredData
      .map(point => {
        const rawValue = type === 'fiat' ? point.fiatValue : point.btcValue
        return {
          date: new Date(point.date).toLocaleDateString('it-IT', {
            day: '2-digit',
            month: '2-digit',
            year: '2-digit'
          }),
          value: rawValue,
          originalValue: rawValue,
          fullDate: point.date
        }
      })
      .filter(point => {
        // Se siamo in scala log, filtriamo i valori <= 0
        return logScale ? point.value > 0 : true
      })
  }, [data, type, logScale, timeRange])

  // Calculate Y-axis domain
  const yAxisDomain = useMemo(() => {
    if (logScale) {
      // Usa i dati già filtrati per valori positivi
      const values = chartData.map(d => d.value)
      if (values.length === 0) {
        console.log('Nessun valore positivo per scala logaritmica')
        return [1, 1000] // Fallback
      }

      const minValue = Math.min(...values)
      const maxValue = Math.max(...values)

      console.log('Log scale domain:', { minValue, maxValue, pointCount: values.length })

      // Iniziamo dal primo valore positivo reale con un po' di margin
      return [
        Math.max(1, minValue * 0.9), // Leggermente sotto il minimo reale
        maxValue * 1.1 // Leggermente sopra il massimo
      ]
    }

    // Full scale: let recharts handle it automatically
    return undefined
  }, [chartData, logScale])

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
          {/* Time range selector */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => setTimeRange('full')}
              className={`px-2 py-1 text-xs rounded-md border ${
                timeRange === 'full'
                  ? 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700'
                  : 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
              }`}
            >
              Full
            </button>
            <button
              onClick={() => setTimeRange('1y')}
              className={`px-2 py-1 text-xs rounded-md border ${
                timeRange === '1y'
                  ? 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700'
                  : 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
              }`}
            >
              1A
            </button>
            <button
              onClick={() => setTimeRange('1m')}
              className={`px-2 py-1 text-xs rounded-md border ${
                timeRange === '1m'
                  ? 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700'
                  : 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
              }`}
            >
              1M
            </button>
            <button
              onClick={() => setTimeRange('1w')}
              className={`px-2 py-1 text-xs rounded-md border ${
                timeRange === '1w'
                  ? 'bg-blue-100 text-blue-700 border-blue-300 dark:bg-blue-900 dark:text-blue-200 dark:border-blue-700'
                  : 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
              }`}
            >
              1S
            </button>
          </div>
          {/* Log scale toggle */}
          <button
            onClick={() => setLogScale(!logScale)}
            className={`px-2 py-1 text-xs rounded-md border ${
              logScale
                ? 'bg-orange-100 text-orange-700 border-orange-300 dark:bg-orange-900 dark:text-orange-200 dark:border-orange-700'
                : 'bg-gray-100 text-gray-700 border-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'
            }`}
          >
            Log
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
              scale={logScale ? 'log' : 'linear'}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(0, 0, 0, 0.85)',
                border: `1px solid ${strokeColor}`,
                borderRadius: '8px',
                color: '#fff',
                fontSize: '12px'
              }}
              formatter={(value: number, name: string, props: any) => {
                const originalValue = props.payload?.originalValue ?? value
                return [formatTooltipValue(originalValue), type === 'fiat' ? `Portfolio (${currency})` : 'Portfolio (BTC)']
              }}
              labelFormatter={(label) => `Data: ${label}`}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={strokeColor}
              strokeWidth={1}
              dot={false}
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