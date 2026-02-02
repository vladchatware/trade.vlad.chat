import { v } from 'convex/values'
import { calculateCost, completeWithGateway } from '../providers/llm'
import { internal } from './_generated/api'
import { action } from './_generated/server'

export const researchSignal = action({
  args: {
    symbol: v.string(),
    sentiment: v.number(),
    volume: v.number(),
  },
  handler: async (ctx, args) => {
    const prompt = `Analyze ${args.symbol} for potential trading opportunity.
Current sentiment: ${(args.sentiment * 100).toFixed(0)}%
Social volume: ${args.volume}

Respond with JSON:
{
  "verdict": "BUY" | "SKIP" | "WAIT",
  "confidence": 0.0 to 1.0,
  "reasoning": "explanation",
  "red_flags": ["flag1", "flag2"],
  "catalysts": ["catalyst1", "catalyst2"]
}`

    const result = await completeWithGateway({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a stock market analyst. Be concise and accurate.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
    })

    // Track cost
    await ctx.runMutation(internal.llmCosts.track, {
      model: 'gpt-4o-mini',
      tokensIn: result.usage.prompt_tokens,
      tokensOut: result.usage.completion_tokens,
      costUsd: calculateCost('gpt-4o-mini', result.usage),
    })

    try {
      const parsed = JSON.parse(result.content)
      return {
        verdict: parsed.verdict,
        confidence: parsed.confidence,
        reasoning: parsed.reasoning,
        redFlags: parsed.red_flags || [],
        catalysts: parsed.catalysts || [],
      }
    } catch {
      return {
        verdict: 'SKIP',
        confidence: 0,
        reasoning: 'Parse error',
        redFlags: [],
        catalysts: [],
      }
    }
  },
})
