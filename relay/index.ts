/**
 * relay/index.ts — Binance WebSocket → PWA relay
 *
 * Two upstream streams:
 *   1. btcusdt@kline_5m — candle data (public)
 *   2. /fapi/v1/listenKey — user data stream (fills, orders)
 *
 * Broadcasts to all connected PWA clients.
 */

import type { Candle } from '../src/types.ts'
import { createListenKey, renewListenKey, closeListenKey, fetchRecentTrades } from './auth.ts'

// ── Binance kline stream types ──────────────────────────────────────────

interface BinanceKline {
  t: number; T: number; s: string; i: string;
  f: number; L: number; o: string; c: string;
  h: string; l: string; v: string; n: number;
  x: boolean; q: string; V: string; Q: string; B: string;
}

interface BinanceKlineMessage {
  e: 'kline'; E: number; s: string; k: BinanceKline;
}

// ── Execution report types ──────────────────────────────────────────────

interface ExecutionReport {
  e: 'executionReport';
  E: number;       // event time
  s: string;       // symbol
  c: string;       // client order id
  S: 'BUY' | 'SELL'; // side
  o: string;       // order type (LIMIT, MARKET, STOP, TAKE_PROFIT, etc.)
  f: string;       // time in force
  q: string;       // original quantity
  p: string;       // original price
  P: string;       // stop price
  F: string;       // iceberg qty
  g: number;       // orderListId
  x: string;       // execution type (NEW, TRADE, CANCELED, EXPIRED, REJECTED)
  X: string;       // order status (NEW, PARTIALLY_FILLED, FILLED, CANCELED, EXPIRED)
  r: string;       // order reject reason / reduceOnly
  i: number;       // order id
  l: string;       // last filled qty
  z: string;       // cumulative filled qty
  L: string;       // last filled price
  n: string;       // commission
  N: string | null; // commission asset
  T: number;       // trade time
  t: number;       // trade id
  I: number;       // order can id
  w: boolean;      // is working
  m: boolean;      // is buyer maker
  M: boolean;      // margin
  O: number;       // order creation time
  Z: string;       // cumulative quote asset transacted
  Y: string;       // last quote asset transacted
  Q: string;       // quote order qty
  W: number;       // working time
  V: string;       // selfTradePrevention
  rp?: string;     // realized profit (for closing trades)
}

// ── Config ──────────────────────────────────────────────────────────────

const CANDLE_PORT = 3001
const BINANCE_CANDLE_URL = 'wss://stream.binance.com:9443/ws/btcusdt@kline_5m'
const BINANCE_USER_URL = 'wss://fstream.binance.com/ws'
const RECONNECT_DELAY_MS = 5_000
const LISTEN_KEY_RENEW_INTERVAL = 30 * 60 * 1000  // 30 min

// ── Client registry ─────────────────────────────────────────────────────

const clients = new Set<WebSocket>()

// Candle history buffer for snapshot on client connect
const MAX_HISTORY = 120
const candleHistory: Candle[] = []

function broadcast(message: string): void {
  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(message)
    }
  }
}

// ── User data stream (listen key) ───────────────────────────────────────

let listenKey: string | null = null
let userDataWs: WebSocket | null = null
let renewTimer: Timer | null = null

async function connectUserData(): Promise<void> {
  if (userDataWs) {
    userDataWs.onopen = null
    userDataWs.onmessage = null
    userDataWs.onerror = null
    userDataWs.onclose = null
    userDataWs.close()
  }

  try {
    listenKey = await createListenKey()
    console.log(`[relay] listenKey obtained`)
  } catch (err: any) {
    console.error(`[relay] listenKey failed: ${err.message}, retrying in ${RECONNECT_DELAY_MS / 1000}s`)
    setTimeout(connectUserData, RECONNECT_DELAY_MS)
    return
  }

  const url = `${BINANCE_USER_URL}/${listenKey}`
  userDataWs = new WebSocket(url)

  userDataWs.onopen = () => {
    console.log(`[relay] Connected to Futures user data stream`)
    // Schedule listen key renewal
    clearInterval(renewTimer!)
    renewTimer = setInterval(async () => {
      if (listenKey) {
        try {
          await renewListenKey(listenKey)
          console.log(`[relay] listenKey renewed`)
        } catch (err: any) {
          console.error(`[relay] listenKey renew failed: ${err.message}`)
          // Will reconnect on WS close
        }
      }
    }, LISTEN_KEY_RENEW_INTERVAL)
  }

  userDataWs.onmessage = (event: MessageEvent) => {
    try {
      const raw = JSON.parse(event.data as string)

      if (raw.e === 'executionReport') {
        handleExecutionReport(raw as ExecutionReport)
      }
      // Ignore other user data events (ACCOUNT_UPDATE, ORDER_TRADE_UPDATE, etc.)
    } catch (err) {
      console.error('[relay] user data parse error:', err)
    }
  }

  userDataWs.onerror = () => {
    console.error('[relay] User data WS error')
  }

  userDataWs.onclose = () => {
    console.log(`[relay] User data WS closed, reconnecting in ${RECONNECT_DELAY_MS / 1000}s...`)
    clearInterval(renewTimer!)
    setTimeout(connectUserData, RECONNECT_DELAY_MS)
  }
}

