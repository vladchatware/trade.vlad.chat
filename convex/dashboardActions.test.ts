import { describe, expect, it } from 'vitest'
import { computeDerivedMetrics } from './dashboardActions'

describe('dashboardActions helpers', () => {
  it('computes unrealized, realized and total pnl metrics', () => {
    const metrics = computeDerivedMetrics({
      account: {
        equity: 105000,
        cash: 30000,
        buyingPower: 60000,
        portfolioValue: 105000,
      },
      positions: [
        {
          symbol: 'AAPL',
          qty: 1,
          side: 'long',
          marketValue: 200,
          unrealizedPl: 10,
          currentPrice: 200,
        },
        {
          symbol: 'MSFT',
          qty: 2,
          side: 'long',
          marketValue: 600,
          unrealizedPl: 40,
          currentPrice: 300,
        },
      ],
      startingEquity: 100000,
    })

    expect(metrics).toEqual({
      startingEquity: 100000,
      unrealizedPl: 50,
      totalPl: 5000,
      realizedPl: 4950,
      totalPlPct: 5,
    })
  })
})
