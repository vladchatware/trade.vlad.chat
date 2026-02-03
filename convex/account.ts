import { v } from 'convex/values'
import { type MutationCtx, mutation, query } from './_generated/server'

type AccountArgs = {
  equity: number
  cash: number
  buyingPower: number
  portfolioValue: number
}

async function upsertAccount(ctx: MutationCtx, args: AccountArgs) {
  const existing = await ctx.db.query('account').first()
  const payload = {
    equity: args.equity,
    cash: args.cash,
    buyingPower: args.buyingPower,
    portfolioValue: args.portfolioValue,
    updatedAt: Date.now(),
  }

  if (existing) {
    await ctx.db.patch(existing._id, payload)
    return await ctx.db.get(existing._id)
  }

  const id = await ctx.db.insert('account', payload)
  return await ctx.db.get(id)
}

export const updateAccount = mutation({
  args: {
    equity: v.number(),
    cash: v.number(),
    buyingPower: v.number(),
    portfolioValue: v.number(),
  },
  handler: async (ctx, args) => {
    return await upsertAccount(ctx, args)
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
    return await upsertAccount(ctx, args)
  },
})

export const getAccount = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('account').first()
  },
})
