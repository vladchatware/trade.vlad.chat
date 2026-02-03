#!/usr/bin/env bun
/**
 * MAHORAGA Real-time Worker
 *
 * This worker maintains a persistent WebSocket connection to Alpaca
 * and forwards position/account updates to Convex.
 *
 * Run with: bun run worker/index.ts
 */

// Load environment variables from .env.local
import { config } from 'dotenv'
config({ path: '../.env.local' })

interface PositionUpdate {
  symbol: string
  qty: number
  avgEntryPrice: number
  currentPrice: number
  marketValue: number
  unrealizedPl: number
  unrealizedPlpc: number
}

interface AccountUpdate {
  equity: number
  cash: number
  buyingPower: number
  portfolioValue: number
}

interface AlpacaMessage {
  stream: string
  data?: {
    symbol?: string
    qty?: number
    avg_entry_price?: number
    price?: number
    market_value?: number
    unrealized_pl?: number
    unrealized_plpc?: number
    equity?: number
    cash?: number
    buying_power?: number
    portfolio_value?: number
    status?: string
  }
}

// Configuration
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL
const CONVEX_ADMIN_KEY = process.env.CONVEX_ADMIN_KEY
const ALPACA_API_KEY = process.env.ALPACA_API_KEY
const ALPACA_API_SECRET = process.env.ALPACA_API_SECRET
const ALPACA_PAPER = process.env.ALPACA_PAPER === 'true'

if (!CONVEX_URL || !ALPACA_API_KEY || !ALPACA_API_SECRET) {
  console.error('❌ Missing required environment variables')
  console.error('   Required: NEXT_PUBLIC_CONVEX_URL, ALPACA_API_KEY, ALPACA_API_SECRET')
  process.exit(1)
}

class AlpacaRealTimeWorker {
  private ws: WebSocket | null = null
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null
  private isConnected = false
  private lastAccountUpdate = 0
  private lastPositionsUpdate: Map<string, number> = new Map()

  constructor() {
    console.info('🚀 MAHORAGA Real-time Worker Starting...')
    console.info(`   Convex: ${CONVEX_URL}`)
    console.info(`   Alpaca: ${ALPACA_PAPER ? 'Paper' : 'Live'} Trading`)
  }

  async start() {
    await this.connect()
  }

  private async connect() {
    try {
      const wsUrl = ALPACA_PAPER
        ? 'wss://paper-api.alpaca.markets/stream'
        : 'wss://api.alpaca.markets/stream'

      console.info(`🔌 Connecting to Alpaca WebSocket (${wsUrl})...`)

      this.ws = new WebSocket(wsUrl)

      this.ws.onopen = () => {
        console.info('✅ Connected to Alpaca')
        this.isConnected = true

        // Authenticate
        const authMessage = {
          action: 'auth',
          key: ALPACA_API_KEY,
          secret: ALPACA_API_SECRET,
        }
        this.ws?.send(JSON.stringify(authMessage))

        // Subscribe to trade updates and account updates
        const subscribeMessage = {
          action: 'listen',
          data: {
            streams: ['trade_updates', 'account_updates'],
          },
        }
        this.ws?.send(JSON.stringify(subscribeMessage))
      }

      this.ws.onmessage = async (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data) as AlpacaMessage | AlpacaMessage[]

          for (const message of Array.isArray(data) ? data : [data]) {
            await this.handleMessage(message)
          }
        } catch (err) {
          console.error('❌ Error processing message:', err)
        }
      }

      this.ws.onerror = (error: Event) => {
        console.error('❌ WebSocket error:', error)
        this.isConnected = false
      }

      this.ws.onclose = () => {
        console.info('🔌 WebSocket closed')
        this.isConnected = false
        this.scheduleReconnect()
      }
    } catch (error) {
      console.error('❌ Failed to connect:', error)
      this.scheduleReconnect()
    }
  }

  private async handleMessage(message: AlpacaMessage) {
    switch (message.stream) {
      case 'authorization':
        if (message.data?.status === 'authorized') {
          console.info('🔓 Authorized with Alpaca')
        } else {
          console.error('❌ Authorization failed:', message.data)
        }
        break

      case 'trade_updates':
        if (message.data) {
          await this.handlePositionUpdate(message.data)
        }
        break

      case 'account_updates':
        if (message.data) {
          await this.handleAccountUpdate(message.data)
        }
        break

      default:
        if (message.stream !== 'listening') {
          console.info('📨 Received:', message.stream, message.data)
        }
    }
  }

  private async handlePositionUpdate(data: AlpacaMessage['data']) {
    if (!data || !data.symbol) return

    const symbol = data.symbol
    const now = Date.now()

    const lastUpdate = this.lastPositionsUpdate.get(symbol) || 0
    if (now - lastUpdate < 5000) {
      return
    }
    this.lastPositionsUpdate.set(symbol, now)

    const position: PositionUpdate = {
      symbol,
      qty: data.qty || 0,
      avgEntryPrice: data.avg_entry_price || 0,
      currentPrice: data.price || 0,
      marketValue: data.market_value || 0,
      unrealizedPl: data.unrealized_pl || 0,
      unrealizedPlpc: data.unrealized_plpc || 0,
    }

    console.info(
      `📈 Position: ${symbol} $${position.marketValue.toFixed(2)} (${position.unrealizedPlpc.toFixed(2)}%)`
    )
    await this.sendToConvex('positions/updateFromWebSocket', position)
  }

  private async handleAccountUpdate(data: AlpacaMessage['data']) {
    if (!data) return

    const now = Date.now()
    if (now - this.lastAccountUpdate < 10000) {
      return
    }
    this.lastAccountUpdate = now

    const account: AccountUpdate = {
      equity: data.equity || 0,
      cash: data.cash || 0,
      buyingPower: data.buying_power || 0,
      portfolioValue: data.portfolio_value || 0,
    }

    console.info(
      `💰 Account: Equity $${account.equity.toFixed(2)} | Cash $${account.cash.toFixed(2)}`
    )
    await this.sendToConvex('account/updateFromWebSocket', account)
  }

  private async sendToConvex(mutation: string, data: PositionUpdate | AccountUpdate) {
    try {
      const url = `${CONVEX_URL}/api/mutation`
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(CONVEX_ADMIN_KEY && { Authorization: `Bearer ${CONVEX_ADMIN_KEY}` }),
        },
        body: JSON.stringify({
          path: mutation,
          args: data,
        }),
      })

      if (!response.ok) {
        const error = await response.text()
        console.error(`❌ Failed to send to Convex (${mutation}):`, error)
      }
    } catch (error) {
      console.error(`❌ Network error sending to Convex (${mutation}):`, error)
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
    }

    console.info('🔄 Scheduling reconnect in 5 seconds...')
    this.reconnectTimeout = setTimeout(() => {
      console.info('🔄 Attempting to reconnect...')
      this.connect()
    }, 5000)
  }

  stop() {
    console.info('🛑 Stopping worker...')
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout)
    }
    if (this.ws) {
      this.ws.close()
    }
  }
}

// Start the worker
const worker = new AlpacaRealTimeWorker()

// Graceful shutdown
process.on('SIGINT', () => {
  console.info('\n')
  worker.stop()
  process.exit(0)
})

process.on('SIGTERM', () => {
  worker.stop()
  process.exit(0)
})

// Start
worker.start()
