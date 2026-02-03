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

export interface AlpacaBar {
  t: string
  o: number
  h: number
  l: number
  c: number
  v: number
}

export type PreviewOrderParams = {
  symbol: string
  side: 'buy' | 'sell'
  qty: number
  orderType?: string
}

type AlpacaTradeResponse = {
  trade?: {
    p?: number
  }
}

type AlpacaBarsResponse = {
  bars: Record<string, AlpacaBar[]>
}

export class AlpacaClient {
  private readonly apiKey: string
  private readonly apiSecret: string
  private readonly tradingBaseUrl: string
  private readonly dataBaseUrl: string

  constructor(config: { apiKey: string; apiSecret: string; paper: boolean }) {
    this.apiKey = config.apiKey
    this.apiSecret = config.apiSecret
    this.tradingBaseUrl = config.paper
      ? 'https://paper-api.alpaca.markets'
      : 'https://api.alpaca.markets'
    this.dataBaseUrl = 'https://data.alpaca.markets'
  }

  private async request<T>(url: string, options: RequestInit = {}): Promise<T> {
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

    return (await response.json()) as T
  }

  private async tradingRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return await this.request<T>(`${this.tradingBaseUrl}/v2${endpoint}`, options)
  }

  private async dataRequest<T>(path: string): Promise<T> {
    return await this.request<T>(`${this.dataBaseUrl}${path}`)
  }

  async getAccount(): Promise<AlpacaAccount> {
    return await this.tradingRequest<AlpacaAccount>('/account')
  }

  async getPositions(): Promise<AlpacaPosition[]> {
    return await this.tradingRequest<AlpacaPosition[]>('/positions')
  }

  async getPosition(symbol: string): Promise<AlpacaPosition | null> {
    try {
      return await this.tradingRequest<AlpacaPosition>(`/positions/${symbol}`)
    } catch {
      return null
    }
  }

  async closePosition(symbol: string): Promise<AlpacaOrder> {
    return await this.tradingRequest<AlpacaOrder>(`/positions/${symbol}`, { method: 'DELETE' })
  }

  async getClock(): Promise<AlpacaClock> {
    return await this.tradingRequest<AlpacaClock>('/clock')
  }

  async getBars(
    symbol: string,
    timeframe: string,
    params?: { limit?: number; start?: string; end?: string }
  ): Promise<AlpacaBar[]> {
    const query = new URLSearchParams({
      symbols: symbol,
      timeframe,
    })
    if (params?.limit) query.set('limit', params.limit.toString())
    if (params?.start) query.set('start', params.start)
    if (params?.end) query.set('end', params.end)

    const data = await this.dataRequest<AlpacaBarsResponse>(`/v2/stocks/bars?${query.toString()}`)
    return data.bars[symbol] || []
  }

  async createOrder(params: {
    symbol: string
    side: 'buy' | 'sell'
    qty: number
    type: 'market' | 'limit' | 'stop' | 'stop_limit'
    time_in_force: 'day' | 'gtc' | 'ioc' | 'fok'
    client_order_id?: string
  }): Promise<AlpacaOrder> {
    const body: Record<string, unknown> = {
      symbol: params.symbol,
      side: params.side,
      type: params.type,
      time_in_force: params.time_in_force,
      qty: String(params.qty),
    }
    if (params.client_order_id) {
      body.client_order_id = params.client_order_id
    }
    return await this.tradingRequest<AlpacaOrder>('/orders', {
      method: 'POST',
      body: JSON.stringify(body),
    })
  }

  async previewOrder(params: PreviewOrderParams): Promise<{ id: string; estimated_price: number }> {
    const symbol = params.symbol.toUpperCase()
    const id = `preview_${Date.now()}_${symbol}_${params.side}_${params.orderType ?? 'market'}_${params.qty}`

    const position = await this.getPosition(symbol)
    if (position?.current_price && Number.isFinite(position.current_price)) {
      return { id, estimated_price: position.current_price }
    }

    try {
      const latest = await this.dataRequest<AlpacaTradeResponse>(
        `/v2/stocks/${encodeURIComponent(symbol)}/trades/latest`
      )
      const price = latest.trade?.p
      if (price && Number.isFinite(price)) {
        return { id, estimated_price: price }
      }
    } catch {
      // Fall back below when market data is unavailable for a symbol.
    }

    return {
      id,
      estimated_price: 0,
    }
  }
}

export function createAlpacaClient(): AlpacaClient {
  const apiKey = process.env.ALPACA_API_KEY
  const apiSecret = process.env.ALPACA_API_SECRET
  const paper = process.env.ALPACA_PAPER !== 'false'

  if (!apiKey || !apiSecret) {
    throw new Error('ALPACA_API_KEY and ALPACA_API_SECRET must be set')
  }

  return new AlpacaClient({ apiKey, apiSecret, paper })
}
