import { NotificationBell } from '@/app/components/NotificationBell'
import { StatusBar, StatusIndicator } from '@/app/components/StatusIndicator'

import type { LlmStats, OvernightActivity, PremarketPlan } from '../types'

interface HeaderBarProps {
  isMarketOpen: boolean
  llmStats: LlmStats
  time: Date | null
  overnightActivity?: OvernightActivity | null
  premarketPlan?: PremarketPlan | null
  onOpenSettings: () => void
}

export function HeaderBar({
  isMarketOpen,
  llmStats,
  time,
  overnightActivity,
  premarketPlan,
  onOpenSettings,
}: HeaderBarProps) {
  return (
    <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 pb-3 border-b border-hud-line">
      <div className="flex items-center gap-4 md:gap-6">
        <div className="flex items-baseline gap-2">
          <span className="text-xl md:text-2xl font-light tracking-tight text-hud-text-bright">
            trade.vlad.chat
          </span>
          <span className="hud-label">v2</span>
        </div>
        <StatusIndicator
          status={isMarketOpen ? 'active' : 'inactive'}
          label={isMarketOpen ? 'MARKET OPEN' : 'MARKET CLOSED'}
          pulse={isMarketOpen}
        />
      </div>
      <div className="flex items-center gap-3 md:gap-6 flex-wrap">
        <StatusBar
          items={[
            {
              label: 'LLM COST',
              value: `$${llmStats.totalUsd.toFixed(4)}`,
              status: llmStats.totalUsd > 1 ? 'warning' : 'active',
            },
            { label: 'API CALLS', value: llmStats.calls.toString() },
          ]}
        />
        <NotificationBell overnightActivity={overnightActivity} premarketPlan={premarketPlan} />
        <button
          type="button"
          className="hud-label hover:text-hud-primary transition-colors cursor-pointer"
          onClick={onOpenSettings}
        >
          [CONFIG]
        </button>
        <span className="hud-value-sm font-mono">
          {time?.toLocaleTimeString('en-US', { hour12: false })}
        </span>
      </div>
    </header>
  )
}
