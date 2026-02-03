import type { Config, Position, Signal } from './types'
import { getErrorMessage } from './utils'

type AlpacaAccountResponse = {
  equity?: string | number
  cash?: string | number
  buying_power?: string | number
  portfolio_value?: string | number
}

type AlpacaPositionResponse = {
  symbol: string
  qty?: string | number
  avg_entry_price?: string | number
  current_price?: string | number
  market_value?: string | number
  unrealized_pl?: string | number
  unrealized_plpc?: string | number
}

type AlpacaClockResponse = {
  is_open?: boolean
  next_open?: string
  next_close?: string
  timestamp?: string
}

type StockTwitsTrendingItem = { symbol: string }

type StockTwitsStreamMessage = {
  entities?: { sentiment?: { basic?: 'Bullish' | 'Bearish' | null } }
}

export type BrokerSnapshot = {
  account: AlpacaAccountResponse | null
  positions: Position[]
  clock: AlpacaClockResponse | null
}

function alpacaBaseUrl() {
  return process.env.ALPACA_PAPER === 'false'
    ? 'https://api.alpaca.markets'
    : 'https://paper-api.alpaca.markets'
}

function alpacaHeaders() {
  const apiKey = process.env.ALPACA_API_KEY
  const apiSecret = process.env.ALPACA_API_SECRET
  if (!apiKey || !apiSecret) {
    throw new Error('Missing ALPACA_API_KEY or ALPACA_API_SECRET')
  }
  return {
    'APCA-API-KEY-ID': apiKey,
    'APCA-API-SECRET-KEY': apiSecret,
    'Content-Type': 'application/json',
  }
}

async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init)
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${await response.text()}`)
  }
  return response.json() as Promise<T>
}

function toPosition(position: AlpacaPositionResponse): Position {
  return {
    symbol: position.symbol,
    qty: position.qty,
    avg_entry_price: String(position.avg_entry_price ?? 0),
    current_price: String(position.current_price ?? 0),
    market_value: position.market_value,
    unrealized_pl: position.unrealized_pl,
    unrealized_plpc: position.unrealized_plpc,
  }
}

export async function getBrokerSnapshot(): Promise<BrokerSnapshot> {
  const baseUrl = alpacaBaseUrl()
  const headers = alpacaHeaders()

  try {
    const [account, positions, clock] = await Promise.all([
      fetchJson<AlpacaAccountResponse>(`${baseUrl}/v2/account`, { headers }),
      fetchJson<AlpacaPositionResponse[]>(`${baseUrl}/v2/positions`, { headers }),
      fetchJson<AlpacaClockResponse>(`${baseUrl}/v2/clock`, { headers }),
    ])

    return {
      account,
      positions: positions.map(toPosition),
      clock,
    }
  } catch (_err) {
    return { account: null, positions: [], clock: null }
  }
}

async function getTrendingSymbols(limit = 10): Promise<StockTwitsTrendingItem[]> {
  const data = await fetchJson<{ symbols?: StockTwitsTrendingItem[] }>(
    'https://api.stocktwits.com/api/2/trending/symbols.json'
  )
  return (data.symbols || []).slice(0, limit)
}

async function getSentiment(symbol: string): Promise<Signal | null> {
  const data = await fetchJson<{ messages?: StockTwitsStreamMessage[] }>(
    `https://api.stocktwits.com/api/2/streams/symbol/${symbol}.json?limit=30`
  )
  const messages = data.messages || []

  let bullish = 0
  let bearish = 0
  for (const message of messages) {
    const sentiment = message.entities?.sentiment?.basic
    if (sentiment === 'Bullish') bullish += 1
    if (sentiment === 'Bearish') bearish += 1
  }

  const total = messages.length
  if (total === 0) return null
  const score = (bullish - bearish) / total

  return {
    symbol,
    source: 'stocktwits',
    sentiment: score,
    volume: total,
    bullish,
    bearish,
    reason: `StockTwits: ${bullish}B/${bearish}b (${(score * 100).toFixed(0)}%)`,
  }
}

export async function gatherStocktwitsSignals(config: Config): Promise<Signal[]> {
  try {
    const trending = await getTrendingSymbols(10)
    const signals: Signal[] = []

    for (const item of trending) {
      const signal = await getSentiment(item.symbol)
      if (!signal) continue
      if (signal.volume < config.min_volume) continue
      signals.push(signal)
      await new Promise((resolve) => setTimeout(resolve, 250))
    }

    return signals
  } catch (err) {
    console.error('StockTwits gather failed:', getErrorMessage(err))
    return []
  }
}
