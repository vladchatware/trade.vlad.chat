import type { Candle, SRLevel } from '../types'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface SwingPoint {
  price: number
  time: number
}

export interface Cluster {
  price: number
  count: number
}

/* ------------------------------------------------------------------ */
/*  Swing detection                                                    */
/* ------------------------------------------------------------------ */

/**
 * Find swing highs and lows in a candle array.
 * A swing high is a candle whose high is higher than `window` candles
 * on each side. A swing low is a candle whose low is lower.
 */
export function findSwings(
  candles: Candle[],
  window: number,
): { highs: SwingPoint[]; lows: SwingPoint[] } {
  const highs: SwingPoint[] = []
  const lows: SwingPoint[] = []

  if (candles.length < window * 2 + 1) {
    return { highs, lows }
  }

  for (let i = window; i < candles.length - window; i++) {
    const c = candles[i]

    // Swing high?
    const isHigh = (() => {
      for (let j = 1; j <= window; j++) {
        if (c.high <= candles[i - j].high) return false
        if (c.high <= candles[i + j].high) return false
      }
      return true
    })()

    if (isHigh) {
      highs.push({ price: c.high, time: c.time })
    }

    // Swing low?
    const isLow = (() => {
      for (let j = 1; j <= window; j++) {
        if (c.low >= candles[i - j].low) return false
        if (c.low >= candles[i + j].low) return false
      }
      return true
    })()

    if (isLow) {
      lows.push({ price: c.low, time: c.time })
    }
  }

  return { highs, lows }
}

/* ------------------------------------------------------------------ */
/*  Price clustering                                                   */
/* ------------------------------------------------------------------ */

/**
 * Group nearby price levels together using a percentage threshold.
 * Returns the mean price of each cluster and the number of points in it.
 */
export function clusterLevels(
  points: SwingPoint[],
  thresholdPct = 0.001,
): Cluster[] {
  if (points.length === 0) return []

  const sorted = [...points].sort((a, b) => a.price - b.price)
  const clusters: Cluster[] = [{ price: sorted[0].price, count: 1 }]

  for (let i = 1; i < sorted.length; i++) {
    const lastCluster = clusters[clusters.length - 1]
    const lastPrice = lastCluster.price / lastCluster.count // mean of cluster so far
    if (Math.abs(sorted[i].price - lastPrice) / lastPrice < thresholdPct) {
      // Merge into cluster — running sum
      lastCluster.price += sorted[i].price
      lastCluster.count += 1
    } else {
      clusters.push({ price: sorted[i].price, count: 1 })
    }
  }

  // Compute final means
  for (const cl of clusters) {
    cl.price = cl.price / cl.count
  }

  return clusters
}

/* ------------------------------------------------------------------ */
/*  Main computation                                                   */
/* ------------------------------------------------------------------ */

export interface SROptions {
  swingWindow?: number
  clusterThreshold?: number
  minStrength?: number
}

/**
 * Compute support and resistance levels from a candle array.
 *
 * 1. Find swing highs and lows (window=3 for intraday sensitivity).
 * 2. Cluster nearby prices into distinct horizontal levels.
 * 3. Return typed SRLevel[] with strength = number of swing points per cluster.
 */
export function computeSR(
  candles: Candle[],
  options: SROptions = {},
): SRLevel[] {
  const { swingWindow = 5, clusterThreshold = 0.001, minStrength = 2 } = options

  const { highs, lows } = findSwings(candles, swingWindow)

  const resistanceClusters = clusterLevels(highs, clusterThreshold)
  const supportClusters = clusterLevels(lows, clusterThreshold)

  const levels: SRLevel[] = [
    ...resistanceClusters.map((c) => ({
      price: c.price,
      type: 'resistance' as const,
      strength: c.count,
    })),
    ...supportClusters.map((c) => ({
      price: c.price,
      type: 'support' as const,
      strength: c.count,
    })),
  ]

  // Filter out weak levels (single touch = noise)
  const filtered = levels.filter((l) => l.strength >= minStrength)

  // Sort by price descending
  filtered.sort((a, b) => b.price - a.price)

  // Dedup: if S and R are within 0.15% of each other, keep the stronger one
  const minDistPct = 0.0015
  const deduped: SRLevel[] = []
  for (const lvl of filtered) {
    const conflictIdx = deduped.findIndex(
      (d) => d.type !== lvl.type && Math.abs(d.price - lvl.price) / lvl.price < minDistPct,
    )
    if (conflictIdx !== -1) {
      // Keep the stronger level, drop the weaker
      if (lvl.strength > deduped[conflictIdx].strength) {
        deduped[conflictIdx] = lvl
      }
    } else {
      deduped.push(lvl)
    }
  }

  return deduped
}
