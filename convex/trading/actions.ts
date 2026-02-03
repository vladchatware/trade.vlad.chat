'use node'

import { createHash, randomUUID } from 'node:crypto'
import { v } from 'convex/values'
import { withTradingConfigDefaults } from '../../shared/tradingConfig'
import { api } from '../_generated/api'
import type { Doc, Id } from '../_generated/dataModel'
import { action } from '../_generated/server'
import {
  type AlpacaOrder,
  type AlpacaPosition,
  createAlpacaClient,
} from '../shared/providers/alpaca'
import { createPolicyEngine } from './policy/engine'

type PositionSummary = {
  symbol: string
  qty: number
  side: 'long' | 'short'
  marketValue: number
  unrealizedPl: number
  currentPrice: number
}

type PolicyInput = {
  side: 'buy' | 'sell'
  symbol: string
  qty: number
  estimatedPrice: number
  marketOpen: boolean
  killSwitchActive: boolean
  dailyLossUsd: number
  cooldownUntil?: number
  equity: number
  cash: number
  buyingPower: number
  maxPositionValue: number
  maxPositions: number
  maxDailyLossPct: number
  approvalTtlSeconds: number
  positions: PositionSummary[]
}

type PolicyResult = {
  allowed: boolean
  reason?: string
  violations?: Array<{ rule: string; message: string }>
  warnings?: Array<{ rule: string; message: string }>
}

function toOrderType(orderType: string | undefined): 'market' | 'limit' | 'stop' | 'stop_limit' {
  if (orderType === 'limit' || orderType === 'stop' || orderType === 'stop_limit') {
    return orderType
  }
  return 'market'
}

export function evaluateOrderPolicy(input: PolicyInput): PolicyResult {
  const maxPositionPctEquity =
    input.equity > 0 ? Math.min(1, input.maxPositionValue / input.equity) : 0.2
  const engine = createPolicyEngine({
    maxPositionPctEquity,
    maxNotionalPerTrade: input.maxPositionValue,
    maxDailyLossPct: input.maxDailyLossPct,
    maxOpenPositions: input.maxPositions,
    approvalTtlSeconds: input.approvalTtlSeconds,
  })

  const result = engine.evaluate({
    order: {
      symbol: input.symbol,
      side: input.side,
      qty: input.qty,
      estimatedPrice: input.estimatedPrice,
    },
    account: {
      equity: input.equity,
      cash: input.cash,
      buyingPower: input.buyingPower,
    },
    positions: input.positions.map((position) => ({
      symbol: position.symbol,
      qty: position.qty,
      marketValue: position.marketValue,
    })),
    clock: { isOpen: input.marketOpen },
    riskState: {
      killSwitchActive: input.killSwitchActive,
      dailyLossUsd: input.dailyLossUsd,
      cooldownUntil: input.cooldownUntil,
    },
  })

  if (result.allowed) return { allowed: true, warnings: result.warnings }
  const primaryRule = result.violations[0]?.rule
  return {
    allowed: false,
    reason: mapPolicyRuleToReason(primaryRule),
    violations: result.violations,
    warnings: result.warnings,
  }
}

function mapPolicyRuleToReason(rule: string | undefined): string {
  if (!rule) return 'policy_rejected'
  const mapping: Record<string, string> = {
    kill_switch: 'kill_switch_active',
    market_hours: 'market_closed',
    max_positions: 'max_positions_reached',
    max_notional: 'max_position_value_exceeded',
    buying_power: 'insufficient_buying_power',
    invalid_price: 'invalid_estimated_price',
    invalid_qty: 'invalid_qty',
    cooldown: 'cooldown_active',
    daily_loss_limit: 'daily_loss_limit_reached',
    position_size: 'position_size_exceeded',
  }
  return mapping[rule] ?? `policy_${rule}`
}

export function mapPosition(position: AlpacaPosition): PositionSummary {
  return {
    symbol: position.symbol,
    qty: position.qty,
    side: position.side,
    marketValue: position.market_value,
    unrealizedPl: position.unrealized_pl,
    currentPrice: position.current_price,
  }
}

