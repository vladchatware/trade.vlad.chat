import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

export const get = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('riskState').first()
  },
})

export const create = mutation({
  args: {
    killSwitchActive: v.boolean(),
    dailyLossUsd: v.number(),
    dailyLossResetAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('riskState', args)
  },
})

export const resetDailyLoss = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query('riskState').first()
    const nextState = {
      killSwitchActive: existing?.killSwitchActive ?? false,
      killSwitchReason: existing?.killSwitchReason,
      dailyLossUsd: 0,
      dailyLossResetAt: Date.now(),
      cooldownUntil: existing?.cooldownUntil,
    }

    if (existing) {
      await ctx.db.patch(existing._id, nextState)
      return { reset: true, created: false }
    }

    await ctx.db.insert('riskState', nextState)
    return { reset: true, created: true }
  },
})
