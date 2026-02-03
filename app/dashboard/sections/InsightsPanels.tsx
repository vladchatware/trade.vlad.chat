import { Panel } from '@/app/components/Panel'
import { Tooltip, TooltipContent } from '@/app/components/Tooltip'

import type { LogRow, SignalResearch, SignalRow } from '../types'
import {
  formatAction,
  formatCurrency,
  getAgentColor,
  getQualityColor,
  getSentimentColor,
  getVerdictColor,
} from '../utils'

export function SignalsPanel({ signals }: { signals: SignalRow[] }) {
  return (
    <Panel title="ACTIVE SIGNALS" titleRight={signals.length.toString()} className="h-80">
      <div className="overflow-y-auto h-full space-y-1">
        {signals.length === 0 ? (
          <div className="text-hud-text-dim text-sm py-4 text-center">Gathering signals...</div>
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
                  <span className={`hud-label ${signal.isCrypto ? 'text-hud-warning' : ''}`}>
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
                    <span className="hud-label hidden sm:inline">VOL {signal.volume ?? 'N/A'}</span>
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
  return (
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
                {log.symbol && <span className="text-hud-primary ml-1">({log.symbol})</span>}
              </span>
            </div>
          ))
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
  const entries = Object.entries(signalResearch)

  return (
    <Panel title="SIGNAL RESEARCH" titleRight={entries.length.toString()} className="h-80">
      <div className="overflow-y-auto h-full space-y-2">
        {entries.length === 0 ? (
          <div className="text-hud-text-dim text-sm py-4 text-center">
            Researching candidates...
          </div>
        ) : (
          entries.map(([symbol, research]) => (
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
