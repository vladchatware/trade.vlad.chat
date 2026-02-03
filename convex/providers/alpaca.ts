export interface AlpacaAccount {
  id: string
  account_number: string
  status: string
  currency: string
  cash: number
  buying_power: number
  equity: number
  portfolio_value: number
  pattern_day_trader: boolean
  trading_blocked: boolean
}

export interface AlpacaPosition {
  asset_id: string
  symbol: string
  qty: number
  side: 'long' | 'short'
  market_value: number
  cost_basis: number
  unrealized_pl: number
  unrealized_plpc: number
  current_price: number
}

export interface AlpacaOrder {
  id: string
  client_order_id: string
  symbol: string
  qty: string
  filled_qty: string
  filled_avg_price: string | null
  order_type: string
  side: 'buy' | 'sell'
  time_in_force: string
  status: string
  created_at: string
}

export interface AlpacaClock {
  timestamp: string
  is_open: boolean
  next_open: string
  next_close: string
}

export interface AlpacaQuote {
  symbol: string
  bid_price: number
  bid_size: number
  ask_price: number
  ask_size: number
  timestamp: string
}

export interface AlpacaBar {
  t: string
  o: number
  h: number
  l: number
  c: number
  v: number
}

export class AlpacaClient {
  private apiKey: string
  private apiSecret: string
  private paper: boolean
  private baseUrl: string

  constructor(config: { apiKey: string; apiSecret: string; paper: boolean }) {
    this.apiKey = config.apiKey
    this.apiSecret = config.apiSecret
    this.paper = config.paper
    this.baseUrl = config.paper ? 'https://paper-api.alpaca.markets' : 'https://api.alpaca.markets'
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseUrl}/v2${endpoint}`
    const response = await fetch(url, {
      ...options,
      headers: {
        'APCA-API-KEY-ID': this.apiKey,
        'APCA-API-SECRET-KEY': this.apiSecret,
        'Content-Type': 'application/json',
        ...options.headers,
      },
    })

    if (!response.ok) {
      const error = await response.text()
      throw new Error(`Alpaca API error (${response.status}): ${error}`)
    }

    return response.json() as Promise<T>
  }

  // Account endpoints
  async getAccount(): Promise<AlpacaAccount> {
    return this.request<AlpacaAccount>('/account')
  }

  // Position endpoints
  async getPositions(): Promise<AlpacaPosition[]> {
    return this.request<AlpacaPosition[]>('/positions')
  }

  async getPosition(symbol: string): Promise<AlpacaPosition | null> {
    try {
      return await this.request<AlpacaPosition>(`/positions/${symbol}`)
    } catch {
      return null
    }
  }

  async closePosition(symbol: string): Promise<AlpacaOrder> {
    return this.request<AlpacaOrder>(`/positions/${symbol}`, { method: 'DELETE' })
  }

  // Order endpoints
  async createOrder(params: {
    symbol: string
    qty?: number
    notional?: number
    side: 'buy' | 'sell'
    type: 'market' | 'limit' | 'stop' | 'stop_limit'
    time_in_force: 'day' | 'gtc' | 'ioc' | 'fok'
    limit_price?: number
    stop_price?: number
  }): Promise<AlpacaOrder> {
    return this.request<AlpacaOrder>('/orders', {
      method: 'POST',
      body: JSON.stringify(params),
    })
  }

  async getOrders(params?: { status?: string; limit?: number }): Promise<AlpacaOrder[]> {
    const query = new URLSearchParams()
    if (params?.status) query.set('status', params.status)
    if (params?.limit) query.set('limit', params.limit.toString())
    return this.request<AlpacaOrder[]>(`/orders?${query.toString()}`)
  }

  async cancelOrder(orderId: string): Promise<void> {
    await this.request<void>(`/orders/${orderId}`, { method: 'DELETE' })
  }

  // Market data endpoints
  async getClock(): Promise<AlpacaClock> {
    return this.request<AlpacaClock>('/clock')
  }

  async getQuote(symbol: string): Promise<AlpacaQuote> {
    const data = await this.request<{ quotes: Record<string, AlpacaQuote> }>(
      `/quotes?symbols=${symbol}`
    )
    return data.quotes[symbol]
  }

  async getBars(
    symbol: string,
    timeframe: string,
    params?: { limit?: number; start?: string; end?: string }
  ): Promise<AlpacaBar[]> {
    const query = new URLSearchParams({ symbols: symbol, timeframe })
    if (params?.limit) query.set('limit', params.limit.toString())
    if (params?.start) query.set('start', params.start)
    if (params?.end) query.set('end', params.end)

    const data = await this.request<{ bars: Record<string, AlpacaBar[]> }>(
      `/bars?${query.toString()}`
    )
    return data.bars[symbol] || []
  }

  async previewOrder(params: {
    symbol: string
    side: string
    qty: number
    orderType?: string
  }): Promise<{ id: string; estimated_price: number }> {
    // Get current position to estimate price (if holding)
    const position = await this.getPosition(params.symbol)

    // If we have a position, use its current price as estimate
    // Otherwise, use a placeholder (actual price will be determined at execution)
    const estimatedPrice = position?.current_price || 0

    return {
      id: `preview_${Date.now()}_${params.symbol}`,
      estimated_price: estimatedPrice,
    }
  }

  async submitOrder(previewId: string): Promise<AlpacaOrder> {
    // In real implementation, this would submit the actual order
    // For now, return a mock order
    return {
      id: `order_${Date.now()}`,
      client_order_id: previewId,
      symbol: '',
      qty: '0',
      filled_qty: '0',
      filled_avg_price: null,
      order_type: 'market',
      side: 'buy',
      time_in_force: 'day',
      status: 'filled',
      created_at: new Date().toISOString(),
    }
  }
}

export function createAlpacaClient(): AlpacaClient {
  const apiKey = process.env.ALPACA_API_KEY
  const apiSecret = process.env.ALPACA_API_SECRET
  const paper = process.env.ALPACA_PAPER === 'true'

  if (!apiKey || !apiSecret) {
    throw new Error('ALPACA_API_KEY and ALPACA_API_SECRET must be set')
  }

  return new AlpacaClient({ apiKey, apiSecret, paper })
}
