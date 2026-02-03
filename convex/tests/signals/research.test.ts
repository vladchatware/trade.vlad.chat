import { describe, expect, it } from 'vitest'
import {
  ResearchSignalSchema,
  confidenceToEntryQuality,
  pickSignalResearchCandidates,
} from '../../signals/research'

describe('llmActions helpers', () => {
  it('validates structured research output', () => {
    const result = ResearchSignalSchema.parse({
      verdict: 'BUY',
      confidence: 0.82,
      entryQuality: 'good',
      reasoning: 'trend',
      redFlags: ['x'],
      catalysts: ['y'],
    })
    expect(result.verdict).toBe('BUY')
    expect(result.confidence).toBe(0.82)
    expect(result.redFlags).toEqual(['x'])
  })

  it('rejects invalid verdict', () => {
    expect(() =>
      ResearchSignalSchema.parse({
        verdict: 'MAYBE',
        confidence: 0.82,
        reasoning: 'trend',
        redFlags: [],
        catalysts: [],
      })
    ).toThrow()
  })

  it('supports explicit entry quality from model response', () => {
    const result = ResearchSignalSchema.parse({
      verdict: 'BUY',
      confidence: 0.91,
      entryQuality: 'excellent',
      reasoning: 'trend',
      redFlags: [],
      catalysts: [],
    })
    expect(result.entryQuality).toBe('excellent')
  })
})

describe('research helpers', () => {
  it('maps confidence to entry quality', () => {
    expect(confidenceToEntryQuality(0.9)).toBe('excellent')
    expect(confidenceToEntryQuality(0.75)).toBe('good')
    expect(confidenceToEntryQuality(0.55)).toBe('fair')
    expect(confidenceToEntryQuality(0.4)).toBe('poor')
  })

  it('picks unique, recent candidates above minimum volume', () => {
    const picked = pickSignalResearchCandidates(
      [
        { symbol: 'AAPL', sentiment: 0.5, volume: 12, timestamp: 100 },
        { symbol: 'AAPL', sentiment: 0.6, volume: 8, timestamp: 99 },
        { symbol: 'MSFT', sentiment: 0.4, volume: 0, timestamp: 100 },
        { symbol: 'NVDA', sentiment: 0.7, volume: 20, timestamp: 80 },
      ],
      3,
      1,
      90
    )

    expect(picked).toEqual([{ symbol: 'AAPL', sentiment: 0.5, volume: 12, timestamp: 100 }])
  })
})
