import { describe, expect, it } from 'vitest'
import { calculateCost, parseGatewayResponse } from './llm'

describe('llm provider helpers', () => {
  it('calculates cost from model pricing', () => {
    const cost = calculateCost('moonshotai/kimi-k2.5', {
      prompt_tokens: 1000,
      completion_tokens: 500,
    })
    expect(cost).toBeCloseTo(0.0015, 10)
  })

  it('falls back to default model pricing for unknown model', () => {
    const cost = calculateCost('unknown/model', {
      prompt_tokens: 1000,
      completion_tokens: 1000,
    })
    expect(cost).toBeCloseTo(0.0025, 10)
  })

  it('parses gateway payload and defaults missing usage', () => {
    const parsed = parseGatewayResponse({
      choices: [{ message: { content: '{"ok":true}' } }],
    })
    expect(parsed).toEqual({
      content: '{"ok":true}',
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    })
  })

  it('fails safe on invalid gateway payload shape', () => {
    const parsed = parseGatewayResponse('bad_payload')
    expect(parsed).toEqual({
      content: '',
      usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
    })
  })
})
