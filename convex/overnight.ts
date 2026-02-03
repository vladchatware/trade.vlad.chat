import { v } from 'convex/values'
import { mutation } from './_generated/server'

type SignalRow = { sentiment?: number }
type ResearchRow = {
  verdict: 'BUY' | 'SKIP' | 'WAIT'
  confidence: number
  reasoning: string
  symbol: string
}

export function buildOvernightActivity(
  signals: SignalRow[],
  research: ResearchRow[],
  confirmations: unknown[],
  latestPlanTimestamp: number | null,
  since: number,
  now: number
) {
  const buySignals = research.filter((item) => item.verdict === 'BUY').length
  const premarketPlanReady = latestPlanTimestamp !== null ? latestPlanTimestamp >= since : false

  return {
    signalsGathered: signals.length,
    signalsResearched: research.length,
    buySignals,
    twitterConfirmations: confirmations.length,
    premarketPlanReady,
    lastUpdated: now,
  }
}

export function buildPremarketPlan(signals: SignalRow[], research: ResearchRow[], now: number) {
  const avgSentiment =
    signals.length > 0
      ? signals.reduce((sum, signal) => sum + (signal.sentiment || 0), 0) / signals.length
      : 0

  const marketOutlook =
    avgSentiment >= 0.2
      ? 'Bullish bias: sentiment elevated across recent signals.'
      : avgSentiment <= -0.1
        ? 'Cautious bias: sentiment subdued across recent signals.'
        : 'Neutral bias: mixed sentiment across recent signals.'

  const candidates = research
    .filter((item) => item.verdict === 'BUY' && item.confidence >= 0.7)
    .slice(0, 12)

  const highConvictionPlays = Array.from(new Set(candidates.map((item) => item.symbol))).slice(0, 5)
  const recommendations = candidates.map((item) => ({
    symbol: item.symbol,
    action: 'BUY' as const,
    confidence: item.confidence,
    reasoning: item.reasoning,
  }))

  const summary =
    recommendations.length > 0
      ? `High conviction: ${highConvictionPlays.join(', ')}`
      : 'No high conviction plays from overnight research.'

  return {
    timestamp: now,
    summary,
    recommendations,
    highConvictionPlays,
    marketOutlook,
  }
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(max, value))
}

export const computeOvernightActivity = mutation({
  args: {
    lookbackHours: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const lookbackHours = clamp(args.lookbackHours ?? 12, 1, 48)
    const since = Date.now() - lookbackHours * 60 * 60 * 1000

    const [signals, research, confirmations, latestPlan] = await Promise.all([
      ctx.db
        .query('signals')
        .withIndex('by_timestamp', (q) => q.gte('timestamp', since))
        .collect(),
      ctx.db
        .query('signalResearch')
        .withIndex('by_timestamp', (q) => q.gte('timestamp', since))
        .collect(),
      ctx.db
        .query('twitterConfirmations')
        .withIndex('by_timestamp', (q) => q.gte('timestamp', since))
        .collect(),
      ctx.db.query('premarketPlans').withIndex('by_timestamp').order('desc').first(),
    ])

    const payload = buildOvernightActivity(
      signals,
      research,
      confirmations,
      latestPlan?.timestamp ?? null,
      since,
      Date.now()
    )

    const existing = await ctx.db.query('overnightActivity').first()
    if (existing) {
      await ctx.db.patch(existing._id, payload)
      return { ...payload, updated: true }
    }

    await ctx.db.insert('overnightActivity', payload)
    return { ...payload, updated: false }
  },
})

export const generatePremarketPlan = mutation({
  args: {
    lookbackHours: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const lookbackHours = clamp(args.lookbackHours ?? 12, 1, 48)
    const since = Date.now() - lookbackHours * 60 * 60 * 1000

    const [signals, research] = await Promise.all([
      ctx.db
        .query('signals')
        .withIndex('by_timestamp', (q) => q.gte('timestamp', since))
        .collect(),
      ctx.db
        .query('signalResearch')
        .withIndex('by_timestamp', (q) => q.gte('timestamp', since))
        .collect(),
    ])

    const plan = buildPremarketPlan(signals, research, Date.now())
    const id = await ctx.db.insert('premarketPlans', plan)
    return { ...plan, id }
  },
})
