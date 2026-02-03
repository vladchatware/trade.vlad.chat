'use node'

import { v } from 'convex/values'
import { z } from 'zod'
import { DEFAULT_LLM_MODEL } from '../shared/llmCatalog'
import { api } from './_generated/api'
import { action } from './_generated/server'
import { calculateCost, completeWithGateway } from './providers/llm'

export type ResearchSignalResult = {
  verdict: 'BUY' | 'SKIP' | 'WAIT'
  confidence: number
  reasoning: string
  redFlags: string[]
  catalysts: string[]
}

export const ResearchSignalSchema = z.object({
  verdict: z.enum(['BUY', 'SKIP', 'WAIT']),
  confidence: z.number().min(0).max(1),
  reasoning: z.string().default(''),
  red_flags: z.array(z.string()).default([]),
  catalysts: z.array(z.string()).default([]),
})

export function extractJsonFromMarkdown(content: string): string {
  const jsonCodeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/)
  if (jsonCodeBlockMatch) {
    return jsonCodeBlockMatch[1]?.trim() ?? ''
  }
  return content.trim()
}

export function parseResearchSignalResponse(content: string): ResearchSignalResult {
  try {
    const jsonContent = extractJsonFromMarkdown(content)
    const parsed = ResearchSignalSchema.parse(JSON.parse(jsonContent))
    return {
      verdict: parsed.verdict,
      confidence: parsed.confidence,
      reasoning: parsed.reasoning,
      redFlags: parsed.red_flags,
      catalysts: parsed.catalysts,
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
}

export const researchSignal = action({
  args: {
    symbol: v.string(),
    sentiment: v.number(),
    volume: v.number(),
  },
  handler: async (ctx, args): Promise<ResearchSignalResult> => {
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

    const model = DEFAULT_LLM_MODEL
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

    await ctx.runMutation(api.llmCosts.track, {
      model,
      tokensIn: result.usage.prompt_tokens,
      tokensOut: result.usage.completion_tokens,
      costUsd: calculateCost(model, result.usage),
    })

    return parseResearchSignalResponse(result.content)
  },
})
