import { describe, expect, it } from 'vitest'
import { extractJsonFromMarkdown, parseResearchSignalResponse } from '../../signals/research'

describe('llmActions helpers', () => {
  it('extracts JSON wrapped in markdown block', () => {
    const json = extractJsonFromMarkdown('```json\n{"verdict":"BUY"}\n```')
    expect(json).toBe('{"verdict":"BUY"}')
  })

  it('parses valid research response', () => {
    const result = parseResearchSignalResponse(
      '{"verdict":"BUY","confidence":0.82,"reasoning":"trend","red_flags":["x"],"catalysts":["y"]}'
    )
    expect(result).toEqual({
      verdict: 'BUY',
      confidence: 0.82,
      reasoning: 'trend',
      redFlags: ['x'],
      catalysts: ['y'],
    })
  })

  it('rejects invalid verdict via schema and fails safe', () => {
    const result = parseResearchSignalResponse(
      '{"verdict":"MAYBE","confidence":0.82,"reasoning":"trend","red_flags":[],"catalysts":[]}'
    )
    expect(result).toEqual({
      verdict: 'SKIP',
      confidence: 0,
      reasoning: 'Parse error',
      redFlags: [],
      catalysts: [],
    })
  })

  it('fails safe on invalid content', () => {
    const result = parseResearchSignalResponse('not json')
    expect(result).toEqual({
      verdict: 'SKIP',
      confidence: 0,
      reasoning: 'Parse error',
      redFlags: [],
      catalysts: [],
    })
  })
})
