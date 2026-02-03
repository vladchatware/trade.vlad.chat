import { v } from 'convex/values'
import type { Id } from '../_generated/dataModel'
import { mutation } from '../_generated/server'

export type TradeCreateArgs = {
  alpacaOrderId: string
  symbol: string
  side: string
  qty: number
  orderType: string
  limitPrice?: number
  stopPrice?: number
  status: string
  filledQty?: number
  filledAvgPrice?: number
  notional?: number
  approvalId?: Id<'orderApprovals'>
}

export function toTradeMutationPayload(args: TradeCreateArgs, now: number) {
  return {
    ...args,
    updatedAt: now,
  }
}

export const create = mutation({
  args: {
    alpacaOrderId: v.string(),
    symbol: v.string(),
    side: v.string(),
    qty: v.number(),
    orderType: v.string(),
    limitPrice: v.optional(v.number()),
    stopPrice: v.optional(v.number()),
    status: v.string(),
    filledQty: v.optional(v.number()),
    filledAvgPrice: v.optional(v.number()),
    notional: v.optional(v.number()),
    approvalId: v.optional(v.id('orderApprovals')),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query('trades')
      .withIndex('by_alpaca_order_id', (q) => q.eq('alpacaOrderId', args.alpacaOrderId))
      .first()

    const now = Date.now()
    const payload = toTradeMutationPayload(args, now)

    if (existing) {
      await ctx.db.patch(existing._id, payload)
      return existing._id
    }

    return await ctx.db.insert('trades', {
      ...payload,
      createdAt: now,
    })
  },
})
