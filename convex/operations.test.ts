import { describe, expect, it } from 'vitest'
import {
  buildMarketCloseCleanupResult,
  buildMarketOpenPrepResult,
  buildMidnightResetResult,
} from './operations'

describe('operations helpers', () => {
  it('builds market open prep response with safe defaults', () => {
    const result = buildMarketOpenPrepResult(null, 3)
    expect(result).toEqual({
      status: 'success',
      killSwitchActive: false,
      dailyLossUsd: 0,
      approvalsCleaned: 3,
    })
  })

  it('builds market close cleanup response', () => {
    const result = buildMarketCloseCleanupResult(4, 105_500.25, 2)
    expect(result).toEqual({
      status: 'success',
      positions: 4,
      equity: 105_500.25,
      approvalsCleaned: 2,
    })
  })

  it('builds midnight reset response', () => {
    const result = buildMidnightResetResult({ reset: true, created: false }, 1)
    expect(result).toEqual({
      status: 'success',
      reset: { reset: true, created: false },
      approvalsCleaned: 1,
    })
  })
})
