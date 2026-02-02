import { mutation } from './_generated/server'
import { v } from 'convex/values'

export const create = mutation({
  args: {
    agent: v.string(),
    action: v.string(),
    symbol: v.optional(v.string()),
    details: v.optional(v.record(v.string(), v.any())),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('activityLogs', {
      ...args,
      detailsJson: args.details ? JSON.stringify(args.details) : undefined,
      timestamp: Date.now(),
    })
  },
})
