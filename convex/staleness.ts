import { mutation } from './_generated/server'

const DEFAULTS = {
  enabled: true,
  minHoldHours: 6,
  maxHoldDays: 3,
  minGainPct: 5,
  midHoldDays: 1.5,
  midMinGainPct: 2,
  socialVolumeDecay: 0.3,
  noMentionsHours: 8,
  recentSignalHours: 6,
}

function clamp01(value: number) {
  return Math.max(0, Math.min(1, value))
}

export const compute = mutation({
  args: {},
  handler: async (ctx) => {
    if (!DEFAULTS.enabled) {
      return { success: true, message: 'Staleness disabled' }
    }

    const now = Date.now()
    const positions = await ctx.db.query('positions').collect()
    if (positions.length === 0) {
      return { success: true, message: 'No positions to analyze' }
    }

    const entries = await ctx.db.query('positionEntries').collect()
    const entryBySymbol = new Map(entries.map((entry) => [entry.symbol, entry]))

    const recentSignals = await ctx.db
      .query('signals')
      .filter((q) => q.gte(q.field('timestamp'), now - DEFAULTS.recentSignalHours * 3600000))
      .collect()

    const signalStats = new Map<string, { lastSeen: number; recentVolume: number }>()

    for (const signal of recentSignals) {
      const existing = signalStats.get(signal.symbol)
      const lastSeen = Math.max(existing?.lastSeen ?? 0, signal.timestamp)
      const recentVolume = (existing?.recentVolume ?? 0) + (signal.volume || 0)
      signalStats.set(signal.symbol, { lastSeen, recentVolume })
    }

    let updated = 0
    for (const position of positions) {
      const entry = entryBySymbol.get(position.symbol)
      if (!entry) {
        continue
      }

      const holdHours = (now - entry.entryTime) / 3600000
      const holdDays = holdHours / 24
      if (holdHours < DEFAULTS.minHoldHours) {
        continue
      }

      const gainPct =
        entry.entryPrice > 0
          ? ((position.currentPrice - entry.entryPrice) / entry.entryPrice) * 100
          : 0

      const stats = signalStats.get(position.symbol)
      const lastSeen = stats?.lastSeen ?? entry.entryTime
      const hoursSinceMention = (now - lastSeen) / 3600000

      const entryVolume = entry.entrySocialVolume ?? 0
      const recentVolume = stats?.recentVolume ?? 0
      const volumeDecay = entryVolume > 0 ? recentVolume / entryVolume : 1

      const reasons: string[] = []
      let score = 0

      if (holdDays >= DEFAULTS.maxHoldDays && gainPct < DEFAULTS.minGainPct) {
        reasons.push('Max hold days exceeded with insufficient gains')
        score += 0.35
      }

      if (holdDays >= DEFAULTS.midHoldDays && gainPct < DEFAULTS.midMinGainPct) {
        reasons.push('Mid-hold period with weak gains')
        score += 0.2
      }

      if (volumeDecay <= DEFAULTS.socialVolumeDecay) {
        reasons.push('Social volume decay below threshold')
        score += 0.25
      }

      if (hoursSinceMention >= DEFAULTS.noMentionsHours) {
        reasons.push('No recent mentions')
        score += 0.2
      }

      const shouldExit = reasons.length > 0
      const normalizedScore = clamp01(score)

      const existing = await ctx.db
        .query('stalenessAnalysis')
        .withIndex('by_symbol', (q) => q.eq('symbol', position.symbol))
        .first()

      const payload = {
        symbol: position.symbol,
        score: normalizedScore,
        holdDays,
        gainPct,
        socialVolumeDecay: volumeDecay,
        shouldExit,
        reasons,
        updatedAt: now,
      }

      if (existing) {
        await ctx.db.patch(existing._id, payload)
      } else {
        await ctx.db.insert('stalenessAnalysis', payload)
      }

      updated += 1
    }

    return { success: true, updated }
  },
})
