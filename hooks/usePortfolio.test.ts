import { renderHook, waitFor } from '@testing-library/react'
import { useAction, useQuery } from 'convex/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usePortfolio } from './usePortfolio'

// Get the mocked functions
const mockedUseQuery = vi.mocked(useQuery)
const mockedUseAction = vi.mocked(useAction)

describe('usePortfolio', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns loading state initially', () => {
    // Mock undefined (loading) state from Convex
    mockedUseQuery.mockReturnValue(undefined)
    mockedUseAction.mockReturnValue(vi.fn())

    const { result } = renderHook(() => usePortfolio())

    expect(result.current.isLoading).toBe(true)
    expect(result.current.portfolioValue).toBeUndefined()
    expect(result.current.cash).toBeUndefined()
  })

  it('calculates unrealized P&L from positions correctly', async () => {
    // Mock account data
    const mockAccount = {
      portfolioValue: 100000,
      cash: 50000,
      equity: 100000,
      buyingPower: 50000,
    }

    // Mock positions with P&L
    const mockPositions = [
      {
        _id: '1',
        symbol: 'AAPL',
        qty: 10,
        avgEntryPrice: 150,
        currentPrice: 160,
        unrealizedPl: 100,
      },
      {
        _id: '2',
        symbol: 'TSLA',
        qty: 5,
        avgEntryPrice: 200,
        currentPrice: 190,
        unrealizedPl: -50,
      },
    ]

    mockedUseQuery.mockReturnValue({
      positions: mockPositions,
      account: mockAccount,
      config: null,
      signals: [],
      logs: [],
      riskState: null,
    })
    mockedUseAction.mockReturnValue(vi.fn())

    const { result } = renderHook(() => usePortfolio())

    // Wait for the effect to run
    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Verify P&L calculation: 100 + (-50) = 50
    expect(result.current.unrealizedPl).toBe(50)
    // P&L % = 50 / ((10*150) + (5*200)) * 100 = 50 / 2500 * 100 = 2%
    expect(result.current.unrealizedPlPct).toBe(2)
    expect(result.current.positionsCount).toBe(2)
  })

  it('handles empty positions', async () => {
    const mockAccount = {
      portfolioValue: 100000,
      cash: 100000,
      equity: 100000,
      buyingPower: 100000,
    }

    mockedUseQuery.mockReturnValue({
      positions: [],
      account: mockAccount,
      config: null,
      signals: [],
      logs: [],
      riskState: null,
    })
    mockedUseAction.mockReturnValue(vi.fn())

    const { result } = renderHook(() => usePortfolio())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.unrealizedPl).toBe(0)
    expect(result.current.unrealizedPlPct).toBe(0)
    expect(result.current.positionsCount).toBe(0)
    expect(result.current.portfolioValue).toBe(100000)
  })

  it('handles account fetch error gracefully', async () => {
    const mockPositions = [
      { _id: '1', symbol: 'AAPL', qty: 10, avgEntryPrice: 150, unrealizedPl: 100 },
    ]

    mockedUseQuery.mockReturnValue({
      positions: mockPositions,
      account: undefined,
      config: null,
      signals: [],
      logs: [],
      riskState: null,
    })
    mockedUseAction.mockReturnValue(vi.fn())

    const { result } = renderHook(() => usePortfolio())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    // Should still have position data even if account fetch fails
    expect(result.current.positionsCount).toBe(1)
    expect(result.current.unrealizedPl).toBe(100)
    // Account data should be undefined when fetch fails
    expect(result.current.portfolioValue).toBeUndefined()
  })

  it('returns correct account values when loaded', async () => {
    const mockAccount = {
      portfolioValue: 150000,
      cash: 75000,
      equity: 150000,
      buyingPower: 75000,
    }

    mockedUseQuery.mockReturnValue({
      positions: [],
      account: mockAccount,
      config: null,
      signals: [],
      logs: [],
      riskState: null,
    })
    mockedUseAction.mockReturnValue(vi.fn())

    const { result } = renderHook(() => usePortfolio())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.portfolioValue).toBe(150000)
    expect(result.current.cash).toBe(75000)
    expect(result.current.equity).toBe(150000)
    expect(result.current.buyingPower).toBe(75000)
  })
})
