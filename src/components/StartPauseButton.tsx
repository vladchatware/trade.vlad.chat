import type { Regime } from '../types'

interface StartPauseButtonProps {
  isRunning: boolean
  onToggle: () => void
  signalConnected?: boolean
  regime?: Regime
  alignmentScore?: number
}

const REGIME_COLORS: Record<Regime, string> = {
  bullish: '#26a69a',
  bearish: '#ef5350',
  sideways: '#ffd166',
}

export function StartPauseButton({ isRunning, onToggle, signalConnected, regime, alignmentScore }: StartPauseButtonProps) {
  return (
    <div className="flex flex-col items-center gap-1">
      <button
        onClick={onToggle}
        className={[
          'px-4 py-2 text-sm font-semibold rounded-full transition-colors border uppercase tracking-widest',
          isRunning
            ? 'bg-red-500/10 text-red-400 border-red-500/30 hover:bg-red-500/20'
            : 'bg-green-500/10 text-green-400 border-green-500/30 hover:bg-green-500/20',
        ].join(' ')}
      >
        {isRunning ? '⏸ Pause' : '▶ Start'}
      </button>

      {/* Signal status bar — always visible */}
      <div className="flex items-center gap-2 text-[9px] uppercase tracking-widest">
        <span className={`flex items-center gap-1 ${signalConnected ? 'text-[#26a69a]' : 'text-[#ef5350]'}`}>
          <span className={`w-1.5 h-1.5 rounded-full ${signalConnected ? 'bg-[#26a69a]' : 'bg-[#ef5350]'}`} />
          {signalConnected ? 'Live' : 'Disconnected'}
        </span>
        {regime && (
          <span style={{ color: REGIME_COLORS[regime] }}>
            {regime.toUpperCase()}
          </span>
        )}
        {alignmentScore !== undefined && (
          <span className="text-[#666]">
            {Math.round(alignmentScore * 100)}%
          </span>
        )}
      </div>
    </div>
  )
}
