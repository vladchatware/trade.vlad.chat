import fs from 'node:fs'
import { LOG_PATH } from './config'
import type { Costs, LogEntry } from './types'

export type ActivityLogger = {
  save: () => void
  log: (agent: string, action: string, details?: Record<string, unknown>) => LogEntry
  addCost: (amount: number) => void
  getRecentLogs: (limit?: number) => LogEntry[]
  getCosts: () => Costs
}

export function createActivityLogger(): ActivityLogger {
  let logs: LogEntry[] = []
  let costs: Costs = {
    total: 0,
    today: 0,
    calls: 0,
  }

  function load() {
    try {
      if (fs.existsSync(LOG_PATH)) {
        const data = fs.readFileSync(LOG_PATH, 'utf-8')
        const parsed = JSON.parse(data)
        logs = parsed.logs || []
        costs = parsed.costs || costs
      }
    } catch (err) {
      console.error('Failed to load logs:', err)
    }
  }

  function save() {
    try {
      fs.writeFileSync(LOG_PATH, JSON.stringify({ logs, costs }, null, 2))
    } catch (err) {
      console.error('Failed to save logs:', err)
    }
  }

  function log(agent: string, action: string, details: Record<string, unknown> = {}): LogEntry {
    const entry: LogEntry = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      agent,
      action,
      ...details,
    }
    logs.unshift(entry)

    if (logs.length > 1000) {
      logs = logs.slice(0, 1000)
    }

    save()
    return entry
  }

  function addCost(amount: number) {
    costs.total += amount
    costs.today += amount
    costs.calls += 1
    save()
  }

  function getRecentLogs(limit = 100): LogEntry[] {
    return logs.slice(0, limit)
  }

  function getCosts(): Costs {
    return costs
  }

  load()
  return { save, log, addCost, getRecentLogs, getCosts }
}
