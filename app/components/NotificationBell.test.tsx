import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { NotificationBell } from './NotificationBell'

describe('NotificationBell', () => {
  it('uses good signal count for unread badge', () => {
    render(
      <NotificationBell
        overnightActivity={{
          signalsGathered: 5,
          signalsResearched: 4,
          buySignals: 2,
          twitterConfirmations: 1,
          premarketPlanReady: true,
          lastUpdated: Date.now(),
        }}
        premarketPlan={{
          timestamp: Date.now(),
          summary: 'test',
          recommendations: [],
          highConvictionPlays: ['AAPL', 'TSLA'],
          marketOutlook: 'test',
        }}
        goodSignalCount={1}
      />
    )

    expect(screen.getByText('1')).toBeInTheDocument()
  })
})
