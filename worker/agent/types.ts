export type Config = {
  mcp_url: string
  data_poll_interval_ms: number
  analyst_interval_ms: number
  max_position_value: number
  max_positions: number
  min_sentiment_score: number
  min_volume: number
  take_profit_pct: number
  stop_loss_pct: number
  position_size_pct_of_cash: number
  crypto_enabled: boolean
  crypto_symbols: string[]
  crypto_momentum_threshold: number
  crypto_max_position_value: number
  crypto_take_profit_pct: number
  crypto_stop_loss_pct: number
  llm_model: string
  llm_analyst_model: string
  llm_max_tokens: number
  starting_equity: number
}

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
