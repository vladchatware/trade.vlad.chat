// @vitest-environment node
import { describe, expect, it, vi } from 'vitest'
import {
  syncAccountStateToConvex,
  syncMarketClockToConvex,
  syncSignalsToConvex,
  syncTechnicalIndicatorsToConvex,
  toConvexAccountPayload,
  toConvexPositionPayload,
} from './convex-sync'
import type { Position } from './types'

describe('convex-sync', () => {
  it('normalizes account payload from snake_case broker fields', () => {
    const payload = toConvexAccountPayload({
      equity: '101000.50',
      cash: '23000.10',
      buying_power: '46000.20',
      portfolio_value: '101000.50',
    })

    expect(payload).toEqual({
      equity: 101000.5,
      cash: 23000.1,
      buyingPower: 46000.2,
      portfolioValue: 101000.5,
    })
  })

  it('normalizes position payload from mixed field shapes', () => {
    const position: Position = {
      symbol: 'AAPL',
      qty: '2',
      avg_entry_price: '100',
      currentPrice: 112,
      market_value: '224',
      unrealized_pl: '24',
      unrealized_plpc: '0.12',
    }

    expect(toConvexPositionPayload(position)).toEqual({
      symbol: 'AAPL',
      qty: 2,
      avgEntryPrice: 100,
      currentPrice: 112,
      marketValue: 224,
      unrealizedPl: 24,
      unrealizedPlpc: 0.12,
    })
  })

  it('writes account, positions, history, cleanup, and portfolio snapshot', async () => {
    const mutation = vi.fn().mockResolvedValue(undefined)
    const action = vi.fn().mockResolvedValue(undefined)
    const convex = { mutation, action }

    await syncAccountStateToConvex({
      convex,
      account: {
        equity: '102000',
        cash: '50000',
        buying_power: '75000',
        portfolio_value: '102000',
      },
      positions: [
        {
          symbol: 'TSLA',
          qty: '1',
          avg_entry_price: '200',
          current_price: '210',
          market_value: '210',
          unrealized_pl: '10',
          unrealized_plpc: '0.05',
        },
      ],
      startingEquity: 100000,
      now: 1700000000000,
    })

    expect(mutation).toHaveBeenCalledTimes(5)
    expect(mutation).toHaveBeenCalledWith(expect.anything(), {
      equity: 102000,
      cash: 50000,
      buyingPower: 75000,
      portfolioValue: 102000,
    })
    expect(mutation).toHaveBeenCalledWith(expect.anything(), {
      equity: 102000,
      pl: 2000,
      plPct: 2,
    })
    expect(mutation).toHaveBeenCalledWith(expect.anything(), {
      symbol: 'TSLA',
      qty: 1,
      avgEntryPrice: 200,
      currentPrice: 210,
      marketValue: 210,
      unrealizedPl: 10,
      unrealizedPlpc: 0.05,
    })
    expect(mutation).toHaveBeenCalledWith(expect.anything(), {
      symbol: 'TSLA',
      price: 210,
      timestamp: 1700000000000,
    })
    expect(mutation).toHaveBeenCalledWith(expect.anything(), {
      activeSymbols: ['TSLA'],
    })
  })

  it('writes market clock snapshot', async () => {
    const mutation = vi.fn().mockResolvedValue(undefined)
    const action = vi.fn().mockResolvedValue(undefined)
    const convex = { mutation, action }

    await syncMarketClockToConvex({
      convex,
      clock: {
        is_open: true,
        next_open: '2026-02-03T14:30:00Z',
        next_close: '2026-02-03T21:00:00Z',
      },
      now: 1700000000000,
    })

    expect(mutation).toHaveBeenCalledWith('portfolio/marketClock:upsert', {
      isOpen: true,
      nextOpen: '2026-02-03T14:30:00Z',
      nextClose: '2026-02-03T21:00:00Z',
      timestamp: 1700000000000,
    })
  })

  it('writes stocktwits signals', async () => {
    const mutation = vi.fn().mockResolvedValue(undefined)
    const action = vi.fn().mockResolvedValue(undefined)
    const convex = { mutation, action }

    await syncSignalsToConvex({
      convex,
      signals: [
        {
          symbol: 'NVDA',
          source: 'stocktwits',
          sentiment: 0.8,
          volume: 120,
          bullish: 30,
          bearish: 2,
          reason: 'strong',
        },
      ],
      now: 1700000000000,
    })

    expect(mutation).toHaveBeenCalledWith('signals/queries:create', {
      symbol: 'NVDA',
      source: 'stocktwits',
      sentiment: 0.8,
      volume: 120,
      reason: 'strong',
      bullish: 30,
      bearish: 2,
      isCrypto: undefined,
      momentum: undefined,
      price: undefined,
      timestamp: 1700000000000,
    })
  })

  it('writes technical indicator snapshots', async () => {
    const mutation = vi.fn().mockResolvedValue(undefined)
    const action = vi.fn().mockResolvedValue(undefined)
    const convex = { mutation, action }

    await syncTechnicalIndicatorsToConvex({
      convex,
      snapshots: [
        {
          symbol: 'BTC/USD',
          market: 'crypto',
          timeframe: 'realtime',
          source: 'worker',
          price: 60000,
          momentumPct: 1.23,
          volume: 250,
          sma20: 59800,
          sma50: 59000,
          ema12: 59900,
          ema26: 59500,
          rsi14: 42,
          timestamp: 1700000000000,
        },
      ],
    })

    expect(mutation).toHaveBeenCalledWith('signals/technicalIndicators:upsertFromWorker', {
      symbol: 'BTC/USD',
      market: 'crypto',
      timeframe: 'realtime',
      source: 'worker',
      price: 60000,
      momentumPct: 1.23,
      volume: 250,
      sma20: 59800,
      sma50: 59000,
      ema12: 59900,
      ema26: 59500,
      rsi14: 42,
      timestamp: 1700000000000,
    })
  })
})
