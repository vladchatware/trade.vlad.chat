import { describe, expect, it } from 'vitest'
import { buildTradingCyclePrompt, getTradingCycleThreadTitle } from '../../system/agent'

describe('agent prompt', () => {
  it('pins decision constraints and embeds snapshot', () => {
    const prompt = buildTradingCyclePrompt({
      account: { cash: 5000 },
      positions: [{ symbol: 'AAPL', qty: 1 }],
      signals: [{ symbol: 'NVDA', sentiment: 0.8 }],
      marketClock: { isOpen: true },
      riskState: { killSwitchActive: false },
      config: { maxPositions: 3 },
    })

    expect(prompt).toContain('Task: choose exactly one label for this cycle')
    expect(prompt).toContain('HOLD, BUY_CANDIDATE, or SELL_CANDIDATE')
    expect(prompt).toContain('Return the label and a brief rationale')
    expect(prompt).toContain('"symbol":"NVDA"')
  })
})

describe('thread title', () => {
  it('uses daily title format', () => {
    expect(getTradingCycleThreadTitle(new Date('2026-02-03T12:00:00.000Z'))).toBe(
      'trading-cycle-2026-02-03'
    )
  })
})
