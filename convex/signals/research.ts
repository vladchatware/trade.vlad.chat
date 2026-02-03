'use node'

import { createOpenAI } from '@ai-sdk/openai'
import { generateObject } from 'ai'
import { v } from 'convex/values'
import { z } from 'zod'
import { DEFAULT_LLM_MODEL } from '../../shared/llmCatalog'
import { api } from '../_generated/api'
import { action } from '../_generated/server'

const RESEARCH_ENTRY_QUALITY_VALUES = ['excellent', 'good', 'fair', 'poor'] as const

export type ResearchSignalResult = {
  verdict: 'BUY' | 'SKIP' | 'WAIT'
  confidence: number
  entryQuality: (typeof RESEARCH_ENTRY_QUALITY_VALUES)[number]
  reasoning: string
  redFlags: string[]
  catalysts: string[]
}

export const ResearchSignalSchema = z.object({
  verdict: z.enum(['BUY', 'SKIP', 'WAIT']),
  confidence: z.number().min(0).max(1),
  entryQuality: z.enum(RESEARCH_ENTRY_QUALITY_VALUES).optional(),
  reasoning: z.string().default(''),
  redFlags: z.array(z.string()).default([]),
  catalysts: z.array(z.string()).default([]),
})

export function confidenceToEntryQuality(
  confidence: number
): (typeof RESEARCH_ENTRY_QUALITY_VALUES)[number] {
  if (confidence >= 0.85) return 'excellent'
  if (confidence >= 0.7) return 'good'
  if (confidence >= 0.5) return 'fair'
  return 'poor'
}

type SignalCandidate = {
  symbol: string
  sentiment: number
  volume: number
  timestamp: number
}

export function pickSignalResearchCandidates(
  signals: SignalCandidate[],
  maxSymbols: number,
  minVolume: number,
  notBeforeTimestamp: number
): SignalCandidate[] {
  const picked: SignalCandidate[] = []
  const seenSymbols = new Set<string>()

  for (const signal of signals) {
    if (picked.length >= maxSymbols) break
    if (signal.timestamp < notBeforeTimestamp) continue
    if (signal.volume < minVolume) continue
    if (seenSymbols.has(signal.symbol)) continue
    seenSymbols.add(signal.symbol)
    picked.push(signal)
  }

  return picked
}

async function analyzeSignal(args: { symbol: string; sentiment: number; volume: number }) {
  const prompt = `Analyze ${args.symbol} for potential trading opportunity.
Current sentiment: ${(args.sentiment * 100).toFixed(0)}%
Social volume: ${args.volume}`

  const model = DEFAULT_LLM_MODEL
  const baseURL = (process.env.AI_GATEWAY_URL || 'https://ai-gateway.vercel.sh/v1').replace(
    /\/$/,
    ''
  )
  const gateway = createOpenAI({
    apiKey: process.env.AI_GATEWAY_API_KEY as string,
    baseURL,
  })
  const result = await generateObject({
    model: gateway.chat(model),
    schema: ResearchSignalSchema,
    messages: [
      {
        role: 'system',
        content: 'You are a stock market analyst. Be concise and accurate.',
      },
      { role: 'user', content: prompt },
    ],
    temperature: 0.3,
  })

  const parsed: ResearchSignalResult = {
    verdict: result.object.verdict,
    confidence: result.object.confidence,
    entryQuality: result.object.entryQuality ?? confidenceToEntryQuality(result.object.confidence),
    reasoning: result.object.reasoning,
    redFlags: result.object.redFlags,
    catalysts: result.object.catalysts,
  }
  const rawGatewayCost = (
    result.providerMetadata as { gateway?: { cost?: number | string } } | undefined
  )?.gateway?.cost
  const gatewayCost =
    typeof rawGatewayCost === 'string'
      ? Number(rawGatewayCost)
      : typeof rawGatewayCost === 'number'
        ? rawGatewayCost
        : undefined

  return {
    model,
    usage: {
      tokensIn: result.usage.inputTokens ?? 0,
      tokensOut: result.usage.outputTokens ?? 0,
    },
    costUsd: Number.isFinite(gatewayCost ?? Number.NaN) ? gatewayCost : undefined,
    parsed,
  }
}

export const researchSignal = action({
  args: {
    symbol: v.string(),
    sentiment: v.number(),
    volume: v.number(),
  },
  handler: async (ctx, args): Promise<ResearchSignalResult> => {
    const analyzed = await analyzeSignal(args)

    await ctx.runMutation(api.system.llmCosts.track, {
      model: analyzed.model,
      tokensIn: analyzed.usage.tokensIn,
      tokensOut: analyzed.usage.tokensOut,
      costUsd: analyzed.costUsd,
    })

    return analyzed.parsed
  },
})
