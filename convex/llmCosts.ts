import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

export type LlmStats = {
  totalUsd: number
  calls: number
  tokensIn: number
  tokensOut: number
}

type CostPayload = {
  cost_usd?: unknown
  tokens_in?: unknown
  tokens_out?: unknown
}

function toNumber(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function parseLlmCostOutput(outputJson: string | undefined): CostPayload {
  if (!outputJson) return {}
  try {
    const parsed = JSON.parse(outputJson)
    return typeof parsed === 'object' && parsed !== null ? (parsed as CostPayload) : {}
  } catch {
    return {}
  }
}

export function aggregateLlmStats(logs: Array<{ outputJson?: string }>): LlmStats {
  return logs.reduce<LlmStats>(
    (acc, log) => {
      const output = parseLlmCostOutput(log.outputJson)
      return {
        totalUsd: acc.totalUsd + toNumber(output.cost_usd),
        calls: acc.calls + 1,
        tokensIn: acc.tokensIn + toNumber(output.tokens_in),
        tokensOut: acc.tokensOut + toNumber(output.tokens_out),
      }
    },
    { totalUsd: 0, calls: 0, tokensIn: 0, tokensOut: 0 }
  )
}

export const track = mutation({
  args: {
    model: v.string(),
    tokensIn: v.number(),
    tokensOut: v.number(),
    costUsd: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('toolLogs', {
      requestId: crypto.randomUUID(),
      toolName: 'llm-completion',
      inputHash: '',
      inputJson: JSON.stringify({ model: args.model }),
      outputJson: JSON.stringify({
        tokens_in: args.tokensIn,
        tokens_out: args.tokensOut,
        cost_usd: args.costUsd,
      }),
      providerCalls: 1,
      latencyMs: 0,
      createdAt: Date.now(),
    })
  },
})

export const getStats = query({
  args: {},
  handler: async (ctx): Promise<LlmStats> => {
    const logs = await ctx.db
      .query('toolLogs')
      .withIndex('by_tool', (q) => q.eq('toolName', 'llm-completion'))
      .order('desc')
      .take(1000)

    return aggregateLlmStats(logs)
  },
})
