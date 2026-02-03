import { describe, expect, it } from 'vitest'
import { cryptoExitReason, pickCryptoEntry } from '../../trading/cryptoAgent'

describe('cryptoAgent helpers', () => {
  it('picks first non-held signal', () => {
    const picked = pickCryptoEntry(
      [
        { symbol: 'BTC/USD', momentum: 0.05 },
        { symbol: 'ETH/USD', momentum: 0.04 },
      ],
      new Set(['BTC/USD'])
    )

    expect(picked?.symbol).toBe('ETH/USD')
  })

  it('classifies crypto exits from unrealized plpc', () => {
    expect(cryptoExitReason(0.11, 10, 5)).toBe('take_profit')
    expect(cryptoExitReason(-0.06, 10, 5)).toBe('stop_loss')
    expect(cryptoExitReason(0.02, 10, 5)).toBeNull()
  })
})
