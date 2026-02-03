import { v } from 'convex/values'
import { mutation } from './_generated/server'

export const MAX_POINTS = 120

export function appendHistorySeries(
  prices: number[],
  timestamps: number[],
  price: number,
  timestamp: number,
  maxPoints: number = MAX_POINTS
) {
  return {
    prices: [...prices, price].slice(-maxPoints),
    timestamps: [...timestamps, timestamp].slice(-maxPoints),
  }
}

export const upsert = mutation({
  args: {
    symbol: v.string(),
    price: v.number(),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('positionHistory')
      .withIndex('by_symbol', (q) => q.eq('symbol', args.symbol))
      .first()

    if (existing) {
      const { prices, timestamps } = appendHistorySeries(
        existing.prices,
        existing.timestamps,
        args.price,
        args.timestamp
      )
      await ctx.db.patch(existing._id, {
        prices,
        timestamps,
        updatedAt: args.timestamp,
      })
      return { updated: true }
    }

    await ctx.db.insert('positionHistory', {
      symbol: args.symbol,
      prices: [args.price],
      timestamps: [args.timestamp],
      updatedAt: args.timestamp,
    })
    return { updated: false }
  },
})
