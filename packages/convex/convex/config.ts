import { query, mutation } from './_generated/server'
import { v } from 'convex/values'

export const get = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('config').first()
  },
})

export const update = mutation({
  args: {
    maxPositionValue: v.number(),
    maxPositions: v.number(),
    minSentimentScore: v.number(),
    minAnalystConfidence: v.number(),
    takeProfitPct: v.number(),
    stopLossPct: v.number(),
    positionSizePctOfCash: v.number(),
    llmModel: v.string(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query('config').first()
    const config = {
      ...args,
      updatedAt: Date.now(),
    }
    if (existing) {
      await ctx.db.patch(existing._id, config)
    } else {
      await ctx.db.insert('config', config)
    }
    return config
  },
})
