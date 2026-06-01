import { test, expect } from 'bun:test'
import { findSwings, clusterLevels, computeSR } from '../srLevels'
import type { Candle } from '../../types'

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function makeCandle(
  time: number,
  open: number,
  high: number,
  low: number,
  close: number,
  volume = 100,
): Candle {
  return { time, open, high, low, close, volume }
}

/**
 * Candles forming a clear peak at index 5:
 *   Indices 0-4: rising   (high goes 70k → 72k)
 *   Index 5:      peak    (high = 73k)
 *   Indices 6-19: falling (high goes 72.6k → 67.4k)
 */
function buildSwingHighData(): Candle[] {
  const candles: Candle[] = []
  for (let i = 0; i < 20; i++) {
    let high: number
    let low: number
    if (i < 5) {
      high = 70_000 + i * 500
      low = 69_900 + i * 500
    } else if (i === 5) {
      high = 73_000
      low = 72_900
    } else {
      high = 73_000 - (i - 5) * 400
      low = 72_900 - (i - 5) * 400
    }
    const mid = (high + low) / 2
    candles.push(makeCandle(i, mid, high, low, mid))
  }
  return candles
}

/**
 * Candles forming a clear trough at index 5:
 *   Indices 0-4: falling  (low goes 71k → 69k)
 *   Index 5:      trough  (low = 67k)
 *   Indices 6-19: rising  (low goes 67.4k → 72.6k)
 */
function buildSwingLowData(): Candle[] {
  const candles: Candle[] = []
  for (let i = 0; i < 20; i++) {
    let high: number
    let low: number
    if (i < 5) {
      high = 72_000 - i * 500
      low = 71_000 - i * 500
    } else if (i === 5) {
      high = 67_100
      low = 67_000
    } else {
      high = 67_100 + (i - 5) * 400
      low = 67_000 + (i - 5) * 400
    }
    const mid = (high + low) / 2
    candles.push(makeCandle(i, mid, high, low, mid))
  }
  return candles
}

/* ------------------------------------------------------------------ */
/*  T1: findSwings detects 1 clear swing high                          */
/* ------------------------------------------------------------------ */

test('findSwings — detects 1 clear swing high', () => {
  const candles = buildSwingHighData()
  const { highs, lows } = findSwings(candles, 3)

  expect(highs.length).toBeGreaterThanOrEqual(1)

  // The peak should be at index 5 (high = 73_000)
  const hasPeak = highs.some((h) => Math.abs(h.price - 73_000) < 1)
  expect(hasPeak).toBe(true)

  // No swing lows in a rising-then-falling pattern
  expect(lows.length).toBe(0)
})

/* ------------------------------------------------------------------ */
/*  T2: findSwings detects 1 clear swing low                           */
/* ------------------------------------------------------------------ */

test('findSwings — detects 1 clear swing low', () => {
  const candles = buildSwingLowData()
  const { highs, lows } = findSwings(candles, 3)

  expect(lows.length).toBeGreaterThanOrEqual(1)

  // The trough should be at index 5 (low = 67_000)
  const hasTrough = lows.some((l) => Math.abs(l.price - 67_000) < 1)
  expect(hasTrough).toBe(true)

  expect(highs.length).toBe(0)
})

/* ------------------------------------------------------------------ */
/*  T3: clusterLevels merges 3 nearby points into 1                    */
/* ------------------------------------------------------------------ */

test('clusterLevels — merges 3 nearby points into 1 cluster', () => {
  const points = [
    { price: 72_000, time: 1 },
    { price: 72_010, time: 2 },
    { price: 72_005, time: 3 },
  ]
  const clusters = clusterLevels(points, 0.001)

  // All within 0.1% so should be one cluster
  expect(clusters.length).toBe(1)
  expect(clusters[0].count).toBe(3)
  expect(Math.abs(clusters[0].price - 72_005)).toBeLessThan(5)
})

/* ------------------------------------------------------------------ */
/*  T4: no swings in flat/same-price data                              */
/* ------------------------------------------------------------------ */

test('findSwings — no swings in flat data', () => {
  const candles: Candle[] = []
  for (let i = 0; i < 20; i++) {
    candles.push(makeCandle(i, 70_000, 70_010, 69_990, 70_000))
  }
  const { highs, lows } = findSwings(candles, 3)

  expect(highs.length).toBe(0)
  expect(lows.length).toBe(0)
})

/* ------------------------------------------------------------------ */
/*  T5: computeSR returns correct types                                */
/* ------------------------------------------------------------------ */

test('computeSR — returns correct types (support vs resistance)', () => {
  const candles: Candle[] = []

  // Create data with clear swings
  for (let i = 0; i < 30; i++) {
    let high: number
    let low: number
    // Two peaks and two troughs
    if (i === 5) {
      high = 73_000
      low = 72_800
    } else if (i === 15) {
      high = 72_000
      low = 71_800
    } else if (i === 10) {
      high = 71_500
      low = 70_500
    } else if (i === 20) {
      high = 71_500
      low = 70_500
    } else {
      high = 71_000 + Math.random() * 500
      low = 70_500 + Math.random() * 500
    }
    candles.push(makeCandle(i, (high + low) / 2, high, low, (high + low) / 2))
  }

  const levels = computeSR(candles, { swingWindow: 2, clusterThreshold: 0.002, minStrength: 1 })

  expect(levels.length).toBeGreaterThan(0)

  for (const lvl of levels) {
    expect(lvl).toHaveProperty('price')
    expect(typeof lvl.price).toBe('number')
    expect(['support', 'resistance']).toContain(lvl.type)
    expect(lvl.strength).toBeGreaterThanOrEqual(1)
  }

  // Levels should be sorted descending by price
  for (let i = 1; i < levels.length; i++) {
    expect(levels[i].price).toBeLessThanOrEqual(levels[i - 1].price)
  }

  // Should have both support and resistance types
  const types = new Set(levels.map((l) => l.type))
  expect(types.has('support')).toBe(true)
  expect(types.has('resistance')).toBe(true)
})
