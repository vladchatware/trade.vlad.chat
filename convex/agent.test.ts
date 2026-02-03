import { describe, expect, it } from 'vitest'
import { buildFirstAgentPrompt } from './agent'

describe('agent prompt', () => {
  it('pins bootstrap constraints and embeds snapshot', () => {
    const prompt = buildFirstAgentPrompt({
      account: { cash: 5000 },
      positions: [{ symbol: 'AAPL', qty: 1 }],
      signals: [{ symbol: 'NVDA', sentiment: 0.8 }],
      marketClock: { isOpen: true },
      riskState: { killSwitchActive: false },
      config: { maxPositions: 3 },
    })

    expect(prompt).toContain('bootstrap mode')
    expect(prompt).toContain('Output one of: HOLD, BUY_CANDIDATE, SELL_CANDIDATE.')
    expect(prompt).toContain('"symbol":"NVDA"')
  })
})
