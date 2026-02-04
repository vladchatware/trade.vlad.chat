import { useMemo, useState } from 'react'

import { Panel } from '@/app/components/Panel'
import { Tooltip, TooltipContent } from '@/app/components/Tooltip'

import { isGoodSignalResearch } from '../researchFilters'
import type { LogRow, SignalResearch, SignalRow } from '../types'
import {
  formatAction,
  formatCurrency,
  formatPercent,
  getAgentColor,
  getQualityColor,
  getSentimentColor,
  getVerdictColor,
} from '../utils'

export function SignalsPanel({ signals }: { signals: SignalRow[] }) {
  const [showBullishOnly, setShowBullishOnly] = useState(false)
  const uniqueSignals = useMemo(() => {
    const seen = new Set<string>()
    const deduped: SignalRow[] = []

    for (const signal of signals) {
      if (seen.has(signal.symbol)) continue
      seen.add(signal.symbol)
      deduped.push(signal)
    }

    return deduped
  }, [signals])

  const filteredSignals = useMemo(
    () =>
      showBullishOnly
        ? uniqueSignals.filter((signal) => (signal.sentiment || 0) >= 0.2)
        : uniqueSignals,
    [showBullishOnly, uniqueSignals]
  )
  const showSourceColumn =
    filteredSignals.length <= 1 ||
    new Set(filteredSignals.map((signal) => (signal.source || 'Unknown').toUpperCase())).size > 1
  const showVolumeColumn =
    filteredSignals.length <= 1 ||
    new Set(filteredSignals.map((signal) => signal.volume ?? 'N/A')).size > 1

  return (
    <Panel
      title="ACTIVE SIGNALS"
      titleRight={
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={`hud-label border px-2 py-0.5 rounded transition-colors ${
              showBullishOnly
                ? 'text-hud-success border-hud-success/40 bg-hud-success/10'
                : 'text-hud-text-dim border-hud-line/40 hover:text-hud-text'
            }`}
            onClick={() => setShowBullishOnly((value) => !value)}
          >
            BULLISH ONLY
          </button>
          <span className="hud-value-sm">
            {filteredSignals.length}/{uniqueSignals.length}
          </span>
        </div>
      }
      className="h-80"
    >
      <div className="overflow-y-auto h-full space-y-1">
        {uniqueSignals.length === 0 ? (
          <div className="text-hud-text-dim text-sm py-4 text-center">Gathering signals...</div>
        ) : filteredSignals.length === 0 ? (
          <div className="text-hud-text-dim text-sm py-4 text-center">
            No bullish signals in current feed.
          </div>
        ) : (
          filteredSignals.slice(0, 20).map((signal, i) => (
            <Tooltip
              key={signal._id || `${signal.symbol}-${i}`}
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
                      ? [{ label: 'Bullish', value: signal.bullish, color: 'text-hud-success' }]
                      : []),
                    ...(signal.bearish !== undefined
                      ? [{ label: 'Bearish', value: signal.bearish, color: 'text-hud-error' }]
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
                  {showSourceColumn && (
                    <span className={`hud-label ${signal.isCrypto ? 'text-hud-warning' : ''}`}>
                      {(signal.source || 'Unknown').toUpperCase()}
                    </span>
                  )}
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
                    showVolumeColumn && (
                      <span className="hud-label hidden sm:inline">
                        VOL {signal.volume ?? 'N/A'}
                      </span>
                    )
                  )}
                  <span className={`hud-value-sm ${getSentimentColor(signal.sentiment || 0)}`}>
                    {((signal.sentiment || 0) * 100).toFixed(0)}%
                  </span>
                </div>
              </div>
            </Tooltip>
          ))
        )}
      </div>
    </Panel>
  )
}

