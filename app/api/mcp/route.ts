import { createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import { createAlpacaClient } from '@/app/lib/mcp/providers/alpaca/client'
import { createAlpacaMarketDataProvider } from '@/app/lib/mcp/providers/alpaca/market-data'
import { createAlpacaTradingProvider } from '@/app/lib/mcp/providers/alpaca/trading'
import { createStockTwitsProvider } from '@/app/lib/mcp/providers/social/stocktwits'
import { createMcpHandler } from 'mcp-handler'
import { z } from 'zod'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type ToolPayload = { ok: boolean; data?: unknown; error?: string }

type AppConfig = {
  max_position_value: number
  position_size_pct_of_cash: number
}

const DEFAULT_CONFIG: AppConfig = {
  max_position_value: 2000,
  position_size_pct_of_cash: 20,
}

const configPath = path.join(process.cwd(), 'agent-config.json')

function loadConfig(): AppConfig {
  try {
    if (!fs.existsSync(configPath)) return DEFAULT_CONFIG
    const raw = JSON.parse(fs.readFileSync(configPath, 'utf8')) as Partial<AppConfig>
    return {
      max_position_value: raw.max_position_value ?? DEFAULT_CONFIG.max_position_value,
      position_size_pct_of_cash:
        raw.position_size_pct_of_cash ?? DEFAULT_CONFIG.position_size_pct_of_cash,
    }
  } catch {
    return DEFAULT_CONFIG
  }
}

function asMcpResponse(payload: ToolPayload, isError = false) {
  return {
    content: [{ type: 'text' as const, text: JSON.stringify(payload) }],
    ...(isError ? { isError: true } : {}),
  }
}

function normalizeSnapshot(symbol: string, snapshot: unknown) {
  const data = snapshot as {
    latest_trade?: { price?: number }
    latest_quote?: { bid_price?: number; ask_price?: number }
    daily_bar?: { c?: number; v?: number }
    prev_daily_bar?: { c?: number }
  }

  const price = data.latest_trade?.price ?? data.daily_bar?.c
  const prevClose = data.prev_daily_bar?.c
  const changePct = price && prevClose ? ((price - prevClose) / prevClose) * 100 : 0

  return {
    symbol,
    price,
    bid: data.latest_quote?.bid_price,
    ask: data.latest_quote?.ask_price,
    prev_close: prevClose,
    change_pct: changePct,
    volume: data.daily_bar?.v,
  }
}

const handler = createMcpHandler(
  (server) => {
    const apiKey = process.env.ALPACA_API_KEY
    const apiSecret = process.env.ALPACA_API_SECRET
    if (!apiKey || !apiSecret) {
      throw new Error('Missing ALPACA_API_KEY or ALPACA_API_SECRET')
    }

    const client = createAlpacaClient({
      apiKey,
      apiSecret,
      paper: process.env.ALPACA_PAPER !== 'false',
    })

    const trading = createAlpacaTradingProvider(client)
    const marketData = createAlpacaMarketDataProvider(client)
    const stocktwits = createStockTwitsProvider()

    server.registerTool(
      'account-get',
      {
        title: 'Get Account',
        description: 'Get broker account information',
        inputSchema: {},
      },
      async () => {
        try {
          const account = await trading.getAccount()
          return asMcpResponse({ ok: true, data: account })
        } catch (error) {
          return asMcpResponse({ ok: false, error: String(error) }, true)
        }
      }
    )

    server.registerTool(
      'positions-get',
      {
        title: 'Get Positions',
        description: 'Get all open positions',
        inputSchema: {},
      },
      async () => {
        try {
          const positions = await trading.getPositions()
          return asMcpResponse({ ok: true, data: positions })
        } catch (error) {
          return asMcpResponse({ ok: false, error: String(error) }, true)
        }
      }
    )

    server.registerTool(
      'market-clock',
      {
        title: 'Market Clock',
        description: 'Get market clock status',
        inputSchema: {},
      },
      async () => {
        try {
          const clock = await trading.getClock()
          return asMcpResponse({ ok: true, data: clock })
        } catch (error) {
          return asMcpResponse({ ok: false, error: String(error) }, true)
        }
      }
    )

    server.registerTool(
      'market-quote',
      {
        title: 'Market Quote',
        description: 'Get latest normalized quote for stock or crypto symbol',
        inputSchema: { symbol: z.string() },
      },
      async ({ symbol }) => {
        try {
          const snapshot = symbol.includes('/')
            ? await marketData.getCryptoSnapshot(symbol)
            : await marketData.getSnapshot(symbol)
          return asMcpResponse({ ok: true, data: normalizeSnapshot(symbol, snapshot) })
        } catch (error) {
          return asMcpResponse({ ok: false, error: String(error) }, true)
        }
      }
    )

    server.registerTool(
      'trade-buy',
      {
        title: 'Trade Buy',
        description: 'Place a market buy order using configured risk sizing',
        inputSchema: {
          symbol: z.string(),
          confidence: z.number().optional(),
          reason: z.string().optional(),
          isCrypto: z.boolean().optional(),
        },
      },
      async ({ symbol, confidence, reason, isCrypto }) => {
        try {
          const config = loadConfig()
          const account = await trading.getAccount()
          const maxFromCash = account.cash * (config.position_size_pct_of_cash / 100)
          const notional = Math.min(config.max_position_value, maxFromCash)

          if (!Number.isFinite(notional) || notional <= 0) {
            return asMcpResponse({ ok: false, error: 'Not enough buying power for order' }, true)
          }

          const clientOrderId = createHash('sha1')
            .update(`${symbol}:${Date.now()}:${confidence ?? 0}:${reason ?? ''}`)
            .digest('hex')
            .slice(0, 36)

          const order = await trading.createOrder({
            symbol,
            side: 'buy',
            type: 'market',
            time_in_force: isCrypto ? 'gtc' : 'day',
            notional,
            client_order_id: clientOrderId,
          })

          return asMcpResponse({ ok: true, data: order })
        } catch (error) {
          return asMcpResponse({ ok: false, error: String(error) }, true)
        }
      }
    )

    server.registerTool(
      'trade-sell',
      {
        title: 'Trade Sell',
        description: 'Close a full position by symbol',
        inputSchema: { symbol: z.string(), reason: z.string().optional() },
      },
      async ({ symbol }) => {
        try {
          const order = await trading.closePosition(symbol)
          return asMcpResponse({ ok: true, data: order })
        } catch (error) {
          return asMcpResponse({ ok: false, error: String(error) }, true)
        }
      }
    )

    server.registerTool(
      'stocktwits-trending',
      {
        title: 'StockTwits Trending',
        description: 'Get top trending StockTwits symbols',
        inputSchema: { limit: z.number().int().positive().max(30).optional() },
      },
      async ({ limit }) => {
        try {
          const symbols = await stocktwits.getTrendingSymbols()
          const data = symbols.slice(0, limit ?? 10).map((item) => ({
            symbol: item.symbol,
            title: item.title,
            watchlist_count: item.watchlist_count,
          }))
          return asMcpResponse({ ok: true, data })
        } catch (error) {
          return asMcpResponse({ ok: false, error: String(error) }, true)
        }
      }
    )

    server.registerTool(
      'stocktwits-sentiment',
      {
        title: 'StockTwits Sentiment',
        description: 'Get sentiment summary for a symbol from StockTwits stream',
        inputSchema: {
          symbol: z.string(),
          limit: z.number().int().positive().max(50).optional(),
        },
      },
      async ({ symbol, limit }) => {
        try {
          const messages = await stocktwits.getSymbolStream(symbol, limit ?? 30)
          const summary = stocktwits
            .analyzeSentiment(messages)
            .find((item) => item.symbol.toUpperCase() === symbol.toUpperCase())

          const data = summary ?? {
            symbol: symbol.toUpperCase(),
            bullish: 0,
            bearish: 0,
            total: 0,
            score: 0,
            trending_users: [],
          }

          return asMcpResponse({ ok: true, data })
        } catch (error) {
          return asMcpResponse({ ok: false, error: String(error) }, true)
        }
      }
    )
  },
  {},
  {
    basePath: '/api',
    maxDuration: 60,
    verboseLogs: false,
    disableSse: true,
  }
)

export { handler as GET, handler as POST, handler as DELETE }