function toNumber(value: string | number | null | undefined): number | undefined {
  if (value === null || value === undefined) return undefined
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

export function buildTradeRecord(
  order: AlpacaOrder,
  approvalId?: Id<'orderApprovals'>
): {
  alpacaOrderId: string
  symbol: string
  side: string
  qty: number
  orderType: string
  status: string
  filledQty?: number
  filledAvgPrice?: number
  notional?: number
  approvalId?: Id<'orderApprovals'>
} {
  const qty = toNumber(order.qty) ?? 0
  const filledQty = toNumber(order.filled_qty)
  const filledAvgPrice = toNumber(order.filled_avg_price)
  return {
    alpacaOrderId: order.id,
    symbol: order.symbol,
    side: order.side,
    qty,
    orderType: order.order_type,
    status: order.status,
    filledQty,
    filledAvgPrice,
    notional:
      filledQty !== undefined && filledAvgPrice !== undefined
        ? filledQty * filledAvgPrice
        : undefined,
    approvalId,
  }
}

export const getAccount = action({
  args: {},
  handler: async () => {
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
  handler: async (): Promise<PositionSummary[]> => {
    const alpaca = createAlpacaClient()
    const positions = await alpaca.getPositions()
    return positions.map(mapPosition)
  },
})

export const getMarketClock = action({
  args: {},
  handler: async () => {
    const alpaca = createAlpacaClient()
    const clock = await alpaca.getClock()
    return {
      isOpen: clock.is_open,
      nextOpen: clock.next_open,
      nextClose: clock.next_close,
    }
  },
})

export const closePosition = action({
  args: {
    symbol: v.string(),
  },
  handler: async (ctx, args) => {
    const alpaca = createAlpacaClient()
    const order = await alpaca.closePosition(args.symbol)
    await ctx.runMutation(api.trading.trades.create, buildTradeRecord(order))

    await ctx.runMutation(api.system.activityLogs.create, {
      agent: 'Executor',
      action: 'position_closed',
      symbol: args.symbol,
      detailsJson: JSON.stringify({ orderId: order.id }),
    })

    return { orderId: order.id, status: order.status }
  },
})

export const previewOrder = action({
  args: {
    symbol: v.string(),
    side: v.union(v.literal('buy'), v.literal('sell')),
    qty: v.number(),
    orderType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const alpaca = createAlpacaClient()
    const preview = await alpaca.previewOrder(args)
    const [config, account, positions, marketClock, riskState]: [
      { maxPositionValue: number; maxPositions: number } | null,
      Doc<'account'> | null,
      Doc<'positions'>[],
      Doc<'marketClock'> | null,
      Doc<'riskState'> | null,
    ] = await Promise.all([
      ctx.runQuery(api.system.config.get, {}),
      ctx.runQuery(api.portfolio.account.getAccount, {}),
      ctx.runQuery(api.portfolio.positions.getAll, {}),
      ctx.runQuery(api.portfolio.marketClock.get, {}),
      ctx.runQuery(api.system.riskState.get, {}),
    ])

    const defaults = withTradingConfigDefaults()
    const approvalTtlSeconds = 300
    const policy = evaluateOrderPolicy({
      side: args.side,
      symbol: args.symbol,
      qty: args.qty,
      estimatedPrice: preview.estimated_price,
      marketOpen: marketClock?.isOpen ?? false,
      killSwitchActive: riskState?.killSwitchActive ?? false,
      dailyLossUsd: riskState?.dailyLossUsd ?? 0,
      cooldownUntil: riskState?.cooldownUntil,
      equity: account?.equity ?? 0,
      cash: account?.cash ?? 0,
      buyingPower: account?.buyingPower ?? 0,
      maxPositionValue: config?.maxPositionValue ?? defaults.maxPositionValue,
      maxPositions: config?.maxPositions ?? defaults.maxPositions,
      maxDailyLossPct: 0.02,
      approvalTtlSeconds,
      positions: positions.map((position) => ({
        symbol: position.symbol,
        qty: position.qty,
        side: 'long',
        marketValue: position.marketValue,
        unrealizedPl: position.unrealizedPl,
        currentPrice: position.currentPrice,
      })),
    })

    let approvalToken: string | null = null
    let approvalExpiresAt: number | null = null
    if (policy.allowed) {
      approvalToken = randomUUID()
      approvalExpiresAt = Date.now() + approvalTtlSeconds * 1000
      const previewHash = createHash('sha256')
        .update(`${preview.id}:${args.symbol}:${args.side}:${args.qty}`)
        .digest('hex')

      await ctx.runMutation(api.trading.orderApprovals.create, {
        previewHash,
        orderParamsJson: JSON.stringify(args),
        policyResultJson: JSON.stringify(policy),
        approvalToken,
        expiresAt: approvalExpiresAt,
      })
    }

    return {
      previewId: preview.id,
      estimatedPrice: preview.estimated_price,
      policy,
      approvalToken,
      approvalExpiresAt,
    }
  },
})

export const submitOrder = action({
  args: {
    previewId: v.string(),
    approvalToken: v.string(),
  },
  handler: async (ctx, args) => {
    const riskState = await ctx.runQuery(api.system.riskState.get, {})
    if (riskState?.killSwitchActive) {
      throw new Error(`Kill switch active: ${riskState.killSwitchReason ?? 'unspecified'}`)
    }

    const approval = await ctx.runQuery(api.trading.orderApprovals.getByToken, {
      token: args.approvalToken,
    })
    if (!approval) {
      throw new Error('Invalid approval token')
    }
    if (approval.usedAt) {
      throw new Error('Approval token already used')
    }
    if (approval.expiresAt < Date.now()) {
      throw new Error('Approval token expired')
    }

    const parsedOrder = JSON.parse(approval.orderParamsJson) as {
      symbol?: string
      side?: 'buy' | 'sell'
      qty?: number
      orderType?: string
    }
    const symbol = parsedOrder.symbol?.toUpperCase()
    const side = parsedOrder.side
    const qty = parsedOrder.qty
    if (!symbol || (side !== 'buy' && side !== 'sell') || !qty || qty <= 0) {
      throw new Error('Approval payload is invalid')
    }

    const expectedHash = createHash('sha256')
      .update(`${args.previewId}:${symbol}:${side}:${qty}`)
      .digest('hex')
    if (expectedHash !== approval.previewHash) {
      throw new Error('Preview hash mismatch')
    }

    const alpaca = createAlpacaClient()
    const order = await alpaca.createOrder({
      symbol,
      side,
      qty,
      type: toOrderType(parsedOrder.orderType),
      time_in_force: 'day',
      client_order_id: args.previewId,
    })
    await ctx.runMutation(api.trading.trades.create, buildTradeRecord(order, approval._id))
    await ctx.runMutation(api.trading.orderApprovals.markUsed, { approvalId: approval._id })

    await ctx.runMutation(api.system.activityLogs.create, {
      agent: 'Executor',
      action: 'order_submitted',
      detailsJson: JSON.stringify({
        orderId: order.id,
        previewId: args.previewId,
        approvalToken: args.approvalToken,
      }),
    })

    return { orderId: order.id, status: order.status }
  },
})
