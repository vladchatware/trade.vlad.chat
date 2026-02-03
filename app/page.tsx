'use client'

import { LineChart, Sparkline } from '@/components/LineChart'
import { Metric, MetricInline } from '@/components/Metric'
import { NotificationBell } from '@/components/NotificationBell'
import { Panel } from '@/components/Panel'
import { SettingsModal } from '@/components/SettingsModal'
import { StatusBar, StatusIndicator } from '@/components/StatusIndicator'
import { Tooltip, TooltipContent } from '@/components/Tooltip'
import { api } from '@/convex/_generated/api'
import { useClock } from '@/hooks/useClock'
import { usePortfolio } from '@/hooks/usePortfolio'
import { usePortfolioHistory } from '@/hooks/usePortfolioHistory'
import { useMutation, useQuery } from 'convex/react'
import { useMemo, useState } from 'react'

interface Config {
  maxPositionValue: number
  maxPositions: number
  minSentimentScore: number
  minAnalystConfidence: number
  sellSentimentThreshold?: number
  takeProfitPct: number
  stopLossPct: number
  positionSizePctOfCash: number
  dataPollIntervalMs?: number
  analystIntervalMs?: number
  llmModel: string
  llmAnalystModel?: string
  llmMaxTokens?: number
  cryptoEnabled?: boolean
  cryptoSymbols?: string[]
  startingEquity?: number
  optionsEnabled?: boolean
  optionsTargetDelta?: number
  optionsMinDte?: number
  optionsMaxDte?: number
  optionsMaxPctPerTrade?: number
  optionsMinConfidence?: number
  optionsMaxPositions?: number
  optionsStopLossPct?: number
  optionsTakeProfitPct?: number
  cryptoMomentumThreshold?: number
  cryptoMaxPositionValue?: number
  cryptoTakeProfitPct?: number
  cryptoStopLossPct?: number
  stalePositionEnabled?: boolean
  staleMaxHoldDays?: number
  staleMinGainPct?: number
  staleSocialVolumeDecay?: number
  staleNoMentionsHours?: number
}

interface SignalResearch {
  verdict?: string
  entryQuality?: string
  reasoning?: string
  redFlags?: string[]
  confidence?: number
  sentiment?: number
  timestamp?: number
  catalysts?: string[]
}

interface PositionEntry {
  entry_time: number
  entry_price: number
  entry_sentiment: number
  entry_reason: string
}

interface StalenessAnalysis {
  score: number
  shouldExit: boolean
}

// Helper functions
function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

function getAgentColor(agent: string): string {
  const colors: Record<string, string> = {
    Analyst: 'text-hud-purple',
    Executor: 'text-hud-cyan',
    StockTwits: 'text-hud-success',
    SignalResearch: 'text-hud-cyan',
    PositionResearch: 'text-hud-purple',
    Crypto: 'text-hud-warning',
    System: 'text-hud-text-dim',
  }
  return colors[agent] || 'text-hud-text'
}

function formatAction(action: string, detailsJson?: string): string {
  const actionNames: Record<string, string> = {
    order_submitted: 'Order Submitted',
    position_closed: 'Position Closed',
    take_profit: 'Take Profit',
    stop_loss: 'Stop Loss',
  }

  let text = actionNames[action] || action

  if (detailsJson) {
    try {
      const details = JSON.parse(detailsJson)
      if (details.orderId) {
        text += ` · ${details.orderId.slice(0, 8)}`
      }
      if (details.plPct !== undefined) {
        const sign = details.plPct >= 0 ? '+' : ''
        text += ` · ${sign}${details.plPct.toFixed(2)}%`
      }
    } catch {
      // ignore invalid JSON
    }
  }

  return text
}

function isCryptoSymbol(symbol: string, cryptoSymbols: string[] = []): boolean {
  return (
    cryptoSymbols.includes(symbol) ||
    symbol.includes('/USD') ||
    symbol.includes('BTC') ||
    symbol.includes('ETH') ||
    symbol.includes('SOL')
  )
}

function getSentimentColor(score: number): string {
  if (score >= 0.3) return 'text-hud-success'
  if (score <= -0.2) return 'text-hud-error'
  return 'text-hud-warning'
}

function getVerdictColor(verdict?: string): string {
  if (verdict === 'BUY') return 'text-hud-success'
  if (verdict === 'SKIP') return 'text-hud-error'
  return 'text-hud-warning'
}

