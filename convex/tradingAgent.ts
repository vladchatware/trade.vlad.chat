'use node'

/* eslint-disable @typescript-eslint/no-explicit-any */

import { api } from './_generated/api'
import { action } from './_generated/server'
import { createAlpacaClient } from './providers/alpaca'

// Main trading loop for market-hours equities execution
export const runTrading = action({
  args: {},
  handler: async (ctx) => {
    const alpaca = createAlpacaClient()
    const config = await ctx.runQuery(api.config.get)
    const riskState = await ctx.runQuery(api.riskState.get)

    if (!config || riskState?.killSwitchActive) {
      return { status: 'skipped', reason: 'Config missing or kill switch active' }
    }

    type AlpacaPosition = {
      symbol: string
      unrealized_plpc?: string | number
    }
    type SignalCandidate = {
      sentiment?: number
      symbol: string
      price?: number
      volume?: number
    }

    // Fetch current state
    const account = await alpaca.getAccount()
    const positions = (await alpaca.getPositions()) as AlpacaPosition[]
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
      const signals = (await ctx.runQuery(api.signalsQueries.getTop, {
        limit: 5,
      })) as SignalCandidate[]
      // Filter by sentiment after fetching
      const filteredSignals = signals.filter((s) => (s.sentiment ?? 0) >= config.minSentimentScore)

      const heldSymbols = new Set(positions.map((p) => p.symbol))
      const candidates = filteredSignals.filter((s) => !heldSymbols.has(s.symbol))

      const bestCandidate = candidates[0]
      if (bestCandidate) {
        const positionSize = Math.min(
          config.maxPositionValue,
          account.cash * (config.positionSizePctOfCash / 100)
        )

        const preview = await ctx.runAction(api.tradingActions.previewOrder, {
          symbol: bestCandidate.symbol,
          side: 'buy',
          qty: bestCandidate.price ? positionSize / bestCandidate.price : 0,
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
    type AlpacaPosition = {
      symbol: string
      qty?: string | number
      avg_entry_price?: string | number
      current_price?: string | number
      market_value?: string | number
      unrealized_pl?: string | number
      unrealized_plpc?: string | number
    }

    // Update positions in database
    const positions = (await alpaca.getPositions()) as AlpacaPosition[]

    for (const pos of positions) {
      const positionData = {
        symbol: pos.symbol,
        qty: Number.parseFloat(String(pos.qty ?? 0)),
        avgEntryPrice: Number.parseFloat(String(pos.avg_entry_price ?? 0)),
        currentPrice: Number.parseFloat(String(pos.current_price ?? 0)),
        marketValue: Number.parseFloat(String(pos.market_value ?? 0)),
        unrealizedPl: Number.parseFloat(String(pos.unrealized_pl ?? 0)),
        unrealizedPlpc: Number.parseFloat(String(pos.unrealized_plpc ?? 0)),
      }

      await ctx.runMutation(api.positions.updateFromWebSocket, positionData)

      await ctx.runMutation(api.positionHistory.upsert, {
        symbol: positionData.symbol,
        price: positionData.currentPrice,
        timestamp: Date.now(),
      })
    }

    // Remove stale entries for closed positions
    const activeSymbols = positions.map((pos) => pos.symbol)
    await ctx.runMutation(api.positions.cleanupClosed, { activeSymbols })

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
