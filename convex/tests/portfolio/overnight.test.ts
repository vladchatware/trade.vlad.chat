import { describe, expect, it } from 'vitest'
import { buildOvernightActivity, buildPremarketPlan } from '../../portfolio/overnight'

describe('overnight helpers', () => {
  it('buildOvernightActivity aggregates counts and readiness', () => {
    const signals = [{ sentiment: 0.2 }, { sentiment: 0.1 }]
    const research: Array<{
      verdict: 'BUY' | 'SKIP' | 'WAIT'
      confidence: number
      reasoning: string
      symbol: string
    }> = [
      { verdict: 'BUY', confidence: 0.8, reasoning: 'x', symbol: 'AAPL' },
      { verdict: 'SKIP', confidence: 0.6, reasoning: 'y', symbol: 'MSFT' },
    ]
    const confirmations = [{}, {}]
    const since = 1_000
    const now = 2_000
    const activity = buildOvernightActivity(signals, research, confirmations, 1_500, since, now)

    expect(activity.signalsGathered).toBe(2)
    expect(activity.signalsResearched).toBe(2)
    expect(activity.buySignals).toBe(1)
    expect(activity.twitterConfirmations).toBe(2)
    expect(activity.premarketPlanReady).toBe(true)
    expect(activity.lastUpdated).toBe(now)
  })

  it('buildPremarketPlan creates bullish outlook and recommendations', () => {
    const signals = [{ sentiment: 0.4 }, { sentiment: 0.3 }]
    const research: Array<{
      verdict: 'BUY' | 'SKIP' | 'WAIT'
      confidence: number
      reasoning: string
      symbol: string
    }> = [
      { verdict: 'BUY', confidence: 0.9, reasoning: 'Strong', symbol: 'AAPL' },
      { verdict: 'BUY', confidence: 0.75, reasoning: 'Setup', symbol: 'MSFT' },
      { verdict: 'SKIP', confidence: 0.8, reasoning: 'Nope', symbol: 'TSLA' },
    ]
    const plan = buildPremarketPlan(signals, research, 1_234)

    expect(plan.marketOutlook).toContain('Bullish')
    expect(plan.recommendations.length).toBe(2)
    expect(plan.highConvictionPlays).toEqual(['AAPL', 'MSFT'])
    expect(plan.summary).toContain('High conviction')
  })

  it('buildPremarketPlan handles empty recommendations', () => {
    const plan = buildPremarketPlan([], [], 42)
    expect(plan.recommendations.length).toBe(0)
    expect(plan.summary).toContain('No high conviction')
    expect(plan.marketOutlook).toContain('Neutral')
  })
})
