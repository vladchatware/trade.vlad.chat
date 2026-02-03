import { Sparkline } from '@/app/components/LineChart'
import { Metric } from '@/app/components/Metric'
import { Panel } from '@/app/components/Panel'
import { Tooltip, TooltipContent } from '@/app/components/Tooltip'

import type { Config, LlmStats, PositionEntry, PositionRow, StalenessAnalysis } from '../types'
import { formatCurrency, formatPercent, isCryptoSymbol } from '../utils'

interface AccountPanelProps {
  isLoading: boolean
  portfolioValue: number
  cash: number
  buyingPower: number
  totalPl: number
  totalPlPct: number
  realizedPl: number
  unrealizedPl: number
}

export function AccountPanel({
  isLoading,
  portfolioValue,
  cash,
  buyingPower,
  totalPl,
  totalPlPct,
  realizedPl,
  unrealizedPl,
}: AccountPanelProps) {
  return (
    <Panel title="ACCOUNT" className="h-full">
      {!isLoading ? (
        <div className="space-y-3">
          <Metric label="EQUITY" value={formatCurrency(portfolioValue)} size="xl" />
          <div className="grid grid-cols-2 gap-3">
            <Metric label="CASH" value={formatCurrency(cash)} size="md" />
            <Metric label="BUYING POWER" value={formatCurrency(buyingPower)} size="md" />
          </div>
          <div className="pt-2 border-t border-hud-line space-y-1">
            <div className={`hud-value-md ${totalPl >= 0 ? 'text-hud-success' : 'text-hud-error'}`}>
              {formatCurrency(totalPl)} ({formatPercent(totalPlPct)})
            </div>
            <div className="flex gap-4 text-xs">
              <span className="text-hud-text-dim">
                REALIZED{' '}
                <span className={realizedPl >= 0 ? 'text-hud-success' : 'text-hud-error'}>
                  {formatCurrency(realizedPl)}
                </span>
              </span>
              <span className="text-hud-text-dim">
                UNREALIZED{' '}
                <span className={unrealizedPl >= 0 ? 'text-hud-success' : 'text-hud-error'}>
                  {formatCurrency(unrealizedPl)}
                </span>
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="text-hud-text-dim text-sm">Loading...</div>
      )}
    </Panel>
  )
}

interface PositionsPanelProps {
  positions: PositionRow[]
  config: Config
  positionPriceHistories: Record<string, number[]>
  positionEntries?: Record<string, PositionEntry>
  stalenessAnalysis?: Record<string, StalenessAnalysis>
}

export function PositionsPanel({
  positions,
  config,
  positionPriceHistories,
  positionEntries,
  stalenessAnalysis,
}: PositionsPanelProps) {
  return (
    <Panel
      title="POSITIONS"
      titleRight={`${positions.length}/${config.maxPositions}`}
      className="h-full"
    >
      {positions.length === 0 ? (
        <div className="text-hud-text-dim text-sm py-8 text-center">No open positions</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-hud-line/50">
                <th className="hud-label text-left py-2 px-2">Symbol</th>
                <th className="hud-label text-right py-2 px-2 hidden sm:table-cell">Qty</th>
                <th className="hud-label text-right py-2 px-2 hidden md:table-cell">Value</th>
                <th className="hud-label text-right py-2 px-2">P&L</th>
                <th className="hud-label text-center py-2 px-2">Trend</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((pos) => {
                const plPct =
                  pos.unrealizedPl && pos.marketValue
                    ? (pos.unrealizedPl / (pos.marketValue - pos.unrealizedPl)) * 100
                    : 0
                const priceHistory = positionPriceHistories[pos.symbol] || []
                const posEntry = positionEntries?.[pos.symbol]
                const staleness = stalenessAnalysis?.[pos.symbol]
                const holdTime = posEntry
                  ? Math.floor((Date.now() - posEntry.entry_time) / 3600000)
                  : null

                return (
                  <tr
                    key={pos.symbol || pos._id}
                    className="border-b border-hud-line/20 hover:bg-hud-line/10 transition-colors"
                  >
                    <td className="hud-value-sm py-2 px-2">
                      <Tooltip
                        position="right"
                        content={
                          <TooltipContent
                            title={pos.symbol}
                            items={[
                              {
                                label: 'Entry Price',
                                value: posEntry ? formatCurrency(posEntry.entry_price) : 'N/A',
                              },
                              {
                                label: 'Current Price',
                                value: formatCurrency(pos.currentPrice ?? pos.avgEntryPrice ?? 0),
                              },
                              {
                                label: 'Hold Time',
                                value: holdTime !== null ? `${holdTime}h` : 'N/A',
                              },
                              {
                                label: 'Entry Sentiment',
                                value: posEntry
                                  ? `${(posEntry.entry_sentiment * 100).toFixed(0)}%`
                                  : 'N/A',
                              },
                              ...(staleness
                                ? [
                                    {
                                      label: 'Staleness',
                                      value: `${(staleness.score * 100).toFixed(0)}%`,
                                      color: staleness.shouldExit
                                        ? 'text-hud-error'
                                        : 'text-hud-text',
                                    },
                                  ]
                                : []),
                            ]}
                            description={posEntry?.entry_reason}
                          />
                        }
                      >
                        <span className="cursor-help border-b border-dotted border-hud-text-dim">
                          {isCryptoSymbol(pos.symbol, config.cryptoSymbols) && (
                            <span className="text-hud-warning mr-1">₿</span>
                          )}
                          {pos.symbol}
                        </span>
                      </Tooltip>
                    </td>
                    <td className="hud-value-sm text-right py-2 px-2 hidden sm:table-cell">
                      {pos.qty}
                    </td>
                    <td className="hud-value-sm text-right py-2 px-2 hidden md:table-cell">
                      {formatCurrency(pos.marketValue || 0)}
                    </td>
                    <td
                      className={`hud-value-sm text-right py-2 px-2 ${(pos.unrealizedPl || 0) >= 0 ? 'text-hud-success' : 'text-hud-error'}`}
                    >
                      <div>{formatCurrency(pos.unrealizedPl || 0)}</div>
                      <div className="text-xs opacity-70">{formatPercent(plPct)}</div>
                    </td>
                    <td className="py-2 px-2">
                      <div className="flex justify-center">
                        {priceHistory.length > 1 ? (
                          <Sparkline data={priceHistory} width={60} height={20} />
                        ) : (
                          <span className="text-xs text-hud-text-dim">-</span>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  )
}

export function LlmCostsPanel({ llmStats, model }: { llmStats: LlmStats; model: string }) {
  return (
    <Panel title="LLM COSTS" className="h-full">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <Metric label="TOTAL SPENT" value={`$${llmStats.totalUsd.toFixed(4)}`} size="lg" />
          <Metric label="API CALLS" value={llmStats.calls.toString()} size="lg" />
        </div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
          <div className="text-hud-text-dim">
            TOKENS IN <span className="text-hud-text">{llmStats.tokensIn.toLocaleString()}</span>
          </div>
          <div className="text-hud-text-dim">
            TOKENS OUT <span className="text-hud-text">{llmStats.tokensOut.toLocaleString()}</span>
          </div>
          <div className="text-hud-text-dim">
            AVG COST/CALL{' '}
            <span className="text-hud-text">
              {llmStats.calls > 0 ? `$${(llmStats.totalUsd / llmStats.calls).toFixed(6)}` : '$0'}
            </span>
          </div>
          <div className="text-hud-text-dim">
            MODEL <span className="text-hud-text">{model.split('/')[1] || 'kimi-k2.5'}</span>
          </div>
        </div>
      </div>
    </Panel>
  )
}
