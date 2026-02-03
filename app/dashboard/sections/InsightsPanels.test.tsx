import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { ActivityFeedPanel, SignalResearchPanel, SignalsPanel } from './InsightsPanels'

describe('InsightsPanels', () => {
  it('renders signals empty and populated states', () => {
    const { rerender } = render(<SignalsPanel signals={[]} />)

    expect(screen.getByText('Gathering signals...')).toBeInTheDocument()

    rerender(
      <SignalsPanel
        signals={[
          {
            _id: 'signal-1',
            symbol: 'BTC/USD',
            source: 'Crypto',
            sentiment: 0.42,
            volume: 1200,
            isCrypto: true,
            momentum: 2.4,
          },
        ]}
      />
    )

    expect(screen.getByText('BTC/USD')).toBeInTheDocument()
    expect(screen.getByText('CRYPTO')).toBeInTheDocument()
    expect(screen.getByText('42%')).toBeInTheDocument()
  })

  it('renders activity feed empty and formatted states', () => {
    const { rerender } = render(<ActivityFeedPanel logs={[]} />)

    expect(screen.getByText('Waiting for activity...')).toBeInTheDocument()

    rerender(
      <ActivityFeedPanel
        logs={[
          {
            _id: 'log-1',
            agent: 'Executor',
            action: 'order_submitted',
            symbol: 'AAPL',
            detailsJson: JSON.stringify({ orderId: 'abcdef123456' }),
            timestamp: new Date('2026-02-03T13:00:00.000Z').valueOf(),
          },
        ]}
      />
    )

    expect(screen.getByText('Executor')).toBeInTheDocument()
    expect(screen.getByText('Order Submitted · abcdef12')).toBeInTheDocument()
    expect(screen.getByText('(AAPL)')).toBeInTheDocument()
  })

  it('renders signal research empty and populated states', () => {
    const { rerender } = render(<SignalResearchPanel signalResearch={{}} />)

    expect(screen.getByText('Researching candidates...')).toBeInTheDocument()

    rerender(
      <SignalResearchPanel
        signalResearch={{
          NVDA: {
            verdict: 'BUY',
            entryQuality: 'excellent',
            reasoning: 'Momentum and fundamentals aligned.',
            redFlags: ['Short-term overbought'],
          },
        }}
      />
    )

    expect(screen.getByText('NVDA')).toBeInTheDocument()
    expect(screen.getByText('BUY')).toBeInTheDocument()
    expect(screen.getByText('EXCELLENT')).toBeInTheDocument()
    expect(screen.getByText('Short-term overbought...')).toBeInTheDocument()
  })
})
