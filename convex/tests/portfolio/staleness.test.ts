import { describe, expect, it } from 'vitest'
import { analyzePositionStaleness, clamp01, getStalenessSettings } from '../../portfolio/staleness'

describe('staleness helpers', () => {
  it('clamps score into [0,1]', () => {
    expect(clamp01(-1)).toBe(0)
    expect(clamp01(0.4)).toBe(0.4)
    expect(clamp01(5)).toBe(1)
  })

  it('reads defaults when config is absent', () => {
    const settings = getStalenessSettings(null)
    expect(settings.enabled).toBe(true)
    expect(settings.maxHoldDays).toBe(3)
    expect(settings.minGainPct).toBe(5)
  })

  it('marks stale positions for weak gain + low mention activity', () => {
    const now = Date.now()
    const result = analyzePositionStaleness({
      now,
      trackedSince: now - 4 * 24 * 3_600_000,
      currentPrice: 102,
      avgEntryPrice: 100,
      entrySocialVolume: 100,
      signalStats: {
        lastSeen: now - 9 * 3_600_000,
        recentVolume: 10,
      },
      settings: {
        enabled: true,
        maxHoldDays: 3,
        minGainPct: 5,
        socialVolumeDecay: 0.3,
        noMentionsHours: 8,
      },
    })

    expect(result.shouldExit).toBe(true)
    expect(result.reasons).toContain('Max hold days exceeded with insufficient gains')
    expect(result.reasons).toContain('No recent mentions')
  })

  it('does not mark stale before minimum hold duration', () => {
    const now = Date.now()
    const result = analyzePositionStaleness({
      now,
      trackedSince: now - 2 * 3_600_000,
      currentPrice: 90,
      avgEntryPrice: 100,
      entrySocialVolume: 100,
      signalStats: {
        lastSeen: now - 10 * 3_600_000,
        recentVolume: 0,
      },
      settings: {
        enabled: true,
        maxHoldDays: 3,
        minGainPct: 5,
        socialVolumeDecay: 0.3,
        noMentionsHours: 8,
      },
    })

    expect(result.shouldExit).toBe(false)
    expect(result.reasons).toEqual([])
    expect(result.score).toBe(0)
  })
})
