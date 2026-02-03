/* eslint-disable @typescript-eslint/no-explicit-any */

export async function upsertPositionEntry(
  // biome-ignore lint/suspicious/noExplicitAny: Convex ctx typing is omitted in this helper.
  ctx: any,
  params: {
    symbol: string
    qty: number
    avgEntryPrice: number
    currentPrice: number
  }
): Promise<void> {
  if (params.qty <= 0) return

  const existing = await ctx.db
    .query('positionEntries')
    // biome-ignore lint/suspicious/noExplicitAny: Convex query builder typing is not exported here.
    .withIndex('by_symbol', (q: any) => q.eq('symbol', params.symbol))
    .first()

  const latestSignal = await ctx.db
    .query('signals')
    // biome-ignore lint/suspicious/noExplicitAny: Convex query builder typing is not exported here.
    .withIndex('by_symbol', (q: any) => q.eq('symbol', params.symbol))
    .order('desc')
    .first()

  const entrySentiment = latestSignal?.sentiment ?? 0
  const entryReason =
    latestSignal?.reason ?? (latestSignal ? `${latestSignal.source} signal` : 'Position entry')
  const entrySocialVolume = latestSignal?.volume ?? 0
  const entrySources = latestSignal?.source ? [latestSignal.source] : []
  const now = Date.now()

  const entryPrice = params.avgEntryPrice > 0 ? params.avgEntryPrice : params.currentPrice

  if (!existing) {
    await ctx.db.insert('positionEntries', {
      symbol: params.symbol,
      entryTime: now,
      entryPrice,
      entrySentiment,
      entryReason,
      entrySocialVolume,
      entrySources,
      peakPrice: params.currentPrice,
      peakSentiment: entrySentiment,
    })
    return
  }

  const peakPrice = Math.max(existing.peakPrice ?? 0, params.currentPrice)
  const peakSentiment = Math.max(existing.peakSentiment ?? entrySentiment, entrySentiment)
  const updatedEntryPrice = existing.entryPrice > 0 ? existing.entryPrice : entryPrice

  await ctx.db.patch(existing._id, {
    peakPrice,
    peakSentiment,
    entryPrice: updatedEntryPrice,
  })
}
