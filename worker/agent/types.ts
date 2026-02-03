import type { WorkerAgentConfig } from '../../shared/tradingConfig'

export type Config = WorkerAgentConfig

export type LogEntry = {
  id: string
  timestamp: number
  agent: string
  action: string
  [key: string]: unknown
}

export type Costs = {
  total: number
  today: number
  calls: number
}

export type ToolCall = { name: string; arguments: Record<string, unknown> }
export type ToolResult = {
  content?: Array<{ type?: string; text?: string; [key: string]: unknown }>
  isError?: boolean
  [key: string]: unknown
}
export type ToolCaller = { callTool: (call: ToolCall) => Promise<ToolResult> }

export type Signal = {
  symbol: string
  source: string
  sentiment: number
  volume: number
  bullish: number
  bearish: number
  reason: string
  isCrypto?: boolean
  momentum?: number
  price?: number
}

export type Position = {
  symbol: string
  qty?: string | number
  avg_entry_price?: string
  avgEntryPrice?: number
  current_price?: string
  currentPrice?: number
  price?: number
  market_value?: string | number
  unrealized_pl?: string | number
  unrealized_plpc?: string | number
}
