import { describe, expect, it } from 'vitest'
import { calculatePositionSize, classifyExit, selectBestCandidate } from './tradingAgent'

describe('tradingAgent helpers', () => {
  it('calculates bounded position size from cash and max', () => {
    expect(calculatePositionSize(2000, 10000, 20)).toBe(2000)
    expect(calculatePositionSize(5000, 10000, 20)).toBe(2000)
    expect(calculatePositionSize(2000, 0, 20)).toBe(0)
  })

  it('selects first non-held candidate above sentiment threshold', () => {
    const candidate = selectBestCandidate(
      [
        { symbol: 'AAPL', sentiment: 0.2 },
        { symbol: 'NVDA', sentiment: 0.8 },
        { symbol: 'TSLA', sentiment: 0.9 },
      ],
      new Set(['NVDA']),
      0.4
    )

    expect(candidate?.symbol).toBe('TSLA')
  })

  it('classifies exits using take-profit and stop-loss boundaries', () => {
    expect(classifyExit(0.09, 8, 4)).toBe('take_profit')
    expect(classifyExit(-0.05, 8, 4)).toBe('stop_loss')
    expect(classifyExit(0.01, 8, 4)).toBeNull()
  })
})
