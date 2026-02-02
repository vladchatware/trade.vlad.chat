import { action } from './_generated/server'
import { internal } from './_generated/api'
import { createAlpacaClient } from '../providers/alpaca'

// Main trading loop - ported from agent-v1.mjs
export const runTrading = action({
  args: {},
  handler: async (ctx) => {
    const alpaca = createAlpacaClient()
    const config = await ctx.runQuery(internal.config.get)
    const riskState = await ctx.runQuery(internal.riskState.get)

    if (!config || riskState?.killSwitchActive) {
      return { status: 'skipped', reason: 'Config missing or kill switch active' }
    }

    // Fetch current state
    const account = await alpaca.getAccount()
    const positions = await alpaca.getPositions()
    const clock = await alpaca.getClock()

    if (!clock.is_open) {
      return { status: 'skipped', reason: 'Market closed' }
    }

    // Check positions for exits (stop-loss, take-profit)
    for (const pos of positions) {
      const plPct = parseFloat(pos.unrealized_plpc) * 100

      if (plPct >= config.takeProfitPct) {
        await ctx.runAction(internal.actions.closePosition, {
          symbol: pos.symbol,
        })
        await ctx.runMutation(internal.activityLogs.create, {
          agent: 'Executor',
          action: 'take_profit',
          symbol: pos.symbol,
          details: { plPct },
        })
      } else if (plPct <= -config.stopLossPct) {
        await ctx.runAction(internal.actions.closePosition, {
          symbol: pos.symbol,
        })
        await ctx.runMutation(internal.activityLogs.create, {
          agent: 'Executor',
          action: 'stop_loss',
          symbol: pos.symbol,
          details: { plPct },
        })
      }
    }

    // Look for buy opportunities
    if (positions.length < config.maxPositions) {
      const signals = await ctx.runQuery(internal.signals.getTop, {
        limit: 5,
        minSentiment: config.minSentimentScore,
      })

      const heldSymbols = new Set(positions.map((p) => p.symbol))
      const candidates = signals.filter((s) => !heldSymbols.has(s.symbol))

      for (const signal of candidates.slice(0, 1)) {
        const positionSize = Math.min(
          config.maxPositionValue,
          account.cash * (config.positionSizePctOfCash / 100)
        )

        const preview = await ctx.runAction(internal.actions.previewOrder, {
          symbol: signal.symbol,
          side: 'buy',
          notional: positionSize,
          orderType: 'market',
          timeInForce: 'day',
        })

        if (preview.allowed && preview.approvalToken) {
          await ctx.runAction(internal.actions.submitOrder, {
            approvalToken: preview.approvalToken,
          })
        }
      }
    }

    return { status: 'success', positionsChecked: positions.length }
  },
})

export const gatherData = action({
  args: {},
  handler: async (ctx) => {
    // Update positions in database
    const alpaca = createAlpacaClient()
    const positions = await alpaca.getPositions()

    for (const pos of positions) {
      const existing = await ctx.db
        .query('positions')
        .withIndex('by_symbol', (q) => q.eq('symbol', pos.symbol))
        .first()

      const positionData = {
        symbol: pos.symbol,
        qty: parseFloat(pos.qty),
        avgEntryPrice: parseFloat(pos.avg_entry_price),
        currentPrice: parseFloat(pos.current_price),
        marketValue: parseFloat(pos.market_value),
        unrealizedPl: parseFloat(pos.unrealized_pl),
        unrealizedPlpc: parseFloat(pos.unrealized_plpc),
        updatedAt: Date.now(),
      }

      if (existing) {
        await ctx.db.patch(existing._id, positionData)
      } else {
        await ctx.db.insert('positions', positionData)
      }
    }

    return { positionsUpdated: positions.length }
  },
})
