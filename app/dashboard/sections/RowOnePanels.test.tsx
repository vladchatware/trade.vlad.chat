import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import type { Config, PositionRow } from '../types'
import { AccountPanel, LlmCostsPanel, PositionsPanel } from './RowOnePanels'

const config: Config = {
  maxPositionValue: 2000,
  maxPositions: 3,
  minSentimentScore: 0.7,
  minAnalystConfidence: 0.8,
  takeProfitPct: 10,
  stopLossPct: 5,
  positionSizePctOfCash: 20,
  llmModel: 'openai/gpt-4o-mini',
  cryptoEnabled: true,
  cryptoSymbols: ['BTC/USD'],
}

describe('RowOnePanels', () => {
  it('renders account metrics when loaded', () => {
    render(
      <AccountPanel
        isLoading={false}
        portfolioValue={102500}
        cash={50000}
        buyingPower={75000}
        totalPl={2500}
        totalPlPct={2.5}
        realizedPl={1000}
        unrealizedPl={1500}
      />
    )

    expect(screen.getByText('ACCOUNT')).toBeInTheDocument()
    expect(screen.getByText('$102,500.00')).toBeInTheDocument()
    expect(screen.getByText('$2,500.00 (+2.50%)')).toBeInTheDocument()
  })

  it('renders empty positions state and triggers demo seed action', () => {
    const onSeedDemoData = vi.fn()

    render(
      <PositionsPanel
        positions={[]}
        config={config}
        positionPriceHistories={{}}
        onSeedDemoData={onSeedDemoData}
      />
    )

    expect(screen.getByText('No open positions')).toBeInTheDocument()
    fireEvent.click(screen.getByRole('button', { name: '[ADD DEMO DATA]' }))
    expect(onSeedDemoData).toHaveBeenCalledTimes(1)
  })

  it('renders position table rows with trend data', () => {
    const positions: PositionRow[] = [
      {
        symbol: 'BTC/USD',
        qty: 1,
        avgEntryPrice: 100,
        currentPrice: 110,
        marketValue: 110,
        unrealizedPl: 10,
      },
    ]

    render(
      <PositionsPanel
        positions={positions}
        config={config}
        positionPriceHistories={{ 'BTC/USD': [100, 105, 110] }}
        onSeedDemoData={() => {}}
      />
    )

    expect(screen.getByText('1/3')).toBeInTheDocument()
    expect(screen.getByText('BTC/USD')).toBeInTheDocument()
    expect(screen.getByText('$110.00')).toBeInTheDocument()
    expect(screen.getByText('$10.00')).toBeInTheDocument()
    expect(screen.getByText('+10.00%')).toBeInTheDocument()
    expect(screen.getByText('₿')).toBeInTheDocument()
  })

  it('renders llm costs panel with computed average and model alias', () => {
    render(
      <LlmCostsPanel
        llmStats={{ totalUsd: 1.2, calls: 3, tokensIn: 1500, tokensOut: 2200 }}
        model="openai/gpt-4o-mini"
      />
    )

    expect(screen.getByText('LLM COSTS')).toBeInTheDocument()
    expect(screen.getByText('$1.2000')).toBeInTheDocument()
    expect(screen.getByText('$0.400000')).toBeInTheDocument()
    expect(screen.getByText('gpt-4o-mini')).toBeInTheDocument()
  })
})
