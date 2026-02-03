import { CryptoAgent } from './agents/crypto'
import { StockTwitsAgent } from './agents/stocktwits'
import { loadConfig, saveConfig } from './config'
import { TradingExecutor } from './executor'
import { ActivityLogger } from './logger'
import { MCPRouter } from './mcp-router'
import type { Config, Position, Signal } from './types'
import { getErrorMessage, parseToolResult } from './utils'

export class SimpleOrchestrator {
  config: Config
  logger: ActivityLogger
  mcp: MCPRouter
  stocktwits: StockTwitsAgent
  crypto: CryptoAgent | null
  executor: TradingExecutor
  signalCache: Signal[]
  lastAnalystRun: number

  constructor() {
    this.config = loadConfig()
    this.logger = new ActivityLogger()
    const alpacaMcpUrl = process.env.ALPACA_MCP_URL ? String(process.env.ALPACA_MCP_URL) : undefined
    this.mcp = new MCPRouter(this.config.mcp_url, alpacaMcpUrl)
    this.stocktwits = new StockTwitsAgent(this.logger, this.config, this.mcp)
    this.crypto = null
    this.executor = new TradingExecutor(this.mcp, this.logger, this.config)
    this.signalCache = [] as Signal[]
    this.lastAnalystRun = 0
  }

  async connect() {
    const ok = await this.mcp.connect()
    if (!ok) return false

    this.crypto = new CryptoAgent(this.logger, this.config, this.mcp)
    return true
  }

  async getAccountState(): Promise<{
    account: unknown
    positions: Position[]
    clock: { is_open?: boolean } | null
  }> {
    try {
      const [account, positions, clock] = await Promise.all([
        this.mcp.callTool({ name: 'account-get', arguments: {} }),
        this.mcp.callTool({ name: 'positions-get', arguments: {} }),
        this.mcp.callTool({ name: 'market-clock', arguments: {} }),
      ])

      const accountData = parseToolResult(account)
      const positionsData = parseToolResult(positions)
      const clockData = parseToolResult(clock)

      return {
        account: accountData.ok ? accountData.data : null,
        positions: positionsData.ok ? positionsData.data : [],
        clock: clockData.ok ? clockData.data : null,
      }
    } catch (_err) {
      return { account: null, positions: [], clock: null }
    }
  }

  async runDataGatherers() {
    const stocktwitsSignals = await this.stocktwits.gatherSignals()
    const cryptoSignals = this.crypto ? await this.crypto.gatherSignals() : []

    this.signalCache = [...stocktwitsSignals, ...cryptoSignals]

    this.logger.log('System', 'signals_updated', {
      total: this.signalCache.length,
      stocktwits: stocktwitsSignals.length,
      crypto: cryptoSignals.length,
    })
  }

