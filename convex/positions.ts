import { query } from './_generated/server'

export const getAll = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('positions').collect()
  },
})

export const getBySymbol = query({
  args: {},
  handler: async (ctx, args: { symbol: string }) => {
    return await ctx.db
      .query('positions')
      .withIndex('by_symbol', (q) => q.eq('symbol', args.symbol))
      .first()
  },
})
