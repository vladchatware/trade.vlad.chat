import type { ActivityLogger } from './logger'
import type { Config, Position } from './types'
import type { ToolCaller } from './types'
import { getErrorMessage, parseToolResult } from './utils'

export class TradingExecutor {
  mcp: ToolCaller
  logger: ActivityLogger
  config: Config
  name: string
  lastTrades: Map<string, number>

  constructor(mcpClient: ToolCaller, logger: ActivityLogger, config: Config) {
    this.mcp = mcpClient
    this.logger = logger
    this.config = config
    this.name = 'Executor'
    this.lastTrades = new Map<string, number>()
  }

  async callTool(name: string, args: Record<string, unknown> = {}) {
    const result = await this.mcp.callTool({ name, arguments: args })
    return parseToolResult(result)
  }

  async executeBuy(symbol: string, confidence: number, reasonText = '', isCrypto = false) {
    const lastTrade = this.lastTrades.get(symbol)
    if (lastTrade && Date.now() - lastTrade < 300_000) {
      this.logger.log(this.name, 'skipped_cooldown', { symbol })
      return null
    }

    try {
      const result = await this.callTool('trade-buy', {
        symbol,
        confidence,
        reason: reasonText,
        isCrypto,
      })

      if (result.ok) {
        this.lastTrades.set(symbol, Date.now())
        this.logger.log(this.name, 'buy_executed', { symbol, confidence, isCrypto })
        return result.data
      }

      this.logger.log(this.name, 'buy_failed', { symbol, error: result.error })
      return null
    } catch (err) {
      this.logger.log(this.name, 'buy_error', { symbol, error: getErrorMessage(err) })
      return null
    }
  }

  async executeSell(position: Position, reason = '') {
    const symbol = position.symbol

    try {
      const result = await this.callTool('trade-sell', {
        symbol,
        reason,
      })

      if (result.ok) {
        this.logger.log(this.name, 'sell_executed', { symbol, reason })
        return result.data
      }

      this.logger.log(this.name, 'sell_failed', { symbol, error: result.error })
      return null
    } catch (err) {
      this.logger.log(this.name, 'sell_error', { symbol, error: getErrorMessage(err) })
      return null
    }
  }
}
