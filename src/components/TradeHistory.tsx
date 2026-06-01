import { useState } from 'react'
import type { TradeRecord } from '../types'
import type { ThemeColors } from '../lib/theme'

interface TradeHistoryProps {
  trades: TradeRecord[]
  theme: ThemeColors
}

export function TradeHistory({ trades, theme }: TradeHistoryProps) {
  const [open, setOpen] = useState(false)

  // Merge strategy + PWA trades sorted by closedAt desc
  const sorted = [...trades].sort((a, b) => b.closedAt - a.closedAt)

  if (sorted.length === 0) return null

  const strategyCount = trades.filter(t => t.source === 'strategy').length
  const pwaCount = trades.filter(t => t.source !== 'strategy').length

  return (
    <div className="absolute left-2 bottom-20 z-30">
      {/* Toggle button */}
      <button
        onClick={() => setOpen(o => !o)}
        className="text-[10px] tracking-widest uppercase px-2 py-1 rounded-md transition-colors font-mono"
        style={{
          color: theme.textMuted,
          backgroundColor: theme.bg + '99',
        }}
      >
        {open ? '✕ Close' : `📋 ${sorted.length} trades`}
      </button>

      {/* History panel */}
      {open && (
        <div
          className="absolute bottom-8 left-0 w-[22rem] max-h-72 overflow-y-auto backdrop-blur rounded-xl border p-3 space-y-1"
          style={{
            backgroundColor: theme.bg + 'f2',
            borderColor: theme.border,
          }}
        >
          <div className="flex items-center justify-between text-[9px] tracking-widest uppercase mb-2" style={{ color: theme.textMuted }}>
            <span>Trade History</span>
            <span className="space-x-2">
              {pwaCount > 0 && <span className="text-green-500/60">{pwaCount} pwa</span>}
              {strategyCount > 0 && <span className="text-blue-400/60">{strategyCount} strat</span>}
            </span>
          </div>
          {sorted.map(t => (
            <TradeRow key={t.id} trade={t} />
          ))}
        </div>
      )}
    </div>
  )
}

function TradeRow({ trade }: { trade: TradeRecord }) {
  const isWin = trade.pnl >= 0
  const isStrategy = trade.source === 'strategy'
  const sideColor = trade.side === 'long' ? 'text-green-500' : 'text-red-500'

  const reasonLabel = {
    tap: 'M',
    sl: 'SL',
    tp: 'TP',
    liquidation: '💀',
  }[trade.reason]

  const time = new Date(trade.closedAt)
  const timeStr = time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

  return (
    <div className="flex items-center gap-1.5 text-[10px] font-mono leading-tight">
      {/* Source badge — blue for strategy, green for PWA */}
      <span className={`px-1 py-0.5 rounded text-[7px] font-bold tracking-wider ${
        isStrategy ? 'bg-blue-500/20 text-blue-400' : 'bg-green-500/20 text-green-400'
      }`}>
        {isStrategy ? 'S' : 'P'}
      </span>

      {/* Side badge */}
      <span className={`${sideColor} font-bold w-8 text-center`}>
        {trade.side === 'long' ? 'LONG' : 'SHRT'}
      </span>

      {/* Price — for strategy trades show single fill price, for PWA show entry→exit */}
      {isStrategy ? (
        <span className="text-white/60">
          ${trade.entryPrice || trade.exitPrice ? (trade.entryPrice || trade.exitPrice).toFixed(0) : '—'}
        </span>
      ) : (
        <>
          <span className="text-white/60">{trade.entryPrice.toFixed(0)}</span>
          <span className="text-white/20">→</span>
          <span className="text-white/60">{trade.exitPrice.toFixed(0)}</span>
        </>
      )}

      {/* PnL */}
      <span className={`${isWin ? 'text-green-400' : 'text-red-400'} font-bold text-right flex-1 min-w-[4rem]`}>
        {isWin ? '+' : ''}{trade.pnl.toFixed(2)}
      </span>

      {/* Reason badge */}
      {trade.reason !== 'tap' && (
        <span className={`px-1 py-0.5 rounded text-[8px] font-bold ${
          trade.reason === 'tp' ? 'bg-green-500/20 text-green-400' :
          trade.reason === 'sl' ? 'bg-red-500/20 text-red-400' :
          'bg-white/10 text-white/50'
        }`}>
          {reasonLabel}
        </span>
      )}

      {/* Time */}
      <span className="text-white/20">{timeStr}</span>
    </div>
  )
}