export function ActivityFeedPanel({ logs }: { logs: LogRow[] }) {
  const parseDetails = (detailsJson?: string): Record<string, unknown> | null => {
    if (!detailsJson) return null
    try {
      const parsed = JSON.parse(detailsJson)
      return parsed && typeof parsed === 'object' ? (parsed as Record<string, unknown>) : null
    } catch {
      return null
    }
  }

  const humanizeToken = (value: string) =>
    value.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())

  const getOutcome = (
    action: string,
    details: Record<string, unknown> | null
  ): { value: string; color: string } => {
    if (typeof details?.reason === 'string') {
      const isFailure =
        action.includes('failed') ||
        details.reason.toLowerCase().includes('reject') ||
        details.reason.toLowerCase().includes('invalid')
      return {
        value: humanizeToken(details.reason),
        color: isFailure ? 'text-hud-error' : 'text-hud-warning',
      }
    }

    if (action === 'decision_cycle_start' && typeof details?.positions === 'number') {
      const maxPositions =
        typeof details.maxPositions === 'number' ? `/${details.maxPositions}` : ''
      return {
        value: `Scanning Positions ${details.positions}${maxPositions}`,
        color: 'text-hud-primary',
      }
    }

    if (action.includes('failed')) return { value: 'Order Failed', color: 'text-hud-error' }
    if (action.includes('submitted')) return { value: 'Order Submitted', color: 'text-hud-success' }
    if (action.includes('closed')) return { value: 'Position Closed', color: 'text-hud-success' }
    if (action === 'take_profit')
      return { value: 'Take Profit Triggered', color: 'text-hud-success' }
    if (action === 'stop_loss') return { value: 'Stop Loss Triggered', color: 'text-hud-error' }
    if (action === 'decision_no_candidate')
      return { value: 'No Candidate Found', color: 'text-hud-warning' }

    return { value: humanizeToken(action), color: 'text-hud-text-bright' }
  }

  const tooltipItems = (log: LogRow, details: Record<string, unknown> | null) => {
    const action = log.action ?? 'unknown'
    const outcome = getOutcome(action, details)
    const items: Array<{ label: string; value: string | number; color?: string }> = [
      { label: 'Outcome', value: outcome.value, color: outcome.color },
      { label: 'Action', value: action },
    ]

    if (typeof details?.reason === 'string')
      items.push({ label: 'Reason', value: humanizeToken(details.reason) })
    if (typeof details?.orderId === 'string')
      items.push({ label: 'Order ID', value: details.orderId })
    if (typeof details?.previewId === 'string')
      items.push({ label: 'Preview', value: details.previewId })
    if (typeof details?.plPct === 'number')
      items.push({ label: 'P/L', value: formatPercent(details.plPct) })
    if (typeof details?.sentiment === 'number')
      items.push({ label: 'Sentiment', value: `${(details.sentiment * 100).toFixed(0)}%` })
    if (typeof details?.volume === 'number') items.push({ label: 'Volume', value: details.volume })
    if (typeof details?.price === 'number')
      items.push({ label: 'Price', value: formatCurrency(details.price) })
    if (typeof details?.estimatedPrice === 'number')
      items.push({ label: 'Est. Price', value: formatCurrency(details.estimatedPrice) })
    if (typeof details?.positionSize === 'number')
      items.push({ label: 'Position Size', value: formatCurrency(details.positionSize) })

    return items
  }

  return (
    <Panel title="ACTIVITY FEED" titleRight="LIVE" className="h-80">
      <div className="overflow-y-auto h-full font-mono text-xs space-y-1">
        {logs.length === 0 ? (
          <div className="text-hud-text-dim py-4 text-center">Waiting for activity...</div>
        ) : (
          logs.slice(-50).map((log, i) => {
            const details = parseDetails(log.detailsJson)
            const timestamp = new Date(log.timestamp || Date.now()).toLocaleTimeString('en-US', {
              hour12: false,
            })

            return (
              <Tooltip
                key={`${log._id}-${i}`}
                position="left"
                wrapperClassName="block"
                content={
                  <TooltipContent
                    title={`${log.agent ?? 'unknown'} · ${timestamp}`}
                    items={tooltipItems(log, details)}
                  />
                }
              >
                <div className="flex items-start gap-2 py-1 border-b border-hud-line/10 hover:bg-hud-line/10 cursor-help">
                  <span className="text-hud-text-dim shrink-0 hidden sm:inline w-[52px]">
                    {timestamp}
                  </span>
                  <span
                    className={`shrink-0 w-[72px] text-right ${getAgentColor(log.agent ?? 'unknown')}`}
                  >
                    {log.agent ?? 'unknown'}
                  </span>
                  <span className="text-hud-text flex-1 text-right wrap-break-word">
                    {formatAction(log.action ?? 'unknown', log.detailsJson)}
                    {log.symbol && <span className="text-hud-primary ml-1">({log.symbol})</span>}
                  </span>
                </div>
              </Tooltip>
            )
          })
        )}
      </div>
    </Panel>
  )
}

export function SignalResearchPanel({
  signalResearch,
}: {
  signalResearch: Record<string, SignalResearch>
}) {
  const [showGoodOnly, setShowGoodOnly] = useState(false)
  const entries = Object.entries(signalResearch)
  const filteredEntries = useMemo(
    () =>
      showGoodOnly ? entries.filter(([, research]) => isGoodSignalResearch(research)) : entries,
    [entries, showGoodOnly]
  )

  return (
    <Panel
      title="SIGNAL RESEARCH"
      titleRight={
        <div className="flex items-center gap-2">
          <button
            type="button"
            className={`hud-label border px-2 py-0.5 rounded transition-colors ${
              showGoodOnly
                ? 'text-hud-success border-hud-success/40 bg-hud-success/10'
                : 'text-hud-text-dim border-hud-line/40 hover:text-hud-text'
            }`}
            onClick={() => setShowGoodOnly((value) => !value)}
          >
            GOOD ONLY
          </button>
          <span className="hud-value-sm">
            {filteredEntries.length}/{entries.length}
          </span>
        </div>
      }
      className="h-80"
    >
      <div className="overflow-y-auto h-full space-y-2">
        {entries.length === 0 ? (
          <div className="text-hud-text-dim text-sm py-4 text-center">
            Researching candidates...
          </div>
        ) : filteredEntries.length === 0 ? (
          <div className="text-hud-text-dim text-sm py-4 text-center">
            No good signals in current research.
          </div>
        ) : (
          filteredEntries.map(([symbol, research]) => (
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
                      <span className={`hud-label ${getQualityColor(research.entryQuality)}`}>
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
                          <div key={`${symbol}-flag-${flag}`} className="text-xs text-hud-error">
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
                    <span className={`hud-value-sm font-bold ${getVerdictColor(research.verdict)}`}>
                      {research.verdict || 'HOLD'}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-hud-text-dim leading-tight mb-1">
                  {research.reasoning || 'Analyzing market conditions...'}
                </p>
                {research.redFlags && research.redFlags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {research.redFlags.slice(0, 2).map((flag) => (
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
  )
}
