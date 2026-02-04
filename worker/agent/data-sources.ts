import { calculateEMA, calculateRSI, calculateSMA } from '../../convex/shared/providers/technicals'
import type { Config, Position, Signal, TechnicalSnapshot } from './types'
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

type CryptoRealtimeSample = {
  prices: number[]
  volume: number
  updatedAt: number
}

const MAX_SAMPLE_AGE_MS = 10 * 60 * 1000

const cryptoRealtimeCache = new Map<string, CryptoRealtimeSample>()
let cryptoStreamWorker: Worker | null = null
let lastSubscribedSymbolsKey = ''

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

export function ensureCryptoMarketStream(symbols: string[]) {
  const normalizedSymbols = Array.from(new Set(symbols))
  if (normalizedSymbols.length === 0) return
  const apiKey = process.env.ALPACA_API_KEY
  const apiSecret = process.env.ALPACA_API_SECRET
  if (!apiKey || !apiSecret) return

  if (!cryptoStreamWorker) {
    try {
      cryptoStreamWorker = new Worker(new URL('./crypto-stream.worker.ts', import.meta.url).href, {
        type: 'module',
      })
    } catch (err) {
      console.error('Crypto stream worker failed to start:', getErrorMessage(err))
      return
    }

    cryptoStreamWorker.addEventListener('message', (event: MessageEvent<unknown>) => {
      const payload = event.data
      if (!payload || typeof payload !== 'object') return
      const node = payload as {
        type?: string
        symbol?: string
        sample?: CryptoRealtimeSample
      }
      if (node.type !== 'sample' || !node.symbol || !node.sample) return
      cryptoRealtimeCache.set(node.symbol, node.sample)
    })

    cryptoStreamWorker.addEventListener('error', (event) => {
      console.error('Crypto stream worker error:', getErrorMessage(event.error))
    })
  }

  const symbolsKey = normalizedSymbols.slice().sort().join(',')
  if (symbolsKey === lastSubscribedSymbolsKey) return
  lastSubscribedSymbolsKey = symbolsKey

  cryptoStreamWorker.postMessage({
    type: 'subscribe',
    symbols: normalizedSymbols,
  })
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

type AlpacaCryptoBarsResponse = {
  bars?: Record<
    string,
    Array<{
      c?: number | string
      v?: number | string
    }>
  >
}

type AlpacaStockBarsResponse = {
  bars?: Record<
    string,
    Array<{
      c?: number | string
      v?: number | string
    }>
  >
}

function normalizeCryptoSymbolForAlpaca(symbol: string): string {
  return symbol.replace('/', '')
}

function toNumber(value: unknown): number {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function buildCryptoMomentumSignal(
  symbol: string,
  closes: number[],
  volume: number
): Signal | null {
  if (closes.length < 2) return null
  const first = closes[0]
  const last = closes[closes.length - 1]
  if (!first || !last || first <= 0 || last <= 0) return null

  const momentumPct = ((last - first) / first) * 100
  const sentiment = Math.max(-1, Math.min(1, momentumPct / 10))

  return {
    symbol,
    source: 'crypto_momentum',
    sentiment,
    volume,
    bullish: momentumPct > 0 ? 1 : 0,
    bearish: momentumPct < 0 ? 1 : 0,
    reason: `Momentum ${momentumPct >= 0 ? '+' : ''}${momentumPct.toFixed(2)}%`,
    isCrypto: true,
    momentum: Number(momentumPct.toFixed(4)),
    price: last,
  }
}

export function buildTechnicalSnapshot(
  symbol: string,
  market: 'equity' | 'crypto',
  closes: number[],
  volume: number,
  timestamp = Date.now()
): TechnicalSnapshot | null {
  if (closes.length < 2) return null
  const first = closes[0]
  const last = closes[closes.length - 1]
  if (!first || !last || first <= 0 || last <= 0) return null

  const momentumPct = ((last - first) / first) * 100
  return {
    symbol,
    market,
    timeframe: market === 'crypto' ? 'realtime' : '1Min',
    source: 'worker',
    price: last,
    momentumPct: Number(momentumPct.toFixed(4)),
    volume,
    sma20: calculateSMA(closes, 20),
    sma50: calculateSMA(closes, 50),
    ema12: calculateEMA(closes, 12),
    ema26: calculateEMA(closes, 26),
    rsi14: calculateRSI(closes, 14),
    timestamp,
  }
}

export function buildSimpleStrategySignals(snapshots: TechnicalSnapshot[]): Signal[] {
  const signals: Signal[] = []

  for (const snapshot of snapshots) {
    const sma20 = snapshot.sma20
    const sma50 = snapshot.sma50
    const rsi14 = snapshot.rsi14
    const bullishTrend = sma20 !== null && sma50 !== null && sma20 > sma50
    const bearishTrend = sma20 !== null && sma50 !== null && sma20 < sma50
    const oversold = rsi14 !== null && rsi14 <= 35
    const overbought = rsi14 !== null && rsi14 >= 68
    const momentum = snapshot.momentumPct

    if (oversold && bullishTrend && momentum > 0.5) {
      signals.push({
        symbol: snapshot.symbol,
        source: 'worker_simple_strategy',
        sentiment: Math.min(1, Math.max(0.2, Math.abs(momentum) / 8)),
        volume: snapshot.volume,
        bullish: 1,
        bearish: 0,
        reason: `Bullish setup: RSI ${rsi14?.toFixed(1)}, SMA20>SMA50, momentum +${momentum.toFixed(2)}%`,
        isCrypto: snapshot.market === 'crypto',
        momentum: snapshot.market === 'crypto' ? snapshot.momentumPct : undefined,
        price: snapshot.price,
      })
      continue
    }

    if (overbought && bearishTrend && momentum < -0.5) {
      signals.push({
        symbol: snapshot.symbol,
        source: 'worker_simple_strategy',
        sentiment: -Math.min(1, Math.max(0.2, Math.abs(momentum) / 8)),
        volume: snapshot.volume,
        bullish: 0,
        bearish: 1,
        reason: `Bearish setup: RSI ${rsi14?.toFixed(1)}, SMA20<SMA50, momentum ${momentum.toFixed(2)}%`,
        isCrypto: snapshot.market === 'crypto',
        momentum: snapshot.market === 'crypto' ? snapshot.momentumPct : undefined,
        price: snapshot.price,
      })
    }
  }

  return signals
}

async function fetchCryptoBars(symbol: string): Promise<AlpacaCryptoBarsResponse | null> {
  const headers = alpacaHeaders()
  const normalized = normalizeCryptoSymbolForAlpaca(symbol)
  const urls = [
    `https://data.alpaca.markets/v1beta3/crypto/us/bars?symbols=${encodeURIComponent(symbol)}&timeframe=1Min&limit=30`,
    `https://data.alpaca.markets/v1beta3/crypto/us/bars?symbols=${encodeURIComponent(normalized)}&timeframe=1Min&limit=30`,
  ]

  for (const url of urls) {
    try {
      return await fetchJson<AlpacaCryptoBarsResponse>(url, { headers })
    } catch {
      // Try next symbol format
    }
  }
  return null
}

async function fetchStockBars(symbol: string): Promise<AlpacaStockBarsResponse | null> {
  const headers = alpacaHeaders()
  const encodedSymbol = encodeURIComponent(symbol)
  const url = `https://data.alpaca.markets/v2/stocks/bars?symbols=${encodedSymbol}&timeframe=1Min&limit=60&feed=iex`
  try {
    return await fetchJson<AlpacaStockBarsResponse>(url, { headers })
  } catch {
    return null
  }
}

export async function gatherCryptoMomentumSignals(config: Config): Promise<Signal[]> {
  if (!config.crypto_enabled) return []

  const symbols = config.crypto_symbols || []
  if (symbols.length === 0) return []

  const signals: Signal[] = []
  ensureCryptoMarketStream(symbols)

  for (const symbol of symbols) {
    try {
      const realtime = cryptoRealtimeCache.get(symbol)
      const hasFreshRealtime =
        realtime &&
        Date.now() - realtime.updatedAt <= MAX_SAMPLE_AGE_MS &&
        realtime.prices.length >= 2

      let closes: number[] = []
      let volume = 0
      if (hasFreshRealtime) {
        closes = realtime.prices
        volume = realtime.volume
      } else {
        const barsData = await fetchCryptoBars(symbol)
        if (!barsData?.bars) continue
        const bars =
          barsData.bars[symbol] ||
          barsData.bars[normalizeCryptoSymbolForAlpaca(symbol)] ||
          Object.values(barsData.bars)[0] ||
          []
        closes = bars.map((bar) => toNumber(bar.c)).filter((price) => price > 0)
        volume = bars.reduce((sum, bar) => sum + toNumber(bar.v), 0)
      }

      const signal = buildCryptoMomentumSignal(symbol, closes, volume)
      if (!signal) continue
      if ((signal.momentum ?? 0) < config.crypto_momentum_threshold) continue
      signals.push(signal)
    } catch (err) {
      console.error(`Crypto signal gather failed for ${symbol}:`, getErrorMessage(err))
    }
  }

  return signals
}

export async function gatherTechnicalSnapshots(
  config: Config,
  symbols: string[]
): Promise<TechnicalSnapshot[]> {
  const dedupedSymbols = Array.from(new Set(symbols)).filter((symbol) => symbol.length > 0)
  if (dedupedSymbols.length === 0) return []

  const cryptoSymbols = new Set(config.crypto_symbols ?? [])
  if (config.crypto_enabled && cryptoSymbols.size > 0) {
    ensureCryptoMarketStream(Array.from(cryptoSymbols))
  }

  const snapshots: TechnicalSnapshot[] = []
  for (const symbol of dedupedSymbols) {
    try {
      const isCrypto = symbol.includes('/') || cryptoSymbols.has(symbol)
      if (isCrypto) {
        const realtime = cryptoRealtimeCache.get(symbol)
        const hasFreshRealtime =
          realtime &&
          Date.now() - realtime.updatedAt <= MAX_SAMPLE_AGE_MS &&
          realtime.prices.length >= 2

        let closes: number[] = []
        let volume = 0
        if (hasFreshRealtime) {
          closes = realtime.prices
          volume = realtime.volume
        } else {
          const barsData = await fetchCryptoBars(symbol)
          if (!barsData?.bars) continue
          const bars =
            barsData.bars[symbol] ||
            barsData.bars[normalizeCryptoSymbolForAlpaca(symbol)] ||
            Object.values(barsData.bars)[0] ||
            []
          closes = bars.map((bar) => toNumber(bar.c)).filter((price) => price > 0)
          volume = bars.reduce((sum, bar) => sum + toNumber(bar.v), 0)
        }

        const snapshot = buildTechnicalSnapshot(symbol, 'crypto', closes, volume)
        if (snapshot) snapshots.push(snapshot)
        continue
      }

      const barsData = await fetchStockBars(symbol)
      if (!barsData?.bars) continue
      const bars = barsData.bars[symbol] || Object.values(barsData.bars)[0] || []
      const closes = bars.map((bar) => toNumber(bar.c)).filter((price) => price > 0)
      const volume = bars.reduce((sum, bar) => sum + toNumber(bar.v), 0)
      const snapshot = buildTechnicalSnapshot(symbol, 'equity', closes, volume)
      if (snapshot) snapshots.push(snapshot)
    } catch (err) {
      console.error(`Technical snapshot gather failed for ${symbol}:`, getErrorMessage(err))
    }
  }

  return snapshots
}
