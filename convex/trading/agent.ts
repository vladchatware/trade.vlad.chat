'use node'

import { api } from '../_generated/api'
import type { Doc } from '../_generated/dataModel'
import { action } from '../_generated/server'

type SignalCandidate = {
  symbol: string
  sentiment?: number
  volume?: number
  price?: number
}

export function calculatePositionSize(
  maxPositionValue: number,
  cash: number,
  positionSizePctOfCash: number
): number {
  return Math.max(0, Math.min(maxPositionValue, cash * (positionSizePctOfCash / 100)))
}

export function selectBestCandidate(
  signals: SignalCandidate[],
  heldSymbols: Set<string>,
  minSentimentScore: number
): SignalCandidate | null {
  return (
    signals
      .filter((signal) => (signal.sentiment ?? 0) >= minSentimentScore)
      .filter((signal) => !heldSymbols.has(signal.symbol))[0] ?? null
  )
}

export function classifyExit(
  unrealizedPlpc: number | undefined,
  takeProfitPct: number,
  stopLossPct: number
): 'take_profit' | 'stop_loss' | null {
  const plPct = (unrealizedPlpc ?? 0) * 100
  if (plPct >= takeProfitPct) return 'take_profit'
  if (plPct <= -stopLossPct) return 'stop_loss'
  return null
}

export const runTrading = action({
  args: {},
  handler: async (ctx): Promise<{ status: string; reason?: string; positionsChecked?: number }> => {
    const [config, riskState] = await Promise.all([
      ctx.runQuery(api.system.config.get, {}),
      ctx.runQuery(api.system.riskState.get, {}),
    ])

    if (!config || riskState?.killSwitchActive) {
      await ctx.runMutation(api.system.activityLogs.create, {
        agent: 'System',
        action: 'decision_cycle_skipped',
        detailsJson: JSON.stringify({
          reason: !config ? 'config_missing' : 'kill_switch_active',
        }),
      })
      return { status: 'skipped', reason: !config ? 'config_missing' : 'kill_switch_active' }
    }

    const [account, positions, clock]: [
      Doc<'account'> | null,
      Doc<'positions'>[],
      Doc<'marketClock'> | null,
    ] = await Promise.all([
      ctx.runQuery(api.portfolio.account.getAccount, {}),
      ctx.runQuery(api.portfolio.positions.getAll, {}),
      ctx.runQuery(api.portfolio.marketClock.get, {}),
    ])

    if (!clock?.isOpen) {
      await ctx.runMutation(api.system.activityLogs.create, {
        agent: 'System',
        action: 'decision_cycle_skipped',
        detailsJson: JSON.stringify({ reason: !clock ? 'clock_missing' : 'market_closed' }),
      })
      return { status: 'skipped', reason: !clock ? 'clock_missing' : 'market_closed' }
    }

    await ctx.runMutation(api.system.activityLogs.create, {
      agent: 'System',
      action: 'decision_cycle_start',
      detailsJson: JSON.stringify({
        positions: positions.length,
        maxPositions: config.maxPositions,
      }),
    })

    for (const position of positions) {
      const exitReason = classifyExit(
        position.unrealizedPlpc,
        config.takeProfitPct,
        config.stopLossPct
      )
      if (!exitReason) continue

      await ctx.runAction(api.trading.actions.closePosition, { symbol: position.symbol })
      await ctx.runMutation(api.system.activityLogs.create, {
        agent: 'Executor',
        action: exitReason,
        symbol: position.symbol,
        detailsJson: JSON.stringify({ plPct: (position.unrealizedPlpc ?? 0) * 100 }),
      })
    }

    if (positions.length >= config.maxPositions) {
      return { status: 'success', positionsChecked: positions.length }
    }

    const signals = await ctx.runQuery(api.signals.queries.getTop, { limit: 5 })
    const heldSymbols = new Set(positions.map((position) => position.symbol))
    const candidate = selectBestCandidate(signals, heldSymbols, config.minSentimentScore)

    if (!candidate) {
      await ctx.runMutation(api.system.activityLogs.create, {
        agent: 'Analyst',
        action: 'decision_no_candidate',
        detailsJson: JSON.stringify({
          scanned: signals.length,
          blockedByPositionLimit: positions.length >= config.maxPositions,
        }),
      })
      return { status: 'success', positionsChecked: positions.length }
    }

    const positionSize = calculatePositionSize(
      config.maxPositionValue,
      account?.cash ?? 0,
      config.positionSizePctOfCash
    )

    await ctx.runMutation(api.system.activityLogs.create, {
      agent: 'Analyst',
      action: 'decision_candidate_selected',
      symbol: candidate.symbol,
      detailsJson: JSON.stringify({
        sentiment: candidate.sentiment ?? 0,
        volume: candidate.volume ?? 0,
        price: candidate.price ?? 0,
        positionSize,
        reason: 'top_ranked_signal_above_threshold',
      }),
    })

    const qty = candidate.price ? positionSize / candidate.price : 0
    if (!Number.isFinite(qty) || qty <= 0) {
      await ctx.runMutation(api.system.activityLogs.create, {
        agent: 'Executor',
        action: 'decision_buy_failed',
        symbol: candidate.symbol,
        detailsJson: JSON.stringify({ reason: 'invalid_qty_or_price' }),
      })
      return { status: 'success', positionsChecked: positions.length }
    }

    try {
      const preview = await ctx.runAction(api.trading.actions.previewOrder, {
        symbol: candidate.symbol,
        side: 'buy',
        qty,
        orderType: 'market',
      })

      if (!preview.policy.allowed || !preview.approvalToken) {
        await ctx.runMutation(api.system.activityLogs.create, {
          agent: 'Executor',
          action: 'decision_buy_failed',
          symbol: candidate.symbol,
          detailsJson: JSON.stringify({ reason: preview.policy.reason ?? 'policy_rejected' }),
        })
        return { status: 'success', positionsChecked: positions.length }
      }

      await ctx.runAction(api.trading.actions.submitOrder, {
        previewId: preview.previewId,
        approvalToken: preview.approvalToken,
      })

      await ctx.runMutation(api.system.activityLogs.create, {
        agent: 'Executor',
        action: 'decision_buy_submitted',
        symbol: candidate.symbol,
        detailsJson: JSON.stringify({
          previewId: preview.previewId,
          estimatedPrice: preview.estimatedPrice,
        }),
      })
    } catch (error) {
      await ctx.runMutation(api.system.activityLogs.create, {
        agent: 'Executor',
        action: 'decision_buy_failed',
        symbol: candidate.symbol,
        detailsJson: JSON.stringify({
          reason: error instanceof Error ? error.message : String(error),
        }),
      })
    }

    return { status: 'success', positionsChecked: positions.length }
  },
})
