import { useState, useEffect, useRef, useCallback } from 'react'
import type { Regime } from '../types'

interface RegimeSignal {
  type: 'regime'
  regime: Regime
  alignmentScore: number
  directions: Record<string, string>
  rawRegime: string
  session: string
  bias: string
  timestamp: number
  timeframes: Record<string, { price: number; regime: string }>
}

interface SignalState {
  regime: Regime
  rawRegime: string
  alignmentScore: number
  directions: Record<string, string>
  session: string
  lastUpdate: number
  connected: boolean
}

const RECONNECT_DELAY_MS = 5000

function getRelayUrl(): string {
  const host = typeof window !== 'undefined' ? window.location.hostname : 'localhost'
  return `ws://${host}:3002/signal`
}

export function useRegimeSignal(): SignalState {
  const [state, setState] = useState<SignalState>({
    regime: 'sideways',
    rawRegime: 'unknown',
    alignmentScore: 0,
    directions: {},
    session: '',
    lastUpdate: Date.now(),
    connected: false,
  })

  const wsRef = useRef<WebSocket | null>(null)
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return

    const ws = new WebSocket(getRelayUrl())

    ws.onopen = () => {
      setState(prev => ({ ...prev, connected: true }))
    }

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data) as RegimeSignal | { type: 'error'; stale: boolean }

        if (data.type === 'regime') {
          const signal = data as RegimeSignal
          setState({
            regime: signal.regime,
            rawRegime: signal.rawRegime,
            alignmentScore: signal.alignmentScore,
            directions: signal.directions,
            session: signal.session,
            lastUpdate: signal.timestamp,
            connected: true,
          })
        }
      } catch {
        // ignore malformed messages
      }
    }

    ws.onclose = () => {
      setState(prev => ({ ...prev, connected: false }))
      wsRef.current = null
      // Schedule reconnect
      reconnectTimer.current = setTimeout(connect, RECONNECT_DELAY_MS)
    }

    ws.onerror = () => {
      ws.close()
    }

    wsRef.current = ws
  }, [])

  useEffect(() => {
    connect()
    return () => {
      const sock = wsRef.current
      if (sock) {
        if (sock.readyState !== WebSocket.CONNECTING) {
          sock.close()
        } else {
          sock.onopen = () => {
            if (!wsRef.current) sock.close()
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

  return state
}
