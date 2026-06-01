import { useState, useEffect, useRef, useCallback } from 'react'
import type { TradeRecord, StrategyTrade } from '../types'

const RECONNECT_DELAY_MS = 5000
const MAX_TRADES = 200

/**
 * WebSocket hook for live strategy trades from the Binance user data stream.
 *
 * Connects to the candle relay (port 3001) which also broadcasts
 * executionReport events as { type: 'trade', trade: StrategyTrade }.
 *
 * Returns TradeRecord[] with source='strategy' for display alongside
 * PWA-made trades in TradeHistory.
 */
export function useTradeStream(): TradeRecord[] {
  const [trades, setTrades] = useState<TradeRecord[]>([])
  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const closedRef = useRef(false)
  const idRef = useRef(0)

  const connect = useCallback(() => {
    if (closedRef.current) return
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
    const ws = new WebSocket(`ws://${host}:3001`)

    ws.onopen = () => {
      console.log('[tradeStream] Connected to relay')
    }

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data)

        if (msg.type === 'trade') {
          const raw = msg.trade as StrategyTrade
          const record = mapStrategyTrade(raw, ++idRef.current)
          setTrades(prev => {
            // Dedup by trade id
            const exists = prev.some(t => t.id === raw.id)
            if (exists) return prev
            const next = [record, ...prev]
            return next.length > MAX_TRADES ? next.slice(0, MAX_TRADES) : next
          })
        }

        // Historical trade snapshot from Binance API
        if (msg.type === 'trade_snapshot' && Array.isArray(msg.trades)) {
          const incoming = (msg.trades as StrategyTrade[])
            .map((t, i) => mapStrategyTrade(t, ++idRef.current))
          setTrades(prev => {
            const existingIds = new Set(prev.map(t => t.id))
            const newOnes = incoming.filter(t => !existingIds.has(t.id))
            if (newOnes.length === 0) return prev
            const merged = [...newOnes, ...prev]
            return merged.length > MAX_TRADES ? merged.slice(0, MAX_TRADES) : merged
          })
          console.log(`[tradeStream] loaded ${incoming.length} historical trades`)
        }

        // Ignore other message types (candle, snapshot, etc.)
      } catch {
        // Malformed JSON — skip
      }
    }

    ws.onerror = () => {
      ws.close()
    }

    ws.onclose = () => {
      wsRef.current = null
      if (!closedRef.current) {
        reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY_MS)
      }
    }

    wsRef.current = ws
  }, [])

  useEffect(() => {
    closedRef.current = false
    connect()

    return () => {
      closedRef.current = true
      const sock = wsRef.current
      if (sock) {
        if (sock.readyState !== WebSocket.CONNECTING) {
          sock.close()
        } else {
          sock.onopen = () => {
            if (closedRef.current) sock.close()
          }
        }
        wsRef.current = null
      }
      if (reconnectTimer.current) {
        clearTimeout(reconnectTimer.current)
        reconnectTimer.current = null
      }
    }
  }, [connect])

  return trades
}

/**
 * Normalize a raw StrategyTrade (from WS relay) into TradeRecord
 * for unified rendering in TradeHistory.
 */
function mapStrategyTrade(st: StrategyTrade, _seq: number): TradeRecord {
  // Determine if this is an entry or exit fill
  const isEntry = st.reason === 'entry'
  const isExit = st.reason === 'sl' || st.reason === 'tp'

  return {
    id: st.id,
    side: st.direction,
    entryPrice: isEntry ? st.price : 0,
    exitPrice: isExit ? st.price : st.price,
    margin: 0,
    pnl: st.pnl ?? 0,
    balanceAfter: 0,
    reason: st.reason === 'sl' ? 'sl' : st.reason === 'tp' ? 'tp' : 'tap',
    openedAt: st.timestamp,
    closedAt: st.timestamp,
    source: 'strategy',
    qty: st.qty,
    symbol: st.symbol,
    orderType: st.orderType,
  }
}
