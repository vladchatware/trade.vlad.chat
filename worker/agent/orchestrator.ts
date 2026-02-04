import { loadConfig, saveConfig } from './config'
import {
  createConvexClient,
  syncAccountStateToConvex,
  syncMarketClockToConvex,
  syncSignalsToConvex,
  syncTechnicalIndicatorsToConvex,
} from './convex-sync'
import {
  buildSimpleStrategySignals,
  ensureCryptoMarketStream,
  gatherCryptoMomentumSignals,
  gatherStocktwitsSignals,
  gatherTechnicalSnapshots,
  getBrokerSnapshot,
} from './data-sources'
import { type ActivityLogger, createActivityLogger } from './logger'
import type { Config, Costs, LogEntry, Position, Signal } from './types'
import { getErrorMessage } from './utils'

export type SyncStatus = {
  lastSyncRun: number
  lastSyncOk: boolean
  lastSyncError: string | null
  positionsSynced: number
  snapshotCreated: boolean
  accountSynced: boolean
}

export type AnalystStatus = {
  lastRun: number
  lastOk: boolean
  lastError: string | null
  inFlight: boolean
}

export type CryptoCycleStatus = {
  lastRun: number
  lastOk: boolean
  lastError: string | null
  inFlight: boolean
}

export type Orchestrator = {
  config: Config
  logger: ActivityLogger
  connect: () => Promise<boolean>
  getAccountState: () => Promise<{
    account: unknown
    positions: Position[]
    clock: { is_open?: boolean } | null
  }>
  runSyncCycle: () => Promise<void>
  run: () => Promise<void>
  getStatus: () => {
    config: Config
    signals: Signal[]
    logs: LogEntry[]
    costs: Costs
    lastAnalystRun: number
    signalResearch: Record<string, never>
    positionResearch: Record<string, never>
    stalenessAnalysis: Record<string, never>
    positionTracking: Record<string, never>
    optionsEnabled: boolean
    sync: SyncStatus
    analyst: AnalystStatus
    cryptoCycle: CryptoCycleStatus
  }
}

function getConvexUrl(): string | null {
  const url = process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL
  return url ? String(url) : null
}

