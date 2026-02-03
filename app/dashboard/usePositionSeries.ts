import { useMemo } from 'react'

import type { PositionRow } from './types'
import { positionColors } from './utils'

export function usePositionSeries(positions: PositionRow[]) {
  const positionPriceHistories = useMemo(() => {
    const histories: Record<string, number[]> = {}

    for (const pos of positions) {
      const currentPrice = pos.currentPrice || pos.avgEntryPrice || 100
      const unrealizedPlVal = pos.unrealizedPl || 0
      const isPositive = unrealizedPlVal >= 0
      const startPrice = currentPrice * (isPositive ? 0.95 : 1.05)
      const prices: number[] = []
      const points = 20

      for (let i = 0; i < points; i++) {
        const progress = i / (points - 1)
        const trend = startPrice + (currentPrice - startPrice) * progress
        const noise = trend * (Math.random() - 0.5) * 0.02
        prices.push(trend + noise)
      }

      prices[prices.length - 1] = currentPrice
      histories[pos.symbol] = prices
    }

    return histories
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [positions])

  const normalizedPositionSeries = useMemo(() => {
    return positions
      .map((pos, idx) => {
        const priceHistory = positionPriceHistories[pos.symbol] || []
        if (priceHistory.length < 2) return null

        const startPrice = priceHistory[0]
        const normalizedData = priceHistory.map(
          (price) => ((price - startPrice) / startPrice) * 100
        )

        return {
          label: pos.symbol,
          data: normalizedData,
          variant: positionColors[idx % positionColors.length],
        }
      })
      .filter(Boolean) as {
      label: string
      data: number[]
      variant: (typeof positionColors)[number]
    }[]
  }, [positionPriceHistories, positions])

  return {
    positionPriceHistories,
    normalizedPositionSeries,
  }
}
