import fs from 'node:fs'
import { LOG_PATH } from './config'
import type { Costs, LogEntry } from './types'

export class ActivityLogger {
  logs: LogEntry[]
  costs: Costs

  constructor() {
    this.logs = [] as LogEntry[]
    this.costs = {
      total: 0,
      today: 0,
      calls: 0,
    } as Costs
    this.load()
  }

  load() {
    try {
      if (fs.existsSync(LOG_PATH)) {
        const data = fs.readFileSync(LOG_PATH, 'utf-8')
        const parsed = JSON.parse(data)
        this.logs = parsed.logs || []
        this.costs = parsed.costs || this.costs
      }
    } catch (err) {
      console.error('Failed to load logs:', err)
    }
  }

  save() {
    try {
      fs.writeFileSync(LOG_PATH, JSON.stringify({ logs: this.logs, costs: this.costs }, null, 2))
    } catch (err) {
      console.error('Failed to save logs:', err)
    }
  }

  log(agent: string, action: string, details: Record<string, unknown> = {}): LogEntry {
    const entry: LogEntry = {
      id: Date.now().toString(),
      timestamp: Date.now(),
      agent,
      action,
      ...details,
    }
    this.logs.unshift(entry)

    if (this.logs.length > 1000) {
      this.logs = this.logs.slice(0, 1000)
    }

    this.save()
    return entry
  }

  addCost(amount: number) {
    this.costs.total += amount
    this.costs.today += amount
    this.costs.calls += 1
    this.save()
  }

  getRecentLogs(limit = 100): LogEntry[] {
    return this.logs.slice(0, limit)
  }

  getCosts(): Costs {
    return this.costs
  }
}
