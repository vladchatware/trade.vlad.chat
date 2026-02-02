import { v } from 'convex/values'
import { mutation, query } from './_generated/server'

export const track = mutation({
  args: {
    model: v.string(),
    tokensIn: v.number(),
    tokensOut: v.number(),
    costUsd: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('toolLogs', {
      toolName: 'llm-completion',
      requestId: crypto.randomUUID(),
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
  handler: async (ctx) => {
    const logs = await ctx.db
      .query('toolLogs')
      .filter((q) => q.eq(q.field('toolName'), 'llm-completion'))
      .order('desc')
      .take(1000)

    return logs.reduce(
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
  },
})
