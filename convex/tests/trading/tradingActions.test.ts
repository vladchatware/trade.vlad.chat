import { describe, expect, it } from 'vitest'
import { buildTradeRecord, evaluateOrderPolicy, mapPosition } from '../../trading/actions'

describe('tradingActions helpers', () => {
  it('maps Alpaca position into UI-safe summary shape', () => {
    const mapped = mapPosition({
      asset_id: 'asset_1',
      symbol: 'AAPL',
      qty: 2,
      side: 'long',
      market_value: 420,
      cost_basis: 400,
      unrealized_pl: 20,
      unrealized_plpc: 0.05,
      current_price: 210,
    })

    expect(mapped).toEqual({
      symbol: 'AAPL',
      qty: 2,
      side: 'long',
      marketValue: 420,
      unrealizedPl: 20,
      currentPrice: 210,
    })
  })

  it('blocks buy when market is closed', () => {
    const decision = evaluateOrderPolicy({
      side: 'buy',
      symbol: 'AAPL',
      qty: 1,
      estimatedPrice: 100,
      marketOpen: false,
      killSwitchActive: false,
      dailyLossUsd: 0,
      cooldownUntil: undefined,
      equity: 10000,
      cash: 5000,
      buyingPower: 1000,
      maxPositionValue: 500,
      maxPositions: 3,
      maxDailyLossPct: 0.02,
      approvalTtlSeconds: 300,
      positions: [],
    })

    expect(decision).toMatchObject({ allowed: false, reason: 'market_closed' })
  })

  it('allows sell with closed market check bypassed and no buy-side limits', () => {
    const decision = evaluateOrderPolicy({
      side: 'sell',
      symbol: 'AAPL',
      qty: 1,
      estimatedPrice: 100,
      marketOpen: false,
      killSwitchActive: false,
      dailyLossUsd: 0,
      cooldownUntil: undefined,
      equity: 10000,
      cash: 5000,
      buyingPower: 0,
      maxPositionValue: 500,
      maxPositions: 3,
      maxDailyLossPct: 0.02,
      approvalTtlSeconds: 300,
      positions: [],
    })

    expect(decision).toMatchObject({ allowed: true })
  })

  it('builds normalized trade records from Alpaca order payloads', () => {
    const trade = buildTradeRecord({
      id: 'ord_1',
      client_order_id: 'preview_1',
      symbol: 'AAPL',
      qty: '2',
      filled_qty: '1.5',
      filled_avg_price: '205.5',
      order_type: 'market',
      side: 'buy',
      time_in_force: 'day',
      status: 'filled',
      created_at: '2026-02-03T00:00:00.000Z',
    })

    expect(trade).toMatchObject({
      alpacaOrderId: 'ord_1',
      symbol: 'AAPL',
      side: 'buy',
      qty: 2,
      orderType: 'market',
      status: 'filled',
      filledQty: 1.5,
      filledAvgPrice: 205.5,
      notional: 308.25,
    })
  })
})
