// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Config, Position, Signal } from './types'

const mocks = vi.hoisted(() => {
  const logger = {
    save: vi.fn(),
    log: vi.fn(),
    addCost: vi.fn(),
    getRecentLogs: vi.fn().mockReturnValue([]),
    getCosts: vi.fn().mockReturnValue({ total: 0, today: 0, calls: 0 }),
  }

  const config: Config = {
    mcp_url: 'http://localhost:3000/api/mcp',
    data_poll_interval_ms: 60_000,
    analyst_interval_ms: 120_000,
    max_position_value: 2000,
    max_positions: 3,
    min_sentiment_score: 0.4,
    min_volume: 10,
    take_profit_pct: 8,
    stop_loss_pct: 4,
    position_size_pct_of_cash: 20,
    crypto_enabled: true,
    crypto_symbols: ['BTC/USD', 'ETH/USD'],
    crypto_momentum_threshold: 2,
    crypto_max_position_value: 1000,
    crypto_take_profit_pct: 10,
    crypto_stop_loss_pct: 5,
    llm_model: 'x',
    llm_analyst_model: 'y',
    llm_max_tokens: 500,
    starting_equity: 100000,
  }

  return {
    logger,
    config,
    positions: [] as Position[],
    account: {
      equity: '100000',
      cash: '50000',
      buying_power: '75000',
      portfolio_value: '100000',
    },
    clock: { is_open: true, next_open: '', next_close: '' },
    signals: [] as Signal[],
    syncAccount: vi.fn().mockResolvedValue({
      positionsSynced: 0,
      snapshotCreated: true,
      accountSynced: true,
    }),
    syncClock: vi.fn().mockResolvedValue(undefined),
    syncSignals: vi.fn().mockResolvedValue(undefined),
    getBrokerSnapshot: vi.fn(),
    gatherSignals: vi.fn(),
  }
})

vi.mock('./logger', () => ({
  createActivityLogger: vi.fn(() => mocks.logger),
}))

vi.mock('./config', () => ({
  loadConfig: vi.fn(() => ({ ...mocks.config })),
  saveConfig: vi.fn(),
}))

vi.mock('./convex-sync', () => ({
  createConvexClient: vi.fn(() => ({ mutation: vi.fn() })),
  syncAccountStateToConvex: mocks.syncAccount,
  syncMarketClockToConvex: mocks.syncClock,
  syncSignalsToConvex: mocks.syncSignals,
}))

vi.mock('./data-sources', () => ({
  getBrokerSnapshot: mocks.getBrokerSnapshot,
  gatherStocktwitsSignals: mocks.gatherSignals,
}))

import { createActivityLogger } from './logger'
import { createOrchestrator } from './orchestrator'

describe('createOrchestrator (ingest/sync)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.positions = []
    mocks.signals = []
    mocks.getBrokerSnapshot.mockResolvedValue({
      account: mocks.account,
      positions: mocks.positions,
      clock: mocks.clock,
    })
    mocks.gatherSignals.mockResolvedValue(mocks.signals)
    process.env.CONVEX_URL = 'https://demo.convex.cloud'
  })

  it('creates logger once and reuses it across method calls', async () => {
    const orchestrator = createOrchestrator()

    await orchestrator.runSyncCycle()
    orchestrator.getStatus()
    await orchestrator.getAccountState()

    expect(createActivityLogger).toHaveBeenCalledTimes(1)
  })

  it('syncs broker snapshot + market clock + stocktwits signals', async () => {
    const orchestrator = createOrchestrator()
    mocks.signals = [
      {
        symbol: 'AAPL',
        source: 'stocktwits',
        sentiment: 0.7,
        volume: 100,
        bullish: 20,
        bearish: 2,
        reason: 'strong',
      },
    ]
    mocks.gatherSignals.mockResolvedValue(mocks.signals)

    await orchestrator.runSyncCycle()

    expect(mocks.syncAccount).toHaveBeenCalledTimes(1)
    expect(mocks.syncClock).toHaveBeenCalledTimes(1)
    expect(mocks.syncSignals).toHaveBeenCalledWith(
      expect.objectContaining({
        signals: mocks.signals,
      })
    )

    const status = orchestrator.getStatus()
    expect(status.signals).toEqual(mocks.signals)
    expect(mocks.logger.log).toHaveBeenCalledWith('SyncWorker', 'sync_ok', {
      positionsSynced: 0,
      snapshotCreated: true,
      accountSynced: true,
      signalsSynced: 1,
    })
  })

  it('does not call trade-buy or trade-sell in ingest mode', async () => {
    const orchestrator = createOrchestrator()

    await orchestrator.runSyncCycle()

    const loggedPayload = JSON.stringify(mocks.logger.log.mock.calls)
    expect(loggedPayload.includes('trade-buy')).toBe(false)
    expect(loggedPayload.includes('trade-sell')).toBe(false)
  })
})
