import { useMemo } from 'react'
import { computeSR, type SROptions } from '../lib/srLevels'
import type { Candle, SRLevel } from '../types'

/**
 * React hook that computes S/R levels from a candle array.
 * Recomputes only when `candles` reference changes.
 */
export function useSRLevels(
  candles: Candle[],
  options: SROptions = {},
): SRLevel[] {
  return useMemo(() => {
    if (candles.length < 10) return []
    // Use last 200 candles for S/R — recent price action is what matters
    const window = candles.length > 200 ? candles.slice(-200) : candles
    return computeSR(window, { swingWindow: 5, clusterThreshold: 0.001, minStrength: 1, ...options })
  }, [candles, options.swingWindow, options.clusterThreshold])
}
