import { describe, expect, it } from 'vitest'
import { toTradeMutationPayload } from './trades'

describe('trades helpers', () => {
  it('adds updatedAt while preserving fields', () => {
    const payload = toTradeMutationPayload(
      {
        alpacaOrderId: 'ord_1',
        symbol: 'AAPL',
        side: 'buy',
        qty: 2,
        orderType: 'market',
        status: 'filled',
        filledQty: 2,
        filledAvgPrice: 200,
        notional: 400,
      },
      1234
    )

    expect(payload).toMatchObject({
      alpacaOrderId: 'ord_1',
      symbol: 'AAPL',
      side: 'buy',
      qty: 2,
      orderType: 'market',
      status: 'filled',
      updatedAt: 1234,
    })
  })
})
