import { describe, expect, it } from 'vitest'
import { MAX_POINTS, appendHistorySeries } from './positionHistory'

describe('positionHistory helpers', () => {
  it('appends and trims to MAX_POINTS', () => {
    const prices = Array.from({ length: MAX_POINTS }, (_, i) => i)
    const timestamps = Array.from({ length: MAX_POINTS }, (_, i) => i * 1000)
    const next = appendHistorySeries(prices, timestamps, 999, 999000)

    expect(next.prices.length).toBe(MAX_POINTS)
    expect(next.timestamps.length).toBe(MAX_POINTS)
    expect(next.prices[next.prices.length - 1]).toBe(999)
    expect(next.timestamps[next.timestamps.length - 1]).toBe(999000)
    expect(next.prices[0]).toBe(1)
  })

  it('appends when below MAX_POINTS', () => {
    const prices = [10, 11]
    const timestamps = [100, 200]
    const next = appendHistorySeries(prices, timestamps, 12, 300)

    expect(next.prices).toEqual([10, 11, 12])
    expect(next.timestamps).toEqual([100, 200, 300])
  })
})
