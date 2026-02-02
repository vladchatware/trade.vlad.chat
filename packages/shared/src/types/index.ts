export interface Account {
  equity: number
  cash: number
  buying_power: number
  portfolio_value: number
}

export interface Position {
  symbol: string
  qty: number
  side: string
  market_value: number
  unrealized_pl: number
  current_price: number
}

export interface Clock {
  is_open: boolean
  next_open: string
  next_close: string
}

export interface Signal {
  symbol: string
  source: string
  sentiment: number
  volume: number
  reason?: string
  isCrypto?: boolean
  momentum?: number
  price?: number
}

export interface Config {
  max_position_value: number
  max_positions: number
  min_sentiment_score: number
  min_analyst_confidence: number
  take_profit_pct: number
  stop_loss_pct: number
  position_size_pct_of_cash: number
  llm_model: string
  crypto_enabled?: boolean
  crypto_symbols?: string[]
}

export interface SignalResearch {
  verdict: 'BUY' | 'SKIP' | 'WAIT'
  confidence: number
  reasoning: string
  sentiment: number
}
