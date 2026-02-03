import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

export const create = mutation({
  args: {
    agent: v.string(),
    action: v.string(),
    symbol: v.optional(v.string()),
    details: v.optional(v.record(v.string(), v.any())),
  },
  handler: async (ctx, args) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { details, ...rest } = args
    return await ctx.db.insert('activityLogs', {
      ...rest,
      detailsJson: details ? JSON.stringify(details) : undefined,
      timestamp: Date.now(),
    })
  },
})

export const getRecent = query({
  args: {
    limit: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.query('activityLogs').order('desc').take(args.limit)
  },
})
