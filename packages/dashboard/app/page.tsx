'use client'

import { Metric } from '@/components/Metric'
import { Panel } from '@/components/Panel'
import { SettingsModal } from '@/components/SettingsModal'
import { useState } from 'react'

export default function Dashboard() {
  const [showSettings, setShowSettings] = useState(false)
  const [config, setConfig] = useState({
    maxPositionValue: 2000,
    maxPositions: 3,
    minSentimentScore: 0.7,
    takeProfitPct: 10,
    stopLossPct: 5,
  })

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
        <Metric label="Portfolio Value" value="$100,000" prefix="$" />
        <Metric label="Cash" value="50,000" prefix="$" />
        <Metric label="Positions" value="3" suffix="/ 10" />
        <Metric label="P&L Today" value="+2.5%" trend="up" suffix="%" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Panel title="Positions" titleRight="3 Active">
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-900 rounded">
              <div>
                <div className="font-semibold">AAPL</div>
                <div className="text-sm text-gray-500">100 shares @ $150.50</div>
              </div>
              <div className="text-green-500">+$523 (+3.5%)</div>
            </div>
          </div>
        </Panel>

        <Panel title="Recent Signals">
          <div className="space-y-3">
            <div className="flex justify-between items-center p-3 bg-gray-900 rounded">
              <div>
                <div className="font-semibold">NVDA</div>
                <div className="text-sm text-gray-500">Sentiment: 85%</div>
              </div>
              <div className="px-2 py-1 bg-green-900 text-green-300 rounded text-sm">BUY</div>
            </div>
          </div>
        </Panel>

        <Panel title="Activity Log">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Executor</span>
              <span>Position closed: AAPL</span>
            </div>
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
        onSave={setConfig}
      />
    </div>
  )
}
