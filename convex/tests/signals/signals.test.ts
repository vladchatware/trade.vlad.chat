import { describe, expect, it } from 'vitest'
import { analyzeSentiment } from '../../signals/ingestion'

describe('signals helpers', () => {
  it('computes bullish/bearish/score correctly', () => {
    const summary = analyzeSentiment([
      { entities: { sentiment: { basic: 'Bullish' } } },
      { entities: { sentiment: { basic: 'Bullish' } } },
      { entities: { sentiment: { basic: 'Bearish' } } },
      {},
    ])

    expect(summary).toEqual({
      bullish: 2,
      bearish: 1,
      total: 4,
      score: 0.25,
    })
  })

  it('handles empty message array safely', () => {
    const summary = analyzeSentiment([])
    expect(summary).toEqual({ bullish: 0, bearish: 0, total: 0, score: 0 })
  })
})
