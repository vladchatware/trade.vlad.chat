'use node'

import { v } from 'convex/values'
import { api } from '../_generated/api'
import { action } from '../_generated/server'
import { pickSignalResearchCandidates } from './research'

export const run = action({
  args: {
    maxSymbols: v.optional(v.number()),
    minVolume: v.optional(v.number()),
    lookbackMinutes: v.optional(v.number()),
    refreshWindowMinutes: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now()
    const maxSymbols = Math.min(Math.max(args.maxSymbols ?? 5, 1), 10)
    const minVolume = Math.max(args.minVolume ?? 1, 0)
    const lookbackMinutes = Math.min(Math.max(args.lookbackMinutes ?? 180, 10), 1440)
    const refreshWindowMinutes = Math.min(Math.max(args.refreshWindowMinutes ?? 240, 15), 1440)

    await ctx.runMutation(api.system.activityLogs.create, {
      agent: 'SignalResearch',
      action: 'research_cycle_started',
      detailsJson: JSON.stringify({ maxSymbols, minVolume, lookbackMinutes, refreshWindowMinutes }),
    })

    const signals: Array<{
      symbol: string
      sentiment: number
      volume: number
      timestamp: number
    }> = await ctx.runQuery(api.signals.queries.getTop, { limit: maxSymbols * 8 })
    const candidates = pickSignalResearchCandidates(
      signals.map((signal) => ({
        symbol: signal.symbol,
        sentiment: signal.sentiment,
        volume: signal.volume,
        timestamp: signal.timestamp,
      })),
      maxSymbols,
      minVolume,
      now - lookbackMinutes * 60 * 1000
    )

    let refreshed = 0
    let skippedFresh = 0
    let failed = 0

    for (const candidate of candidates) {
      try {
        const latest = await ctx.runQuery(api.signals.researchStore.getLatestBySymbol, {
          symbol: candidate.symbol,
        })

        if (latest && now - latest.timestamp < refreshWindowMinutes * 60 * 1000) {
          skippedFresh += 1
          continue
        }

        const analyzed = await ctx.runAction(api.signals.research.researchSignal, {
          symbol: candidate.symbol,
          sentiment: candidate.sentiment,
          volume: candidate.volume,
        })

        await ctx.runMutation(api.signals.researchStore.upsert, {
          symbol: candidate.symbol,
          verdict: analyzed.verdict,
          confidence: analyzed.confidence,
          entryQuality: analyzed.entryQuality,
          reasoning: analyzed.reasoning,
          redFlags: analyzed.redFlags,
          catalysts: analyzed.catalysts,
          sentiment: candidate.sentiment,
          timestamp: now,
        })
        refreshed += 1
      } catch {
        failed += 1
      }
    }

    await ctx.runMutation(api.system.activityLogs.create, {
      agent: 'SignalResearch',
      action: 'research_cycle_completed',
      detailsJson: JSON.stringify({
        candidates: candidates.length,
        refreshed,
        skippedFresh,
        failed,
      }),
    })

    return {
      status: 'ok' as const,
      candidates: candidates.length,
      refreshed,
      skippedFresh,
      failed,
    }
  },
})
