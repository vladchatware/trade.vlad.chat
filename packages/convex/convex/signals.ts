import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

export const getTop = query({
  args: {
    limit: v.number(),
    minSentiment: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('signals')
      .filter((q) => q.gte(q.field('sentiment'), args.minSentiment))
      .order('desc')
      .take(args.limit)
  },
})

export const getCrypto = query({
  args: {
    symbols: v.array(v.string()),
    minMomentum: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('signals')
      .filter((q) =>
        q.and(q.eq(q.field('isCrypto'), true), q.gte(q.field('momentum'), args.minMomentum))
      )
      .order('desc')
      .take(10)
  },
})

export const create = mutation({
  args: {
    symbol: v.string(),
    source: v.string(),
    sentiment: v.number(),
    volume: v.number(),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('signals', args)
  },
})
