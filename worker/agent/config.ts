import fs from 'node:fs'
import path from 'node:path'
import { toWorkerAgentConfig } from '../../shared/tradingConfig'
import type { Config } from './types'

export const CONFIG_PATH = path.join(process.cwd(), 'agent-config.json')
export const LOG_PATH = path.join(process.cwd(), 'agent-logs.json')

export const DEFAULT_CONFIG: Config = toWorkerAgentConfig(
  {},
  process.env.MCP_URL || 'unused://sync-only-worker'
)

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
