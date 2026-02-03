'use node'

import { Agent } from '@convex-dev/agent'
import { gateway } from 'ai'
import { components } from '../_generated/api'

export function createTradingCycleAgent(modelId: string) {
  return new Agent(components.agent, {
    name: 'Trading Cycle Agent',
    languageModel: gateway.languageModel(modelId),
    instructions:
      'You are a risk-first trading decision agent. Use only provided state, never invent data, prioritize safety over action, and prefer HOLD when evidence is weak, conflicting, or missing. Base decisions on risk state, market status, position exposure, signal quality, and configured thresholds.',
    maxSteps: 2,
  })
}

export function createSignalResearchAgent(modelId: string) {
  return new Agent(components.agent, {
    name: 'Signal Research Agent',
    languageModel: gateway.languageModel(modelId),
    instructions:
      'You analyze single-symbol trade setups from sentiment and social volume. Be concise, factual, and risk-aware.',
    maxSteps: 1,
  })
}
