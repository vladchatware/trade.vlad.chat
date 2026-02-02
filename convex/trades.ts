import { v } from 'convex/values'
import { mutation } from './_generated/server'

export const create = mutation({
  args: {
    alpacaOrderId: v.string(),
    symbol: v.string(),
    side: v.string(),
    qty: v.number(),
    orderType: v.string(),
    status: v.string(),
    approvalId: v.optional(v.id('orderApprovals')),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('trades', {
      ...args,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    })
  },
})
