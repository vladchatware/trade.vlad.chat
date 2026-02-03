import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { PortfolioPerformancePanel, PositionPerformancePanel } from './PerformancePanels'

describe('PerformancePanels', () => {
  it('renders portfolio loading and no-history states', () => {
    const { rerender } = render(
      <PortfolioPerformancePanel isLoading={true} hasHistory={false} data={[]} labels={[]} />
    )

    expect(screen.getByText('Loading chart data...')).toBeInTheDocument()

    rerender(
      <PortfolioPerformancePanel isLoading={false} hasHistory={false} data={[]} labels={[]} />
    )
    expect(screen.getByText('No portfolio history data available')).toBeInTheDocument()
  })

  it('renders portfolio chart state when history exists', () => {
    render(
      <PortfolioPerformancePanel
        isLoading={false}
        hasHistory={true}
        data={[100000, 101000, 102000]}
        labels={['09:30', '10:00', '10:30']}
      />
    )

    expect(screen.getByText('PORTFOLIO PERFORMANCE')).toBeInTheDocument()
    expect(screen.getByText('24H')).toBeInTheDocument()
    expect(screen.getByTitle('Line chart')).toBeInTheDocument()
  })

  it('renders position performance empty and chart states', () => {
    const { rerender } = render(
      <PositionPerformancePanel positions={[]} normalizedPositionSeries={[]} />
    )

    expect(screen.getByText('No positions to display')).toBeInTheDocument()

    rerender(
      <PositionPerformancePanel
        positions={[{ symbol: 'AAPL', unrealizedPl: 100, marketValue: 1600 }]}
        normalizedPositionSeries={[{ label: 'AAPL', data: [0, 1, 2], variant: 'cyan' }]}
      />
    )

    expect(screen.getByText('POSITION PERFORMANCE')).toBeInTheDocument()
    expect(screen.getByText('AAPL')).toBeInTheDocument()
    expect(screen.getByText('+6.67%')).toBeInTheDocument()
    expect(screen.getByTitle('Line chart')).toBeInTheDocument()
  })
})
