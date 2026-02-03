'use node'

/* eslint-disable @typescript-eslint/no-explicit-any */

import { api } from './_generated/api'
import { action } from './_generated/server'
import { upsertPositionEntry } from './lib/positionEntries'
import { createAlpacaClient } from './providers/alpaca'

// Main trading loop - ported from agent-v1.mjs
export const runTrading = action({
  args: {},
  handler: async (ctx) => {
    const alpaca = createAlpacaClient()
    const config = await ctx.runQuery(api.config.get)
    const riskState = await ctx.runQuery(api.riskState.get)

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
      // @ts-ignore - various type errors
      const plPct = Number.parseFloat(pos.unrealized_plpc) * 100

      if (plPct >= config.takeProfitPct) {
        await ctx.runAction(api.tradingActions.closePosition, {
          symbol: pos.symbol,
        })
        await ctx.runMutation(api.activityLogs.create, {
          agent: 'Executor',
          action: 'take_profit',
          symbol: pos.symbol,
          details: { plPct },
        })
      } else if (plPct <= -config.stopLossPct) {
        await ctx.runAction(api.tradingActions.closePosition, {
          symbol: pos.symbol,
        })
        await ctx.runMutation(api.activityLogs.create, {
          agent: 'Executor',
          action: 'stop_loss',
          symbol: pos.symbol,
          details: { plPct },
        })
      }
    }

    // Look for buy opportunities
    if (positions.length < config.maxPositions) {
      const signals = await ctx.runQuery(api.signalsQueries.getTop, {
        limit: 5,
      })
      // Filter by sentiment after fetching
      const filteredSignals = signals.filter((s) => (s.sentiment || 0) >= config.minSentimentScore)

      // @ts-ignore - parameter 'p' implicitly has 'any' type
      const heldSymbols = new Set(positions.map((p) => p.symbol))
      // @ts-ignore - parameter 's' implicitly has 'any' type
      const candidates = filteredSignals.filter((s) => !heldSymbols.has(s.symbol))

      for (const signal of candidates.slice(0, 1)) {
        const positionSize = Math.min(
          config.maxPositionValue,
          account.cash * (config.positionSizePctOfCash / 100)
        )

        const preview = await ctx.runAction(api.tradingActions.previewOrder, {
          symbol: signal.symbol,
          side: 'buy',
          qty: signal.price ? positionSize / signal.price : 0,
          orderType: 'market',
        })

        if (preview.previewId) {
          await ctx.runAction(api.tradingActions.submitOrder, {
            previewId: preview.previewId,
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
    const alpaca = createAlpacaClient()

    // Update positions in database
    const positions = await alpaca.getPositions()

    for (const pos of positions) {
      // @ts-ignore - ctx.db property issues
      const existing = await ctx.db
        .query('positions')
        // @ts-ignore - parameter 'q' implicitly has 'any' type
        .withIndex('by_symbol', (q) => q.eq('symbol', pos.symbol))
        .first()

      // @ts-ignore - Number.parseFloat argument type issues
      const positionData = {
        symbol: pos.symbol,
        // @ts-ignore
        qty: Number.parseFloat(pos.qty),
        // @ts-ignore - Property 'avg_entry_price' does not exist on type 'AlpacaPosition'
        avgEntryPrice: Number.parseFloat(pos.avg_entry_price),
        // @ts-ignore
        currentPrice: Number.parseFloat(pos.current_price),
        // @ts-ignore
        marketValue: Number.parseFloat(pos.market_value),
        // @ts-ignore
        unrealizedPl: Number.parseFloat(pos.unrealized_pl),
        // @ts-ignore
        unrealizedPlpc: Number.parseFloat(pos.unrealized_plpc),
        updatedAt: Date.now(),
      }

      if (existing) {
        // @ts-ignore - ctx.db property issues
        await ctx.db.patch(existing._id, positionData)
      } else {
        // @ts-ignore - ctx.db property issues
        await ctx.db.insert('positions', positionData)
      }

      await upsertPositionEntry(ctx, {
        symbol: positionData.symbol,
        qty: positionData.qty,
        avgEntryPrice: positionData.avgEntryPrice,
        currentPrice: positionData.currentPrice,
      })

      await ctx.runMutation(api.positionHistory.upsert, {
        symbol: positionData.symbol,
        price: positionData.currentPrice,
        timestamp: Date.now(),
      })
    }

    // Remove stale entries for closed positions
    const activeSymbols = new Set(positions.map((pos) => pos.symbol))
    // @ts-ignore - ctx.db property issues
    const entries = await ctx.db.query('positionEntries').collect()
    for (const entry of entries) {
      if (!activeSymbols.has(entry.symbol)) {
        // @ts-ignore - ctx.db property issues
        await ctx.db.delete(entry._id)
      }
    }
    // @ts-ignore - ctx.db property issues
    const stalenessItems = await ctx.db.query('stalenessAnalysis').collect()
    for (const item of stalenessItems) {
      if (!activeSymbols.has(item.symbol)) {
        // @ts-ignore - ctx.db property issues
        await ctx.db.delete(item._id)
      }
    }

    // Fetch and store account data for real-time dashboard updates
    const account = await alpaca.getAccount()
    // @ts-ignore - Property 'equity' does not exist on type 'AlpacaAccount'
    const equity = Number.parseFloat(account.equity)
    // @ts-ignore - Property 'cash' does not exist on type 'AlpacaAccount'
    const cash = Number.parseFloat(account.cash)
    // @ts-ignore - Property 'buying_power' does not exist on type 'AlpacaAccount'
    const buyingPower = Number.parseFloat(account.buying_power)
    // @ts-ignore - Property 'portfolio_value' does not exist on type 'AlpacaAccount'
    const portfolioValue = Number.parseFloat(account.portfolio_value)

    // Update account data in database (real-time via WebSocket)
    await ctx.runMutation(api.account.updateAccount, {
      equity,
      cash,
      buyingPower,
      portfolioValue,
    })

    // Create portfolio snapshot for chart history
    const config = await ctx.runQuery(api.config.get)
    const startingEquity = config?.startingEquity || 100000
    const pl = equity - startingEquity
    const plPct = (pl / startingEquity) * 100

    // Use mutation to insert snapshot (actions can't access ctx.db directly)
    await ctx.runMutation(api.portfolio.createSnapshot, {
      equity,
      pl,
      plPct,
    })

    return { positionsUpdated: positions.length, snapshotCreated: true }
  },
})
