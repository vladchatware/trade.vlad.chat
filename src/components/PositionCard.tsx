import type { Position } from '../types'

interface PositionCardProps {
  position: Position
  balance: number
}

export function PositionCard({ position, balance }: PositionCardProps) {
  const sideColor = position.side === 'long' ? 'text-green-500' : 'text-red-500'
  const sideBg = position.side === 'long' ? 'bg-green-500/10' : 'bg-red-500/10'
  const sideBorder = position.side === 'long' ? 'border-green-500/20' : 'border-red-500/20'
  const pnlColor = position.unrealizedPnl >= 0 ? 'text-green-400' : 'text-red-400'
  const pnlBarPct = Math.min(Math.abs(position.unrealizedPnl) / (position.margin * 5) * 100, 100)

  return (
    <div className={`bg-neutral-900/90 backdrop-blur rounded-xl px-4 py-3 border ${sideBorder}`}>
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
          <span className="text-white/30">Entry</span>
          <span className="text-white/70">${position.entryPrice.toFixed(1)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-white/30">Mark</span>
          <span className="text-white/70">${position.currentPrice.toFixed(1)}</span>
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
      <div className="flex justify-between text-[10px] text-white/20 mt-2 pt-2 border-t border-white/5 font-mono">
        <span>Margin ${position.margin.toFixed(2)}</span>
        <span>Bal ${balance.toFixed(2)}</span>
        <span>Size ${(position.margin * 5).toFixed(2)}</span>
      </div>
    </div>
  )
}
