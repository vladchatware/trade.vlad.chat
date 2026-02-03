import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

async function upsertAccount(
  // biome-ignore lint/suspicious/noExplicitAny: Convex ctx typing is omitted in this helper.
  ctx: any,
  args: {
    equity: number
    cash: number
    buyingPower: number
    portfolioValue: number
  }
) {
  const existing = await ctx.db.query('account').first()

  if (existing) {
    await ctx.db.patch(existing._id, {
      equity: args.equity,
      cash: args.cash,
      buyingPower: args.buyingPower,
      portfolioValue: args.portfolioValue,
      updatedAt: Date.now(),
    })
  } else {
    await ctx.db.insert('account', {
      equity: args.equity,
      cash: args.cash,
      buyingPower: args.buyingPower,
      portfolioValue: args.portfolioValue,
      updatedAt: Date.now(),
    })
  }
}

export const updateAccount = mutation({
  args: {
    equity: v.number(),
    cash: v.number(),
    buyingPower: v.number(),
    portfolioValue: v.number(),
  },
  handler: async (ctx, args) => {
    await upsertAccount(ctx, args)
  },
})

export const updateFromWebSocket = mutation({
  args: {
    equity: v.number(),
    cash: v.number(),
    buyingPower: v.number(),
    portfolioValue: v.number(),
  },
  handler: async (ctx, args) => {
    await upsertAccount(ctx, args)
  },
})

export const getAccount = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('account').first()
  },
})
