import { v } from 'convex/values'
import { mutation, query } from '../_generated/server'

export const getLatestBySymbol = query({
  args: { symbol: v.string() },
  handler: async (ctx, args) => {
    const recent = await ctx.db
      .query('signalResearch')
      .withIndex('by_symbol', (q) => q.eq('symbol', args.symbol))
      .order('desc')
      .take(1)
    return recent[0] ?? null
  },
})

export const upsert = mutation({
  args: {
    symbol: v.string(),
    verdict: v.union(v.literal('BUY'), v.literal('SKIP'), v.literal('WAIT')),
    confidence: v.number(),
    entryQuality: v.union(
      v.literal('excellent'),
      v.literal('good'),
      v.literal('fair'),
      v.literal('poor')
    ),
    reasoning: v.string(),
    redFlags: v.array(v.string()),
    catalysts: v.array(v.string()),
    sentiment: v.number(),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('signalResearch')
      .withIndex('by_symbol', (q) => q.eq('symbol', args.symbol))
      .order('desc')
      .take(1)

    if (existing[0]) {
      await ctx.db.patch(existing[0]._id, args)
      return { ...args, updated: true }
    }

    const id = await ctx.db.insert('signalResearch', args)
    return { ...args, id, updated: false }
  },
})
