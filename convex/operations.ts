'use node'

import { api } from './_generated/api'
import { action } from './_generated/server'

type RiskStateLite = {
  killSwitchActive?: boolean
  dailyLossUsd?: number
}

type ExpiredApprovalsResult = { deleted: number }
type TradingPosition = { symbol: string }
type TradingAccount = { equity: number }
type DailyResetResult = { reset: boolean; created: boolean }
type SecIngestResult =
  | { status: 'success'; inserted: number }
  | { status: 'skipped'; reason: 'market_closed' | 'kill_switch_active'; inserted: number }

export function buildMarketOpenPrepResult(
  riskState: RiskStateLite | null,
  approvalsDeleted: number
): {
  status: 'success'
  killSwitchActive: boolean
  dailyLossUsd: number
  approvalsCleaned: number
} {
  return {
    status: 'success' as const,
    killSwitchActive: riskState?.killSwitchActive ?? false,
    dailyLossUsd: riskState?.dailyLossUsd ?? 0,
    approvalsCleaned: approvalsDeleted,
  }
}

export function buildMarketCloseCleanupResult(
  positionsCount: number,
  equity: number,
  approvalsDeleted: number
): {
  status: 'success'
  positions: number
  equity: number
  approvalsCleaned: number
} {
  return {
    status: 'success' as const,
    positions: positionsCount,
    equity,
    approvalsCleaned: approvalsDeleted,
  }
}

export function buildMidnightResetResult(
  reset: { reset: boolean; created: boolean },
  approvalsDeleted: number
): {
  status: 'success'
  reset: { reset: boolean; created: boolean }
  approvalsCleaned: number
} {
  return {
    status: 'success' as const,
    reset,
    approvalsCleaned: approvalsDeleted,
  }
}

export const ingestSecEdgar = action({
  args: {},
  handler: async (ctx): Promise<SecIngestResult> => {
    return (await ctx.runAction(api.secEdgar.ingestCurrentFilings, {})) as SecIngestResult
  },
})

export const marketOpenPrep = action({
  args: {},
  handler: async (ctx): Promise<ReturnType<typeof buildMarketOpenPrepResult>> => {
    const [riskState, approvals]: [RiskStateLite | null, ExpiredApprovalsResult] =
      await Promise.all([
        ctx.runQuery(api.riskState.get, {}),
        ctx.runMutation(api.orderApprovals.cleanupExpired, {}),
      ])

    return buildMarketOpenPrepResult(riskState, approvals.deleted)
  },
})

export const marketCloseCleanup = action({
  args: {},
  handler: async (ctx): Promise<ReturnType<typeof buildMarketCloseCleanupResult>> => {
    const [positions, account, approvals]: [
      TradingPosition[],
      TradingAccount,
      ExpiredApprovalsResult,
    ] = await Promise.all([
      ctx.runAction(api.tradingActions.getPositions, {}),
      ctx.runAction(api.tradingActions.getAccount, {}),
      ctx.runMutation(api.orderApprovals.cleanupExpired, {}),
    ])

    return buildMarketCloseCleanupResult(
      positions.length,
      Number(account.equity),
      approvals.deleted
    )
  },
})

export const midnightReset = action({
  args: {},
  handler: async (ctx): Promise<ReturnType<typeof buildMidnightResetResult>> => {
    const [reset, approvals]: [DailyResetResult, ExpiredApprovalsResult] = await Promise.all([
      ctx.runMutation(api.riskState.resetDailyLoss, {}),
      ctx.runMutation(api.orderApprovals.cleanupExpired, {}),
    ])

    return buildMidnightResetResult(reset, approvals.deleted)
  },
})

export const hourlyCacheRefresh = action({
  args: {},
  handler: async () => {
    return { status: 'noop' as const }
  },
})
