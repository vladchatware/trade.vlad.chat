import { useMemo } from 'react'
import { computeMC } from '../lib/monteCarlo'
import type { Candle, MCResult } from '../types'

/**
 * Compute Monte Carlo projection from candles.
 * Recomputes when candles reference changes.
 */
export function useMonteCarlo(
  candles: Candle[],
  nSteps = 24,
): MCResult | null {
  return useMemo(() => {
    if (candles.length < 20) return null
    return computeMC(candles, 500, nSteps)
  }, [candles, nSteps])
}
