import { describe, expect, it } from 'vitest'
import { aggregateLlmStats, parseLlmCostOutput } from './llmCosts'

describe('llmCosts helpers', () => {
  it('parses valid output payload', () => {
    const parsed = parseLlmCostOutput('{"tokens_in":12,"tokens_out":4,"cost_usd":0.33}')
    expect(parsed).toEqual({ tokens_in: 12, tokens_out: 4, cost_usd: 0.33 })
  })

  it('returns empty payload on invalid JSON', () => {
    expect(parseLlmCostOutput('{broken')).toEqual({})
  })

  it('aggregates totals safely', () => {
    const stats = aggregateLlmStats([
      { outputJson: '{"tokens_in":10,"tokens_out":5,"cost_usd":0.1}' },
      { outputJson: '{"tokens_in":"20","tokens_out":"8","cost_usd":"0.2"}' },
      { outputJson: '{"tokens_in":"bad","tokens_out":2}' },
    ])

    expect(stats.calls).toBe(3)
    expect(stats.tokensIn).toBe(30)
    expect(stats.tokensOut).toBe(15)
    expect(stats.totalUsd).toBeCloseTo(0.3, 10)
  })
})
