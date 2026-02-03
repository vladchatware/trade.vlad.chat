import { MCPClient } from './mcp'
import type { ToolCall } from './types'
import { getErrorMessage, parseToolResult } from './utils'

const ALPACA_TOOL_MAP: Record<string, string> = {
  'account-get': 'get_account_info',
  'positions-get': 'get_all_positions',
  'market-clock': 'get_market_clock',
  // market-quote is handled specially
}

function isCryptoSymbol(symbol: string) {
  return symbol.includes('/')
}

function wrapOk(data: unknown) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({ ok: true, data }),
      },
    ],
  }
}

function wrapError(message: string) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify({ ok: false, error: message }),
      },
    ],
    isError: true,
  }
}

function extractSnapshot(snapshot: unknown, symbol?: string) {
  const asRecord = (value: unknown): Record<string, unknown> | undefined =>
    value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined
  const pick = (obj: Record<string, unknown> | undefined, key: string) =>
    obj ? obj[key] : undefined

  const source = snapshot as Record<string, unknown> | undefined
  const symbolSnap =
    symbol && source && typeof source[symbol] === 'object'
      ? (source[symbol] as Record<string, unknown>)
      : undefined
  const snap = symbolSnap ?? source
  const latestTrade = asRecord(pick(snap, 'latestTrade') ?? pick(snap, 'latest_trade'))
  const latestQuote = asRecord(pick(snap, 'latestQuote') ?? pick(snap, 'latest_quote'))
  const dailyBar = asRecord(pick(snap, 'dailyBar') ?? pick(snap, 'daily_bar'))
  const prevDailyBar = asRecord(pick(snap, 'prevDailyBar') ?? pick(snap, 'prev_daily_bar'))

  const tradePrice =
    pick(latestTrade, 'p') ??
    pick(latestTrade, 'price') ??
    pick(snap, 'price') ??
    pick(snap, 'last') ??
    pick(snap, 'close') ??
    pick(dailyBar, 'c')

  const bid = pick(latestQuote, 'bp') ?? pick(latestQuote, 'bid_price') ?? pick(latestQuote, 'bid')
  const ask = pick(latestQuote, 'ap') ?? pick(latestQuote, 'ask_price') ?? pick(latestQuote, 'ask')

  const prevClose =
    pick(prevDailyBar, 'c') ?? pick(snap, 'prev_close') ?? pick(snap, 'previous_close')
  const price = tradePrice
  const close = pick(dailyBar, 'c') ?? price
  const closeNum = typeof close === 'number' ? close : Number(close)
  const prevCloseNum = typeof prevClose === 'number' ? prevClose : Number(prevClose)
  const change_pct = Number.isFinite(prevCloseNum)
    ? ((closeNum - prevCloseNum) / prevCloseNum) * 100
    : 0
  const volume = pick(dailyBar, 'v') ?? pick(snap, 'volume')

  return {
    symbol: symbol ?? pick(snap, 'symbol'),
    price,
    bid,
    ask,
    prev_close: prevClose,
    change_pct,
    volume,
  }
}

export class MCPRouter {
  local: MCPClient
  alpaca: MCPClient | null

  constructor(localUrl: string, alpacaUrl?: string) {
    this.local = new MCPClient(localUrl)
    this.alpaca = alpacaUrl ? new MCPClient(alpacaUrl) : null
  }

  async connect() {
    const localOk = await this.local.connect()
    if (!localOk) return false

    if (this.alpaca) {
      const alpacaOk = await this.alpaca.connect()
      if (!alpacaOk) {
        console.warn('Alpaca MCP connection failed; falling back to local MCP only')
        this.alpaca = null
      }
    }

    return true
  }

  async callTool({ name, arguments: args }: ToolCall) {
    if (!this.alpaca) {
      return this.local.callTool({ name, arguments: args })
    }

    try {
      if (name === 'market-quote') {
        const symbol = String(args.symbol || '')
        if (!symbol) return wrapError('symbol is required')

        const toolName = isCryptoSymbol(symbol) ? 'get_crypto_snapshot' : 'get_stock_snapshot'
        const result = await this.alpaca.callTool({
          name: toolName,
          arguments: { symbol_or_symbols: symbol },
        })
        const data = parseToolResult(result)
        const normalized = extractSnapshot(data, symbol)
        return wrapOk(normalized)
      }

      const mapped = ALPACA_TOOL_MAP[name]
      if (!mapped) {
        return this.local.callTool({ name, arguments: args })
      }

      const result = await this.alpaca.callTool({ name: mapped, arguments: args })
      const data = parseToolResult(result)
      return wrapOk(data)
    } catch (err) {
      return wrapError(getErrorMessage(err))
    }
  }
}
