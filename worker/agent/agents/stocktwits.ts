import type { ActivityLogger } from '../logger'
import type { Config, Signal } from '../types'
import type { ToolCaller } from '../types'
import { getErrorMessage, parseToolResult, sleep } from '../utils'

export class StockTwitsAgent {
  logger: ActivityLogger
  config: Config
  mcp: ToolCaller
  name: string

  constructor(logger: ActivityLogger, config: Config, mcpClient: ToolCaller) {
    this.logger = logger
    this.config = config
    this.mcp = mcpClient
    this.name = 'StockTwits'
  }

  async callTool(name: string, args: Record<string, unknown> = {}) {
    const result = await this.mcp.callTool({ name, arguments: args })
    return parseToolResult(result)
  }

  async gatherSignals(): Promise<Signal[]> {
    const signals: Signal[] = []

    try {
      const result = await this.callTool('stocktwits-trending', {})
      if (!result.ok || !result.data) return []

      const trending = result.data.slice(0, 10)

      for (const sym of trending) {
        const sentiment = await this.callTool('stocktwits-sentiment', {
          symbol: sym.symbol,
        })

        if (sentiment.ok && sentiment.data) {
          signals.push({
            symbol: sym.symbol,
            source: 'stocktwits',
            sentiment: sentiment.data.score,
            volume: sentiment.data.total,
            bullish: sentiment.data.bullish,
            bearish: sentiment.data.bearish,
            reason: `StockTwits: ${sentiment.data.bullish}B/${sentiment.data.bearish}b (${(
              sentiment.data.score * 100
            ).toFixed(0)}%)`,
          })
        }
        await sleep(300)
      }
    } catch (err) {
      this.logger.log(this.name, 'error', { error: getErrorMessage(err) })
    }

    this.logger.log(this.name, 'gathered_signals', { count: signals.length })
    return signals
  }
}
