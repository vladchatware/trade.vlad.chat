import { v } from 'convex/values'
import { mutation, query } from './_generated/server'
import { upsertPositionEntry } from './lib/positionEntries'

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

    const positionData = {
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
      await ctx.db.patch(existing._id, positionData)
    } else {
      await ctx.db.insert('positions', positionData)
    }

    await upsertPositionEntry(ctx, {
      symbol: args.symbol,
      qty: args.qty,
      avgEntryPrice: args.avgEntryPrice,
      currentPrice: args.currentPrice,
    })
  },
})

export const cleanupClosed = mutation({
  args: {
    activeSymbols: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const active = new Set(args.activeSymbols)
    const entries = await ctx.db.query('positionEntries').collect()
    let entriesDeleted = 0
    for (const entry of entries) {
      if (!active.has(entry.symbol)) {
        await ctx.db.delete(entry._id)
        entriesDeleted += 1
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

    return { entriesDeleted, stalenessDeleted }
  },
})
