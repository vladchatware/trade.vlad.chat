import { describe, expect, it } from 'vitest'
import { createPolicyEngine } from './engine'

describe('policy engine', () => {
  it('blocks when kill switch is active', () => {
    const engine = createPolicyEngine()
    const result = engine.evaluate({
      order: { symbol: 'AAPL', side: 'buy', qty: 1, estimatedPrice: 100 },
      account: { equity: 10000, cash: 5000, buyingPower: 5000 },
      positions: [],
      clock: { isOpen: true },
      riskState: { killSwitchActive: true, dailyLossUsd: 0 },
    })

    expect(result.allowed).toBe(false)
    expect(result.violations[0]?.rule).toBe('kill_switch')
  })

  it('blocks when order exceeds max notional', () => {
    const engine = createPolicyEngine({ maxNotionalPerTrade: 1000 })
    const result = engine.evaluate({
      order: { symbol: 'AAPL', side: 'buy', qty: 20, estimatedPrice: 100 },
      account: { equity: 100000, cash: 100000, buyingPower: 100000 },
      positions: [],
      clock: { isOpen: true },
      riskState: { killSwitchActive: false, dailyLossUsd: 0 },
    })

    expect(result.allowed).toBe(false)
    expect(result.violations.some((violation) => violation.rule === 'max_notional')).toBe(true)
  })
})
