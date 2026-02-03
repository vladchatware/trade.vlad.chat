'use node'

import { createThread, searchThreadTitles } from '@convex-dev/agent'
import { z } from 'zod'
import type { withTradingConfigDefaults } from '../../shared/tradingConfig'
import { api, components } from '../_generated/api'
import type { Doc } from '../_generated/dataModel'
import { type ActionCtx, action } from '../_generated/server'
import { createTradingCycleAgent } from '../agents'

type CycleSnapshot = {
  account: Doc<'account'> | null
  positions: Doc<'positions'>[]
  signals: Doc<'signals'>[]
  marketClock: Doc<'marketClock'> | null
  riskState: Doc<'riskState'> | null
  config: Doc<'config'> | (ReturnType<typeof withTradingConfigDefaults> & { updatedAt: number })
}

type StatusSnapshot = {
  account: CycleSnapshot['account']
  positions: CycleSnapshot['positions']
  signals: CycleSnapshot['signals']
  marketClock: CycleSnapshot['marketClock']
  config: CycleSnapshot['config']
}

type RunCycleResult =
  | { status: 'skipped'; reason: 'kill_switch_active' }
  | { status: 'success'; decision: 'HOLD' | 'BUY_CANDIDATE' | 'SELL_CANDIDATE'; rationale: string }

const TradingDecisionSchema = z.object({
  decision: z.enum(['HOLD', 'BUY_CANDIDATE', 'SELL_CANDIDATE']),
  rationale: z.string().min(1),
})

export function buildTradingCyclePrompt(snapshot: CycleSnapshot): string {
  return `Task: choose exactly one label for this cycle: HOLD, BUY_CANDIDATE, or SELL_CANDIDATE.
Return the label and a brief rationale grounded in the snapshot.

Snapshot:
${JSON.stringify(snapshot)}`
}

export function getTradingCycleThreadTitle(now = new Date()): string {
  return `trading-cycle-${now.toISOString().slice(0, 10)}`
}

async function getOrCreateTradingCycleThread(ctx: ActionCtx): Promise<string> {
  const title = getTradingCycleThreadTitle()
  const existing = await searchThreadTitles(ctx, components.agent, {
    query: title,
    limit: 10,
  })
  const activeThread = existing.find((thread) => thread.title === title)
  if (activeThread) return activeThread._id

  return createThread(ctx, components.agent, {
    title,
    summary: 'Daily thread for scheduled trading cycle decisions.',
  })
}

export const runCycle = action({
  args: {},
  handler: async (ctx): Promise<RunCycleResult> => {
    const [status, riskState]: [StatusSnapshot, Doc<'riskState'> | null] = await Promise.all([
      ctx.runQuery(api.system.status.get, {}),
      ctx.runQuery(api.system.riskState.get, {}),
    ])

    if (riskState?.killSwitchActive) {
      return { status: 'skipped', reason: 'kill_switch_active' as const }
    }

    const threadId = await getOrCreateTradingCycleThread(ctx)
    const configuredModel: string = status.config.llmModel
    const tradingAgent = createTradingCycleAgent(configuredModel)
    const prompt = buildTradingCyclePrompt({
      account: status.account,
      positions: status.positions,
      signals: status.signals,
      marketClock: status.marketClock,
      riskState,
      config: status.config,
    })

    const result = await tradingAgent.generateObject(
      ctx,
      { threadId },
      {
        schema: TradingDecisionSchema,
        prompt,
        temperature: 0.2,
      }
    )

    await ctx.runMutation(api.system.activityLogs.create, {
      agent: 'TradingCycleAgent',
      action: 'cycle_complete',
      detailsJson: JSON.stringify({
        decision: result.object.decision,
        rationale: result.object.rationale,
      }),
    })

    return {
      status: 'success' as const,
      decision: result.object.decision,
      rationale: result.object.rationale,
    }
  },
})
