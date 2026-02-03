'use node'

import { api } from './_generated/api'
import { action } from './_generated/server'
import { createAlpacaClient } from './providers/alpaca'

interface DashboardStatus {
  account: {
    equity: number
    cash: number
    buyingPower: number
    portfolioValue: number
  }
  alpacaPositions: Array<{
    symbol: string
    qty: number
    side: string
    marketValue: number
    unrealizedPl: number
    unrealizedPlpc: number
    currentPrice: number
  }>
  clock: {
    isOpen: boolean
    nextOpen: string
    nextClose: string
  }
  config: unknown
  riskState: unknown
  signals: unknown[]
  logs: unknown[]
  positions: unknown[]
  signalResearch: unknown[]
  portfolioSnapshots: unknown[]
  llmStats: {
    totalUsd: number
    calls: number
    tokensIn: number
    tokensOut: number
  }
  startingEquity: number
  unrealizedPl: number
  totalPl: number
  realizedPl: number
  totalPlPct: number
}

export const getFullStatus = action({
  args: {},
  handler: async (ctx): Promise<DashboardStatus> => {
    // Fetch Alpaca account data
    const alpaca = createAlpacaClient()
    const [account, positions, clock] = await Promise.all([
      alpaca.getAccount(),
      alpaca.getPositions(),
      alpaca.getClock(),
    ])

    // Fetch all database state in parallel
    const [dbStatus, llmStats] = await Promise.all([
      ctx.runQuery(api.status.get),
      ctx.runQuery(api.llmCosts.getStats),
    ])

    // Calculate derived metrics
    const startingEquity = dbStatus.config?.startingEquity || 100000
    const unrealizedPl = positions.reduce((sum, p) => sum + (Number(p.unrealized_pl) || 0), 0)
    const totalPl = account ? Number(account.equity) - startingEquity : 0
    const realizedPl = totalPl - unrealizedPl
    const totalPlPct = account ? (totalPl / startingEquity) * 100 : 0

    return {
      // Alpaca data
      account: {
        equity: Number(account.equity),
        cash: Number(account.cash),
        buyingPower: Number(account.buying_power),
        portfolioValue: Number(account.portfolio_value),
      },
      alpacaPositions: positions.map((p) => ({
        symbol: p.symbol,
        qty: Number(p.qty),
        side: p.side,
        marketValue: Number(p.market_value),
        unrealizedPl: Number(p.unrealized_pl),
        unrealizedPlpc: Number(p.unrealized_plpc),
        currentPrice: Number(p.current_price),
      })),
      clock: {
        isOpen: clock.is_open,
        nextOpen: clock.next_open,
        nextClose: clock.next_close,
      },

      // Database state (from unified status query)
      config: dbStatus.config,
      riskState: dbStatus.riskState,
      signals: dbStatus.signals,
      logs: dbStatus.logs,
      positions: dbStatus.positions,
      signalResearch: dbStatus.signalResearch,
      portfolioSnapshots: dbStatus.portfolioSnapshots,
      llmStats,

      // Calculated metrics
      startingEquity,
      unrealizedPl,
      totalPl,
      realizedPl,
      totalPlPct,
    }
  },
})
