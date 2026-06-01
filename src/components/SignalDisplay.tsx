import type { Regime, MCResult } from '../types'

interface SignalDisplayProps {
  bias: string
  regime: Regime
  rawRegime: string
  session: string
  directions: Record<string, string>
  alignmentScore: number
  connected: boolean
  mcResult: MCResult | null
}

const BIAS_COLORS: Record<string, string> = {
  long: '#26a69a',
  short: '#ef5350',
  'watch-only': '#ffd166',
}

const DIR_COLORS: Record<string, string> = {
  bullish: '#26a69a',
  bearish: '#ef5350',
  sideways: '#ffd166',
  trending: '#888',
  ranging: '#888',
}

export function SignalDisplay({ bias, regime, rawRegime, session, directions, alignmentScore, connected, mcResult }: SignalDisplayProps) {
  const biasColor = BIAS_COLORS[bias] || '#666'
  const biasLabel = bias === 'watch-only' ? 'WATCH' : (bias || 'WATCH').toUpperCase()

  // Build TF chips sorted by timeframe size
  const tfOrder = ['4H', '1H', '15M']
  const tfChips = tfOrder.filter(tf => directions[tf])

  return (
    <div className="absolute top-10 left-3 z-20 pointer-events-none select-none">
      {/* Bias — big, the main signal */}
      <div className="flex items-center gap-2 mb-1.5">
        <span
          className="text-xl font-bold font-mono tracking-widest"
          style={{ color: biasColor }}
        >
          {biasLabel}
        </span>
        <span className="text-[10px] text-white/30 font-mono">
          {session}
        </span>
      </div>

      {/* Multi-TF alignment chips */}
      <div className="flex items-center gap-1.5 mb-1">
        {tfChips.map(tf => {
          const dir = directions[tf]
          return (
            <span
              key={tf}
              className="text-[9px] font-mono font-semibold px-1 py-0.5 rounded-sm uppercase tracking-wider"
              style={{
                color: DIR_COLORS[dir] || '#666',
                backgroundColor: (DIR_COLORS[dir] || '#666') + '15',
              }}
            >
              {tf} {dir === 'bullish' ? '▲' : dir === 'bearish' ? '▼' : '--'}
            </span>
          )
        })}
      </div>

      {/* Raw regime + confidence bar */}
      <div className="flex items-center gap-2">
        <span className="text-[9px] text-white/25 font-mono uppercase tracking-wider">
          {rawRegime}
        </span>
        <div className="w-12 h-1 rounded-full bg-white/10 overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${Math.round(alignmentScore * 100)}%`,
              backgroundColor: biasColor,
            }}
          />
        </div>
        <span className="text-[9px] text-white/25 font-mono">
          {Math.round(alignmentScore * 100)}%
        </span>
      </div>

      {/* MC projection stats */}
      {mcResult && (
        <div className="flex items-center gap-2 mt-1.5">
          <span className="text-[9px] text-[#f0883e] font-mono">
            MC σ {mcResult.annVol.toFixed(0)}%
          </span>
          <span className="text-[9px] text-[#8b949e] font-mono">
            E[close] ${mcResult.expectedClose.toFixed(0)}
          </span>
          <span className="text-[9px] font-mono">
            <span className="text-[#26a69a]">↑{(mcResult.probUp * 100).toFixed(0)}%</span>
            {' / '}
            <span className="text-[#ef5350]">↓{((1 - mcResult.probUp) * 100).toFixed(0)}%</span>
          </span>
        </div>
      )}

      {/* Connection indicator */}
      <div className="flex items-center gap-1 mt-1">
        <span
          className={`inline-block w-1 h-1 rounded-full ${connected ? 'bg-[#26a69a]' : 'bg-[#ef5350]'}`}
        />
        <span className="text-[8px] text-white/20 font-mono">
          {connected ? 'signal live' : 'disconnected'}
        </span>
      </div>
    </div>
  )
}
