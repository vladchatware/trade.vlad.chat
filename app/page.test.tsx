import { render, screen, waitFor } from '@testing-library/react'
import { useMutation, useQuery } from 'convex/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import Dashboard from './page'

const mockedUseQuery = vi.mocked(useQuery)
const mockedUseMutation = vi.mocked(useMutation)

const createMockMutation = () => {
  const fn = vi.fn()
  return Object.assign(fn, { withOptimisticUpdate: vi.fn() })
}

const baseStatus = {
  config: {
    maxPositionValue: 2000,
    maxPositions: 3,
    minSentimentScore: 0.7,
    minAnalystConfidence: 0.8,
    takeProfitPct: 10,
    stopLossPct: 5,
    positionSizePctOfCash: 20,
    llmModel: 'gpt-4o-mini',
  },
  positions: [
    {
      _id: '1',
      symbol: 'AAPL',
      qty: 10,
      avgEntryPrice: 150,
      currentPrice: 160,
      marketValue: 1600,
      unrealizedPl: 100,
    },
  ],
  signals: [
    {
      _id: 's1',
      symbol: 'GOOGL',
      sentiment: 0.8,
      timestamp: Date.now(),
      source: 'Analyst',
      reason: 'Strong earnings',
      volume: 1200,
    },
  ],
  logs: [{ _id: 'l1', agent: 'Trading Agent', action: 'signal_received', symbol: 'AAPL' }],
  account: {
    portfolioValue: 100000,
    cash: 50000,
    equity: 100000,
    buyingPower: 50000,
  },
  marketClock: { isOpen: true },
  llmStats: { totalUsd: 0.1, calls: 2, tokensIn: 100, tokensOut: 200 },
  riskState: null,
}

describe('Dashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedUseMutation.mockReturnValue(createMockMutation())
  })

  it('shows loading state when data is loading', () => {
    mockedUseQuery.mockReturnValue(undefined)

    render(<Dashboard />)

    expect(screen.getByText('Loading...')).toBeInTheDocument()
  })

  it('renders dashboard shell and section headers when data is loaded', async () => {
    mockedUseQuery.mockReturnValue(baseStatus)

    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })

    expect(screen.getByText('MAHORAGA')).toBeInTheDocument()
    expect(screen.getByText('MARKET OPEN')).toBeInTheDocument()
    expect(screen.getByText('[CONFIG]')).toBeInTheDocument()

    expect(screen.getByText('ACCOUNT')).toBeInTheDocument()
    expect(screen.getByText('POSITIONS')).toBeInTheDocument()
    expect(screen.getByText('LLM COSTS')).toBeInTheDocument()
    expect(screen.getByText('PORTFOLIO PERFORMANCE')).toBeInTheDocument()
    expect(screen.getByText('POSITION PERFORMANCE')).toBeInTheDocument()
    expect(screen.getByText('ACTIVE SIGNALS')).toBeInTheDocument()
    expect(screen.getByText('ACTIVITY FEED')).toBeInTheDocument()
    expect(screen.getByText('SIGNAL RESEARCH')).toBeInTheDocument()
  })

  it('shows empty positions state when no positions exist', async () => {
    mockedUseQuery.mockReturnValue({
      ...baseStatus,
      positions: [],
    })

    render(<Dashboard />)

    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument()
    })

    expect(screen.getByText('No open positions')).toBeInTheDocument()
    expect(screen.getByText('0/3')).toBeInTheDocument()
  })
})
