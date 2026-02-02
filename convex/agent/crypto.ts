import { createAlpacaClient } from '../providers/alpaca'
import { internal } from './_generated/api'
import { action } from './_generated/server'

// 24/7 crypto trading loop
export const runCryptoTrading = action({
  args: {},
  handler: async (ctx) => {
    const config = await ctx.runQuery(internal.config.get)

    if (!config?.cryptoEnabled) {
      return { status: 'skipped', reason: 'Crypto not enabled' }
    }

    const alpaca = createAlpacaClient()
    const account = await alpaca.getAccount()
    const positions = await alpaca.getPositions()

    // Filter crypto positions
    const cryptoPositions = positions.filter((p) => config.cryptoSymbols?.includes(p.symbol))

    // Check existing positions for exits
    for (const pos of cryptoPositions) {
      const plPct = Number.parseFloat(pos.unrealized_plpc) * 100

      if (plPct >= (config.takeProfitPct || 10)) {
        await ctx.runAction(internal.actions.closePosition, {
          symbol: pos.symbol,
        })
      } else if (plPct <= -(config.stopLossPct || 5)) {
        await ctx.runAction(internal.actions.closePosition, {
          symbol: pos.symbol,
        })
      }
    }

    // Look for new crypto opportunities
    const cryptoSignals = await ctx.runQuery(internal.signals.getCrypto, {
      symbols: config.cryptoSymbols || [],
      minMomentum: config.cryptoMomentumThreshold || 0.02,
    })

    const heldSymbols = new Set(cryptoPositions.map((p) => p.symbol))
    const candidates = cryptoSignals.filter((s) => !heldSymbols.has(s.symbol))

    for (const signal of candidates.slice(0, 1)) {
      const positionSize = Math.min(
        config.maxPositionValue || 1000,
        Number.parseFloat(account.cash) * 0.1
      )

      const preview = await ctx.runAction(internal.actions.previewOrder, {
        symbol: signal.symbol,
        side: 'buy',
        notional: positionSize,
        orderType: 'market',
        timeInForce: 'ioc',
      })

      if (preview.allowed && preview.approvalToken) {
        await ctx.runAction(internal.actions.submitOrder, {
          approvalToken: preview.approvalToken,
        })
      }
    }

    return { status: 'success', cryptoPositions: cryptoPositions.length }
  },
})
