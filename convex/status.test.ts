import { describe, expect, it } from 'vitest'
import { buildStatusResponse } from './status'

describe('status response', () => {
  it('includes defaults and stable dashboard keys', () => {
    const status = buildStatusResponse({
      account: null,
      positions: [],
      signals: [],
      logs: [],
      marketClock: null,
      config: null,
      portfolioSnapshots: [],
      stalenessAnalysis: [],
      llmStats: { totalUsd: 1.25, calls: 2, tokensIn: 100, tokensOut: 40 },
      signalResearch: [],
      overnightActivity: null,
      premarketPlan: null,
    })

    expect(status.config).toBeTruthy()
    expect(status.llmStats.calls).toBe(2)
    expect(status.signalResearch).toEqual([])
    expect(status.stalenessAnalysis).toEqual({})
    expect(status.overnightActivity).toBeNull()
    expect(status.premarketPlan).toBeNull()
    expect(Array.isArray(status.portfolioSnapshots)).toBe(true)
  })
})
