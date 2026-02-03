import type { MutationCtx } from '../../_generated/server'

/**
 * Legacy compatibility shim.
 * Position entry tracking moved to stalenessAnalysis.trackedSince in Convex v2.
 */
export async function upsertPositionEntry(
  _ctx: MutationCtx,
  _params: {
    symbol: string
    qty: number
    avgEntryPrice: number
    currentPrice: number
  }
): Promise<void> {
  return
}
