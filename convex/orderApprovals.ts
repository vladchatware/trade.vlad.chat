import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

export const getByToken = query({
  args: { token: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query('orderApprovals')
      .withIndex('by_token', (q) => q.eq('approvalToken', args.token))
      .first()
  },
})

export const create = mutation({
  args: {
    previewHash: v.string(),
    orderParamsJson: v.string(),
    policyResultJson: v.string(),
    approvalToken: v.string(),
    expiresAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('orderApprovals', {
      ...args,
      createdAt: Date.now(),
    })
  },
})

export const markUsed = mutation({
  args: { approvalId: v.id('orderApprovals') },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.approvalId, {
      usedAt: Date.now(),
    })
  },
})

export const cleanupExpired = mutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now()
    const expired = await ctx.db
      .query('orderApprovals')
      .withIndex('by_expires', (q) => q.lt('expiresAt', now))
      .collect()

    for (const approval of expired) {
      await ctx.db.delete(approval._id)
    }

    return { deleted: expired.length }
  },
})
