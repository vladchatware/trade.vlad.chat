'use client'

import { api } from '@/convex/_generated/api'
import { useQuery } from 'convex/react'

export function usePortfolioHistory() {
  // Get all data from Convex via WebSocket (real-time updates)
  const status = useQuery(api.status.get)

  const portfolioSnapshots = status?.portfolioSnapshots || []
  const account = status?.account

  // Combine historical snapshots with current account value
  const chartData = portfolioSnapshots.map(
    (snapshot: { equity: number; pl: number; plPct: number; timestamp: number }) => snapshot.equity
  )

  const chartLabels = portfolioSnapshots.map((snapshot: { timestamp: number }) =>
    new Date(snapshot.timestamp).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
  )

  // If we have no history but have current account value, show single point
  const hasNoHistory = chartData.length === 0 && account?.equity
  if (hasNoHistory) {
    chartData.push(account.equity)
    chartLabels.push('Current')
  }

  return {
    data: chartData,
    labels: chartLabels,
    isLoading: status === undefined,
    hasHistory: chartData.length > 0,
    currentEquity: account?.equity,
  }
}
