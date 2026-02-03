import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import type { Config } from '../types'
import { FooterBar } from './FooterBar'

const baseConfig: Config = {
  maxPositionValue: 2000,
  maxPositions: 3,
  minSentimentScore: 0.7,
  minAnalystConfidence: 0.8,
  takeProfitPct: 10,
  stopLossPct: 5,
  positionSizePctOfCash: 20,
  llmModel: 'gpt-4o-mini',
  optionsEnabled: false,
  cryptoEnabled: false,
}

describe('FooterBar', () => {
  it('renders default risk metrics', () => {
    render(<FooterBar config={baseConfig} />)

    expect(screen.getByText('MAX POS')).toBeInTheDocument()
    expect(screen.getByText('$2000')).toBeInTheDocument()
    expect(screen.getByText('MIN SENT')).toBeInTheDocument()
    expect(screen.getByText('70%')).toBeInTheDocument()
  })

  it('renders options and crypto details when enabled', () => {
    render(
      <FooterBar
        config={{
          ...baseConfig,
          optionsEnabled: true,
          optionsTargetDelta: 0.35,
          optionsMinDte: 7,
          optionsMaxDte: 45,
          cryptoEnabled: true,
          cryptoSymbols: ['BTC/USD', 'ETH/USD', 'SOL/USD'],
        }}
      />
    )

    expect(screen.getByText('OPT Δ')).toBeInTheDocument()
    expect(screen.getByText('0.35')).toBeInTheDocument()
    expect(screen.getByText('OPT DTE')).toBeInTheDocument()
    expect(screen.getByText('7-45')).toBeInTheDocument()
    expect(screen.getByText('SYMBOLS')).toBeInTheDocument()
    expect(screen.getByText('BTC/ETH/SOL')).toBeInTheDocument()
  })
})
