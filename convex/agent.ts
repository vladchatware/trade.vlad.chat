'use node'

import { openai } from '@ai-sdk/openai'
import { Agent, createThread } from '@convex-dev/agent'
import { tool } from 'ai'
import { z } from 'zod'
import { api, components } from './_generated/api'
import { action } from './_generated/server'

type CycleSnapshot = {
  account: unknown
  positions: unknown[]
  signals: unknown[]
  marketClock: unknown
  riskState: unknown
  config: unknown
}

export function buildFirstAgentPrompt(snapshot: CycleSnapshot): string {
  return [
    'You are MAHORAGA_TRADER_V2 (bootstrap mode).',
    'You are running in Convex cron and must reason from Convex state.',
    'Output one of: HOLD, BUY_CANDIDATE, SELL_CANDIDATE.',
    'Do not invent external data. Mention uncertainty explicitly.',
    '',
    'Snapshot:',
    JSON.stringify(snapshot),
  ].join('\n')
}

const classifyIntent = tool({
  description: 'Convert free-form reasoning into one strict intent label.',
  inputSchema: z.object({ decision: z.enum(['HOLD', 'BUY_CANDIDATE', 'SELL_CANDIDATE']) }),
  execute: async (args) => {
    return { normalizedDecision: args.decision }
  },
})

export const tradingAgent = new Agent(components.agent, {
  name: 'MAHORAGA V2 Agent',
  languageModel: openai.chat(process.env.LLM_AGENT_MODEL || 'gpt-4o-mini'),
  instructions:
    'You are a cautious trading copilot. Prioritize risk controls and deterministic reasoning over action-taking.',
  tools: {
    classifyIntent,
  },
  maxSteps: 3,
})

export const runCycle = action({
  args: {},
  handler: async (ctx) => {
    if (!process.env.OPENAI_API_KEY) {
      return { status: 'skipped', reason: 'missing_openai_api_key' as const }
    }

    const [status, riskState] = await Promise.all([
      ctx.runQuery(api.status.get, {}),
      ctx.runQuery(api.riskState.get, {}),
    ])

    if (riskState?.killSwitchActive) {
      return { status: 'skipped', reason: 'kill_switch_active' as const }
    }

    const threadId = await createThread(ctx, components.agent)
    const prompt = buildFirstAgentPrompt({
      account: status.account,
      positions: status.positions,
      signals: status.signals,
      marketClock: status.marketClock,
      riskState,
      config: status.config,
    })

    const result = await tradingAgent.generateText(ctx, { threadId }, { prompt })

    await ctx.runMutation(api.activityLogs.create, {
      agent: 'ConvexAgentV2',
      action: 'cycle_complete',
      detailsJson: JSON.stringify({ text: result.text }),
    })

    return { status: 'success' as const, text: result.text }
  },
})
