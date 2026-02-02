import { useState } from 'react'

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
      <div className="panel w-full max-w-md max-h-[80vh] overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4">Trading Settings</h2>

        <div className="space-y-4">
          <div>
            <label htmlFor="maxPositionValue" className="block text-sm text-gray-400 mb-1">
              Max Position Value ($)
            </label>
            <input
              id="maxPositionValue"
              type="number"
              value={formData.maxPositionValue}
              onChange={(e) =>
                setFormData({ ...formData, maxPositionValue: Number(e.target.value) })
              }
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2"
            />
          </div>

          <div>
            <label htmlFor="maxPositions" className="block text-sm text-gray-400 mb-1">
              Max Positions
            </label>
            <input
              id="maxPositions"
              type="number"
              value={formData.maxPositions}
              onChange={(e) => setFormData({ ...formData, maxPositions: Number(e.target.value) })}
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2"
            />
          </div>

          <div>
            <label htmlFor="minSentimentScore" className="block text-sm text-gray-400 mb-1">
              Min Sentiment Score (0-1)
            </label>
            <input
              id="minSentimentScore"
              type="number"
              step="0.1"
              min="0"
              max="1"
              value={formData.minSentimentScore}
              onChange={(e) =>
                setFormData({ ...formData, minSentimentScore: Number(e.target.value) })
              }
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2"
            />
          </div>

          <div>
            <label htmlFor="minAnalystConfidence" className="block text-sm text-gray-400 mb-1">
              Min Analyst Confidence (0-1)
            </label>
            <input
              id="minAnalystConfidence"
              type="number"
              step="0.1"
              min="0"
              max="1"
              value={formData.minAnalystConfidence}
              onChange={(e) =>
                setFormData({ ...formData, minAnalystConfidence: Number(e.target.value) })
              }
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2"
            />
          </div>

          <div>
            <label htmlFor="takeProfitPct" className="block text-sm text-gray-400 mb-1">
              Take Profit (%)
            </label>
            <input
              id="takeProfitPct"
              type="number"
              value={formData.takeProfitPct}
              onChange={(e) => setFormData({ ...formData, takeProfitPct: Number(e.target.value) })}
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2"
            />
          </div>

          <div>
            <label htmlFor="stopLossPct" className="block text-sm text-gray-400 mb-1">
              Stop Loss (%)
            </label>
            <input
              id="stopLossPct"
              type="number"
              value={formData.stopLossPct}
              onChange={(e) => setFormData({ ...formData, stopLossPct: Number(e.target.value) })}
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2"
            />
          </div>

          <div>
            <label htmlFor="positionSizePctOfCash" className="block text-sm text-gray-400 mb-1">
              Position Size % of Cash
            </label>
            <input
              id="positionSizePctOfCash"
              type="number"
              step="5"
              min="5"
              max="100"
              value={formData.positionSizePctOfCash}
              onChange={(e) =>
                setFormData({ ...formData, positionSizePctOfCash: Number(e.target.value) })
              }
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2"
            />
          </div>

          <div>
            <label htmlFor="llmModel" className="block text-sm text-gray-400 mb-1">
              LLM Model
            </label>
            <select
              id="llmModel"
              value={formData.llmModel}
              onChange={(e) => setFormData({ ...formData, llmModel: e.target.value })}
              className="w-full bg-gray-900 border border-gray-700 rounded px-3 py-2"
            >
              <option value="gpt-4o-mini">GPT-4o Mini</option>
              <option value="gpt-4o">GPT-4o</option>
              <option value="claude-3-haiku">Claude 3 Haiku</option>
              <option value="claude-3-sonnet">Claude 3 Sonnet</option>
            </select>
          </div>
        </div>

        <div className="flex gap-3 mt-6">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2 px-4 bg-gray-800 rounded hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onSave(formData)
            }}
            className="flex-1 py-2 px-4 bg-blue-600 rounded hover:bg-blue-500"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
