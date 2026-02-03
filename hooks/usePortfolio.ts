'use client'

import { api } from '@/convex/_generated/api'
import { useQuery } from 'convex/react'
import { useMemo } from 'react'

interface PortfolioMetrics {
  portfolioValue: number | undefined
  cash: number | undefined
  equity: number | undefined
  buyingPower: number | undefined
  positionsCount: number | undefined
  unrealizedPl: number | undefined
  unrealizedPlPct: number | undefined
  isLoading: boolean
}

export function usePortfolio(): PortfolioMetrics {
  // Get all data from Convex via WebSocket (real-time updates)
  const dbStatus = useQuery(api.system.status.get)

  const positions = dbStatus?.positions || []
  const account = dbStatus?.account

  // Calculate unrealized P&L from positions (auto-recalculates when positions change via WebSocket)
  const { unrealizedPl, unrealizedPlPct } = useMemo(() => {
    const totalPl = positions.reduce(
      (sum: number, pos: { unrealizedPl?: number }) => sum + (pos.unrealizedPl || 0),
      0
    )
    const totalCost = positions.reduce(
      (sum: number, pos: { qty?: number; avgEntryPrice?: number; currentPrice?: number }) => {
        const qty = pos.qty || 0
        const entryPrice = pos.avgEntryPrice || pos.currentPrice || 0
        return sum + qty * entryPrice
      },
      0
    )

    const plPct = totalCost > 0 ? (totalPl / totalCost) * 100 : 0

    return {
      unrealizedPl: totalPl,
      unrealizedPlPct: plPct,
    }
  }, [positions])

  const isLoading = dbStatus === undefined

  return {
    portfolioValue: account?.portfolioValue,
    cash: account?.cash,
    equity: account?.equity,
    buyingPower: account?.buyingPower,
    positionsCount: positions.length,
    unrealizedPl,
    unrealizedPlPct,
    isLoading,
  }
}
