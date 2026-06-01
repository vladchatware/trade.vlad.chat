import type { Regime } from '../types'

interface RegimeBannerProps {
  regime: Regime
  connected?: boolean
}

const regimeConfig: Record<Regime, { label: string; color: string; bg: string }> = {
  bullish: { label: 'BULLISH', color: '#26a69a', bg: '#26a69a20' },
  bearish: { label: 'BEARISH', color: '#ef5350', bg: '#ef535020' },
  sideways: { label: 'SIDEWAYS', color: '#ffd166', bg: '#ffd16620' },
}

export function RegimeBanner({ regime, connected }: RegimeBannerProps) {
  const config = regimeConfig[regime]
  return (
    <div
      className="flex items-center justify-center gap-2 py-1.5 text-xs font-semibold tracking-widest uppercase"
      style={{ backgroundColor: config.bg, color: config.color }}
    >
      <span>{config.label}</span>
      {connected !== undefined && (
        <span
          className={`inline-block w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-500' : 'bg-red-500'}`}
          title={connected ? 'Signal connected' : 'Signal disconnected'}
        />
      )}
    </div>
  )
}
