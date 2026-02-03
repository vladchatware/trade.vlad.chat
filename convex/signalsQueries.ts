import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

// Query: Get top signals
export const getTop = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20
    return await ctx.db.query('signals').order('desc').take(limit)
  },
})

// Query: Get crypto signals
export const getCrypto = query({
  args: {
    limit: v.optional(v.number()),
    minMomentum: v.optional(v.number()),
    symbols: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20
    const symbols = args.symbols ?? []
    const minMomentum = args.minMomentum ?? 0.02

    // Filter crypto signals after fetching since we can't query by optional field
    const allSignals = await ctx.db
      .query('signals')
      .order('desc')
      .take(limit * 3)

    return allSignals
      .filter((s) => {
        // Must be crypto signal
        if (s.isCrypto !== true) return false

        // Filter by symbols if provided
        if (symbols.length > 0 && !symbols.includes(s.symbol)) return false

        // Filter by momentum if provided
        if (minMomentum > 0 && (s.momentum || 0) < minMomentum) return false

        return true
      })
      .slice(0, limit)
  },
})

// Mutation: Create a signal
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
