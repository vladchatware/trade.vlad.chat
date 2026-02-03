import type { Config } from './types'

export const defaultConfig: Config = {
  maxPositionValue: 2000,
  maxPositions: 3,
  minSentimentScore: 0.7,
  minAnalystConfidence: 0.8,
  takeProfitPct: 10,
  stopLossPct: 5,
  positionSizePctOfCash: 20,
  llmModel: 'moonshotai/kimi-k2.5',
  cryptoEnabled: false,
  optionsEnabled: false,
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