function handleExecutionReport(er: ExecutionReport): void {
  // Only broadcast filled trades (execution type TRADE, order status FILLED)
  if (er.x !== 'TRADE' && er.x !== 'PARTIAL_FILL') return
  if (er.X !== 'FILLED' && er.X !== 'PARTIALLY_FILLED') return
  if (er.s !== 'BTCUSDT') return

  const isBuy = er.S === 'BUY'
  const qty = parseFloat(er.l)
  const price = parseFloat(er.L)
  const cumQty = parseFloat(er.z)

  if (qty === 0) return

  // Determine if this is an entry or exit:
  // - MARKET/LIMIT orders without reduceOnly flag → entry
  // - STOP/TAKE_PROFIT orders or orders with reduceOnly → exit (SL/TP)
  // - If reduceOnly is implied and the trade closes position → exit
  const isReduceOnly = er.r === 'REDUCE_ONLY' || er.r === 'true' || er.w === true
  const isStopOrder = er.o === 'STOP_MARKET' || er.o === 'TAKE_PROFIT_MARKET' ||
                      er.o === 'STOP' || er.o === 'TAKE_PROFIT'

  let reason: 'entry' | 'sl' | 'tp'
  if (isStopOrder) {
    reason = er.o.startsWith('STOP') ? 'sl' : 'tp'
  } else if (isReduceOnly) {
    // Can't determine sl vs tp from reduceOnly alone — mark as exit
    reason = 'entry' // actually it's an exit but we'll call it entry with a note
    // For now, just reflect what Binance tells us
    if (er.o === 'STOP_MARKET' || er.o === 'STOP') reason = 'sl'
    else if (er.o === 'TAKE_PROFIT_MARKET' || er.o === 'TAKE_PROFIT') reason = 'tp'
    else reason = 'entry' // manual reduce-only close
  } else {
    reason = 'entry'
  }

  const trade = {
    id: `strategy_${er.t}_${er.i}`,
    side: isBuy ? 'buy' : 'sell' as const,
    direction: isBuy ? 'long' as const : 'short' as const,
    price,
    qty: cumQty,
    pnl: er.rp ? parseFloat(er.rp) : 0,
    commission: parseFloat(er.n || '0'),
    commissionAsset: er.N || 'USDT',
    status: er.X === 'FILLED' ? 'filled' : 'partial',
    timestamp: er.T,
    reason,
    symbol: er.s,
    source: 'strategy' as const,
    reduceOnly: isReduceOnly,
    orderType: er.o,
    orderId: er.i,
    tradeId: er.t,
  }

  const message = JSON.stringify({ type: 'trade', trade })
  broadcast(message)
  console.log(`[relay] trade: ${trade.direction} ${trade.reason} @ $${trade.price} qty=${trade.qty} pnl=${trade.pnl}`)
}

// ── Kline stream (unchanged) ────────────────────────────────────────────

let binanceWs: WebSocket | null = null
let reconnectTimer: Timer | null = null

/** Fetch last N 5m klines from Binance REST API to pre-fill history buffer. */
async function backfillKlines(): Promise<void> {
  try {
    const res = await fetch(
      'https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=5m&limit=120',
    )
    if (!res.ok) {
      console.error(`[relay] kline backfill failed (${res.status})`)
      return
    }
    const data = (await res.json()) as unknown[][]
    for (const k of data) {
      candleHistory.push({
        time: k[0] as number,
        open: parseFloat(k[1] as string),
        high: parseFloat(k[2] as string),
        low: parseFloat(k[3] as string),
        close: parseFloat(k[4] as string),
        volume: parseFloat(k[5] as string),
      })
    }
    console.log(`[relay] Backfilled ${candleHistory.length} candles from Binance REST`)
  } catch (err: any) {
    console.error(`[relay] kline backfill error: ${err.message}`)
  }
}

function connectKline(): void {
  if (binanceWs) {
    binanceWs.onopen = null
    binanceWs.onmessage = null
    binanceWs.onerror = null
    binanceWs.onclose = null
    binanceWs.close()
  }

  binanceWs = new WebSocket(BINANCE_CANDLE_URL)

  binanceWs.onopen = () => {
    console.log(`[relay] Connected to Binance kline stream`)
  }

  binanceWs.onmessage = (event: MessageEvent) => {
    try {
      const raw = JSON.parse(event.data as string) as BinanceKlineMessage
      if (raw.e !== 'kline') return

      const k = raw.k
      const candle: Candle = {
        time: k.t,
        open: parseFloat(k.o),
        high: parseFloat(k.h),
        low: parseFloat(k.l),
        close: parseFloat(k.c),
        volume: parseFloat(k.v),
      }

      // Dedup by timestamp
      const lastCandle = candleHistory[candleHistory.length - 1]
      if (lastCandle && lastCandle.time === candle.time) {
        candleHistory[candleHistory.length - 1] = candle
      } else {
        candleHistory.push(candle)
        if (candleHistory.length > MAX_HISTORY) candleHistory.shift()
      }

      broadcast(JSON.stringify({ type: 'candle', candle }))
    } catch (err) {
      console.error('[relay] Kline parse error:', err)
    }
  }

  binanceWs.onerror = () => {
    console.error('[relay] Kline WS error, will reconnect')
  }

  binanceWs.onclose = () => {
    console.log(`[relay] Kline WS closed, reconnecting in ${RECONNECT_DELAY_MS / 1000}s...`)
    reconnectTimer = setTimeout(connectKline, RECONNECT_DELAY_MS)
  }
}

