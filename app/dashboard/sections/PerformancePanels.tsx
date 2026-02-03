import { LineChart } from '@/app/components/LineChart'
import { Panel } from '@/app/components/Panel'

import type { PositionRow } from '../types'
import { formatPercent, positionColors } from '../utils'

interface PortfolioPerformancePanelProps {
  isLoading: boolean
  hasHistory: boolean
  data: number[]
  labels: string[]
}

export function PortfolioPerformancePanel({
  isLoading,
  hasHistory,
  data,
  labels,
}: PortfolioPerformancePanelProps) {
  return (
    <Panel title="PORTFOLIO PERFORMANCE" titleRight="24H" className="h-[320px]">
      {isLoading ? (
        <div className="h-full flex items-center justify-center text-hud-text-dim">
          Loading chart data...
        </div>
      ) : hasHistory ? (
        <div className="h-full w-full">
          <LineChart
            series={[
              {
                label: 'Equity',
                data,
                variant: data[data.length - 1] >= data[0] ? 'green' : 'red',
              },
            ]}
            labels={labels}
            showArea={true}
            showGrid={true}
            showDots={false}
            formatValue={(v: number) => `$${(v / 1000).toFixed(1)}k`}
          />
        </div>
      ) : (
        <div className="h-full flex items-center justify-center text-hud-text-dim text-sm">
          No portfolio history data available
        </div>
      )}
    </Panel>
  )
}

interface PositionPerformancePanelProps {
  positions: PositionRow[]
  normalizedPositionSeries: {
    label: string
    data: number[]
    variant: (typeof positionColors)[number]
  }[]
}

export function PositionPerformancePanel({
  positions,
  normalizedPositionSeries,
}: PositionPerformancePanelProps) {
  return (
    <Panel title="POSITION PERFORMANCE" titleRight="% CHANGE" className="h-[320px]">
      {positions.length === 0 ? (
        <div className="h-full flex items-center justify-center text-hud-text-dim text-sm">
          No positions to display
        </div>
      ) : normalizedPositionSeries.length > 0 ? (
        <div className="h-full flex flex-col">
          <div className="flex flex-wrap gap-3 mb-2 pb-2 border-b border-hud-line/30 shrink-0">
            {positions.slice(0, 5).map((pos, idx) => {
              const isPositive = (pos.unrealizedPl || 0) >= 0
              const plPct =
                pos.unrealizedPl && pos.marketValue
                  ? (pos.unrealizedPl / (pos.marketValue - pos.unrealizedPl)) * 100
                  : 0
              const color = positionColors[idx % positionColors.length]

              return (
                <div key={pos.symbol} className="flex items-center gap-1.5">
                  <div
                    className="w-2 h-2 rounded-full"
                    style={{ backgroundColor: `var(--color-hud-${color})` }}
                  />
                  <span className="hud-value-sm">{pos.symbol}</span>
                  <span
                    className={`hud-label ${isPositive ? 'text-hud-success' : 'text-hud-error'}`}
                  >
                    {formatPercent(plPct)}
                  </span>
                </div>
              )
            })}
          </div>
          <div className="flex-1 min-h-0 w-full">
            <LineChart
              series={normalizedPositionSeries.slice(0, 5)}
              showArea={false}
              showGrid={true}
              showDots={false}
              animated={false}
              formatValue={(v) => `${v >= 0 ? '+' : ''}${v.toFixed(1)}%`}
            />
          </div>
        </div>
      ) : (
        <div className="h-full flex items-center justify-center text-hud-text-dim text-sm">
          Loading position data...
        </div>
      )}
    </Panel>
  )
}