export function createOrchestrator(): Orchestrator {
  const logger = createActivityLogger()
  let config = loadConfig()

  const convexUrl = getConvexUrl()
  const convex = convexUrl ? createConvexClient(convexUrl) : null
  let signalCache: Signal[] = []
  let technicalSnapshotCount = 0

  let syncStatus: SyncStatus = {
    lastSyncRun: 0,
    lastSyncOk: false,
    lastSyncError: convex ? null : 'Missing CONVEX_URL (or NEXT_PUBLIC_CONVEX_URL)',
    positionsSynced: 0,
    snapshotCreated: false,
    accountSynced: false,
  }
  let analystStatus: AnalystStatus = {
    lastRun: 0,
    lastOk: false,
    lastError: null,
    inFlight: false,
  }
  let cryptoCycleStatus: CryptoCycleStatus = {
    lastRun: 0,
    lastOk: false,
    lastError: null,
    inFlight: false,
  }

  async function connect() {
    ensureCryptoMarketStream(config.crypto_symbols || [])
    return true
  }

  async function getAccountState(): Promise<{
    account: unknown
    positions: Position[]
    clock: { is_open?: boolean } | null
  }> {
    return getBrokerSnapshot()
  }

  async function runSyncCycle() {
    const startedAt = Date.now()

    if (!convex) {
      syncStatus = {
        ...syncStatus,
        lastSyncRun: startedAt,
        lastSyncOk: false,
        lastSyncError: 'Missing CONVEX_URL (or NEXT_PUBLIC_CONVEX_URL)',
        positionsSynced: 0,
        snapshotCreated: false,
        accountSynced: false,
      }
      logger.log('SyncWorker', 'sync_skipped', { reason: syncStatus.lastSyncError })
      return
    }

    try {
      const { account, positions, clock } = await getAccountState()
      const [equitySignals, cryptoSignals] = await Promise.all([
        gatherStocktwitsSignals(config),
        gatherCryptoMomentumSignals(config),
      ])
      const baseSignals = [...equitySignals, ...cryptoSignals]
      const technicalSnapshots = await gatherTechnicalSnapshots(
        config,
        baseSignals.map((signal) => signal.symbol)
      )
      technicalSnapshotCount = technicalSnapshots.length
      const strategySignals = buildSimpleStrategySignals(technicalSnapshots)
      signalCache = [...baseSignals, ...strategySignals]

      const result = await syncAccountStateToConvex({
        convex,
        account,
        positions,
        startingEquity: config.starting_equity || 100000,
        now: startedAt,
      })
      await syncMarketClockToConvex({ convex, clock, now: startedAt })
      await syncSignalsToConvex({ convex, signals: signalCache, now: startedAt })
      await syncTechnicalIndicatorsToConvex({
        convex,
        snapshots: technicalSnapshots,
      })

      syncStatus = {
        lastSyncRun: startedAt,
        lastSyncOk: true,
        lastSyncError: null,
        positionsSynced: result.positionsSynced,
        snapshotCreated: result.snapshotCreated,
        accountSynced: result.accountSynced,
      }

      logger.log('SyncWorker', 'sync_ok', {
        positionsSynced: result.positionsSynced,
        snapshotCreated: result.snapshotCreated,
        accountSynced: result.accountSynced,
        signalsSynced: signalCache.length,
        technicalsSynced: technicalSnapshotCount,
      })
    } catch (err) {
      syncStatus = {
        lastSyncRun: startedAt,
        lastSyncOk: false,
        lastSyncError: getErrorMessage(err),
        positionsSynced: 0,
        snapshotCreated: false,
        accountSynced: false,
      }

      logger.log('SyncWorker', 'sync_failed', {
        error: syncStatus.lastSyncError,
      })
      technicalSnapshotCount = 0
    }
  }

  async function withTimeout<T>(promise: Promise<T>, label: string, timeoutMs: number): Promise<T> {
    let timeoutId: ReturnType<typeof setTimeout> | undefined
    try {
      return await Promise.race([
        promise,
        new Promise<never>((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error(`${label}_timeout`)), timeoutMs)
        }),
      ])
    } finally {
      if (timeoutId) clearTimeout(timeoutId)
    }
  }

  async function runTradingDecisionCycle(trigger: 'startup' | 'interval') {
    if (!convex) return
    if (analystStatus.inFlight) return

    analystStatus = { ...analystStatus, inFlight: true }
    const startedAt = Date.now()

    try {
      const tradingAgentResult = await withTimeout(
        convex.action('system/agent:runCycle', {}),
        'trading_agent_cycle',
        30_000
      )

      analystStatus = {
        lastRun: startedAt,
        lastOk: true,
        lastError: null,
        inFlight: false,
      }

      logger.log('AnalystWorker', 'analyst_cycle_ok', {
        trigger,
        tradingAgentResult,
      })
    } catch (err) {
      const error = getErrorMessage(err)
      analystStatus = {
        lastRun: startedAt,
        lastOk: false,
        lastError: error,
        inFlight: false,
      }
      logger.log('AnalystWorker', 'analyst_cycle_failed', { trigger, error })
    }
  }

  async function runCryptoExecutionCycle(trigger: 'startup' | 'interval') {
    if (!convex) return
    if (cryptoCycleStatus.inFlight) return

    cryptoCycleStatus = { ...cryptoCycleStatus, inFlight: true }
    const startedAt = Date.now()

    try {
      const cryptoResult = await withTimeout(
        convex.action('trading/cryptoAgent:runCryptoTrading', {}),
        'crypto_cycle',
        10_000
      )

      cryptoCycleStatus = {
        lastRun: startedAt,
        lastOk: true,
        lastError: null,
        inFlight: false,
      }

      logger.log('CryptoWorker', 'crypto_cycle_ok', { trigger, cryptoResult })
    } catch (err) {
      const error = getErrorMessage(err)
      cryptoCycleStatus = {
        lastRun: startedAt,
        lastOk: false,
        lastError: error,
        inFlight: false,
      }
      logger.log('CryptoWorker', 'crypto_cycle_failed', { trigger, error })
    }
  }

  async function run() {
    if (!(await connect())) {
      console.error('Failed to initialize worker data sources')
      process.exit(1)
    }

    saveConfig(config)

    await runSyncCycle()
    void runTradingDecisionCycle('startup')
    void runCryptoExecutionCycle('startup')

    setInterval(async () => {
      await runSyncCycle()
    }, config.data_poll_interval_ms)

    setInterval(() => {
      void runTradingDecisionCycle('interval')
    }, config.analyst_interval_ms)

    const cryptoLoopIntervalMs = Math.max(5_000, Math.min(config.analyst_interval_ms, 15_000))
    setInterval(() => {
      void runCryptoExecutionCycle('interval')
    }, cryptoLoopIntervalMs)

    setInterval(() => {
      logger.save()
      saveConfig(config)
    }, 60_000)
  }

  function getStatus() {
    return {
      config,
      signals: signalCache,
      logs: logger.getRecentLogs(100),
      costs: logger.getCosts(),
      lastAnalystRun: analystStatus.lastRun,
      signalResearch: {},
      positionResearch: {},
      stalenessAnalysis: {},
      positionTracking: {},
      optionsEnabled: false,
      sync: syncStatus,
      analyst: analystStatus,
      cryptoCycle: cryptoCycleStatus,
    }
  }

  return {
    get config() {
      return config
    },
    set config(nextConfig: Config) {
      config = nextConfig
    },
    logger,
    connect,
    getAccountState,
    runSyncCycle,
    run,
    getStatus,
  }
}
