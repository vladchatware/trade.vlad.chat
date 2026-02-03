import { LLM_MODELS } from '@/shared/llmCatalog'
import { withTradingConfigDefaults } from '@/shared/tradingConfig'
import { useEffect, useState } from 'react'
import { Panel } from './Panel'

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
  startingEquity?: number
  optionsEnabled?: boolean
  optionsMinConfidence?: number
  optionsMaxPctPerTrade?: number
  optionsMinDte?: number
  optionsMaxDte?: number
  optionsTargetDelta?: number
  optionsMaxPositions?: number
  optionsStopLossPct?: number
  optionsTakeProfitPct?: number
  cryptoEnabled?: boolean
  cryptoSymbols?: string[]
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

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  config: Config
  onSave: (config: Config) => void | Promise<void>
}

const normalizeConfig = (input: Config): Config => {
  const defaults = withTradingConfigDefaults()
  return {
    ...input,
    sellSentimentThreshold: input.sellSentimentThreshold ?? defaults.sellSentimentThreshold,
    dataPollIntervalMs: input.dataPollIntervalMs ?? defaults.dataPollIntervalMs,
    analystIntervalMs: input.analystIntervalMs ?? defaults.analystIntervalMs,
    llmAnalystModel: input.llmAnalystModel ?? defaults.llmAnalystModel,
    llmMaxTokens: input.llmMaxTokens ?? defaults.llmMaxTokens,
    startingEquity: input.startingEquity ?? defaults.startingEquity,
    optionsEnabled: input.optionsEnabled ?? defaults.optionsEnabled,
    optionsMinConfidence: input.optionsMinConfidence ?? defaults.optionsMinConfidence,
    optionsMaxPctPerTrade: input.optionsMaxPctPerTrade ?? defaults.optionsMaxPctPerTrade,
    optionsMinDte: input.optionsMinDte ?? defaults.optionsMinDte,
    optionsMaxDte: input.optionsMaxDte ?? defaults.optionsMaxDte,
    optionsTargetDelta: input.optionsTargetDelta ?? defaults.optionsTargetDelta,
    optionsMaxPositions: input.optionsMaxPositions ?? defaults.optionsMaxPositions,
    optionsStopLossPct: input.optionsStopLossPct ?? defaults.optionsStopLossPct,
    optionsTakeProfitPct: input.optionsTakeProfitPct ?? defaults.optionsTakeProfitPct,
    cryptoEnabled: input.cryptoEnabled ?? defaults.cryptoEnabled,
    cryptoSymbols: input.cryptoSymbols ?? defaults.cryptoSymbols,
    cryptoMomentumThreshold: input.cryptoMomentumThreshold ?? defaults.cryptoMomentumThreshold,
    cryptoMaxPositionValue: input.cryptoMaxPositionValue ?? defaults.cryptoMaxPositionValue,
    cryptoTakeProfitPct: input.cryptoTakeProfitPct ?? defaults.cryptoTakeProfitPct,
    cryptoStopLossPct: input.cryptoStopLossPct ?? defaults.cryptoStopLossPct,
    stalePositionEnabled: input.stalePositionEnabled ?? defaults.stalePositionEnabled,
    staleMaxHoldDays: input.staleMaxHoldDays ?? defaults.staleMaxHoldDays,
    staleMinGainPct: input.staleMinGainPct ?? defaults.staleMinGainPct,
    staleSocialVolumeDecay: input.staleSocialVolumeDecay ?? defaults.staleSocialVolumeDecay,
    staleNoMentionsHours: input.staleNoMentionsHours ?? defaults.staleNoMentionsHours,
  }
}