function getQualityColor(quality?: string): string {
  if (quality === 'excellent') return 'text-hud-success'
  if (quality === 'good') return 'text-hud-primary'
  if (quality === 'fair') return 'text-hud-warning'
  return 'text-hud-error'
}

// Color palette for position lines
const positionColors = ['cyan', 'purple', 'yellow', 'blue', 'green'] as const

export default function Dashboard() {
  const [showSettings, setShowSettings] = useState(false)

  // Fetch real-time data from Convex
  const dbStatus = useQuery(api.status.get)

  // Fetch portfolio data (account + calculated metrics)
  const portfolio = usePortfolio()

  // Live clock
  const time = useClock()

  // Portfolio history for charts
  const portfolioHistory = usePortfolioHistory()

  // Mutations for updating data
  const updateConfig = useMutation(api.config.update)
  const seedDemoDataMutation = useMutation(api.demoData.seedDemoData)

  // Extract data (must be before early return to maintain hook order)
  // Use Convex database only (server-side cron job handles Alpaca fetching)
  type PositionRow = {
    symbol: string
    currentPrice?: number
    avgEntryPrice?: number
    unrealizedPl?: number
    marketValue?: number
    qty?: number
    _id?: string
  }
  type SignalRow = {
    _id?: string
    symbol: string
    source?: string
    sentiment?: number
    volume?: number
    reason?: string
    bullish?: number
    bearish?: number
    score?: number
    upvotes?: number
    isCrypto?: boolean
    momentum?: number
    price?: number
  }
  type LogRow = {
    _id?: string
    agent?: string
    action?: string
    symbol?: string
    detailsJson?: string
    timestamp?: number
  }
  const positions: PositionRow[] = dbStatus?.positions || []
  const signals: SignalRow[] = dbStatus?.signals || []
  const logs: LogRow[] = dbStatus?.logs || []
  const signalResearch = (dbStatus?.signalResearch ?? {}) as Record<string, SignalResearch>
  const config: Config = dbStatus?.config || {
    maxPositionValue: 2000,
    maxPositions: 3,
    minSentimentScore: 0.7,
    minAnalystConfidence: 0.8,
    takeProfitPct: 10,
    stopLossPct: 5,
    positionSizePctOfCash: 20,
    llmModel: 'moonshotai/kimi-k2.5',
    cryptoEnabled: false,
    optionsEnabled: false,
  }

  // Calculate metrics from Convex portfolio data only
  const portfolioValue = portfolio.portfolioValue ?? 0
  const cash = portfolio.cash ?? 0
  const buyingPower = portfolio.buyingPower ?? 0
  const startingEquity = config?.startingEquity || 100000
  const unrealizedPl = positions.reduce((sum: number, p) => sum + (p.unrealizedPl || 0), 0)
  const totalPl = portfolioValue - startingEquity
  const realizedPl = totalPl - unrealizedPl
  const totalPlPct = portfolioValue ? (totalPl / startingEquity) * 100 : 0
  const isMarketOpen = dbStatus?.marketClock?.isOpen ?? false
  const llmStats = dbStatus?.llmStats || { totalUsd: 0, calls: 0, tokensIn: 0, tokensOut: 0 }

  // Generate mock price histories for positions sparklines (must be before early return)
  const positionPriceHistories = useMemo(() => {
    const histories: Record<string, number[]> = {}
    for (const pos of positions) {
      const currentPrice = pos.currentPrice || pos.avgEntryPrice || 100
      const unrealizedPlVal = pos.unrealizedPl || 0
      const isPositive = unrealizedPlVal >= 0
      const startPrice = currentPrice * (isPositive ? 0.95 : 1.05)
      const prices: number[] = []
      const points = 20

      for (let i = 0; i < points; i++) {
        const progress = i / (points - 1)
        const trend = startPrice + (currentPrice - startPrice) * progress
        const noise = trend * (Math.random() - 0.5) * 0.02
        prices.push(trend + noise)
      }
      prices[prices.length - 1] = currentPrice
      histories[pos.symbol] = prices
    }
    return histories
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positions])

  // Normalize position price histories to % change for Position Performance panel
  const normalizedPositionSeries = useMemo(() => {
    return positions
      .map((pos, idx) => {
        const priceHistory = positionPriceHistories[pos.symbol] || []
        if (priceHistory.length < 2) return null
        const startPrice = priceHistory[0]
        const normalizedData = priceHistory.map(
          (price) => ((price - startPrice) / startPrice) * 100
        )
        return {
          label: pos.symbol,
          data: normalizedData,
          variant: positionColors[idx % positionColors.length],
        }
      })
      .filter(Boolean) as {
      label: string
      data: number[]
      variant: (typeof positionColors)[number]
    }[]
  }, [positions, positionPriceHistories])

  // Loading state (after all hooks)
  if (dbStatus === undefined || portfolio.isLoading) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  const handleSaveConfig = async (newConfig: Partial<Config>) => {
    try {
      await updateConfig({
        ...config,
        ...newConfig,
      })
      setShowSettings(false)
    } catch (error) {
      console.error('Failed to update config:', error)
      alert('Failed to save settings. Please try again.')
    }
  }

  const handleSeedDemoData = async () => {
    try {
      const result = await seedDemoDataMutation()
      if (result.success) {
        alert(`✅ Demo data added!\n${result.message}`)
      } else {
        alert(result.message)
      }
    } catch (error) {
      console.error('Failed to seed demo data:', error)
      alert('Failed to add demo data. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-hud-bg text-hud-text">
      <div className="max-w-[1920px] mx-auto p-4">
        {/* Header */}
        <header className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4 pb-3 border-b border-hud-line">
          <div className="flex items-center gap-4 md:gap-6">
            <div className="flex items-baseline gap-2">
              <span className="text-xl md:text-2xl font-light tracking-tight text-hud-text-bright">
                MAHORAGA
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
            <NotificationBell
              overnightActivity={dbStatus?.overnightActivity}
              premarketPlan={dbStatus?.premarketPlan}
            />
            <button
              type="button"
              className="hud-label hover:text-hud-primary transition-colors cursor-pointer"
              onClick={() => setShowSettings(true)}
            >
              [CONFIG]
            </button>
            <span className="hud-value-sm font-mono">
              {time?.toLocaleTimeString('en-US', { hour12: false })}
            </span>
          </div>
        </header>

        {/* Dashboard Layout - Row 1: Account, Positions, LLM Costs */}
        <div className="grid grid-cols-4 md:grid-cols-8 lg:grid-cols-12 gap-4">
          {/* Account Panel */}
          <div className="col-span-4 md:col-span-4 lg:col-span-3">
            <Panel title="ACCOUNT" className="h-full">
              {!portfolio.isLoading ? (
                <div className="space-y-3">
                  <Metric label="EQUITY" value={formatCurrency(portfolioValue)} size="xl" />
                  <div className="grid grid-cols-2 gap-3">
                    <Metric label="CASH" value={formatCurrency(cash)} size="md" />
                    <Metric label="BUYING POWER" value={formatCurrency(buyingPower)} size="md" />
                  </div>
                  <div className="pt-2 border-t border-hud-line space-y-1">
                    <div
                      className={`hud-value-md ${totalPl >= 0 ? 'text-hud-success' : 'text-hud-error'}`}
                    >
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
          </div>

          {/* Positions Panel */}
          <div className="col-span-4 md:col-span-4 lg:col-span-5">
            <Panel
              title="POSITIONS"
              titleRight={`${positions.length}/${config.maxPositions}`}
              className="h-full"
            >
              {positions.length === 0 ? (
                <div className="text-hud-text-dim text-sm py-8 text-center">
                  <div className="mb-3">No open positions</div>
                  <button type="button" onClick={handleSeedDemoData} className="hud-button text-xs">
                    [ADD DEMO DATA]
                  </button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-hud-line/50">
                        <th className="hud-label text-left py-2 px-2">Symbol</th>
                        <th className="hud-label text-right py-2 px-2 hidden sm:table-cell">Qty</th>
                        <th className="hud-label text-right py-2 px-2 hidden md:table-cell">
                          Value
                        </th>
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
                        const posEntry: PositionEntry | undefined =
                          dbStatus?.positionEntries?.[pos.symbol]
                        const staleness: StalenessAnalysis | undefined =
                          dbStatus?.stalenessAnalysis?.[pos.symbol]
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
                                        value: posEntry
                                          ? formatCurrency(posEntry.entry_price)
                                          : 'N/A',
                                      },
                                      {
                                        label: 'Current Price',
                                        value: formatCurrency(
                                          pos.currentPrice ?? pos.avgEntryPrice ?? 0
                                        ),
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
          </div>

          {/* LLM Costs Panel */}
          <div className="col-span-4 md:col-span-8 lg:col-span-4">
            <Panel title="LLM COSTS" className="h-full">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <Metric
                    label="TOTAL SPENT"
                    value={`$${llmStats.totalUsd.toFixed(4)}`}
                    size="lg"
                  />
                  <Metric label="API CALLS" value={llmStats.calls.toString()} size="lg" />
                </div>
                <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs">
                  <div className="text-hud-text-dim">
                    TOKENS IN{' '}
                    <span className="text-hud-text">{llmStats.tokensIn.toLocaleString()}</span>
                  </div>
                  <div className="text-hud-text-dim">
                    TOKENS OUT{' '}
                    <span className="text-hud-text">{llmStats.tokensOut.toLocaleString()}</span>
                  </div>
                  <div className="text-hud-text-dim">
                    AVG COST/CALL{' '}
                    <span className="text-hud-text">
                      {llmStats.calls > 0
                        ? `$${(llmStats.totalUsd / llmStats.calls).toFixed(6)}`
                        : '$0'}
                    </span>
                  </div>
                  <div className="text-hud-text-dim">
                    MODEL{' '}
                    <span className="text-hud-text">
                      {config?.llmModel?.split('/')[1] || 'kimi-k2.5'}
                    </span>
                  </div>
                </div>
              </div>
            </Panel>
          </div>

          {/* Row 2: Portfolio Performance Chart */}
          <div className="col-span-4 md:grid-cols-8 lg:col-span-8">
            <Panel title="PORTFOLIO PERFORMANCE" titleRight="24H" className="h-[320px]">
              {portfolioHistory.isLoading ? (
                <div className="h-full flex items-center justify-center text-hud-text-dim">
                  Loading chart data...
                </div>
              ) : portfolioHistory.hasHistory ? (
                <div className="h-full w-full">
                  <LineChart
                    series={[
                      {
                        label: 'Equity',
                        data: portfolioHistory.data,
                        variant:
                          portfolioHistory.data[portfolioHistory.data.length - 1] >=
                          portfolioHistory.data[0]
                            ? 'green'
                            : 'red',
                      },
                    ]}
                    labels={portfolioHistory.labels}
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
          </div>

          {/* Position Performance Panel */}
          <div className="col-span-4 md:col-span-8 lg:col-span-4">
            <Panel title="POSITION PERFORMANCE" titleRight="% CHANGE" className="h-[320px]">
              {positions.length === 0 ? (
                <div className="h-full flex items-center justify-center text-hud-text-dim text-sm">
                  No positions to display
                </div>
              ) : normalizedPositionSeries.length > 0 ? (
                <div className="h-full flex flex-col">
                  {/* Legend */}
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
                  {/* Stacked chart */}
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
          </div>

          {/* Row 3: Signals */}
          <div className="col-span-4 md:col-span-4 lg:col-span-4">
            <Panel title="ACTIVE SIGNALS" titleRight={signals.length.toString()} className="h-80">
              <div className="overflow-y-auto h-full space-y-1">
                {signals.length === 0 ? (
                  <div className="text-hud-text-dim text-sm py-4 text-center">
                    Gathering signals...
                  </div>
                ) : (
                  signals.slice(0, 20).map((signal, i) => (
                    <Tooltip
                      key={`${signal._id}-${i}`}
                      position="right"
                      content={
                        <TooltipContent
                          title={`${signal.symbol} - ${(signal.source || 'Unknown').toUpperCase()}`}
                          items={[
                            {
                              label: 'Sentiment',
                              value: `${((signal.sentiment || 0) * 100).toFixed(0)}%`,
                              color: getSentimentColor(signal.sentiment || 0),
                            },
                            { label: 'Volume', value: signal.volume ?? 'N/A' },
                            ...(signal.bullish !== undefined
                              ? [
                                  {
                                    label: 'Bullish',
                                    value: signal.bullish,
                                    color: 'text-hud-success',
                                  },
                                ]
                              : []),
                            ...(signal.bearish !== undefined
                              ? [
                                  {
                                    label: 'Bearish',
                                    value: signal.bearish,
                                    color: 'text-hud-error',
                                  },
                                ]
                              : []),
                            ...(signal.score !== undefined
                              ? [{ label: 'Score', value: signal.score }]
                              : []),
                            ...(signal.upvotes !== undefined
                              ? [{ label: 'Upvotes', value: signal.upvotes }]
                              : []),
                            ...(signal.momentum !== undefined
                              ? [
                                  {
                                    label: 'Momentum',
                                    value: `${signal.momentum >= 0 ? '+' : ''}${signal.momentum.toFixed(2)}%`,
                                  },
                                ]
                              : []),
                            ...(signal.price !== undefined
                              ? [{ label: 'Price', value: formatCurrency(signal.price) }]
                              : []),
                          ]}
                          description={signal.reason}
                        />
                      }
                    >
                      <div className="flex items-center justify-between py-1 px-2 border-b border-hud-line/10 hover:bg-hud-line/10 cursor-help">
                        <div className="flex items-center gap-2">
                          {signal.isCrypto && <span className="text-hud-warning text-xs">₿</span>}
                          <span className="hud-value-sm">{signal.symbol}</span>
                          <span
                            className={`hud-label ${signal.isCrypto ? 'text-hud-warning' : ''}`}
                          >
                            {(signal.source || 'Unknown').toUpperCase()}
                          </span>
                        </div>
                        <div className="flex items-center gap-3">
                          {signal.isCrypto && signal.momentum !== undefined ? (
                            <span
                              className={`hud-label hidden sm:inline ${signal.momentum >= 0 ? 'text-hud-success' : 'text-hud-error'}`}
                            >
                              {signal.momentum >= 0 ? '+' : ''}
                              {signal.momentum.toFixed(1)}%
                            </span>
                          ) : (
                            <span className="hud-label hidden sm:inline">
                              VOL {signal.volume ?? 'N/A'}
                            </span>
                          )}
                          <span
                            className={`hud-value-sm ${getSentimentColor(signal.sentiment || 0)}`}
                          >
                            {((signal.sentiment || 0) * 100).toFixed(0)}%
                          </span>
                        </div>
                      </div>
                    </Tooltip>
                  ))
                )}
              </div>
            </Panel>
          </div>

          {/* Activity Feed */}
          <div className="col-span-4 md:col-span-4 lg:col-span-4">
            <Panel title="ACTIVITY FEED" titleRight="LIVE" className="h-80">
              <div className="overflow-y-auto h-full font-mono text-xs space-y-1">
                {logs.length === 0 ? (
                  <div className="text-hud-text-dim py-4 text-center">Waiting for activity...</div>
                ) : (
                  logs.slice(-50).map((log, i) => (
                    <div
                      key={`${log._id}-${i}`}
                      className="flex items-start gap-2 py-1 border-b border-hud-line/10"
                    >
                      <span className="text-hud-text-dim shrink-0 hidden sm:inline w-[52px]">
                        {new Date(log.timestamp || Date.now()).toLocaleTimeString('en-US', {
                          hour12: false,
                        })}
                      </span>
                      <span
                        className={`shrink-0 w-[72px] text-right ${getAgentColor(log.agent ?? 'unknown')}`}
                      >
                        {log.agent ?? 'unknown'}
                      </span>
                      <span className="text-hud-text flex-1 text-right wrap-break-word">
                        {formatAction(log.action ?? 'unknown', log.detailsJson)}
                        {log.symbol && (
                          <span className="text-hud-primary ml-1">({log.symbol})</span>
                        )}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </Panel>
          </div>

          {/* Signal Research Panel */}
          <div className="col-span-4 md:col-span-8 lg:col-span-4">
            <Panel
              title="SIGNAL RESEARCH"
              titleRight={Object.keys(signalResearch).length.toString()}
              className="h-80"
            >
              <div className="overflow-y-auto h-full space-y-2">
                {Object.entries(signalResearch).length === 0 ? (
                  <div className="text-hud-text-dim text-sm py-4 text-center">
                    Researching candidates...
                  </div>
                ) : (
                  Object.entries(signalResearch).map(([symbol, research]) => (
                    <Tooltip
                      key={symbol}
                      position="left"
                      content={
                        <div className="space-y-2 min-w-[200px]">
                          <div className="hud-label text-hud-primary border-b border-hud-line/50 pb-1">
                            {symbol} DETAILS
                          </div>
                          <div className="space-y-1">
                            <div className="flex justify-between">
                              <span className="text-hud-text-dim">Confidence</span>
                              <span className="text-hud-text-bright">
                                {((research.confidence || 0) * 100).toFixed(0)}%
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-hud-text-dim">Sentiment</span>
                              <span className={getSentimentColor(research.sentiment || 0)}>
                                {((research.sentiment || 0) * 100).toFixed(0)}%
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-hud-text-dim">Quality</span>
                              <span
                                className={`hud-label ${getQualityColor(research.entryQuality)}`}
                              >
                                {(research.entryQuality || 'fair').toUpperCase()}
                              </span>
                            </div>
                          </div>
                          {research.catalysts && research.catalysts.length > 0 && (
                            <div>
                              <div className="hud-label text-hud-text-dim mb-1">CATALYSTS</div>
                              <div className="space-y-1">
                                {research.catalysts.slice(0, 2).map((catalyst) => (
                                  <div key={`${symbol}-catalyst-${catalyst}`} className="text-xs">
                                    - {catalyst.slice(0, 40)}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          {research.redFlags && research.redFlags.length > 0 && (
                            <div>
                              <div className="hud-label text-hud-error mb-1">RED FLAGS</div>
                              <div className="space-y-1">
                                {research.redFlags.slice(0, 2).map((flag) => (
                                  <div
                                    key={`${symbol}-flag-${flag}`}
                                    className="text-xs text-hud-error"
                                  >
                                    - {flag.slice(0, 40)}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      }
                    >
                      <div className="p-2 border border-hud-line/30 rounded hover:border-hud-line/60 cursor-help transition-colors">
                        <div className="flex justify-between items-center mb-1">
                          <span className="hud-value-sm">{symbol}</span>
                          <div className="flex items-center gap-2">
                            <span className={`hud-label ${getQualityColor(research.entryQuality)}`}>
                              {(research.entryQuality || 'fair').toUpperCase()}
                            </span>
                            <span
                              className={`hud-value-sm font-bold ${getVerdictColor(research.verdict)}`}
                            >
                              {research.verdict || 'HOLD'}
                            </span>
                          </div>
                        </div>
                        <p className="text-xs text-hud-text-dim leading-tight mb-1">
                          {research.reasoning || 'Analyzing market conditions...'}
                        </p>
                        {research.redFlags && research.redFlags.length > 0 && (
                          <div className="flex flex-wrap gap-1">
                            {research.redFlags.slice(0, 2).map((flag: string) => (
                              <span
                                key={`flag-${symbol}-${flag.slice(0, 20)}`}
                                className="text-xs text-hud-error bg-hud-error/10 px-1 rounded"
                              >
                                {flag.slice(0, 30)}...
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </Tooltip>
                  ))
                )}
              </div>
            </Panel>
          </div>
        </div>

        {/* Footer */}
        <footer className="mt-4 pt-3 border-t border-hud-line flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div className="flex flex-wrap gap-4 md:gap-6">
            {config && (
              <>
                <MetricInline label="MAX POS" value={`$${config.maxPositionValue}`} />
                <MetricInline
                  label="MIN SENT"
                  value={`${(config.minSentimentScore * 100).toFixed(0)}%`}
                />
                <MetricInline label="TAKE PROFIT" value={`${config.takeProfitPct}%`} />
                <MetricInline label="STOP LOSS" value={`${config.stopLossPct}%`} />
                <span className="hidden lg:inline text-hud-line">|</span>
                <MetricInline
                  label="OPTIONS"
                  value={config.optionsEnabled ? 'ON' : 'OFF'}
                  valueClassName={config.optionsEnabled ? 'text-hud-purple' : 'text-hud-text-dim'}
                />
                {config.optionsEnabled && (
                  <>
                    <MetricInline
                      label="OPT Δ"
                      value={(config.optionsTargetDelta ?? 0.35).toFixed(2)}
                    />
                    <MetricInline
                      label="OPT DTE"
                      value={`${config.optionsMinDte ?? 7}-${config.optionsMaxDte ?? 45}`}
                    />
                  </>
                )}
                <span className="hidden lg:inline text-hud-line">|</span>
                <MetricInline
                  label="CRYPTO"
                  value={config.cryptoEnabled ? '24/7' : 'OFF'}
                  valueClassName={config.cryptoEnabled ? 'text-hud-warning' : 'text-hud-text-dim'}
                />
                {config.cryptoEnabled && (
                  <MetricInline
                    label="SYMBOLS"
                    value={(config.cryptoSymbols || ['BTC', 'ETH', 'SOL'])
                      .map((symbol) => symbol.split('/')[0])
                      .join('/')}
                  />
                )}
              </>
            )}
          </div>
          <div className="flex items-center gap-4">
            <span className="hud-label hidden md:inline">AUTONOMOUS TRADING SYSTEM</span>
            <span className="hud-value-sm">PAPER MODE</span>
          </div>
        </footer>

        <SettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          config={config}
          onSave={handleSaveConfig}
        />
      </div>
    </div>
  )
}
