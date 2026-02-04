'use client'

import { SettingsModal } from '@/app/components/SettingsModal'
import { api } from '@/convex/_generated/api'
import { useClock } from '@/hooks/useClock'
import { usePortfolio } from '@/hooks/usePortfolio'
import { usePortfolioHistory } from '@/hooks/usePortfolioHistory'
import { useMutation, useQuery } from 'convex/react'
import { useEffect, useState } from 'react'

import { isGoodSignalResearch } from './dashboard/researchFilters'
import { FooterBar } from './dashboard/sections/FooterBar'
import { HeaderBar } from './dashboard/sections/HeaderBar'
import {
  ActivityFeedPanel,
  SignalResearchPanel,
  SignalsPanel,
} from './dashboard/sections/InsightsPanels'
import {
  PortfolioPerformancePanel,
  PositionPerformancePanel,
} from './dashboard/sections/PerformancePanels'
import { AccountPanel, LlmCostsPanel, PositionsPanel } from './dashboard/sections/RowOnePanels'
import type {
  Config,
  LogRow,
  PositionEntry,
  PositionRow,
  SignalResearch,
  SignalRow,
  StalenessAnalysis,
} from './dashboard/types'
import { usePositionSeries } from './dashboard/usePositionSeries'
import { defaultConfig } from './dashboard/utils'

export default function Dashboard() {
  const [showSettings, setShowSettings] = useState(false)

  const dbStatus = useQuery(api.system.status.get)
  const portfolio = usePortfolio()
  const time = useClock()
  const portfolioHistory = usePortfolioHistory()

  const updateConfig = useMutation(api.system.config.update)

  const positions: PositionRow[] = dbStatus?.positions || []
  const signals: SignalRow[] = dbStatus?.signals || []
  const logs: LogRow[] = dbStatus?.logs || []
  const signalResearchRows = (dbStatus?.signalResearch ?? []) as Array<
    SignalResearch & { symbol?: string; timestamp?: number }
  >
  const signalResearch = signalResearchRows.reduce(
    (acc, row) => {
      if (!row.symbol) return acc
      const existing = acc[row.symbol]
      if (!existing || (row.timestamp ?? 0) > (existing.timestamp ?? 0)) {
        acc[row.symbol] = row
      }
      return acc
    },
    {} as Record<string, SignalResearch>
  )
  const goodSignalCount = Object.values(signalResearch).filter((item) =>
    isGoodSignalResearch(item)
  ).length
  const config: Config = dbStatus?.config || defaultConfig

  const portfolioValue = portfolio.portfolioValue ?? 0
  const cash = portfolio.cash ?? 0
  const buyingPower = portfolio.buyingPower ?? 0
  const startingEquity = config.startingEquity || 100000
  const unrealizedPl = positions.reduce((sum: number, p) => sum + (p.unrealizedPl || 0), 0)
  const totalPl = portfolioValue - startingEquity
  const realizedPl = totalPl - unrealizedPl
  const totalPlPct = portfolioValue ? (totalPl / startingEquity) * 100 : 0
  const isMarketOpen = dbStatus?.marketClock?.isOpen ?? false
  const llmStats = dbStatus?.llmStats || { totalUsd: 0, calls: 0, tokensIn: 0, tokensOut: 0 }

  const { positionPriceHistories, normalizedPositionSeries } = usePositionSeries(positions)

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') {
      document.documentElement.setAttribute('data-theme', 'dark')
      return
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const applyTheme = (matchesDark: boolean) => {
      document.documentElement.setAttribute('data-theme', matchesDark ? 'dark' : 'light')
    }

    applyTheme(mediaQuery.matches)
    const handleThemeChange = (event: MediaQueryListEvent) => applyTheme(event.matches)
    mediaQuery.addEventListener('change', handleThemeChange)

    return () => mediaQuery.removeEventListener('change', handleThemeChange)
  }, [])

  if (dbStatus === undefined || portfolio.isLoading) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  const handleSaveConfig = async (newConfig: Partial<Config>) => {
    try {
      await updateConfig({
        ...config,
        ...newConfig,
      })
      setShowSettings(false)
    } catch (error) {
      console.error('Failed to update config:', error)
      alert('Failed to save settings. Please try again.')
    }
  }

  return (
    <div className="min-h-screen bg-hud-bg text-hud-text">
      <div className="max-w-[1920px] mx-auto p-4">
        <HeaderBar
          isMarketOpen={isMarketOpen}
          llmStats={llmStats}
          time={time}
          overnightActivity={dbStatus?.overnightActivity}
          premarketPlan={dbStatus?.premarketPlan}
          goodSignalCount={goodSignalCount}
          onOpenSettings={() => setShowSettings(true)}
        />

        <div className="grid grid-cols-4 md:grid-cols-8 lg:grid-cols-12 gap-4">
          <div className="col-span-4 md:col-span-4 lg:col-span-3">
            <AccountPanel
              isLoading={portfolio.isLoading}
              portfolioValue={portfolioValue}
              cash={cash}
              buyingPower={buyingPower}
              totalPl={totalPl}
              totalPlPct={totalPlPct}
              realizedPl={realizedPl}
              unrealizedPl={unrealizedPl}
            />
          </div>

          <div className="col-span-4 md:col-span-4 lg:col-span-5">
            <PositionsPanel
              positions={positions}
              config={config}
              positionPriceHistories={positionPriceHistories}
              positionEntries={
                dbStatus?.positionEntries as Record<string, PositionEntry> | undefined
              }
              stalenessAnalysis={
                dbStatus?.stalenessAnalysis as Record<string, StalenessAnalysis> | undefined
              }
            />
          </div>

          <div className="col-span-4 md:col-span-8 lg:col-span-4">
            <LlmCostsPanel llmStats={llmStats} model={config.llmModel} />
          </div>

          <div className="col-span-4 md:grid-cols-8 lg:col-span-8">
            <PortfolioPerformancePanel
              isLoading={portfolioHistory.isLoading}
              hasHistory={portfolioHistory.hasHistory}
              data={portfolioHistory.data}
              labels={portfolioHistory.labels}
            />
          </div>

          <div className="col-span-4 md:col-span-8 lg:col-span-4">
            <PositionPerformancePanel
              positions={positions}
              normalizedPositionSeries={normalizedPositionSeries}
            />
          </div>

          <div className="col-span-4 md:col-span-4 lg:col-span-4">
            <SignalsPanel signals={signals} />
          </div>

          <div className="col-span-4 md:col-span-4 lg:col-span-4">
            <ActivityFeedPanel logs={logs} />
          </div>

          <div className="col-span-4 md:col-span-8 lg:col-span-4">
            <SignalResearchPanel signalResearch={signalResearch} />
          </div>
        </div>

        <FooterBar config={config} />

        <SettingsModal
          isOpen={showSettings}
          onClose={() => setShowSettings(false)}
          config={config}
          onSave={handleSaveConfig}
        />
      </div>
    </div>
  )
}
