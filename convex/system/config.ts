import { v } from 'convex/values'
import { withTradingConfigDefaults } from '../../shared/tradingConfig'
import { mutation, query } from '../_generated/server'

function defaultsForStorage() {
  const defaults = withTradingConfigDefaults()
  return {
    maxPositionValue: defaults.maxPositionValue,
    maxPositions: defaults.maxPositions,
    minSentimentScore: defaults.minSentimentScore,
    minAnalystConfidence: defaults.minAnalystConfidence,
    sellSentimentThreshold: defaults.sellSentimentThreshold,
    takeProfitPct: defaults.takeProfitPct,
    stopLossPct: defaults.stopLossPct,
    positionSizePctOfCash: defaults.positionSizePctOfCash,
    dataPollIntervalMs: defaults.dataPollIntervalMs,
    analystIntervalMs: defaults.analystIntervalMs,
    llmModel: defaults.llmModel,
    llmAnalystModel: defaults.llmAnalystModel,
    llmMaxTokens: defaults.llmMaxTokens,
    cryptoEnabled: defaults.cryptoEnabled,
    cryptoSymbols: defaults.cryptoSymbols,
    cryptoMomentumThreshold: defaults.cryptoMomentumThreshold,
    cryptoMaxPositionValue: defaults.cryptoMaxPositionValue,
    cryptoTakeProfitPct: defaults.cryptoTakeProfitPct,
    cryptoStopLossPct: defaults.cryptoStopLossPct,
    optionsEnabled: defaults.optionsEnabled,
    optionsMaxPctPerTrade: defaults.optionsMaxPctPerTrade,
    optionsMinConfidence: defaults.optionsMinConfidence,
    optionsMinDte: defaults.optionsMinDte,
    optionsMaxDte: defaults.optionsMaxDte,
    optionsTargetDelta: defaults.optionsTargetDelta,
    optionsMaxPositions: defaults.optionsMaxPositions,
    optionsStopLossPct: defaults.optionsStopLossPct,
    optionsTakeProfitPct: defaults.optionsTakeProfitPct,
    stalePositionEnabled: defaults.stalePositionEnabled,
    staleMaxHoldDays: defaults.staleMaxHoldDays,
    staleMinGainPct: defaults.staleMinGainPct,
    staleSocialVolumeDecay: defaults.staleSocialVolumeDecay,
    staleNoMentionsHours: defaults.staleNoMentionsHours,
    startingEquity: defaults.startingEquity,
  }
}

export const get = query({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query('config').first()
    return existing ?? { ...defaultsForStorage(), updatedAt: Date.now() }
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
    const payload = { ...args, updatedAt: Date.now() }
    const existing = await ctx.db.query('config').first()

    if (existing) {
      await ctx.db.patch(existing._id, payload)
      return { ...existing, ...payload }
    }

    const id = await ctx.db.insert('config', payload)
    return await ctx.db.get(id)
  },
})
