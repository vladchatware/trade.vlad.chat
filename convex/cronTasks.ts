'use node'

import { api } from './_generated/api'
import { action } from './_generated/server'
import { createAlpacaClient } from './providers/alpaca'

export const ingestSecEdgar = action({
  args: {},
  handler: async (ctx) => {
    const alpaca = createAlpacaClient()
    const [clock, riskState] = await Promise.all([
      alpaca.getClock(),
      ctx.runQuery(api.riskState.get),
    ])

    if (!clock.is_open) {
      return { status: 'skipped', reason: 'Market closed' }
    }

    if (riskState?.killSwitchActive) {
      return { status: 'skipped', reason: 'Kill switch active' }
    }

    const events = await ctx.runAction(api.secEdgar.poll)
    let inserted = 0

    for (const event of events) {
      const result = await ctx.runMutation(api.rawEvents.insertIfMissing, {
        source: event.source,
        sourceId: event.source_id,
        rawContent: event.content,
      })
      if (result.inserted) inserted += 1
    }

    return { status: 'success', inserted }
  },
})

export const marketOpenPrep = action({
  args: {},
  handler: async (ctx) => {
    const riskState = await ctx.runQuery(api.riskState.get)
    const approvals = await ctx.runMutation(api.orderApprovals.cleanupExpired)

    return {
      status: 'success',
      killSwitchActive: riskState?.killSwitchActive ?? false,
      dailyLossUsd: riskState?.dailyLossUsd ?? 0,
      approvalsCleaned: approvals.deleted,
    }
  },
})

export const marketCloseCleanup = action({
  args: {},
  handler: async (ctx) => {
    const alpaca = createAlpacaClient()
    const [positions, account, approvals] = await Promise.all([
      alpaca.getPositions(),
      alpaca.getAccount(),
      ctx.runMutation(api.orderApprovals.cleanupExpired),
    ])

    return {
      status: 'success',
      positions: positions.length,
      equity: Number(account.equity),
      approvalsCleaned: approvals.deleted,
    }
  },
})

export const midnightReset = action({
  args: {},
  handler: async (ctx) => {
    const [reset, approvals] = await Promise.all([
      ctx.runMutation(api.riskState.resetDailyLoss),
      ctx.runMutation(api.orderApprovals.cleanupExpired),
    ])

    return {
      status: 'success',
      reset,
      approvalsCleaned: approvals.deleted,
    }
  },
})

export const hourlyCacheRefresh = action({
  args: {},
  handler: async () => {
    return { status: 'noop' }
  },
})
