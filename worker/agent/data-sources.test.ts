// @vitest-environment node
import { describe, expect, it } from 'vitest'
import {
  buildCryptoMomentumSignal,
  buildSimpleStrategySignals,
  buildTechnicalSnapshot,
} from './data-sources'

describe('buildCryptoMomentumSignal', () => {
  it('builds a crypto momentum signal from closes', () => {
    const signal = buildCryptoMomentumSignal('BTC/USD', [100, 105], 42)
    expect(signal).toMatchObject({
      symbol: 'BTC/USD',
      source: 'crypto_momentum',
      isCrypto: true,
      volume: 42,
      momentum: 5,
      price: 105,
    })
    expect((signal?.sentiment ?? 0) > 0).toBe(true)
  })

  it('returns null when there is insufficient price history', () => {
    expect(buildCryptoMomentumSignal('BTC/USD', [100], 10)).toBeNull()
  })
})

describe('buildTechnicalSnapshot', () => {
  it('computes indicator fields from closes', () => {
    const closes = Array.from({ length: 60 }, (_, i) => 100 + i)
    const snapshot = buildTechnicalSnapshot('AAPL', 'equity', closes, 1000, 1700000000000)
    expect(snapshot).toMatchObject({
      symbol: 'AAPL',
      market: 'equity',
      timeframe: '1Min',
      source: 'worker',
      price: 159,
      volume: 1000,
      timestamp: 1700000000000,
    })
    expect(snapshot?.sma20).not.toBeNull()
    expect(snapshot?.ema12).not.toBeNull()
    expect(snapshot?.rsi14).not.toBeNull()
  })
})

describe('buildSimpleStrategySignals', () => {
  it('emits bullish signal when technical setup is met', () => {
    const signals = buildSimpleStrategySignals([
      {
        symbol: 'BTC/USD',
        market: 'crypto',
        timeframe: 'realtime',
        source: 'worker',
        price: 61000,
        momentumPct: 1.2,
        volume: 400,
        sma20: 60500,
        sma50: 60000,
        ema12: 60800,
        ema26: 60300,
        rsi14: 34,
        timestamp: 1700000000000,
      },
    ])
    expect(signals).toHaveLength(1)
    expect(signals[0]).toMatchObject({
      source: 'worker_simple_strategy',
      symbol: 'BTC/USD',
      bullish: 1,
      bearish: 0,
      isCrypto: true,
    })
  })
})
