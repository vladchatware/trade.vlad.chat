import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

export const create = mutation({
  args: {
    agent: v.string(),
    action: v.string(),
    symbol: v.optional(v.string()),
    detailsJson: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('activityLogs', {
      agent: args.agent,
      action: args.action,
      symbol: args.symbol,
      detailsJson: args.detailsJson,
      timestamp: Date.now(),
    })
  },
})

export const latest = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('activityLogs')
      .withIndex('by_timestamp')
      .order('desc')
      .take(args.limit ?? 50)
  },
})
