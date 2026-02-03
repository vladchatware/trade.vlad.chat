import { MetricInline } from '@/app/components/Metric'

import type { Config } from '../types'

export function FooterBar({ config }: { config: Config }) {
  return (
    <footer className="mt-4 pt-3 border-t border-hud-line flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
      <div className="flex flex-wrap gap-4 md:gap-6">
        <MetricInline label="MAX POS" value={`$${config.maxPositionValue}`} />
        <MetricInline label="MIN SENT" value={`${(config.minSentimentScore * 100).toFixed(0)}%`} />
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
            <MetricInline label="OPT Δ" value={(config.optionsTargetDelta ?? 0.35).toFixed(2)} />
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
      </div>
      <div className="flex items-center gap-4">
        <span className="hud-label hidden md:inline">AUTONOMOUS TRADING SYSTEM</span>
        <span className="hud-value-sm">PAPER MODE</span>
      </div>
    </footer>
  )
}
