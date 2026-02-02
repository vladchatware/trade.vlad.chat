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
