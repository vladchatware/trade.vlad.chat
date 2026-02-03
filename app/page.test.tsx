import { render, screen, waitFor } from '@testing-library/react'
import { useAction, useMutation, useQuery } from 'convex/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import Dashboard from './page'

const mockedUseQuery = vi.mocked(useQuery)
const mockedUseMutation = vi.mocked(useMutation)
const mockedUseAction = vi.mocked(useAction)

// Helper to create a mock mutation function with required properties
const createMockMutation = () => {
  const fn = vi.fn()
  return Object.assign(fn, { withOptimisticUpdate: vi.fn() })
}

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('shows loading state when data is loading', () => {
    // Mock loading state (undefined)
    mockedUseQuery.mockReturnValue(undefined)
    mockedUseMutation.mockReturnValue(createMockMutation())
    mockedUseAction.mockReturnValue(vi.fn())

    render(<Dashboard />)

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('displays dashboard with portfolio data after loading', async () => {
    // Mock config
    const mockConfig = {
      maxPositionValue: 2000,
      maxPositions: 3,
      minSentimentScore: 0.7,
      minAnalystConfidence: 0.8,
      takeProfitPct: 10,
      stopLossPct: 5,
      positionSizePctOfCash: 20,
      llmModel: 'gpt-4o-mini',
    }

    // Mock positions
    const mockPositions = [
      {
        _id: '1',
        symbol: 'AAPL',
        qty: 10,
        avgEntryPrice: 150,
        currentPrice: 160,
        marketValue: 1600,
        unrealizedPl: 100,
      },
    ]

    // Mock signals and logs
    const mockSignals = [
      {
        _id: '1',
        symbol: 'GOOGL',
        sentiment: 0.8,
        timestamp: Date.now(),
        source: 'Analyst',
        reason: 'Strong earnings',
        volume: 1200,
      },
    ]

    const mockLogs = [
      { _id: '1', agent: 'Trading Agent', action: 'signal_received', symbol: 'AAPL' },
    ]

    // Mock account data
    const mockAccount = {
      portfolioValue: 100000,
      cash: 50000,
      equity: 100000,
      buyingPower: 50000,
    }

    mockedUseQuery.mockReturnValue({
      config: mockConfig,
      positions: mockPositions,
      signals: mockSignals,
      logs: mockLogs,
      account: mockAccount,
      marketClock: { isOpen: true },
      llmStats: { totalUsd: 0.1, calls: 2, tokensIn: 100, tokensOut: 200 },
      riskState: null,
    })

    mockedUseMutation.mockReturnValue(createMockMutation())
    mockedUseAction.mockReturnValue(vi.fn())

    render(<Dashboard />)

    // Wait for loading to complete
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })

    // Check header + status
    expect(screen.getByText('MAHORAGA')).toBeInTheDocument()
    expect(screen.getByText('MARKET OPEN')).toBeInTheDocument()
    expect(screen.getByText('[CONFIG]')).toBeInTheDocument()

    // Check panels exist
    expect(screen.getByText('ACCOUNT')).toBeInTheDocument()
    expect(screen.getByText('POSITIONS')).toBeInTheDocument()
    expect(screen.getByText('LLM COSTS')).toBeInTheDocument()
    expect(screen.getByText('ACTIVE SIGNALS')).toBeInTheDocument()
    expect(screen.getByText('ACTIVITY FEED')).toBeInTheDocument()
    expect(screen.getByText('SIGNAL RESEARCH')).toBeInTheDocument()

    // Position count shows
    expect(screen.getByText('1/3')).toBeInTheDocument()
  })

  it('displays "No active positions" when positions array is empty', async () => {
    const mockConfig = {
      maxPositionValue: 2000,
      maxPositions: 5,
      minSentimentScore: 0.7,
      minAnalystConfidence: 0.8,
      takeProfitPct: 10,
      stopLossPct: 5,
      positionSizePctOfCash: 20,
      llmModel: 'gpt-4o-mini',
    }

    const mockAccount = {
      portfolioValue: 100000,
      cash: 100000,
      equity: 100000,
      buyingPower: 100000,
    }

    mockedUseQuery.mockReturnValue({
      config: mockConfig,
      positions: [],
      signals: [],
      logs: [],
      account: mockAccount,
      marketClock: { isOpen: false },
      llmStats: { totalUsd: 0, calls: 0, tokensIn: 0, tokensOut: 0 },
      riskState: null,
    })

    mockedUseMutation.mockReturnValue(createMockMutation())
    mockedUseAction.mockReturnValue(vi.fn())

    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })

    expect(screen.getByText('No open positions')).toBeInTheDocument()
    expect(screen.getByText('0/5')).toBeInTheDocument()
  })

  it('displays position details correctly', async () => {
    const mockConfig = {
      maxPositionValue: 2000,
      maxPositions: 3,
      minSentimentScore: 0.7,
      minAnalystConfidence: 0.8,
      takeProfitPct: 10,
      stopLossPct: 5,
      positionSizePctOfCash: 20,
      llmModel: 'gpt-4o-mini',
    }

    const mockPositions = [
      {
        _id: '1',
        symbol: 'AAPL',
        qty: 10,
        avgEntryPrice: 150,
        currentPrice: 160,
        marketValue: 1600,
        unrealizedPl: 100,
      },
      {
        _id: '2',
        symbol: 'TSLA',
        qty: 5,
        avgEntryPrice: 200,
        currentPrice: 190,
        marketValue: 950,
        unrealizedPl: -25,
      },
    ]

    const mockAccount = {
      portfolioValue: 100000,
      cash: 50000,
      equity: 100000,
      buyingPower: 50000,
    }

    mockedUseQuery.mockReturnValue({
      config: mockConfig,
      positions: mockPositions,
      signals: [],
      logs: [],
      account: mockAccount,
      marketClock: { isOpen: true },
      llmStats: { totalUsd: 0, calls: 0, tokensIn: 0, tokensOut: 0 },
      riskState: null,
    })

    mockedUseMutation.mockReturnValue(createMockMutation())
    mockedUseAction.mockReturnValue(vi.fn())

    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })

    // Check position details
    expect(screen.getAllByText('AAPL').length).toBeGreaterThan(0)
    expect(screen.getAllByText('TSLA').length).toBeGreaterThan(0)
  })

  it('renders footer indicators for options and crypto when enabled', async () => {
    const mockConfig = {
      maxPositionValue: 2000,
      maxPositions: 3,
      minSentimentScore: 0.7,
      minAnalystConfidence: 0.8,
      takeProfitPct: 10,
      stopLossPct: 5,
      positionSizePctOfCash: 20,
      llmModel: 'gpt-4o-mini',
      optionsEnabled: true,
      optionsTargetDelta: 0.35,
      optionsMinDte: 7,
      optionsMaxDte: 45,
      cryptoEnabled: true,
      cryptoSymbols: ['BTC/USD', 'ETH/USD', 'SOL/USD'],
    }

    const mockAccount = {
      portfolioValue: 100000,
      cash: 100000,
      equity: 100000,
      buyingPower: 100000,
    }

    mockedUseQuery.mockReturnValue({
      config: mockConfig,
      positions: [],
      signals: [],
      logs: [],
      account: mockAccount,
      marketClock: { isOpen: false },
      llmStats: { totalUsd: 0, calls: 0, tokensIn: 0, tokensOut: 0 },
      riskState: null,
    })

    mockedUseMutation.mockReturnValue(createMockMutation())
    mockedUseAction.mockReturnValue(vi.fn())

    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })

    expect(screen.getByText('OPTIONS')).toBeInTheDocument()
    expect(screen.getByText('ON')).toBeInTheDocument()
    expect(screen.getByText('OPT Δ')).toBeInTheDocument()
    expect(screen.getByText('OPT DTE')).toBeInTheDocument()
    expect(screen.getByText('CRYPTO')).toBeInTheDocument()
    expect(screen.getByText('24/7')).toBeInTheDocument()
    expect(screen.getByText('SYMBOLS')).toBeInTheDocument()
    expect(screen.getByText('BTC/ETH/SOL')).toBeInTheDocument()
  })
})
