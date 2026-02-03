'use node'

import { api } from './_generated/api'
import type { Doc } from './_generated/dataModel'
import { action } from './_generated/server'

type CryptoSignal = {
  symbol: string
  sentiment?: number
  momentum?: number
  price?: number
}

export function pickCryptoEntry(
  signals: CryptoSignal[],
  heldSymbols: Set<string>
): CryptoSignal | null {
  return signals.filter((signal) => !heldSymbols.has(signal.symbol))[0] ?? null
}

export function cryptoExitReason(
  unrealizedPlpc: number,
  takeProfitPct: number,
  stopLossPct: number
): 'take_profit' | 'stop_loss' | null {
  const plPct = unrealizedPlpc * 100
  if (plPct >= takeProfitPct) return 'take_profit'
  if (plPct <= -stopLossPct) return 'stop_loss'
  return null
}

export const runCryptoTrading = action({
  args: {},
  handler: async (ctx): Promise<{ status: string; reason?: string; cryptoPositions?: number }> => {
    const config = await ctx.runQuery(api.config.get, {})

    if (!config?.cryptoEnabled) {
      return { status: 'skipped', reason: 'crypto_disabled' }
    }

    const [account, positions]: [Doc<'account'> | null, Doc<'positions'>[]] = await Promise.all([
      ctx.runQuery(api.account.getAccount, {}),
      ctx.runQuery(api.positions.getAll, {}),
    ])

    const symbols = config.cryptoSymbols ?? []
    const cryptoPositions = positions.filter((position) => symbols.includes(position.symbol))

    const takeProfitPct = config.cryptoTakeProfitPct ?? 10
    const stopLossPct = config.cryptoStopLossPct ?? 5

    for (const position of cryptoPositions) {
      const reason = cryptoExitReason(position.unrealizedPlpc, takeProfitPct, stopLossPct)
      if (!reason) continue

      await ctx.runAction(api.tradingActions.closePosition, { symbol: position.symbol })
      await ctx.runMutation(api.activityLogs.create, {
        agent: 'Crypto',
        action: reason,
        symbol: position.symbol,
        detailsJson: JSON.stringify({ plPct: position.unrealizedPlpc * 100 }),
      })
    }

    const cryptoSignals = await ctx.runQuery(api.signalsQueries.getCrypto, {
      symbols,
      minMomentum: config.cryptoMomentumThreshold ?? 0.02,
      limit: 20,
    })

    const heldSymbols = new Set(cryptoPositions.map((position) => position.symbol))
    const candidate = pickCryptoEntry(cryptoSignals, heldSymbols)

    if (!candidate?.price || candidate.price <= 0) {
      return { status: 'success', cryptoPositions: cryptoPositions.length }
    }

    const positionSize = Math.min(
      config.cryptoMaxPositionValue ?? config.maxPositionValue,
      (account?.cash ?? 0) * (config.positionSizePctOfCash / 100)
    )
    const qty = positionSize / candidate.price
    if (!Number.isFinite(qty) || qty <= 0) {
      return { status: 'success', cryptoPositions: cryptoPositions.length }
    }

    const preview = await ctx.runAction(api.tradingActions.previewOrder, {
      symbol: candidate.symbol,
      side: 'buy',
      qty,
      orderType: 'market',
    })

    if (!preview.policy.allowed || !preview.approvalToken) {
      await ctx.runMutation(api.activityLogs.create, {
        agent: 'Crypto',
        action: 'crypto_buy_skipped',
        symbol: candidate.symbol,
        detailsJson: JSON.stringify({ reason: preview.policy.reason ?? 'policy_rejected' }),
      })
      return { status: 'success', cryptoPositions: cryptoPositions.length }
    }

    await ctx.runAction(api.tradingActions.submitOrder, {
      previewId: preview.previewId,
      approvalToken: preview.approvalToken,
    })

    await ctx.runMutation(api.activityLogs.create, {
      agent: 'Crypto',
      action: 'crypto_buy_submitted',
      symbol: candidate.symbol,
      detailsJson: JSON.stringify({
        previewId: preview.previewId,
        estimatedPrice: preview.estimatedPrice,
      }),
    })

    return { status: 'success', cryptoPositions: cryptoPositions.length }
  },
})
