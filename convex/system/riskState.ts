import { v } from 'convex/values'
import { mutation, query } from '../_generated/server'

export const get = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('riskState').first()
  },
})

export const upsert = mutation({
  args: {
    killSwitchActive: v.boolean(),
    killSwitchReason: v.optional(v.string()),
    dailyLossUsd: v.number(),
    dailyLossResetAt: v.number(),
    cooldownUntil: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query('riskState').first()
    const payload = { ...args, updatedAt: Date.now() }
    if (existing) {
      await ctx.db.patch(existing._id, payload)
      return await ctx.db.get(existing._id)
    }
    const id = await ctx.db.insert('riskState', payload)
    return await ctx.db.get(id)
  },
})

export function buildResetDailyLossState(
  existing:
    | {
        killSwitchActive?: boolean
        killSwitchReason?: string
        cooldownUntil?: number
      }
    | null
    | undefined,
  now: number
) {
  return {
    killSwitchActive: existing?.killSwitchActive ?? false,
    killSwitchReason: existing?.killSwitchReason,
    dailyLossUsd: 0,
    dailyLossResetAt: now,
    cooldownUntil: existing?.cooldownUntil,
  }
}

export const resetDailyLoss = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query('riskState').first()
    const nextState = buildResetDailyLossState(existing, Date.now())

    if (existing) {
      await ctx.db.patch(existing._id, nextState)
      return { reset: true, created: false }
    }

    await ctx.db.insert('riskState', nextState)
    return { reset: true, created: true }
  },
})
