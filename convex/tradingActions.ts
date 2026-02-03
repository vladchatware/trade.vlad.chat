'use node'

/* eslint-disable @typescript-eslint/no-explicit-any */

import { v } from 'convex/values'
import { api } from './_generated/api'
import { action } from './_generated/server'
import { createAlpacaClient } from './providers/alpaca'

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
    // @ts-ignore - parameter needs type
    // biome-ignore lint/suspicious/noExplicitAny: Alpaca SDK returns untyped payloads here.
    return positions.map((p: any) => ({
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
    await ctx.runMutation(api.activityLogs.create, {
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

// Preview an order (for policy validation)
export const previewOrder = action({
  args: {
    symbol: v.string(),
    side: v.string(),
    qty: v.number(),
    orderType: v.optional(v.string()),
  },
  handler: async (_ctx, args): Promise<{ previewId: string; estimatedPrice: number }> => {
    const alpaca = createAlpacaClient()
    // Call Alpaca to preview order
    const preview = await alpaca.previewOrder(args)
    return {
      previewId: preview.id,
      estimatedPrice: preview.estimated_price,
    }
  },
})

// Submit an order
export const submitOrder = action({
  args: {
    previewId: v.string(),
    approvalToken: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<{ orderId: string; status: string }> => {
    const alpaca = createAlpacaClient()
    const order = await alpaca.submitOrder(args.previewId)
    await ctx.runMutation(api.activityLogs.create, {
      agent: 'Executor',
      action: 'order_submitted',
      details: { orderId: order.id, previewId: args.previewId },
    })
    return { orderId: order.id, status: order.status }
  },
})
