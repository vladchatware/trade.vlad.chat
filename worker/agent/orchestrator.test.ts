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
    syncTechnicals: vi.fn().mockResolvedValue(undefined),
    convexAction: vi.fn().mockResolvedValue({ status: 'success' }),
    getBrokerSnapshot: vi.fn(),
    gatherSignals: vi.fn(),
    gatherCryptoSignals: vi.fn(),
    gatherTechnicals: vi.fn(),
    buildStrategySignals: vi.fn(),
    ensureCryptoStream: vi.fn(),
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
  createConvexClient: vi.fn(() => ({ mutation: vi.fn(), action: mocks.convexAction })),
  syncAccountStateToConvex: mocks.syncAccount,
  syncMarketClockToConvex: mocks.syncClock,
  syncSignalsToConvex: mocks.syncSignals,
  syncTechnicalIndicatorsToConvex: mocks.syncTechnicals,
}))

vi.mock('./data-sources', () => ({
  ensureCryptoMarketStream: mocks.ensureCryptoStream,
  getBrokerSnapshot: mocks.getBrokerSnapshot,
  gatherStocktwitsSignals: mocks.gatherSignals,
  gatherCryptoMomentumSignals: mocks.gatherCryptoSignals,
  gatherTechnicalSnapshots: mocks.gatherTechnicals,
  buildSimpleStrategySignals: mocks.buildStrategySignals,
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
    mocks.gatherCryptoSignals.mockResolvedValue([])
    mocks.gatherTechnicals.mockResolvedValue([])
    mocks.buildStrategySignals.mockReturnValue([])
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
    mocks.gatherCryptoSignals.mockResolvedValue([
      {
        symbol: 'BTC/USD',
        source: 'crypto_momentum',
        sentiment: 0.3,
        volume: 10,
        bullish: 1,
        bearish: 0,
        reason: 'Momentum +3.00%',
        isCrypto: true,
        momentum: 3,
        price: 60000,
      },
    ])
    mocks.gatherTechnicals.mockResolvedValue([
      {
        symbol: 'BTC/USD',
        market: 'crypto',
        timeframe: 'realtime',
        source: 'worker',
        price: 60000,
        momentumPct: 3,
        volume: 10,
        sma20: 59000,
        sma50: 58000,
        ema12: 59500,
        ema26: 58500,
        rsi14: 32,
        timestamp: Date.now(),
      },
    ])
    mocks.buildStrategySignals.mockReturnValue([
      {
        symbol: 'BTC/USD',
        source: 'worker_simple_strategy',
        sentiment: 0.6,
        volume: 10,
        bullish: 1,
        bearish: 0,
        reason: 'Bullish setup',
        isCrypto: true,
        momentum: 3,
        price: 60000,
      },
    ])

    await orchestrator.runSyncCycle()

    expect(mocks.syncAccount).toHaveBeenCalledTimes(1)
    expect(mocks.syncClock).toHaveBeenCalledTimes(1)
    expect(mocks.syncSignals).toHaveBeenCalledWith(
      expect.objectContaining({
        signals: expect.arrayContaining([
          ...mocks.signals,
          expect.objectContaining({ symbol: 'BTC/USD', isCrypto: true }),
          expect.objectContaining({ source: 'worker_simple_strategy' }),
        ]),
      })
    )
    expect(mocks.syncTechnicals).toHaveBeenCalledWith(
      expect.objectContaining({
        snapshots: expect.arrayContaining([expect.objectContaining({ symbol: 'BTC/USD' })]),
      })
    )

    const status = orchestrator.getStatus()
    expect(status.signals).toHaveLength(3)
    expect(mocks.logger.log).toHaveBeenCalledWith('SyncWorker', 'sync_ok', {
      positionsSynced: 0,
      snapshotCreated: true,
      accountSynced: true,
      signalsSynced: 3,
      technicalsSynced: 1,
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
