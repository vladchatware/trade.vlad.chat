import { v } from 'convex/values'
import { mutation, query } from '../_generated/server'

export const getTop = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('signals')
      .withIndex('by_timestamp')
      .order('desc')
      .take(args.limit ?? 20)
  },
})

export const getLatestBySymbol = query({
  args: { symbol: v.string() },
  handler: async (ctx, args) => {
    const recent = await ctx.db
      .query('signals')
      .withIndex('by_symbol', (q) => q.eq('symbol', args.symbol))
      .order('desc')
      .take(1)
    return recent[0] ?? null
  },
})

export const getCrypto = query({
  args: {
    limit: v.optional(v.number()),
    minMomentum: v.optional(v.number()),
    symbols: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20
    const symbols = args.symbols ?? []
    const minMomentum = args.minMomentum ?? 0

    const candidates = await ctx.db
      .query('signals')
      .withIndex('by_timestamp')
      .order('desc')
      .take(limit * 3)

    return candidates
      .filter((signal) => {
        if (signal.isCrypto !== true) return false
        if (symbols.length > 0 && !symbols.includes(signal.symbol)) return false
        if ((signal.momentum ?? 0) < minMomentum) return false
        return true
      })
      .slice(0, limit)
  },
})

export const create = mutation({
  args: {
    symbol: v.string(),
    source: v.string(),
    sentiment: v.number(),
    volume: v.number(),
    reason: v.optional(v.string()),
    bullish: v.optional(v.number()),
    bearish: v.optional(v.number()),
    score: v.optional(v.number()),
    upvotes: v.optional(v.number()),
    isCrypto: v.optional(v.boolean()),
    momentum: v.optional(v.number()),
    price: v.optional(v.number()),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('signals', args)
  },
})
