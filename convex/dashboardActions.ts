'use node'

import { api } from './_generated/api'
import { action } from './_generated/server'

type LiveAccount = {
  equity: number
  cash: number
  buyingPower: number
  portfolioValue: number
}

type LivePosition = {
  symbol: string
  qty: number
  side: string
  marketValue: number
  unrealizedPl: number
  currentPrice: number
}

type DerivedMetrics = {
  startingEquity: number
  unrealizedPl: number
  totalPl: number
  realizedPl: number
  totalPlPct: number
}

type StatusSnapshot = {
  config: { startingEquity?: number } | null
  signals: unknown[]
  logs: unknown[]
  positions: unknown[]
  signalResearch: unknown[]
  portfolioSnapshots: unknown[]
  llmStats: { totalUsd: number; calls: number; tokensIn: number; tokensOut: number }
}

type DashboardFullStatus = {
  account: LiveAccount
  alpacaPositions: LivePosition[]
  clock: unknown
  config: StatusSnapshot['config']
  riskState: unknown
  signals: unknown[]
  logs: unknown[]
  positions: unknown[]
  signalResearch: unknown
  portfolioSnapshots: unknown[]
  llmStats: StatusSnapshot['llmStats']
} & DerivedMetrics

export function computeDerivedMetrics(params: {
  account: LiveAccount
  positions: LivePosition[]
  startingEquity: number
}): DerivedMetrics {
  const unrealizedPl = params.positions.reduce(
    (sum, position) => sum + (position.unrealizedPl || 0),
    0
  )
  const totalPl = params.account.equity - params.startingEquity
  const realizedPl = totalPl - unrealizedPl
  const totalPlPct = params.startingEquity > 0 ? (totalPl / params.startingEquity) * 100 : 0

  return {
    startingEquity: params.startingEquity,
    unrealizedPl,
    totalPl,
    realizedPl,
    totalPlPct,
  }
}

export const getFullStatus = action({
  args: {},
  handler: async (ctx): Promise<DashboardFullStatus> => {
    const [status, account, positions, clock]: [
      StatusSnapshot,
      LiveAccount,
      LivePosition[],
      unknown,
    ] = await Promise.all([
      ctx.runQuery(api.status.get, {}),
      ctx.runAction(api.tradingActions.getAccount, {}),
      ctx.runAction(api.tradingActions.getPositions, {}),
      ctx.runAction(api.tradingActions.getMarketClock, {}),
    ])

    const startingEquity = status.config?.startingEquity ?? 100000
    const derived = computeDerivedMetrics({
      account,
      positions,
      startingEquity,
    })

    return {
      account,
      alpacaPositions: positions,
      clock,
      config: status.config,
      riskState: await ctx.runQuery(api.riskState.get, {}),
      signals: status.signals,
      logs: status.logs,
      positions: status.positions,
      signalResearch: status.signalResearch,
      portfolioSnapshots: status.portfolioSnapshots,
      llmStats: status.llmStats,
      ...derived,
    }
  },
})
