import { withTradingConfigDefaults } from '../shared/tradingConfig'
import type { Doc } from './_generated/dataModel'
import { mutation } from './_generated/server'

const MIN_HOLD_HOURS = 6
const MID_HOLD_DAYS = 1.5
const MID_MIN_GAIN_PCT = 2
const RECENT_SIGNAL_HOURS = 6

type SignalStats = {
  lastSeen: number
  recentVolume: number
}

type StalenessSettings = {
  enabled: boolean
  maxHoldDays: number
  minGainPct: number
  socialVolumeDecay: number
  noMentionsHours: number
}

export type StalenessResult = {
  score: number
  holdDays: number
  gainPct: number
  socialVolumeDecay: number
  shouldExit: boolean
  reasons: string[]
}

export function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value))
}

export function getStalenessSettings(config: Doc<'config'> | null): StalenessSettings {
  const defaults = withTradingConfigDefaults()
  return {
    enabled: config?.stalePositionEnabled ?? defaults.stalePositionEnabled,
    maxHoldDays: config?.staleMaxHoldDays ?? defaults.staleMaxHoldDays,
    minGainPct: config?.staleMinGainPct ?? defaults.staleMinGainPct,
    socialVolumeDecay: config?.staleSocialVolumeDecay ?? defaults.staleSocialVolumeDecay,
    noMentionsHours: config?.staleNoMentionsHours ?? defaults.staleNoMentionsHours,
  }
}

export function analyzePositionStaleness(params: {
  now: number
  trackedSince: number
  currentPrice: number
  avgEntryPrice: number
  entrySocialVolume: number
  signalStats: SignalStats | undefined
  settings: StalenessSettings
}): StalenessResult {
  const holdHours = (params.now - params.trackedSince) / 3_600_000
  const holdDays = holdHours / 24
  const gainPct =
    params.avgEntryPrice > 0
      ? ((params.currentPrice - params.avgEntryPrice) / params.avgEntryPrice) * 100
      : 0
  const lastSeen = params.signalStats?.lastSeen ?? params.trackedSince
  const hoursSinceMention = (params.now - lastSeen) / 3_600_000
  const recentVolume = params.signalStats?.recentVolume ?? 0
  const baselineVolume = params.entrySocialVolume
  const volumeDecay = baselineVolume > 0 ? recentVolume / baselineVolume : 1

  if (holdHours < MIN_HOLD_HOURS) {
    return {
      score: 0,
      holdDays,
      gainPct,
      socialVolumeDecay: volumeDecay,
      shouldExit: false,
      reasons: [],
    }
  }

  const reasons: string[] = []
  let score = 0

  if (holdDays >= params.settings.maxHoldDays && gainPct < params.settings.minGainPct) {
    reasons.push('Max hold days exceeded with insufficient gains')
    score += 0.35
  }

  if (holdDays >= MID_HOLD_DAYS && gainPct < MID_MIN_GAIN_PCT) {
    reasons.push('Mid-hold period with weak gains')
    score += 0.2
  }

  if (volumeDecay <= params.settings.socialVolumeDecay) {
    reasons.push('Social volume decay below threshold')
    score += 0.25
  }

  if (hoursSinceMention >= params.settings.noMentionsHours) {
    reasons.push('No recent mentions')
    score += 0.2
  }

  return {
    score: clamp01(score),
    holdDays,
    gainPct,
    socialVolumeDecay: volumeDecay,
    shouldExit: reasons.length > 0,
    reasons,
  }
}

export const compute = mutation({
  args: {},
  handler: async (ctx) => {
    const [config, positions] = await Promise.all([
      ctx.db.query('config').first(),
      ctx.db.query('positions').collect(),
    ])
    const settings = getStalenessSettings(config)
    if (!settings.enabled) {
      return { success: true, message: 'Staleness disabled' }
    }
    if (positions.length === 0) {
      return { success: true, message: 'No positions to analyze' }
    }

    const now = Date.now()
    const recentSignals = await ctx.db
      .query('signals')
      .withIndex('by_timestamp', (q) => q.gte('timestamp', now - RECENT_SIGNAL_HOURS * 3_600_000))
      .collect()
    const signalStats = new Map<string, SignalStats>()
    for (const signal of recentSignals) {
      const existing = signalStats.get(signal.symbol)
      signalStats.set(signal.symbol, {
        lastSeen: Math.max(existing?.lastSeen ?? 0, signal.timestamp),
        recentVolume: (existing?.recentVolume ?? 0) + (signal.volume || 0),
      })
    }

    const existingItems = await ctx.db.query('stalenessAnalysis').collect()
    const existingBySymbol = new Map(existingItems.map((item) => [item.symbol, item]))

    let updated = 0
    for (const position of positions) {
      const existing = existingBySymbol.get(position.symbol)
      const trackedSince = existing?.trackedSince ?? position.updatedAt ?? now
      const stats = signalStats.get(position.symbol)
      const entrySocialVolume = existing?.entrySocialVolume ?? stats?.recentVolume ?? 0
      const analysis = analyzePositionStaleness({
        now,
        trackedSince,
        currentPrice: position.currentPrice,
        avgEntryPrice: position.avgEntryPrice,
        entrySocialVolume,
        signalStats: stats,
        settings,
      })

      const payload = {
        symbol: position.symbol,
        score: analysis.score,
        holdDays: analysis.holdDays,
        gainPct: analysis.gainPct,
        socialVolumeDecay: analysis.socialVolumeDecay,
        shouldExit: analysis.shouldExit,
        reasons: analysis.reasons,
        trackedSince,
        entrySocialVolume,
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
