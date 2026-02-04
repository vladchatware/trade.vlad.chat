import { v } from 'convex/values'
import { mutation, query } from '../_generated/server'

export const upsertFromWorker = mutation({
  args: {
    symbol: v.string(),
    market: v.union(v.literal('equity'), v.literal('crypto')),
    timeframe: v.string(),
    source: v.literal('worker'),
    price: v.number(),
    momentumPct: v.number(),
    volume: v.number(),
    sma20: v.optional(v.number()),
    sma50: v.optional(v.number()),
    ema12: v.optional(v.number()),
    ema26: v.optional(v.number()),
    rsi14: v.optional(v.number()),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('technicalIndicators')
      .withIndex('by_symbol_market_timeframe', (q) =>
        q.eq('symbol', args.symbol).eq('market', args.market).eq('timeframe', args.timeframe)
      )
      .order('desc')
      .take(1)

    const payload = {
      ...args,
      updatedAt: Date.now(),
    }

    const current = existing[0]
    if (!current) return await ctx.db.insert('technicalIndicators', payload)
    await ctx.db.patch(current._id, payload)
    return current._id
  },
})

export const getLatest = query({
  args: {
    symbol: v.string(),
    market: v.optional(v.union(v.literal('equity'), v.literal('crypto'))),
    timeframe: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const market = args.market ?? 'equity'
    const timeframe = args.timeframe ?? '1Min'
    const rows = await ctx.db
      .query('technicalIndicators')
      .withIndex('by_symbol_market_timeframe', (q) =>
        q.eq('symbol', args.symbol).eq('market', market).eq('timeframe', timeframe)
      )
      .order('desc')
      .take(1)
    return rows[0] ?? null
  },
})
