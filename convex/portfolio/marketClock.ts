import { v } from 'convex/values'
import { mutation, query } from '../_generated/server'

export const upsert = mutation({
  args: {
    isOpen: v.boolean(),
    nextOpen: v.string(),
    nextClose: v.string(),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query('marketClock').first()
    if (existing) {
      await ctx.db.patch(existing._id, args)
      return { updated: true }
    }

    await ctx.db.insert('marketClock', args)
    return { updated: false }
  },
})

export const get = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('marketClock').first()
  },
})
