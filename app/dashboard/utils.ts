import { withTradingConfigDefaults } from '@/shared/tradingConfig'
import type { Config } from './types'

const baseDefaults = withTradingConfigDefaults()

export const defaultConfig: Config = {
  maxPositionValue: baseDefaults.maxPositionValue,
  maxPositions: baseDefaults.maxPositions,
  minSentimentScore: baseDefaults.minSentimentScore,
  minAnalystConfidence: baseDefaults.minAnalystConfidence,
  takeProfitPct: baseDefaults.takeProfitPct,
  stopLossPct: baseDefaults.stopLossPct,
  positionSizePctOfCash: baseDefaults.positionSizePctOfCash,
  llmModel: baseDefaults.llmModel,
  llmAnalystModel: baseDefaults.llmAnalystModel,
  llmMaxTokens: baseDefaults.llmMaxTokens,
  dataPollIntervalMs: baseDefaults.dataPollIntervalMs,
  analystIntervalMs: baseDefaults.analystIntervalMs,
  startingEquity: baseDefaults.startingEquity,
  cryptoEnabled: baseDefaults.cryptoEnabled,
  cryptoSymbols: baseDefaults.cryptoSymbols,
  cryptoMomentumThreshold: baseDefaults.cryptoMomentumThreshold,
  cryptoMaxPositionValue: baseDefaults.cryptoMaxPositionValue,
  cryptoTakeProfitPct: baseDefaults.cryptoTakeProfitPct,
  cryptoStopLossPct: baseDefaults.cryptoStopLossPct,
  optionsEnabled: baseDefaults.optionsEnabled,
  optionsMaxPctPerTrade: baseDefaults.optionsMaxPctPerTrade,
  optionsMinConfidence: baseDefaults.optionsMinConfidence,
  optionsMinDte: baseDefaults.optionsMinDte,
  optionsMaxDte: baseDefaults.optionsMaxDte,
  optionsTargetDelta: baseDefaults.optionsTargetDelta,
  optionsMaxPositions: baseDefaults.optionsMaxPositions,
  optionsStopLossPct: baseDefaults.optionsStopLossPct,
  optionsTakeProfitPct: baseDefaults.optionsTakeProfitPct,
  stalePositionEnabled: baseDefaults.stalePositionEnabled,
  staleMaxHoldDays: baseDefaults.staleMaxHoldDays,
  staleMinGainPct: baseDefaults.staleMinGainPct,
  staleSocialVolumeDecay: baseDefaults.staleSocialVolumeDecay,
  staleNoMentionsHours: baseDefaults.staleNoMentionsHours,
}

export const positionColors = ['cyan', 'purple', 'yellow', 'blue', 'green'] as const

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

export function formatPercent(value: number): string {
  const sign = value >= 0 ? '+' : ''
  return `${sign}${value.toFixed(2)}%`
}

export function getAgentColor(agent: string): string {
  const colors: Record<string, string> = {
    Analyst: 'text-hud-purple',
    Executor: 'text-hud-cyan',
    StockTwits: 'text-hud-success',
    SignalResearch: 'text-hud-cyan',
    PositionResearch: 'text-hud-purple',
    Crypto: 'text-hud-warning',
    System: 'text-hud-text-dim',
  }
  return colors[agent] || 'text-hud-text'
}

export function formatAction(action: string, detailsJson?: string): string {
  const actionNames: Record<string, string> = {
    order_submitted: 'Order Submitted',
    position_closed: 'Position Closed',
    take_profit: 'Take Profit',
    stop_loss: 'Stop Loss',
    decision_cycle_start: 'Cycle Start',
    decision_cycle_skipped: 'Cycle Skipped',
    decision_no_candidate: 'No Candidate',
    decision_candidate_selected: 'Candidate Selected',
    decision_buy_submitted: 'Buy Submitted',
    decision_buy_failed: 'Buy Failed',
  }

  let text = actionNames[action] || action

  if (detailsJson) {
    try {
      const details = JSON.parse(detailsJson)
      if (details.orderId) {
        text += ` · ${details.orderId.slice(0, 8)}`
      }
      if (details.plPct !== undefined) {
        const sign = details.plPct >= 0 ? '+' : ''
        text += ` · ${sign}${details.plPct.toFixed(2)}%`
      }
      if (typeof details.sentiment === 'number') {
        text += ` · ${(details.sentiment * 100).toFixed(0)}%`
      }
      if (typeof details.reason === 'string' && details.reason.length > 0) {
        text += ` · ${details.reason.slice(0, 48)}`
      }
    } catch {
      // ignore invalid JSON
    }
  }

  return text
}

export function isCryptoSymbol(symbol: string, cryptoSymbols: string[] = []): boolean {
  return (
    cryptoSymbols.includes(symbol) ||
    symbol.includes('/USD') ||
    symbol.includes('BTC') ||
    symbol.includes('ETH') ||
    symbol.includes('SOL')
  )
}

export function getSentimentColor(score: number): string {
  if (score >= 0.3) return 'text-hud-success'
  if (score <= -0.2) return 'text-hud-error'
  return 'text-hud-warning'
}

export function getVerdictColor(verdict?: string): string {
  if (verdict === 'BUY') return 'text-hud-success'
  if (verdict === 'SKIP') return 'text-hud-error'
  return 'text-hud-warning'
}

export function getQualityColor(quality?: string): string {
  if (quality === 'excellent') return 'text-hud-success'
  if (quality === 'good') return 'text-hud-primary'
  if (quality === 'fair') return 'text-hud-warning'
  return 'text-hud-error'
}
