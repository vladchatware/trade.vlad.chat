import fs from 'node:fs'
import path from 'node:path'
import type { Config } from './types'

export const CONFIG_PATH = path.join(process.cwd(), 'agent-config.json')
export const LOG_PATH = path.join(process.cwd(), 'agent-logs.json')

export const DEFAULT_CONFIG: Config = {
  mcp_url: process.env.MCP_URL || 'http://localhost:3000/api/mcp',

  data_poll_interval_ms: 60_000,
  analyst_interval_ms: 120_000,

  max_position_value: 2000,
  max_positions: 3,
  min_sentiment_score: 0.4,
  min_volume: 10,

  take_profit_pct: 8,
  stop_loss_pct: 4,
  position_size_pct_of_cash: 20,

  crypto_enabled: false,
  crypto_symbols: ['BTC/USD', 'ETH/USD', 'SOL/USD'],
  crypto_momentum_threshold: 2.0,
  crypto_max_position_value: 1000,
  crypto_take_profit_pct: 10,
  crypto_stop_loss_pct: 5,

  llm_model: 'gpt-4o-mini',
  llm_analyst_model: 'gpt-4o',
  llm_max_tokens: 500,

  starting_equity: 100000,
}

export function loadConfig(): Config {
  try {
    if (fs.existsSync(CONFIG_PATH)) {
      const data = fs.readFileSync(CONFIG_PATH, 'utf-8')
      return { ...DEFAULT_CONFIG, ...JSON.parse(data) }
    }
  } catch (err) {
    console.error('Failed to load config:', err)
  }
  return { ...DEFAULT_CONFIG }
}

export function saveConfig(config: Config) {
  try {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2))
  } catch (err) {
    console.error('Failed to save config:', err)
  }
}
