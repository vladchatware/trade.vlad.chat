import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('positions').collect()
  },
})

export const getBySymbol = query({
  args: { symbol: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('positions')
      .withIndex('by_symbol', (q) => q.eq('symbol', args.symbol))
      .first()
  },
})

export const updateFromWebSocket = mutation({
  args: {
    symbol: v.string(),
    qty: v.number(),
    avgEntryPrice: v.number(),
    currentPrice: v.number(),
    marketValue: v.number(),
    unrealizedPl: v.number(),
    unrealizedPlpc: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('positions')
      .withIndex('by_symbol', (q) => q.eq('symbol', args.symbol))
      .first()

    const payload = {
      symbol: args.symbol,
      qty: args.qty,
      avgEntryPrice: args.avgEntryPrice,
      currentPrice: args.currentPrice,
      marketValue: args.marketValue,
      unrealizedPl: args.unrealizedPl,
      unrealizedPlpc: args.unrealizedPlpc,
      updatedAt: Date.now(),
    }

    if (existing) {
      await ctx.db.patch(existing._id, payload)
      return { updated: true }
    }

    await ctx.db.insert('positions', payload)
    return { updated: false }
  },
})

export const cleanupClosed = mutation({
  args: {
    activeSymbols: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const active = new Set(args.activeSymbols)
    const positions = await ctx.db.query('positions').collect()
    let deleted = 0

    for (const position of positions) {
      if (!active.has(position.symbol)) {
        await ctx.db.delete(position._id)
        deleted += 1
      }
    }

    const stalenessItems = await ctx.db.query('stalenessAnalysis').collect()
    let stalenessDeleted = 0
    for (const item of stalenessItems) {
      if (!active.has(item.symbol)) {
        await ctx.db.delete(item._id)
        stalenessDeleted += 1
      }
    }

    return { deleted, stalenessDeleted }
  },
})
