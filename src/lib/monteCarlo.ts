import type { Candle } from '../types'

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

export interface MCResult {
  median: number[]
  lower25: number[]
  upper75: number[]
  lower10: number[]
  upper90: number[]
  nSteps: number
  probUp: number
  expectedClose: number
  seedPrice: number
  sigma: number
  annVol: number
  mu: number
}

/* ------------------------------------------------------------------ */
/*  GBM fitting                                                        */
/* ------------------------------------------------------------------ */

/**
 * Fit GBM parameters from recent candles.
 * Returns mu (drift per step) and sigma (vol per step) from log returns.
 */
export function fitGBM(
  candles: Candle[],
  window = 48,
): { mu: number; sigma: number; seed: number } | null {
  const n = Math.min(window, candles.length - 1)
  if (n < 5) return null

  const closes = candles.slice(-n).map(c => c.close)
  const logRets: number[] = []

  for (let i = 1; i < closes.length; i++) {
    logRets.push(Math.log(closes[i] / closes[i - 1]))
  }

  const nRets = logRets.length
  const sum = logRets.reduce((a, b) => a + b, 0)
  const mu = sum / nRets
  const sqDiffs = logRets.map(r => (r - mu) ** 2)
  const variance = sqDiffs.reduce((a, b) => a + b, 0) / (nRets - 1)
  const sigma = Math.sqrt(variance)

  if (sigma < 1e-8) return null

  return {
    mu,
    sigma,
    seed: candles[candles.length - 1].close,
  }
}

/* ------------------------------------------------------------------ */
/*  Path simulation                                                    */
/* ------------------------------------------------------------------ */

/**
 * Generate nPaths GBM paths for nSteps into the future.
 * Uses Box-Muller transform for normal random numbers.
 */
export function simulatePaths(
  seed: number,
  mu: number,
  sigma: number,
  nSteps: number,
  nPaths = 500,
): number[][] {
  const dt = 1
  const muAdj = mu - 0.5 * sigma * sigma
  const paths: number[][] = []

  for (let p = 0; p < nPaths; p++) {
    const path: number[] = [seed]
    for (let s = 0; s < nSteps; s++) {
      const z = boxMuller()
      const increment = muAdj * dt + sigma * Math.sqrt(dt) * z
      path.push(path[path.length - 1] * Math.exp(increment))
    }
    paths.push(path)
  }

  return paths
}

/** Box-Muller transform: returns a standard normal random number. */
function boxMuller(): number {
  let u = 0,
    v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

/* ------------------------------------------------------------------ */
/*  Percentile computation                                             */
/* ------------------------------------------------------------------ */

export function computePercentiles(
  paths: number[][],
): {
  median: number[]
  lower25: number[]
  upper75: number[]
  lower10: number[]
  upper90: number[]
} {
  const nSteps = paths[0].length
  const nPaths = paths.length

  function percentile(arr: number[], p: number): number {
    const sorted = [...arr].sort((a, b) => a - b)
    const idx = Math.floor(sorted.length * p)
    return sorted[Math.min(idx, sorted.length - 1)]
  }

  const median: number[] = []
  const lower25: number[] = []
  const upper75: number[] = []
  const lower10: number[] = []
  const upper90: number[] = []

  for (let s = 0; s < nSteps; s++) {
    const values = paths.map(p => p[s])
    median.push(percentile(values, 0.5))
    lower25.push(percentile(values, 0.25))
    upper75.push(percentile(values, 0.75))
    lower10.push(percentile(values, 0.1))
    upper90.push(percentile(values, 0.9))
  }

  return { median, lower25, upper75, lower10, upper90 }
}

/* ------------------------------------------------------------------ */
/*  Main computation                                                   */
/* ------------------------------------------------------------------ */

export function computeMC(
  candles: Candle[],
  nPaths = 500,
  nSteps = 24,
): MCResult | null {
  const params = fitGBM(candles)
  if (!params) return null

  const paths = simulatePaths(params.seed, params.mu, params.sigma, nSteps, nPaths)
  const percentiles = computePercentiles(paths)

  const finalPrices = paths.map(p => p[p.length - 1])
  const probUp = finalPrices.filter(p => p > params.seed).length / finalPrices.length
  const expectedClose = finalPrices.reduce((a, b) => a + b, 0) / finalPrices.length

  return {
    ...percentiles,
    nSteps,
    probUp,
    expectedClose,
    seedPrice: params.seed,
    sigma: params.sigma,
    annVol: params.sigma * Math.sqrt(96 * 252) * 100,
    mu: params.mu,
  }
}