  async runTradingLogic(cryptoOnly = false) {
    const { positions, clock } = await this.getAccountState()

    const marketOpen = clock?.is_open

    if (!cryptoOnly && !marketOpen) {
      if (this.config.crypto_enabled) {
        await this.runTradingLogic(true)
      }
      return
    }

    const cryptoSymbols = new Set(this.config.crypto_symbols || [])
    const stockPositions = positions.filter((p) => !cryptoSymbols.has(p.symbol))
    const cryptoPositions = positions.filter((p) => cryptoSymbols.has(p.symbol))

    const heldSymbols = new Set(positions.map((p) => p.symbol))

    for (const pos of positions) {
      const isCrypto = cryptoSymbols.has(pos.symbol)

      if (cryptoOnly && !isCrypto) continue
      if (!cryptoOnly && isCrypto) continue

      const takeProfit = isCrypto ? this.config.crypto_take_profit_pct : this.config.take_profit_pct
      const stopLoss = isCrypto ? this.config.crypto_stop_loss_pct : this.config.stop_loss_pct

      const currentPrice = Number.parseFloat(
        (pos.current_price as string) || String(pos.currentPrice ?? pos.avg_entry_price ?? 0)
      )
      const avgEntry = Number.parseFloat(
        (pos.avg_entry_price as string) || String(pos.avgEntryPrice ?? 0)
      )
      const pnlPct = ((currentPrice - avgEntry) / avgEntry) * 100

      if (pnlPct >= takeProfit) {
        await this.executor.executeSell(pos, `Take profit: ${pnlPct.toFixed(2)}%`)
      } else if (pnlPct <= -stopLoss) {
        await this.executor.executeSell(pos, `Stop loss: ${pnlPct.toFixed(2)}%`)
      }
    }

    const cryptoSignals = this.signalCache.filter((s) => s.isCrypto)

    if (!cryptoOnly && marketOpen && stockPositions.length < this.config.max_positions) {
      const candidates = this.signalCache
        .filter((s) => !s.isCrypto)
        .filter((s) => s.sentiment >= this.config.min_sentiment_score)
        .filter((s) => s.volume >= this.config.min_volume)
        .filter((s) => !heldSymbols.has(s.symbol))
        .sort((a, b) => b.sentiment - a.sentiment)

      this.logger.log('System', 'buy_candidates', { count: candidates.length })

      for (const signal of candidates.slice(0, 3)) {
        if (stockPositions.length >= this.config.max_positions) break

        const confidence = Math.min(1, Math.max(0.5, signal.sentiment))

        this.logger.log('System', 'considering_buy', {
          symbol: signal.symbol,
          sentiment: signal.sentiment?.toFixed(2),
          volume: signal.volume,
        })

        const result = await this.executor.executeBuy(
          signal.symbol,
          confidence,
          signal.reason,
          false
        )

        if (result) {
          heldSymbols.add(signal.symbol)
          break
        }
      }
    }

    if (this.config.crypto_enabled) {
      const maxCryptoPositions = Math.min(this.config.crypto_symbols?.length || 3, 3)

      if (cryptoPositions.length < maxCryptoPositions) {
        const cryptoCandidates = cryptoSignals
          .filter((s) => !heldSymbols.has(s.symbol))
          .filter((s) => s.sentiment > 0)
          .sort((a, b) => (b.momentum ?? 0) - (a.momentum ?? 0))

        this.logger.log('System', 'crypto_buy_candidates', { count: cryptoCandidates.length })

        for (const signal of cryptoCandidates.slice(0, 2)) {
          if (cryptoPositions.length >= maxCryptoPositions) break

          const confidence = Math.min(1, Math.max(0.5, signal.sentiment))

          this.logger.log('System', 'considering_buy', {
            symbol: signal.symbol,
            momentum: signal.momentum?.toFixed(2),
            type: 'crypto',
          })

          const result = await this.executor.executeBuy(
            signal.symbol,
            confidence,
            signal.reason,
            true
          )

          if (result) {
            heldSymbols.add(signal.symbol)
            cryptoPositions.push({ symbol: signal.symbol })
            break
          }
        }
      }
    }

    this.lastAnalystRun = Date.now()
  }

  async run() {
    if (!(await this.connect())) {
      console.error('Failed to connect. Make sure MCP server is running: npm run dev')
      process.exit(1)
    }

    const { account, clock } = await this.getAccountState()
    if (account) {
    }

    saveConfig(this.config)

    await this.runDataGatherers()

    if (clock?.is_open) {
      await this.runTradingLogic()
    }
    if (this.config.crypto_enabled) {
    }

    setInterval(async () => {
      try {
        await this.runDataGatherers()
      } catch (err) {
        this.logger.log('System', 'error', { phase: 'data_gathering', error: getErrorMessage(err) })
      }
    }, this.config.data_poll_interval_ms)

    setInterval(async () => {
      try {
        await this.runTradingLogic()
      } catch (err) {
        this.logger.log('System', 'error', { phase: 'trading', error: getErrorMessage(err) })
      }
    }, this.config.analyst_interval_ms)

    setInterval(() => {
      this.logger.save()
      saveConfig(this.config)
    }, 60_000)
  }

  getStatus() {
    return {
      config: this.config,
      signals: this.signalCache,
      logs: this.logger.getRecentLogs(100),
      costs: this.logger.getCosts(),
      lastAnalystRun: this.lastAnalystRun,
      signalResearch: {},
      positionResearch: {},
      stalenessAnalysis: {},
      positionTracking: {},
      optionsEnabled: false,
    }
  }
}
