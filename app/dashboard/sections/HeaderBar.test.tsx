import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { HeaderBar } from './HeaderBar'

describe('HeaderBar', () => {
  it('renders market status and opens settings when config is clicked', () => {
    const onOpenSettings = vi.fn()

    render(
      <HeaderBar
        isMarketOpen={true}
        llmStats={{ totalUsd: 0.25, calls: 3, tokensIn: 1200, tokensOut: 900 }}
        time={new Date('2026-02-03T13:00:00.000Z')}
        onOpenSettings={onOpenSettings}
      />
    )

    expect(screen.getByText('MAHORAGA')).toBeInTheDocument()
    expect(screen.getByText('MARKET OPEN')).toBeInTheDocument()
    expect(screen.getByText('API CALLS')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: '[CONFIG]' }))
    expect(onOpenSettings).toHaveBeenCalledTimes(1)
  })

  it('shows market closed label when market is not open', () => {
    render(
      <HeaderBar
        isMarketOpen={false}
        llmStats={{ totalUsd: 0, calls: 0, tokensIn: 0, tokensOut: 0 }}
        time={null}
        onOpenSettings={() => {}}
      />
    )

    expect(screen.getByText('MARKET CLOSED')).toBeInTheDocument()
  })
})