export function SettingsModal({ isOpen, onClose, config, onSave }: SettingsModalProps) {
  const [formData, setFormData] = useState<Config>(() => normalizeConfig(config))
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    setFormData(normalizeConfig(config))
  }, [config])

  const handleChange = (key: keyof Config, value: Config[keyof Config]) => {
    setFormData((prev) => ({ ...prev, [key]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(formData)
    } finally {
      setSaving(false)
    }
  }

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 bg-black/60 flex items-center justify-center z-50"
      // biome-ignore lint/a11y/noNoninteractiveTabindex: Allow keyboard dismissal of the modal overlay.
      tabIndex={0}
      onClick={onClose}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          onClose()
        }
      }}
    >
      <Panel
        title="TRADING CONFIGURATION"
        className="w-full max-w-2xl max-h-[90vh] overflow-auto"
        titleRight={
          <button type="button" onClick={onClose} className="hud-label hover:text-hud-primary">
            [ESC]
          </button>
        }
      >
        <div
          role="presentation"
          onClick={(event) => event.stopPropagation()}
          onKeyDown={(event) => event.stopPropagation()}
          className="space-y-6"
        >
          <div>
            <h3 className="hud-label mb-3 text-hud-primary">Position Limits</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="settings-max-position-value" className="hud-label block mb-1">
                  Max Position Value ($)
                </label>
                <input
                  id="settings-max-position-value"
                  type="number"
                  className="hud-input w-full"
                  value={formData.maxPositionValue}
                  onChange={(e) => handleChange('maxPositionValue', Number(e.target.value))}
                />
              </div>
              <div>
                <label htmlFor="settings-max-positions" className="hud-label block mb-1">
                  Max Positions
                </label>
                <input
                  id="settings-max-positions"
                  type="number"
                  className="hud-input w-full"
                  value={formData.maxPositions}
                  onChange={(e) => handleChange('maxPositions', Number(e.target.value))}
                />
              </div>
              <div>
                <label htmlFor="settings-position-size" className="hud-label block mb-1">
                  Position Size (% of Cash)
                </label>
                <input
                  id="settings-position-size"
                  type="number"
                  className="hud-input w-full"
                  value={formData.positionSizePctOfCash}
                  onChange={(e) => handleChange('positionSizePctOfCash', Number(e.target.value))}
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="hud-label mb-3 text-hud-primary">Sentiment Thresholds</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="settings-min-sentiment" className="hud-label block mb-1">
                  Min Sentiment to Buy (0-1)
                </label>
                <input
                  id="settings-min-sentiment"
                  type="number"
                  step="0.05"
                  className="hud-input w-full"
                  value={formData.minSentimentScore}
                  onChange={(e) => handleChange('minSentimentScore', Number(e.target.value))}
                />
              </div>
              <div>
                <label htmlFor="settings-min-analyst-confidence" className="hud-label block mb-1">
                  Min Analyst Confidence (0-1)
                </label>
                <input
                  id="settings-min-analyst-confidence"
                  type="number"
                  step="0.05"
                  className="hud-input w-full"
                  value={formData.minAnalystConfidence}
                  onChange={(e) => handleChange('minAnalystConfidence', Number(e.target.value))}
                />
              </div>
              <div>
                <label htmlFor="settings-sell-sentiment" className="hud-label block mb-1">
                  Sell Sentiment Threshold
                </label>
                <input
                  id="settings-sell-sentiment"
                  type="number"
                  step="0.05"
                  className="hud-input w-full"
                  value={formData.sellSentimentThreshold}
                  onChange={(e) => handleChange('sellSentimentThreshold', Number(e.target.value))}
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="hud-label mb-3 text-hud-primary">Risk Management</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="settings-take-profit" className="hud-label block mb-1">
                  Take Profit (%)
                </label>
                <input
                  id="settings-take-profit"
                  type="number"
                  className="hud-input w-full"
                  value={formData.takeProfitPct}
                  onChange={(e) => handleChange('takeProfitPct', Number(e.target.value))}
                />
              </div>
              <div>
                <label htmlFor="settings-stop-loss" className="hud-label block mb-1">
                  Stop Loss (%)
                </label>
                <input
                  id="settings-stop-loss"
                  type="number"
                  className="hud-input w-full"
                  value={formData.stopLossPct}
                  onChange={(e) => handleChange('stopLossPct', Number(e.target.value))}
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="hud-label mb-3 text-hud-primary">Polling Intervals</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="settings-data-poll" className="hud-label block mb-1">
                  Data Poll (ms)
                </label>
                <input
                  id="settings-data-poll"
                  type="number"
                  step="1000"
                  className="hud-input w-full"
                  value={formData.dataPollIntervalMs}
                  onChange={(e) => handleChange('dataPollIntervalMs', Number(e.target.value))}
                />
              </div>
              <div>
                <label htmlFor="settings-analyst-interval" className="hud-label block mb-1">
                  Analyst Interval (ms)
                </label>
                <input
                  id="settings-analyst-interval"
                  type="number"
                  step="1000"
                  className="hud-input w-full"
                  value={formData.analystIntervalMs}
                  onChange={(e) => handleChange('analystIntervalMs', Number(e.target.value))}
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="hud-label mb-3 text-hud-primary">LLM Configuration</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="settings-llm-model" className="hud-label block mb-1">
                  Research Model (cheap)
                </label>
                <select
                  id="settings-llm-model"
                  className="hud-input w-full"
                  value={formData.llmModel}
                  onChange={(e) => handleChange('llmModel', e.target.value)}
                >
                  {LLM_MODELS.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="settings-llm-analyst-model" className="hud-label block mb-1">
                  Analyst Model (smart)
                </label>
                <select
                  id="settings-llm-analyst-model"
                  className="hud-input w-full"
                  value={formData.llmAnalystModel}
                  onChange={(e) => handleChange('llmAnalystModel', e.target.value)}
                >
                  {LLM_MODELS.map((model) => (
                    <option key={model.id} value={model.id}>
                      {model.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="settings-llm-max-tokens" className="hud-label block mb-1">
                  Max Tokens
                </label>
                <input
                  id="settings-llm-max-tokens"
                  type="number"
                  step="128"
                  className="hud-input w-full"
                  value={formData.llmMaxTokens}
                  onChange={(e) => handleChange('llmMaxTokens', Number(e.target.value))}
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="hud-label mb-3 text-hud-primary">Account</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="settings-starting-equity" className="hud-label block mb-1">
                  Starting Equity ($)
                </label>
                <input
                  id="settings-starting-equity"
                  type="number"
                  className="hud-input w-full"
                  value={formData.startingEquity}
                  onChange={(e) => handleChange('startingEquity', Number(e.target.value))}
                />
                <p className="text-xs text-hud-text-dim mt-1">For P&L calculation</p>
              </div>
            </div>
          </div>

          <div>
            <h3 className="hud-label mb-3 text-hud-purple">Options Trading (Beta)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="hud-input w-4 h-4"
                    checked={formData.optionsEnabled}
                    onChange={(e) => handleChange('optionsEnabled', e.target.checked)}
                  />
                  <span className="hud-label">Enable Options Trading</span>
                </label>
              </div>
              <div>
                <label htmlFor="settings-options-min-confidence" className="hud-label block mb-1">
                  Min Confidence (0-1)
                </label>
                <input
                  id="settings-options-min-confidence"
                  type="number"
                  step="0.05"
                  className="hud-input w-full"
                  value={formData.optionsMinConfidence}
                  onChange={(e) => handleChange('optionsMinConfidence', Number(e.target.value))}
                  disabled={!formData.optionsEnabled}
                />
              </div>
              <div>
                <label htmlFor="settings-options-max-pct" className="hud-label block mb-1">
                  Max % Per Trade
                </label>
                <input
                  id="settings-options-max-pct"
                  type="number"
                  step="0.5"
                  className="hud-input w-full"
                  value={formData.optionsMaxPctPerTrade}
                  onChange={(e) => handleChange('optionsMaxPctPerTrade', Number(e.target.value))}
                  disabled={!formData.optionsEnabled}
                />
              </div>
              <div>
                <label htmlFor="settings-options-min-dte" className="hud-label block mb-1">
                  Min DTE (days)
                </label>
                <input
                  id="settings-options-min-dte"
                  type="number"
                  className="hud-input w-full"
                  value={formData.optionsMinDte}
                  onChange={(e) => handleChange('optionsMinDte', Number(e.target.value))}
                  disabled={!formData.optionsEnabled}
                />
              </div>
              <div>
                <label htmlFor="settings-options-max-dte" className="hud-label block mb-1">
                  Max DTE (days)
                </label>
                <input
                  id="settings-options-max-dte"
                  type="number"
                  className="hud-input w-full"
                  value={formData.optionsMaxDte}
                  onChange={(e) => handleChange('optionsMaxDte', Number(e.target.value))}
                  disabled={!formData.optionsEnabled}
                />
              </div>
              <div>
                <label htmlFor="settings-options-target-delta" className="hud-label block mb-1">
                  Target Delta
                </label>
                <input
                  id="settings-options-target-delta"
                  type="number"
                  step="0.05"
                  className="hud-input w-full"
                  value={formData.optionsTargetDelta}
                  onChange={(e) => handleChange('optionsTargetDelta', Number(e.target.value))}
                  disabled={!formData.optionsEnabled}
                />
              </div>
              <div>
                <label htmlFor="settings-options-max-positions" className="hud-label block mb-1">
                  Max Positions
                </label>
                <input
                  id="settings-options-max-positions"
                  type="number"
                  className="hud-input w-full"
                  value={formData.optionsMaxPositions}
                  onChange={(e) => handleChange('optionsMaxPositions', Number(e.target.value))}
                  disabled={!formData.optionsEnabled}
                />
              </div>
              <div>
                <label htmlFor="settings-options-stop-loss" className="hud-label block mb-1">
                  Stop Loss (%)
                </label>
                <input
                  id="settings-options-stop-loss"
                  type="number"
                  className="hud-input w-full"
                  value={formData.optionsStopLossPct}
                  onChange={(e) => handleChange('optionsStopLossPct', Number(e.target.value))}
                  disabled={!formData.optionsEnabled}
                />
              </div>
              <div>
                <label htmlFor="settings-options-take-profit" className="hud-label block mb-1">
                  Take Profit (%)
                </label>
                <input
                  id="settings-options-take-profit"
                  type="number"
                  className="hud-input w-full"
                  value={formData.optionsTakeProfitPct}
                  onChange={(e) => handleChange('optionsTakeProfitPct', Number(e.target.value))}
                  disabled={!formData.optionsEnabled}
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="hud-label mb-3 text-hud-cyan">Crypto Trading (24/7)</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="hud-input w-4 h-4"
                    checked={formData.cryptoEnabled}
                    onChange={(e) => handleChange('cryptoEnabled', e.target.checked)}
                  />
                  <span className="hud-label">Enable Crypto Trading</span>
                </label>
                <p className="text-[9px] text-hud-text-dim mt-1">
                  Trade crypto 24/7 based on momentum. Alpaca supports 20+ coins.
                </p>
              </div>
              <div>
                <label htmlFor="settings-crypto-symbols" className="hud-label block mb-1">
                  Symbols (comma-separated)
                </label>
                <input
                  id="settings-crypto-symbols"
                  type="text"
                  className="hud-input w-full"
                  value={(formData.cryptoSymbols || []).join(', ')}
                  onChange={(e) =>
                    handleChange(
                      'cryptoSymbols',
                      e.target.value
                        .split(',')
                        .map((symbol) => symbol.trim())
                        .filter(Boolean)
                    )
                  }
                  disabled={!formData.cryptoEnabled}
                  placeholder="BTC/USD, ETH/USD, SOL/USD, DOGE/USD, AVAX/USD..."
                />
              </div>
              <div>
                <label htmlFor="settings-crypto-momentum" className="hud-label block mb-1">
                  Momentum Threshold (%)
                </label>
                <input
                  id="settings-crypto-momentum"
                  type="number"
                  step="0.5"
                  className="hud-input w-full"
                  value={formData.cryptoMomentumThreshold}
                  onChange={(e) => handleChange('cryptoMomentumThreshold', Number(e.target.value))}
                  disabled={!formData.cryptoEnabled}
                />
              </div>
              <div>
                <label htmlFor="settings-crypto-max-position" className="hud-label block mb-1">
                  Max Position ($)
                </label>
                <input
                  id="settings-crypto-max-position"
                  type="number"
                  className="hud-input w-full"
                  value={formData.cryptoMaxPositionValue}
                  onChange={(e) => handleChange('cryptoMaxPositionValue', Number(e.target.value))}
                  disabled={!formData.cryptoEnabled}
                />
              </div>
              <div>
                <label htmlFor="settings-crypto-take-profit" className="hud-label block mb-1">
                  Take Profit (%)
                </label>
                <input
                  id="settings-crypto-take-profit"
                  type="number"
                  className="hud-input w-full"
                  value={formData.cryptoTakeProfitPct}
                  onChange={(e) => handleChange('cryptoTakeProfitPct', Number(e.target.value))}
                  disabled={!formData.cryptoEnabled}
                />
              </div>
              <div>
                <label htmlFor="settings-crypto-stop-loss" className="hud-label block mb-1">
                  Stop Loss (%)
                </label>
                <input
                  id="settings-crypto-stop-loss"
                  type="number"
                  className="hud-input w-full"
                  value={formData.cryptoStopLossPct}
                  onChange={(e) => handleChange('cryptoStopLossPct', Number(e.target.value))}
                  disabled={!formData.cryptoEnabled}
                />
              </div>
            </div>
          </div>

          <div>
            <h3 className="hud-label mb-3 text-hud-warning">Stale Position Management</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    className="hud-input w-4 h-4"
                    checked={formData.stalePositionEnabled}
                    onChange={(e) => handleChange('stalePositionEnabled', e.target.checked)}
                  />
                  <span className="hud-label">Enable Stale Position Detection</span>
                </label>
              </div>
              <div>
                <label htmlFor="settings-stale-max-hold" className="hud-label block mb-1">
                  Max Hold Days
                </label>
                <input
                  id="settings-stale-max-hold"
                  type="number"
                  className="hud-input w-full"
                  value={formData.staleMaxHoldDays}
                  onChange={(e) => handleChange('staleMaxHoldDays', Number(e.target.value))}
                  disabled={!formData.stalePositionEnabled}
                />
              </div>
              <div>
                <label htmlFor="settings-stale-min-gain" className="hud-label block mb-1">
                  Min Gain % to Keep
                </label>
                <input
                  id="settings-stale-min-gain"
                  type="number"
                  step="0.5"
                  className="hud-input w-full"
                  value={formData.staleMinGainPct}
                  onChange={(e) => handleChange('staleMinGainPct', Number(e.target.value))}
                  disabled={!formData.stalePositionEnabled}
                />
              </div>
              <div>
                <label htmlFor="settings-stale-volume-decay" className="hud-label block mb-1">
                  Social Volume Decay
                </label>
                <input
                  id="settings-stale-volume-decay"
                  type="number"
                  step="0.1"
                  className="hud-input w-full"
                  value={formData.staleSocialVolumeDecay}
                  onChange={(e) => handleChange('staleSocialVolumeDecay', Number(e.target.value))}
                  disabled={!formData.stalePositionEnabled}
                />
                <p className="text-[9px] text-hud-text-dim mt-1">
                  Exit if volume drops to this % of entry
                </p>
              </div>
              <div>
                <label htmlFor="settings-stale-no-mentions" className="hud-label block mb-1">
                  No Mentions Hours
                </label>
                <input
                  id="settings-stale-no-mentions"
                  type="number"
                  className="hud-input w-full"
                  value={formData.staleNoMentionsHours}
                  onChange={(e) => handleChange('staleNoMentionsHours', Number(e.target.value))}
                  disabled={!formData.stalePositionEnabled}
                />
                <p className="text-[9px] text-hud-text-dim mt-1">Exit if no mentions for N hours</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t border-hud-line">
            <button type="button" className="hud-button" onClick={onClose}>
              Cancel
            </button>
            <button type="button" className="hud-button" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Configuration'}
            </button>
          </div>
        </div>
      </Panel>
    </div>
  )
}
