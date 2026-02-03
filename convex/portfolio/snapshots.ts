import { v } from 'convex/values'
import { mutation } from '../_generated/server'

export const createSnapshot = mutation({
  args: {
    equity: v.number(),
    pl: v.number(),
    plPct: v.number(),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert('portfolioSnapshots', {
      equity: args.equity,
      pl: args.pl,
      plPct: args.plPct,
      timestamp: Date.now(),
    })
  },
})