// ── Bun HTTP + WebSocket server ────────────────────────────────────────

const server = Bun.serve({
  port: CANDLE_PORT,

  fetch: async (req: Request, server: { upgrade: (req: Request) => boolean }): Promise<Response> => {
    // CORS headers for all responses
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, X-MBX-APIKEY',
    }

    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders })
    }

    // Debug log collector
    if (req.method === 'POST' && new URL(req.url).pathname === '/debug/log') {
      try {
        const body = await req.json()
        const ts = new Date().toISOString().slice(11, 23)
        const lines: string[] = [`[client:debug] ${ts} ${body.level || 'ERROR'} ${body.message || '(no message)'}`]
        if (body.stack) {
          for (const s of body.stack.split('\n').slice(0, 8)) {
            lines.push(`  ${s}`)
          }
        }
        if (body.data) lines.push(`  data: ${JSON.stringify(body.data).slice(0, 500)}`)
        const text = lines.join('\n') + '\n'
        console.log(text.trimEnd())
        const { appendFileSync } = await import('node:fs')
        appendFileSync('/tmp/flappy-debug.log', text)
      } catch (err: any) {
        console.log('[client:debug] Error handling debug log:', err?.message)
      }
      return new Response('ok', { status: 200, headers: corsHeaders })
    }

    if (server.upgrade(req)) {
      return new Response() // 101
    }
    return new Response('Flappy Trade Relay', { status: 200, headers: corsHeaders })
  },

  websocket: {
    open(ws: WebSocket): void {
      clients.add(ws)
      console.log(`[relay] Client connected (${clients.size} total)`)

      // Send candle snapshot
      if (candleHistory.length > 0) {
        ws.send(JSON.stringify({ type: 'snapshot', candles: candleHistory }))
      }

      // Fire-and-forget: fetch recent trades from Binance API
      fetchRecentTrades().then(trades => {
        if (trades.length > 0) {
          const mapped = trades.map(t => ({
            id: `hist_${t.id}`,
            side: t.side === 'BUY' ? 'buy' as const : 'sell' as const,
            direction: t.side === 'BUY' ? 'long' as const : 'short' as const,
            price: parseFloat(t.price),
            qty: parseFloat(t.qty),
            pnl: parseFloat(t.realizedPnl || '0'),
            commission: parseFloat(t.commission),
            commissionAsset: t.commissionAsset,
            status: 'filled' as const,
            timestamp: t.time,
            reason: 'entry' as const,
            symbol: t.symbol,
            source: 'strategy' as const,
            reduceOnly: false,
            orderType: 'MARKET',
            orderId: t.orderId,
            tradeId: t.id,
          }))
          ws.send(JSON.stringify({ type: 'trade_snapshot', trades: mapped }))
          console.log(`[relay] Sent ${mapped.length} historical trades to new client`)
        }
      }).catch((err: any) => {
        console.log(`[relay] fetchRecentTrades error: ${err?.message}`)
      })
    },

    close(ws: WebSocket): void {
      clients.delete(ws)
      console.log(`[relay] Client disconnected (${clients.size} total)`)
    },

    message(ws: WebSocket, message: string | Buffer): void {
      // One-way relay for now
    },

    drain(ws: WebSocket): void {
      // Backpressure not needed
    },
  },
})

console.log(`[relay] PWA WebSocket relay running on ws://localhost:${CANDLE_PORT}`)

// ── Startup ────────────────────────────────────────────────────────────

// Backfill 120 candles from REST before connecting live WS
backfillKlines().finally(() => {
  // Broadcast snapshot to any clients already connected while backfill ran
  if (candleHistory.length > 0) {
    const msg = JSON.stringify({ type: 'snapshot', candles: candleHistory })
    broadcast(msg)
    console.log(`[relay] Snapshot broadcast to ${clients.size} clients after backfill`)
  }
  connectKline()
})
connectUserData()

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n[relay] Shutting down...')
  if (reconnectTimer) clearTimeout(reconnectTimer)
  if (renewTimer) clearInterval(renewTimer)
  if (listenKey) await closeListenKey(listenKey)
  if (binanceWs) binanceWs.close()
  if (userDataWs) userDataWs.close()
  server.stop()
  process.exit(0)
})

process.on('SIGTERM', async () => {
  if (listenKey) await closeListenKey(listenKey)
  if (reconnectTimer) clearTimeout(reconnectTimer)
  if (renewTimer) clearInterval(renewTimer)
  if (binanceWs) binanceWs.close()
  if (userDataWs) userDataWs.close()
  server.stop()
  process.exit(0)
})
