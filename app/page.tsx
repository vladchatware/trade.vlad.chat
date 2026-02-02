'use client'

import { Metric } from '@/components/Metric'
import { Panel } from '@/components/Panel'
import { SettingsModal } from '@/components/SettingsModal'
import { api } from '@/convex/_generated/api'
import { useAction, useMutation, useQuery } from 'convex/react'
import { useCallback, useEffect, useState } from 'react'

interface Position {
  _id: string
  symbol: string
  qty: number
  avgEntryPrice?: number
  currentPrice?: number
  marketValue?: number
  unrealizedPl?: number
  unrealizedPlPc?: number
}

interface Signal {
  _id: string
  symbol: string
  sentiment?: number
  timestamp: number
  source?: string
  reason?: string
}

interface ActivityLog {
  _id: string
  agent: string
  action: string
  symbol?: string
  timestamp: number
}

interface Config {
  maxPositionValue: number
  maxPositions: number
  minSentimentScore: number
  minAnalystConfidence: number
  takeProfitPct: number
  stopLossPct: number
  positionSizePctOfCash: number
  llmModel: string
}

interface Account {
  portfolioValue: number
  cash: number
  buyingPower: number
  equity: number
}

interface DashboardStatus {
  config: Config | null
  riskState: unknown
  signals: Signal[]
  logs: ActivityLog[]
  positions: Position[]
  account: Account | null
}

export default function Dashboard() {
  const [showSettings, setShowSettings] = useState(false)
  const [status, setStatus] = useState<DashboardStatus | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  // Fetch real-time data from Convex (for data that changes frequently)
  const dbStatus = useQuery(api.status.get)

  // Action for fetching full status including Alpaca account
  const getFullStatus = useAction(api.statusActions.getFullStatus)

  // Mutations for updating data
  const updateConfig = useMutation(api.config.update)

  // Load full status on mount
  const loadFullStatus = useCallback(async () => {
    try {
      setIsLoading(true)
      const fullStatus = await getFullStatus()
      setStatus(fullStatus as DashboardStatus)
    } catch (error) {
      console.error('Failed to load status:', error)
    } finally {
      setIsLoading(false)
    }
  }, [getFullStatus])

  useEffect(() => {
    loadFullStatus()
    // Refresh every 30 seconds
    const interval = setInterval(loadFullStatus, 30000)
    return () => clearInterval(interval)
  }, [loadFullStatus])

  // Update with real-time data when available
  useEffect(() => {
    if (dbStatus && status) {
      setStatus({
        ...status,
        config: dbStatus.config || status.config,
        riskState: dbStatus.riskState || status.riskState,
        signals: dbStatus.signals || status.signals,
        logs: dbStatus.logs || status.logs,
        positions: dbStatus.positions || status.positions,
        // Keep account data from initial load
      })
    }
  }, [dbStatus])

  // Loading state
  if (isLoading || !status) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  const config: Config = status.config || {
    maxPositionValue: 2000,
    maxPositions: 3,
    minSentimentScore: 0.7,
    minAnalystConfidence: 0.8,
    takeProfitPct: 10,
    stopLossPct: 5,
    positionSizePctOfCash: 20,
    llmModel: 'gpt-4o-mini',
  }

  const positions: Position[] = status.positions || []
  const signals: Signal[] = status.signals || []
  const logs: ActivityLog[] = status.logs || []
  const account: Account = status.account || {
    portfolioValue: 0,
    cash: 0,
    buyingPower: 0,
    equity: 0,
  }

  const handleSaveConfig = async (newConfig: Partial<Config>) => {
    try {
      await updateConfig({
        ...config,
        ...newConfig,
      })
      setShowSettings(false)
      // Refresh to get updated config
      loadFullStatus()
    } catch (error) {
      console.error('Failed to update config:', error)
      alert('Failed to save settings. Please try again.')
    }
  }

  return (
    <div className="min-h-screen p-6">
      <header className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-bold">MAHORAGA</h1>
          <p className="text-gray-500">Autonomous Trading Agent</p>
        </div>
        <button type="button" onClick={() => setShowSettings(true)} className="btn-primary">
          Settings
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Metric
          label="Portfolio Value"
          value={account.portfolioValue?.toLocaleString() || '0'}
          prefix="$"
        />
        <Metric label="Cash" value={account.cash?.toLocaleString() || '0'} prefix="$" />
        <Metric
          label="Positions"
          value={positions.length.toString()}
          suffix={`/ ${config.maxPositions}`}
        />
        <Metric label="P&L Today" value="+2.5%" trend="up" suffix="%" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Positions" titleRight={`${positions.length} Active`}>
          <div className="space-y-3">
            {positions.length === 0 ? (
              <div className="text-gray-500 text-center py-4">No active positions</div>
            ) : (
              positions.map((pos) => (
                <div
                  key={pos._id}
                  className="flex justify-between items-center p-3 bg-gray-900 rounded"
                >
                  <div>
                    <div className="font-semibold">{pos.symbol}</div>
                    <div className="text-sm text-gray-500">
                      {pos.qty} shares @ $
                      {pos.avgEntryPrice?.toFixed(2) || pos.currentPrice?.toFixed(2)}
                    </div>
                  </div>
                  <div className={(pos.unrealizedPl || 0) >= 0 ? 'text-green-500' : 'text-red-500'}>
                    {(pos.unrealizedPl || 0) >= 0 ? '+' : ''}${(pos.unrealizedPl || 0).toFixed(0)} (
                    {(pos.unrealizedPlPc || 0).toFixed(1)}%)
                  </div>
                </div>
              ))
            )}
          </div>
        </Panel>

        <Panel title="Recent Signals">
          <div className="space-y-3">
            {signals.length === 0 ? (
              <div className="text-gray-500 text-center py-4">No recent signals</div>
            ) : (
              signals.slice(0, 5).map((signal) => (
                <div
                  key={signal._id}
                  className="flex justify-between items-center p-3 bg-gray-900 rounded"
                >
                  <div>
                    <div className="font-semibold">{signal.symbol}</div>
                    <div className="text-sm text-gray-500">
                      {signal.source || 'Unknown'} • Sentiment:{' '}
                      {((signal.sentiment || 0) * 100).toFixed(0)}%
                    </div>
                    {signal.reason && (
                      <div className="text-xs text-gray-600 mt-1">{signal.reason}</div>
                    )}
                  </div>
                  <div
                    className={`px-2 py-1 rounded text-sm ${(signal.sentiment || 0) > 0.5 ? 'bg-green-900 text-green-300' : 'bg-red-900 text-red-300'}`}
                  >
                    {(signal.sentiment || 0) > 0.5 ? 'BUY' : 'SKIP'}
                  </div>
                </div>
              ))
            )}
          </div>
        </Panel>

        <Panel title="Activity Log">
          <div className="space-y-2 text-sm">
            {logs.length === 0 ? (
              <div className="text-gray-500 text-center py-4">No recent activity</div>
            ) : (
              logs.slice(0, 10).map((log) => (
                <div key={log._id} className="flex justify-between">
                  <span className="text-gray-400">{log.agent}</span>
                  <span>
                    {log.action}
                    {log.symbol ? `: ${log.symbol}` : ''}
                  </span>
                </div>
              ))
            )}
          </div>
        </Panel>

        <Panel title="LLM Costs">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-400">Today</span>
              <span>$0.45</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">This Month</span>
              <span>$12.34</span>
            </div>
          </div>
        </Panel>
      </div>

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        config={config}
        onSave={handleSaveConfig}
      />
    </div>
  )
}
