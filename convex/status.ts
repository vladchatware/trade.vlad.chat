import { withTradingConfigDefaults } from '../shared/tradingConfig'
import type { Doc } from './_generated/dataModel'
import { query } from './_generated/server'
import { type LlmStats, aggregateLlmStats } from './llmCosts'

type DashboardStatus = {
  account: Doc<'account'> | null
  positions: Doc<'positions'>[]
  signals: Doc<'signals'>[]
  logs: Doc<'activityLogs'>[]
  marketClock: Doc<'marketClock'> | null
  config: Doc<'config'> | (ReturnType<typeof withTradingConfigDefaults> & { updatedAt: number })
  llmStats: LlmStats
  signalResearch: Doc<'signalResearch'>[]
  positionEntries: Record<string, never>
  stalenessAnalysis: Record<
    string,
    {
      score: number
      holdDays: number
      gainPct: number
      socialVolumeDecay: number
      shouldExit: boolean
      reasons: string[]
      updatedAt: number
    }
  >
  overnightActivity: Doc<'overnightActivity'> | null
  premarketPlan: Doc<'premarketPlans'> | null
  portfolioSnapshots: Doc<'portfolioSnapshots'>[]
}

type StatusInput = {
  account: Doc<'account'> | null
  positions: Doc<'positions'>[]
  signals: Doc<'signals'>[]
  logs: Doc<'activityLogs'>[]
  marketClock: Doc<'marketClock'> | null
  config: Doc<'config'> | null
  portfolioSnapshots: Doc<'portfolioSnapshots'>[]
  stalenessAnalysis: Doc<'stalenessAnalysis'>[]
  llmStats: LlmStats
  signalResearch: Doc<'signalResearch'>[]
  overnightActivity: Doc<'overnightActivity'> | null
  premarketPlan: Doc<'premarketPlans'> | null
}

export function buildStatusResponse(input: StatusInput): DashboardStatus {
  const defaults = withTradingConfigDefaults()

  return {
    account: input.account,
    positions: input.positions,
    signals: input.signals,
    logs: input.logs,
    marketClock: input.marketClock,
    config: input.config ?? {
      ...defaults,
      updatedAt: Date.now(),
    },
    llmStats: input.llmStats,
    signalResearch: input.signalResearch,
    positionEntries: {},
    stalenessAnalysis: input.stalenessAnalysis.reduce(
      (acc, item) => {
        acc[item.symbol] = {
          score: item.score,
          holdDays: item.holdDays,
          gainPct: item.gainPct,
          socialVolumeDecay: item.socialVolumeDecay,
          shouldExit: item.shouldExit,
          reasons: item.reasons,
          updatedAt: item.updatedAt,
        }
        return acc
      },
      {} as DashboardStatus['stalenessAnalysis']
    ),
    overnightActivity: input.overnightActivity,
    premarketPlan: input.premarketPlan,
    portfolioSnapshots: input.portfolioSnapshots,
  }
}

export const get = query({
  args: {},
  handler: async (ctx): Promise<DashboardStatus> => {
    const [
      account,
      positions,
      signals,
      logs,
      marketClock,
      config,
      portfolioSnapshots,
      stalenessAnalysis,
      llmLogs,
      signalResearch,
      overnightActivity,
      premarketPlan,
    ] = await Promise.all([
      ctx.db.query('account').first(),
      ctx.db.query('positions').collect(),
      ctx.db.query('signals').withIndex('by_timestamp').order('desc').take(25),
      ctx.db.query('activityLogs').withIndex('by_timestamp').order('desc').take(60),
      ctx.db.query('marketClock').first(),
      ctx.db.query('config').first(),
      ctx.db.query('portfolioSnapshots').withIndex('by_timestamp').order('desc').take(120),
      ctx.db.query('stalenessAnalysis').collect(),
      ctx.db
        .query('toolLogs')
        .withIndex('by_tool', (q) => q.eq('toolName', 'llm-completion'))
        .order('desc')
        .take(1000),
      ctx.db.query('signalResearch').withIndex('by_timestamp').order('desc').take(20),
      ctx.db.query('overnightActivity').first(),
      ctx.db.query('premarketPlans').withIndex('by_timestamp').order('desc').first(),
    ])

    return buildStatusResponse({
      account,
      positions,
      signals,
      logs,
      marketClock,
      config,
      portfolioSnapshots: portfolioSnapshots.reverse(),
      stalenessAnalysis,
      llmStats: aggregateLlmStats(llmLogs),
      signalResearch,
      overnightActivity,
      premarketPlan,
    })
  },
})
