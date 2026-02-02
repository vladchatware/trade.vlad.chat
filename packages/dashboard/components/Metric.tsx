interface MetricProps {
  label: string
  value: string | number
  trend?: 'up' | 'down' | 'neutral'
  prefix?: string
  suffix?: string
}

export function Metric({ label, value, trend, prefix = '', suffix = '' }: MetricProps) {
  const trendColor =
    trend === 'up' ? 'text-green-500' : trend === 'down' ? 'text-red-500' : 'text-gray-400'

  return (
    <div className="metric-card">
      <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">{label}</div>
      <div className={`text-2xl font-bold ${trendColor}`}>
        {prefix}
        {value}
        {suffix}
      </div>
    </div>
  )
}
