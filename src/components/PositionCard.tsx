import type { Position } from '../types'
import type { ThemeColors } from '../lib/theme'

interface PositionCardProps {
  position: Position
  balance: number
  theme: ThemeColors
}

export function PositionCard({ position, balance, theme }: PositionCardProps) {
  const isDark = theme.bg === '#0a0a0a'
  const sideColor = position.side === 'long' ? 'text-green-500' : 'text-red-500'
  const sideBg = position.side === 'long' ? 'bg-green-500/10' : 'bg-red-500/10'
  const sideBorder = position.side === 'long' ? 'border-green-500/20' : 'border-red-500/20'
  const pnlColor = position.unrealizedPnl >= 0 ? 'text-green-400' : 'text-red-400'
  const pnlBarPct = Math.min(Math.abs(position.unrealizedPnl) / (position.margin * 5) * 100, 100)

  return (
    <div className={`rounded-xl px-4 py-3 border ${sideBorder}`} style={{ backgroundColor: isDark ? 'rgba(23,23,23,0.9)' : 'rgba(255,255,255,0.95)', backdropFilter: 'blur(8px)' }}>
      {/* Header row: side badge + PnL */}
      <div className="flex justify-between items-center mb-2">
        <div className="flex items-center gap-2">
          <span className={`${sideColor} ${sideBg} px-2 py-0.5 rounded-md text-xs font-bold uppercase tracking-wider`}>
            {position.side}
          </span>
          <span className="text-white/30 text-xs font-mono">
            ×5
          </span>
        </div>
        <div className={`${pnlColor} font-mono text-sm font-bold`}>
          {position.unrealizedPnl >= 0 ? '+' : ''}{position.unrealizedPnl.toFixed(2)}
        </div>
      </div>

      {/* PnL mini-bar */}
      <div className="w-full h-1 bg-neutral-800 rounded-full mb-2.5 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            position.unrealizedPnl >= 0 ? 'bg-green-500' : 'bg-red-500'
          }`}
          style={{ width: `${Math.min(pnlBarPct, 100)}%` }}
        />
      </div>

      {/* Price details */}
      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs font-mono">
        <div className="flex justify-between">
          <span style={{ color: theme.textMuted }}>Entry</span>
          <span style={{ color: theme.text }}>${position.entryPrice.toFixed(1)}</span>
        </div>
        <div className="flex justify-between">
          <span style={{ color: theme.textMuted }}>Mark</span>
          <span style={{ color: theme.text }}>${position.currentPrice.toFixed(1)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-red-400/50">SL</span>
          <span className="text-red-400/70">${position.sl.toFixed(1)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-green-400/50">TP</span>
          <span className="text-green-400/70">${position.tp.toFixed(1)}</span>
        </div>
      </div>

      {/* Margin row */}
      <div className="flex justify-between text-[10px] mt-2 pt-2 font-mono" style={{ color: theme.textMuted, borderTop: `1px solid ${theme.textMuted}22` }}>
        <span>Margin ${position.margin.toFixed(2)}</span>
        <span>Binance ${balance.toFixed(2)}</span>
        <span>Size ${(position.margin * 5).toFixed(2)}</span>
      </div>
    </div>
  )
}
