type CryptoRealtimeSample = {
  prices: number[]
  volume: number
  updatedAt: number
}

type StreamCommand = {
  type: 'subscribe'
  symbols: string[]
}

const CRYPTO_STREAM_URL = 'wss://stream.data.alpaca.markets/v1beta3/crypto/us'
const MAX_RETAINED_PRICES = 120
const RECONNECT_DELAY_MS = 2_000

let ws: WebSocket | null = null
let reconnectTimer: ReturnType<typeof setTimeout> | null = null
let subscribedSymbols: string[] = []
const cache = new Map<string, CryptoRealtimeSample>()

function normalizeIncomingCryptoSymbol(symbol: string): string {
  if (symbol.includes('/')) return symbol
  if (symbol.length >= 6) {
    const base = symbol.slice(0, 3)
    const quote = symbol.slice(3)
    return `${base}/${quote}`
  }
  return symbol
}

function postSample(symbol: string, sample: CryptoRealtimeSample) {
  postMessage({
    type: 'sample',
    symbol,
    sample,
  })
}

function cachePrint(symbol: string, price: number, volume = 0) {
  if (!Number.isFinite(price) || price <= 0) return
  const existing = cache.get(symbol)
  const prices = existing ? [...existing.prices, price] : [price]
  const sample: CryptoRealtimeSample = {
    prices: prices.slice(-MAX_RETAINED_PRICES),
    volume: (existing?.volume ?? 0) + Math.max(0, volume),
    updatedAt: Date.now(),
  }
  cache.set(symbol, sample)
  postSample(symbol, sample)
}

function handleStreamMessage(raw: unknown) {
  if (typeof raw !== 'string') return
  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    return
  }

  const messages = Array.isArray(parsed) ? parsed : [parsed]
  for (const message of messages) {
    if (!message || typeof message !== 'object') continue
    const node = message as Record<string, unknown>
    const maybeSymbol =
      typeof node.S === 'string' ? node.S : typeof node.symbol === 'string' ? node.symbol : null
    if (!maybeSymbol) continue
    const symbol = normalizeIncomingCryptoSymbol(maybeSymbol)
    if (!subscribedSymbols.includes(symbol)) continue

    const price =
      typeof node.p === 'number'
        ? node.p
        : typeof node.c === 'number'
          ? node.c
          : typeof node.price === 'number'
            ? node.price
            : Number(node.p ?? node.c ?? node.price ?? 0)
    const volume =
      typeof node.v === 'number'
        ? node.v
        : typeof node.s === 'number'
          ? node.s
          : Number(node.v ?? node.s ?? node.size ?? 0)

    cachePrint(symbol, price, volume)
  }
}

function sendSubscriptions() {
  if (!ws || ws.readyState !== WebSocket.OPEN) return
  const apiKey = process.env.ALPACA_API_KEY
  const apiSecret = process.env.ALPACA_API_SECRET
  if (!apiKey || !apiSecret || subscribedSymbols.length === 0) return

  ws.send(
    JSON.stringify({
      action: 'auth',
      key: apiKey,
      secret: apiSecret,
    })
  )
  ws.send(
    JSON.stringify({
      action: 'subscribe',
      trades: subscribedSymbols,
      bars: subscribedSymbols,
    })
  )
}

function scheduleReconnect() {
  if (reconnectTimer) return
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null
    connect()
  }, RECONNECT_DELAY_MS)
}

function connect() {
  if (subscribedSymbols.length === 0) return
  if (ws && ws.readyState === WebSocket.OPEN) {
    sendSubscriptions()
    return
  }
  if (ws && ws.readyState === WebSocket.CONNECTING) return

  try {
    ws = new WebSocket(CRYPTO_STREAM_URL)
  } catch {
    scheduleReconnect()
    return
  }

  ws.addEventListener('open', () => {
    sendSubscriptions()
  })

  ws.addEventListener('message', (event) => {
    handleStreamMessage(event.data)
  })

  ws.addEventListener('error', () => {
    scheduleReconnect()
  })

  ws.addEventListener('close', () => {
    ws = null
    scheduleReconnect()
  })
}

addEventListener('message', (event: MessageEvent<StreamCommand>) => {
  const command = event.data
  if (!command || command.type !== 'subscribe') return

  subscribedSymbols = Array.from(new Set(command.symbols))
  connect()
})
