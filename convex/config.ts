import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

export const get = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query('config').first()
  },
})

export const update = mutation({
  args: {
    maxPositionValue: v.number(),
    maxPositions: v.number(),
    minSentimentScore: v.number(),
    minAnalystConfidence: v.number(),
    sellSentimentThreshold: v.optional(v.number()),
    takeProfitPct: v.number(),
    stopLossPct: v.number(),
    positionSizePctOfCash: v.number(),
    dataPollIntervalMs: v.optional(v.number()),
    analystIntervalMs: v.optional(v.number()),
    llmModel: v.string(),
    llmAnalystModel: v.optional(v.string()),
    llmMaxTokens: v.optional(v.number()),
    cryptoEnabled: v.optional(v.boolean()),
    cryptoSymbols: v.optional(v.array(v.string())),
    cryptoMomentumThreshold: v.optional(v.number()),
    cryptoMaxPositionValue: v.optional(v.number()),
    cryptoTakeProfitPct: v.optional(v.number()),
    cryptoStopLossPct: v.optional(v.number()),
    optionsEnabled: v.optional(v.boolean()),
    optionsMaxPctPerTrade: v.optional(v.number()),
    optionsMinConfidence: v.optional(v.number()),
    optionsMinDte: v.optional(v.number()),
    optionsMaxDte: v.optional(v.number()),
    optionsTargetDelta: v.optional(v.number()),
    optionsMaxPositions: v.optional(v.number()),
    optionsStopLossPct: v.optional(v.number()),
    optionsTakeProfitPct: v.optional(v.number()),
    stalePositionEnabled: v.optional(v.boolean()),
    staleMaxHoldDays: v.optional(v.number()),
    staleMinGainPct: v.optional(v.number()),
    staleSocialVolumeDecay: v.optional(v.number()),
    staleNoMentionsHours: v.optional(v.number()),
    startingEquity: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query('config').first()
    const config = {
      ...args,
      updatedAt: Date.now(),
    }
    if (existing) {
      await ctx.db.patch(existing._id, config)
    } else {
      await ctx.db.insert('config', config)
    }
    return config
  },
})

export const enableCrypto = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query('config').first()
    if (existing) {
      await ctx.db.patch(existing._id, {
        cryptoEnabled: true,
        cryptoSymbols: ['BTC', 'ETH', 'SOL'],
        updatedAt: Date.now(),
      })
      return { success: true, message: 'Crypto trading enabled (BTC, ETH, SOL)' }
    }
    // Create default config with crypto enabled if none exists
    await ctx.db.insert('config', {
      maxPositionValue: 2000,
      maxPositions: 3,
      minSentimentScore: 0.7,
      minAnalystConfidence: 0.8,
      takeProfitPct: 10,
      stopLossPct: 5,
      positionSizePctOfCash: 20,
      llmModel: 'moonshotai/kimi-k2.5',
      llmAnalystModel: 'moonshotai/kimi-k2.5',
      cryptoEnabled: true,
      cryptoSymbols: ['BTC', 'ETH', 'SOL'],
      updatedAt: Date.now(),
    })
    return { success: true, message: 'Created config with crypto enabled (BTC, ETH, SOL)' }
  },
})
