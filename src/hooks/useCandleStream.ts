import { useState, useEffect, useRef } from 'react'
import type { Candle } from '../types'

const RECONNECT_DELAY = 3000
const MAX_CANDLES = 500

/**
 * WebSocket hook connecting to the Bun relay at ws://localhost:3001/klines.
 *
 * Protocol:
 *   subscribe → { type: 'subscribe', symbol, interval }
 *   snapshot  → { type: 'snapshot', candles: Candle[] }
 *   candle    → { type: 'candle', candle: Candle }
 *
 * Returns Candle[] for backward compatibility with existing consumers.
 */
export function useCandleStream(symbol: string, interval: string): Candle[] {
  const [candles, setCandles] = useState<Candle[]>([])

  const wsRef = useRef<WebSocket | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const closedRef = useRef(false)
  const symbolRef = useRef(symbol)
  const intervalRef = useRef(interval)

  symbolRef.current = symbol
  intervalRef.current = interval

  useEffect(() => {
    closedRef.current = false
    let ws: WebSocket

    function connect() {
      if (closedRef.current) return

      const host = window.location.hostname
      ws = new WebSocket(`ws://${host}:3001/klines`)
      wsRef.current = ws

      ws.onopen = () => {
        ws.send(JSON.stringify({
          type: 'subscribe',
          symbol: symbolRef.current,
          interval: intervalRef.current,
        }))
      }

      ws.onmessage = (ev) => {
        try {
          const msg = JSON.parse(ev.data)

          if (msg.type === 'snapshot') {
            setCandles((msg.candles ?? []).slice(-MAX_CANDLES))
          } else if (msg.type === 'candle') {
            const c: Candle = msg.candle
            setCandles(prev => {
              const last = prev[prev.length - 1]
              // Replace last candle if same timestamp (live update)
              if (last && last.time === c.time) {
                const copy = [...prev]
                copy[copy.length - 1] = c
                return copy
              }
              const next = [...prev, c]
              return next.length > MAX_CANDLES ? next.slice(-MAX_CANDLES) : next
            })
          }
        } catch {
          /* malformed JSON — skip silently */
        }
      }

      ws.onerror = () => {
        /* connection error — onclose will handle reconnect */
      }

      ws.onclose = () => {
        wsRef.current = null
        if (!closedRef.current) {
          timerRef.current = setTimeout(connect, RECONNECT_DELAY)
        }
      }
    }

    connect()

    return () => {
      closedRef.current = true
      if (timerRef.current) clearTimeout(timerRef.current)
      const sock = wsRef.current
      if (sock) {
        // Don't close a CONNECTING socket — it triggers browser console error.
        // Let it connect and close itself in onopen if closedRef is already true.
        if (sock.readyState !== WebSocket.CONNECTING) {
          sock.close()
        } else {
          sock.onopen = () => {
            if (closedRef.current) sock.close()
          }
        }
        wsRef.current = null
      }
    }
  }, [symbol, interval])

  return candles
}
