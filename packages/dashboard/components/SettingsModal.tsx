import { useState } from 'react'

interface Config {
  maxPositionValue: number
  maxPositions: number
  minSentimentScore: number
  takeProfitPct: number
  stopLossPct: number
}

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
  config: Config
  onSave: (config: Config) => void
}

export function SettingsModal({ isOpen, onClose, config, onSave }: SettingsModalProps) {
  const [formData, setFormData] = useState(config)

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="panel w-full max-w-md">
        <h2 className="text-lg font-semibold mb-4">Trading Settings</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Max Position Value ($)</label>
            <input
              type="number"
              value={formData.maxPositionValue}
              onChange={(e) => setFormData({ ...formData, maxPositionValue: Number(e.target.value) })}
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2"
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-1">Max Positions</label>
            <input
              type="number"
              value={formData.maxPositions}
              onChange={(e) => setFormData({ ...formData, maxPositions: Number(e.target.value) })}
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2"
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-1">Min Sentiment Score (0-1)</label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="1"
              value={formData.minSentimentScore}
              onChange={(e) => setFormData({ ...formData, minSentimentScore: Number(e.target.value) })}
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2"
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-1">Take Profit (%)</label>
            <input
              type="number"
              value={formData.takeProfitPct}
              onChange={(e) => setFormData({ ...formData, takeProfitPct: Number(e.target.value) })}
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2"
            />
          </div>
          
          <div>
            <label className="block text-sm text-gray-400 mb-1">Stop Loss (%)</label>
            <input
              type="number"
              value={formData.stopLossPct}
              onChange={(e) => setFormData({ ...formData, stopLossPct: Number(e.target.value) })}
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2"
            />
          </div>
        </div>
        
        <div className="flex gap-3 mt-6">
          <button onClick={onClose} className="flex-1 py-2 px-4 bg-gray-800 rounded hover:bg-gray-700">
            Cancel
          </button>
          <button 
            onClick={() => { onSave(formData); onClose() }}
            className="flex-1 py-2 px-4 bg-blue-600 rounded hover:bg-blue-500"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
