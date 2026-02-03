import { query } from './_generated/server'

export const get = query({
  args: {},
  handler: async (ctx) => {
    // Fetch data from database
    const [
      config,
      riskState,
      signals,
      logs,
      positions,
      signalResearch,
      marketClock,
      portfolioSnapshots,
      account,
      positionEntries,
      stalenessAnalysis,
      overnightActivity,
      premarketPlan,
      twitterConfirmations,
      positionHistory,
    ] = await Promise.all([
      ctx.db.query('config').first(),
      ctx.db.query('riskState').first(),
      ctx.db.query('signals').order('desc').take(20),
      ctx.db.query('activityLogs').order('desc').take(50),
      ctx.db.query('positions').collect(),
      ctx.db.query('signalResearch').order('desc').take(20),
      ctx.db.query('marketClock').first(),
      ctx.db.query('portfolioSnapshots').order('desc').take(48),
      ctx.db.query('account').first(),
      ctx.db.query('positionEntries').collect(),
      ctx.db.query('stalenessAnalysis').collect(),
      ctx.db.query('overnightActivity').first(),
      ctx.db.query('premarketPlans').order('desc').first(),
      ctx.db.query('twitterConfirmations').order('desc').take(200),
      ctx.db.query('positionHistory').collect(),
    ])

    const positionEntriesBySymbol = positionEntries.reduce(
      (acc, entry) => {
        acc[entry.symbol] = {
          entry_time: entry.entryTime,
          entry_price: entry.entryPrice,
          entry_sentiment: entry.entrySentiment,
          entry_reason: entry.entryReason,
          entry_social_volume: entry.entrySocialVolume ?? 0,
          entry_sources: entry.entrySources ?? [],
          peak_price: entry.peakPrice ?? entry.entryPrice,
          peak_sentiment: entry.peakSentiment ?? entry.entrySentiment,
        }
        return acc
      },
      {} as Record<
        string,
        {
          entry_time: number
          entry_price: number
          entry_sentiment: number
          entry_reason: string
          entry_social_volume: number
          entry_sources: string[]
          peak_price: number
          peak_sentiment: number
        }
      >
    )

    const stalenessBySymbol = stalenessAnalysis.reduce(
      (acc, item) => {
        acc[item.symbol] = {
          score: item.score,
          holdDays: item.holdDays,
          gainPct: item.gainPct,
          socialVolumeDecay: item.socialVolumeDecay,
          shouldExit: item.shouldExit,
          reasons: item.reasons,
        }
        return acc
      },
      {} as Record<
        string,
        {
          score: number
          holdDays: number
          gainPct: number
          socialVolumeDecay: number
          shouldExit: boolean
          reasons: string[]
        }
      >
    )

    const twitterConfirmationsBySymbol = twitterConfirmations.reduce(
      (acc, confirmation) => {
        acc[confirmation.symbol] = confirmation
        return acc
      },
      {} as Record<string, (typeof twitterConfirmations)[number]>
    )

    const positionHistoryBySymbol = positionHistory.reduce(
      (acc, history) => {
        acc[history.symbol] = {
          symbol: history.symbol,
          prices: history.prices,
          timestamps: history.timestamps,
        }
        return acc
      },
      {} as Record<string, { symbol: string; prices: number[]; timestamps: number[] }>
    )

    // Calculate LLM cost stats from tool logs
    const llmLogs = await ctx.db
      .query('toolLogs')
      .filter((q) => q.eq(q.field('toolName'), 'llm-completion'))
      .order('desc')
      .take(1000)

    const llmStats = llmLogs.reduce(
      (acc, log) => {
        const output = JSON.parse(log.outputJson || '{}')
        return {
          totalUsd: acc.totalUsd + (output.cost_usd || 0),
          calls: acc.calls + 1,
          tokensIn: acc.tokensIn + (output.tokens_in || 0),
          tokensOut: acc.tokensOut + (output.tokens_out || 0),
        }
      },
      { totalUsd: 0, calls: 0, tokensIn: 0, tokensOut: 0 }
    )

    return {
      config,
      riskState,
      signals,
      logs,
      positions,
      signalResearch,
      marketClock,
      portfolioSnapshots,
      llmStats,
      account,
      startingEquity: config?.startingEquity || 100000,
      overnightActivity,
      premarketPlan,
      positionEntries: positionEntriesBySymbol,
      stalenessAnalysis: stalenessBySymbol,
      twitterConfirmations: twitterConfirmationsBySymbol,
      positionHistory: positionHistoryBySymbol,
    }
  },
})
