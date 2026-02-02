'use client'

import { Metric } from '@/components/Metric'
import { Panel } from '@/components/Panel'
import { SettingsModal } from '@/components/SettingsModal'
import { useState } from 'react'

interface Position {
  symbol: string
  qty: number
  avgEntryPrice?: number
  unrealizedPl?: number
  unrealizedPlPc?: number
}

interface Signal {
  symbol: string
  sentiment?: number
  timestamp: number
}

interface ActivityLog {
  agent: string
  action: string
  symbol?: string
}

// Mock data for when Convex is not connected
const mockStatus = {
  account: {
    portfolioValue: 100000,
    cash: 50000,
  },
  config: {
    maxPositionValue: 2000,
    maxPositions: 3,
    minSentimentScore: 0.7,
    takeProfitPct: 10,
    stopLossPct: 5,
  },
  positions: [
    {
      symbol: 'AAPL',
      qty: 100,
      avgEntryPrice: 150.5,
      unrealizedPl: 523,
      unrealizedPlPc: 3.5,
    },
  ] as Position[],
  signals: [
    {
      symbol: 'NVDA',
      sentiment: 0.85,
      timestamp: Date.now(),
    },
  ] as Signal[],
  logs: [
    {
      agent: 'Executor',
      action: 'position_closed',
      symbol: 'AAPL',
    },
  ] as ActivityLog[],
}

function useConvexStatus() {
  try {
    // Dynamic import to avoid errors during build
    const { useQuery } = require('convex/react')
    const { api } = require('@/convex/_generated/api')
    return useQuery(api.status.get)
  } catch {
    // Return mock data if Convex is not available
    return mockStatus
  }
}

export default function Dashboard() {
  const [showSettings, setShowSettings] = useState(false)
  const status = useConvexStatus()

  if (status === undefined) {
    return (
      <div className="min-h-screen p-6 flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    )
  }

  const config = status.config || mockStatus.config
  const positions = status.positions || []
  const signals = status.signals || []
  const logs = status.logs || []

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
          value={status.account?.portfolioValue?.toString() || '0'}
          prefix="$"
        />
        <Metric label="Cash" value={status.account?.cash?.toString() || '0'} prefix="$" />
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
              positions.map((pos: Position) => (
                <div
                  key={pos.symbol}
                  className="flex justify-between items-center p-3 bg-gray-900 rounded"
                >
                  <div>
                    <div className="font-semibold">{pos.symbol}</div>
                    <div className="text-sm text-gray-500">
                      {pos.qty} shares @ ${pos.avgEntryPrice?.toFixed(2)}
                    </div>
                  </div>
                  <div className={(pos.unrealizedPl || 0) >= 0 ? 'text-green-500' : 'text-red-500'}>
                    {(pos.unrealizedPl || 0) >= 0 ? '+' : ''}
                    {(pos.unrealizedPl || 0).toFixed(0)} ({(pos.unrealizedPlPc || 0).toFixed(1)}%)
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
              signals.slice(0, 5).map((signal: Signal) => (
                <div
                  key={`${signal.symbol}-${signal.timestamp}`}
                  className="flex justify-between items-center p-3 bg-gray-900 rounded"
                >
                  <div>
                    <div className="font-semibold">{signal.symbol}</div>
                    <div className="text-sm text-gray-500">
                      Sentiment: {((signal.sentiment || 0) * 100).toFixed(0)}%
                    </div>
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
              logs.slice(0, 10).map((log: ActivityLog, idx: number) => (
                <div key={`${log.agent}-${log.action}-${idx}`} className="flex justify-between">
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
        onSave={(newConfig) => {
          console.log('New config:', newConfig)
        }}
      />
    </div>
  )
}
