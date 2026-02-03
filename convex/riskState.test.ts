import { describe, expect, it } from 'vitest'
import { buildResetDailyLossState } from './riskState'

describe('riskState helpers', () => {
  it('preserves kill switch metadata while resetting daily loss', () => {
    const next = buildResetDailyLossState(
      {
        killSwitchActive: true,
        killSwitchReason: 'manual_stop',
        cooldownUntil: 123_456,
      },
      999
    )

    expect(next).toEqual({
      killSwitchActive: true,
      killSwitchReason: 'manual_stop',
      dailyLossUsd: 0,
      dailyLossResetAt: 999,
      cooldownUntil: 123_456,
    })
  })

  it('creates sane defaults when state is missing', () => {
    const next = buildResetDailyLossState(null, 111)
    expect(next).toEqual({
      killSwitchActive: false,
      killSwitchReason: undefined,
      dailyLossUsd: 0,
      dailyLossResetAt: 111,
      cooldownUntil: undefined,
    })
  })
})
