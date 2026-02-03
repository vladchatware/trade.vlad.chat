'use node'

/* eslint-disable @typescript-eslint/no-explicit-any */

import { api } from './_generated/api'
import { action } from './_generated/server'
import { createAlpacaClient } from './providers/alpaca'

// 24/7 crypto trading loop
export const runCryptoTrading = action({
  args: {},
  // biome-ignore lint/suspicious/noExplicitAny: Convex ctx typing is omitted here.
  handler: async (ctx: any) => {
    // @ts-ignore - config typing
    // biome-ignore lint/suspicious/noExplicitAny: Config typing is handled dynamically.
    const config: any = await ctx.runQuery(api.config.get)

    if (!config?.cryptoEnabled) {
      return { status: 'skipped', reason: 'Crypto not enabled' }
    }

    const alpaca = createAlpacaClient()
    const account = await alpaca.getAccount()
    const positions = await alpaca.getPositions()

    // Filter crypto positions
    // @ts-ignore - parameter 'p' implicitly has 'any' type
    const cryptoPositions = positions.filter((p) => config.cryptoSymbols?.includes(p.symbol))

    // Check existing positions for exits
    for (const pos of cryptoPositions) {
      // @ts-ignore - Number.parseFloat argument type issues
      const plPct = Number.parseFloat(pos.unrealized_plpc) * 100

      if (plPct >= (config.takeProfitPct || 10)) {
        await ctx.runAction(api.tradingActions.closePosition, {
          symbol: pos.symbol,
        })
      } else if (plPct <= -(config.stopLossPct || 5)) {
        await ctx.runAction(api.tradingActions.closePosition, {
          symbol: pos.symbol,
        })
      }
    }

    // Look for new crypto opportunities
    const cryptoSignals = await ctx.runQuery(api.signalsQueries.getCrypto, {
      symbols: config.cryptoSymbols || [],
      minMomentum: config.cryptoMomentumThreshold || 0.02,
    })

    // @ts-ignore - parameter 'p' implicitly has 'any' type
    const heldSymbols = new Set(cryptoPositions.map((p) => p.symbol))
    // @ts-ignore - parameter 's' implicitly has 'any' type
    const candidates = cryptoSignals.filter((s) => !heldSymbols.has(s.symbol))

    for (const signal of candidates.slice(0, 1)) {
      const positionSize = Math.min(config.maxPositionValue || 1000, account.cash * 0.1)

      const preview = await ctx.runAction(api.tradingActions.previewOrder, {
        symbol: signal.symbol,
        side: 'buy',
        qty: positionSize / signal.price,
        orderType: 'market',
      })

      if (preview.previewId) {
        await ctx.runAction(api.tradingActions.submitOrder, {
          previewId: preview.previewId,
        })
      }
    }

    return { status: 'success', cryptoPositions: cryptoPositions.length }
  },
})
