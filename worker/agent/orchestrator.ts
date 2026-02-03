import { loadConfig, saveConfig } from './config'
import {
  createConvexClient,
  syncAccountStateToConvex,
  syncMarketClockToConvex,
  syncSignalsToConvex,
} from './convex-sync'
import { gatherStocktwitsSignals, getBrokerSnapshot } from './data-sources'
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

  let syncStatus: SyncStatus = {
    lastSyncRun: 0,
    lastSyncOk: false,
    lastSyncError: convex ? null : 'Missing CONVEX_URL (or NEXT_PUBLIC_CONVEX_URL)',
    positionsSynced: 0,
    snapshotCreated: false,
    accountSynced: false,
  }

  async function connect() {
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
      signalCache = await gatherStocktwitsSignals(config)

      const result = await syncAccountStateToConvex({
        convex,
        account,
        positions,
        startingEquity: config.starting_equity || 100000,
        now: startedAt,
      })
      await syncMarketClockToConvex({ convex, clock, now: startedAt })
      await syncSignalsToConvex({ convex, signals: signalCache, now: startedAt })

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
    }
  }

  async function run() {
    if (!(await connect())) {
      console.error('Failed to initialize worker data sources')
      process.exit(1)
    }

    saveConfig(config)

    await runSyncCycle()

    setInterval(async () => {
      await runSyncCycle()
    }, config.data_poll_interval_ms)

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
      lastAnalystRun: syncStatus.lastSyncRun,
      signalResearch: {},
      positionResearch: {},
      stalenessAnalysis: {},
      positionTracking: {},
      optionsEnabled: false,
      sync: syncStatus,
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
