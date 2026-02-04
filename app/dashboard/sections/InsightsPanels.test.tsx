import { fireEvent, render, screen } from '@testing-library/react'
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

  it('filters active signals to bullish only', () => {
    render(
      <SignalsPanel
        signals={[
          {
            _id: 'signal-1',
            symbol: 'NVDA',
            source: 'Reddit',
            sentiment: 0.45,
            volume: 1200,
          },
          {
            _id: 'signal-2',
            symbol: 'TSLA',
            source: 'Reddit',
            sentiment: 0.1,
            volume: 900,
          },
        ]}
      />
    )

    expect(screen.getByText('2/2')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'BULLISH ONLY' }))

    expect(screen.getByText('1/2')).toBeInTheDocument()
    expect(screen.getByText('NVDA')).toBeInTheDocument()
    expect(screen.queryByText('TSLA')).not.toBeInTheDocument()
  })

  it('deduplicates symbols and hides uniform source/volume labels', () => {
    render(
      <SignalsPanel
        signals={[
          {
            _id: 'signal-1',
            symbol: 'NVDA',
            source: 'Stocktwits',
            sentiment: 0.5,
            volume: 30,
          },
          {
            _id: 'signal-2',
            symbol: 'NVDA',
            source: 'Stocktwits',
            sentiment: 0.45,
            volume: 30,
          },
          {
            _id: 'signal-3',
            symbol: 'AAPL',
            source: 'Stocktwits',
            sentiment: 0.3,
            volume: 30,
          },
        ]}
      />
    )

    expect(screen.getByText('2/2')).toBeInTheDocument()
    expect(screen.getAllByText('NVDA')).toHaveLength(1)
    expect(screen.queryByText('STOCKTWITS')).not.toBeInTheDocument()
    expect(screen.queryByText('VOL 30')).not.toBeInTheDocument()
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
          {
            _id: 'log-2',
            agent: 'System',
            action: 'decision_cycle_skipped',
            detailsJson: JSON.stringify({ reason: 'market_closed' }),
            timestamp: new Date('2026-02-03T13:01:00.000Z').valueOf(),
          },
        ]}
      />
    )

    expect(screen.getByText('Executor')).toBeInTheDocument()
    expect(screen.getByText('Order Submitted · abcdef12')).toBeInTheDocument()
    expect(screen.getByText('(AAPL)')).toBeInTheDocument()
    expect(screen.getByText('Cycle Skipped · market_closed')).toBeInTheDocument()
  })

  it('shows result-focused tooltip for activity items', async () => {
    render(
      <ActivityFeedPanel
        logs={[
          {
            _id: 'log-1',
            agent: 'System',
            action: 'decision_cycle_skipped',
            detailsJson: JSON.stringify({ reason: 'market_closed' }),
            timestamp: new Date('2026-02-03T13:01:00.000Z').valueOf(),
          },
        ]}
      />
    )

    fireEvent.mouseEnter(screen.getByText('Cycle Skipped · market_closed'))

    expect(await screen.findByText('Outcome')).toBeInTheDocument()
    expect(screen.getAllByText('Market Closed').length).toBeGreaterThan(0)
    expect(screen.getByText('Reason')).toBeInTheDocument()
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

  it('filters signal research to good signals only', () => {
    render(
      <SignalResearchPanel
        signalResearch={{
          NVDA: {
            verdict: 'BUY',
            entryQuality: 'excellent',
            reasoning: 'Strong setup.',
          },
          TSLA: {
            verdict: 'WAIT',
            entryQuality: 'good',
            reasoning: 'Needs confirmation.',
          },
          AAPL: {
            verdict: 'BUY',
            entryQuality: 'fair',
            reasoning: 'Weak conviction.',
          },
        }}
      />
    )

    expect(screen.getByText('3/3')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: 'GOOD ONLY' }))

    expect(screen.getByText('1/3')).toBeInTheDocument()
    expect(screen.getByText('NVDA')).toBeInTheDocument()
    expect(screen.queryByText('TSLA')).not.toBeInTheDocument()
    expect(screen.queryByText('AAPL')).not.toBeInTheDocument()
  })
})
