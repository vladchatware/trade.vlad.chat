'use node'

import { v } from 'convex/values'
import { createAlpacaClient } from '../providers/alpaca'
import { internal } from './_generated/api'
import { action } from './_generated/server'

export const getAccount = action({
  args: {},
  handler: async (
    _ctx
  ): Promise<{
    equity: number
    cash: number
    buyingPower: number
    portfolioValue: number
  }> => {
    const alpaca = createAlpacaClient()
    const account = await alpaca.getAccount()
    return {
      equity: account.equity,
      cash: account.cash,
      buyingPower: account.buying_power,
      portfolioValue: account.portfolio_value,
    }
  },
})

export const getPositions = action({
  args: {},
  handler: async (
    _ctx
  ): Promise<
    Array<{
      symbol: string
      qty: number
      side: string
      marketValue: number
      unrealizedPl: number
      currentPrice: number
    }>
  > => {
    const alpaca = createAlpacaClient()
    const positions = await alpaca.getPositions()
    return positions.map((p) => ({
      symbol: p.symbol,
      qty: p.qty,
      side: p.side,
      marketValue: p.market_value,
      unrealizedPl: p.unrealized_pl,
      currentPrice: p.current_price,
    }))
  },
})

export const closePosition = action({
  args: {
    symbol: v.string(),
  },
  handler: async (ctx, args): Promise<{ orderId: string; status: string }> => {
    const alpaca = createAlpacaClient()
    const order = await alpaca.closePosition(args.symbol)
    await ctx.runMutation(internal.activityLogs.create, {
      agent: 'Executor',
      action: 'position_closed',
      symbol: args.symbol,
      details: { orderId: order.id },
    })
    return { orderId: order.id, status: order.status }
  },
})

export const getMarketClock = action({
  args: {},
  handler: async (_ctx): Promise<{ isOpen: boolean; nextOpen: string; nextClose: string }> => {
    const alpaca = createAlpacaClient()
    const clock = await alpaca.getClock()
    return {
      isOpen: clock.is_open,
      nextOpen: clock.next_open,
      nextClose: clock.next_close,
    }
  },
})
