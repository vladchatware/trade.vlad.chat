'use node'

import { v } from 'convex/values'
import { api } from './_generated/api'
import { action } from './_generated/server'
import { calculateCost, completeWithGateway } from './providers/llm'

/**
 * Extracts JSON from a string that may be wrapped in markdown code blocks.
 * Handles cases like:
 *   ```json
 *   { ... }
 *   ```
 * Or plain JSON strings.
 */
function extractJsonFromMarkdown(content: string): string {
  // Try to extract JSON from markdown code blocks
  const jsonCodeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (jsonCodeBlockMatch) {
    return jsonCodeBlockMatch[1].trim()
  }

  // No code block found, return the content as-is (trimmed)
  return content.trim()
}

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

    // Use Kimi K2.5 for analysis (fast and accurate)
    const model = 'moonshotai/kimi-k2.5'

    const result = await completeWithGateway({
      model,
      messages: [
        {
          role: 'system',
          content:
            'You are a stock market analyst. Be concise and accurate. Always respond with valid JSON.',
        },
        { role: 'user', content: prompt },
      ],
      temperature: 0.3,
    })

    // Track cost
    await ctx.runMutation(api.llmCosts.track, {
      model,
      tokensIn: result.usage.prompt_tokens,
      tokensOut: result.usage.completion_tokens,
      costUsd: calculateCost(model, result.usage),
    })

    try {
      // Extract JSON from markdown if present, then parse
      const jsonContent = extractJsonFromMarkdown(result.content)
      const parsed = JSON.parse(jsonContent)
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
