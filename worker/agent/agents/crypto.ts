import type { ActivityLogger } from '../logger'
import type { Config, Signal } from '../types'
import type { ToolCaller } from '../types'
import { getErrorMessage, parseToolResult, sleep } from '../utils'

export class CryptoAgent {
  logger: ActivityLogger
  config: Config
  mcp: ToolCaller
  name: string
  priceCache: Map<string, { price: number; timestamp: number }>

  constructor(logger: ActivityLogger, config: Config, mcpClient: ToolCaller) {
    this.logger = logger
    this.config = config
    this.mcp = mcpClient
    this.name = 'Crypto'
    this.priceCache = new Map<string, { price: number; timestamp: number }>()
  }

  async callTool(name: string, args: Record<string, unknown> = {}) {
    const result = await this.mcp.callTool({ name, arguments: args })
    return parseToolResult(result)
  }

  async getQuote(symbol: string) {
    try {
      const result = await this.callTool('market-quote', { symbol })
      if (result.ok) {
        return result.data
      }
      return null
    } catch (err) {
      this.logger.log(this.name, 'quote_error', { symbol, error: getErrorMessage(err) })
      return null
    }
  }

  async gatherSignals(): Promise<Signal[]> {
    if (!this.config.crypto_enabled) return []

    const signals: Signal[] = []
    const symbols = this.config.crypto_symbols || ['BTC/USD', 'ETH/USD']

    for (const symbol of symbols) {
      const quote = await this.getQuote(symbol)
      if (!quote) continue

      const price = quote.price || quote.last || quote.close
      const prevClose = quote.prev_close || quote.previous_close

      if (!price) continue

      let momentum = 0
      if (prevClose && prevClose > 0) {
        momentum = ((price - prevClose) / prevClose) * 100
      }

      const lastPrice = this.priceCache.get(symbol)
      this.priceCache.set(symbol, { price, timestamp: Date.now() })

      let shortTermMomentum = 0
      if (lastPrice && lastPrice.price > 0) {
        shortTermMomentum = ((price - lastPrice.price) / lastPrice.price) * 100
      }

      const threshold = this.config.crypto_momentum_threshold || 2.0
      const hasSignificantMove =
        Math.abs(momentum) >= threshold || Math.abs(shortTermMomentum) >= threshold * 0.5

      const isBullish = momentum > 0 || shortTermMomentum > 0
      const effectiveMomentum =
        Math.abs(momentum) > Math.abs(shortTermMomentum) ? momentum : shortTermMomentum

      const rawSentiment =
        hasSignificantMove && isBullish ? Math.min(Math.abs(effectiveMomentum) / 5, 1) : 0.1

      signals.push({
        symbol,
        source: 'crypto_momentum',
        sentiment: rawSentiment,
        volume: 100,
        bullish: isBullish ? 1 : 0,
        bearish: isBullish ? 0 : 1,
        reason: `Crypto: ${momentum >= 0 ? '+' : ''}${momentum.toFixed(2)}% (24h)${
          shortTermMomentum !== 0
            ? `, ${shortTermMomentum >= 0 ? '+' : ''}${shortTermMomentum.toFixed(2)}% (recent)`
            : ''
        }`,
        isCrypto: true,
        momentum: effectiveMomentum,
        price,
      })

      await sleep(200)
    }

    this.logger.log(this.name, 'gathered_signals', { count: signals.length })
    return signals
  }
}
