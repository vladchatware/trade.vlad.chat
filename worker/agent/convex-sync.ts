import { ConvexHttpClient } from 'convex/browser'
import type { Position, Signal, TechnicalSnapshot } from './types'

type ConvexClient = {
  mutation: (...args: unknown[]) => Promise<unknown>
  action: (...args: unknown[]) => Promise<unknown>
}

type AccountLike = {
  equity?: number | string
  cash?: number | string
  buying_power?: number | string
  buyingPower?: number | string
  portfolio_value?: number | string
  portfolioValue?: number | string
}

export type SyncResult = {
  positionsSynced: number
  snapshotCreated: boolean
  accountSynced: boolean
}

const ACCOUNT_SYNC_MUTATION = 'portfolio/account:updateFromWebSocket'
const PORTFOLIO_SNAPSHOT_MUTATION = 'portfolio/snapshots:createSnapshot'
const POSITION_SYNC_MUTATION = 'portfolio/positions:updateFromWebSocket'
const POSITION_HISTORY_MUTATION = 'portfolio/positionHistory:upsert'
const POSITIONS_CLEANUP_MUTATION = 'portfolio/positions:cleanupClosed'
const MARKET_CLOCK_UPSERT_MUTATION = 'portfolio/marketClock:upsert'
const SIGNAL_CREATE_MUTATION = 'signals/queries:create'
const TECHNICAL_INDICATOR_UPSERT_MUTATION = 'signals/technicalIndicators:upsertFromWorker'

export function createConvexClient(url: string): ConvexClient {
  return new ConvexHttpClient(url) as unknown as ConvexClient
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = typeof value === 'number' ? value : Number.parseFloat(String(value ?? fallback))
  return Number.isFinite(parsed) ? parsed : fallback
}

export function toConvexPositionPayload(position: Position) {
  return {
    symbol: position.symbol,
    qty: toNumber(position.qty),
    avgEntryPrice: toNumber(position.avg_entry_price ?? position.avgEntryPrice),
    currentPrice: toNumber(position.current_price ?? position.currentPrice ?? position.price),
    marketValue: toNumber(position.market_value),
    unrealizedPl: toNumber(position.unrealized_pl),
    unrealizedPlpc: toNumber(position.unrealized_plpc),
  }
}

export function toConvexAccountPayload(account: unknown) {
  const data = (account ?? {}) as AccountLike
  return {
    equity: toNumber(data.equity),
    cash: toNumber(data.cash),
    buyingPower: toNumber(data.buying_power ?? data.buyingPower),
    portfolioValue: toNumber(data.portfolio_value ?? data.portfolioValue ?? data.equity),
  }
}

export async function syncAccountStateToConvex({
  convex,
  account,
  positions,
  startingEquity,
  now = Date.now(),
}: {
  convex: ConvexClient
  account: unknown
  positions: Position[]
  startingEquity: number
  now?: number
}): Promise<SyncResult> {
  let accountSynced = false
  let snapshotCreated = false

  if (account) {
    const accountPayload = toConvexAccountPayload(account)
    await convex.mutation(ACCOUNT_SYNC_MUTATION, accountPayload)
    accountSynced = true

    const pl = accountPayload.equity - startingEquity
    const plPct = startingEquity > 0 ? (pl / startingEquity) * 100 : 0
    await convex.mutation(PORTFOLIO_SNAPSHOT_MUTATION, {
      equity: accountPayload.equity,
      pl,
      plPct,
    })
    snapshotCreated = true
  }

  await Promise.all(
    positions.map(async (position) => {
      const payload = toConvexPositionPayload(position)
      await convex.mutation(POSITION_SYNC_MUTATION, payload)
      await convex.mutation(POSITION_HISTORY_MUTATION, {
        symbol: payload.symbol,
        price: payload.currentPrice,
        timestamp: now,
      })
    })
  )

  await convex.mutation(POSITIONS_CLEANUP_MUTATION, {
    activeSymbols: positions.map((position) => position.symbol),
  })

  return {
    positionsSynced: positions.length,
    snapshotCreated,
    accountSynced,
  }
}

export async function syncMarketClockToConvex({
  convex,
  clock,
  now = Date.now(),
}: {
  convex: ConvexClient
  clock: { is_open?: boolean; next_open?: string; next_close?: string; timestamp?: string } | null
  now?: number
}) {
  if (!clock) return

  await convex.mutation(MARKET_CLOCK_UPSERT_MUTATION, {
    isOpen: Boolean(clock.is_open),
    nextOpen: String(clock.next_open ?? ''),
    nextClose: String(clock.next_close ?? ''),
    timestamp: now,
  })
}

export async function syncSignalsToConvex({
  convex,
  signals,
  now = Date.now(),
}: {
  convex: ConvexClient
  signals: Signal[]
  now?: number
}) {
  await Promise.all(
    signals.map((signal) =>
      convex.mutation(SIGNAL_CREATE_MUTATION, {
        symbol: signal.symbol,
        source: signal.source,
        sentiment: signal.sentiment,
        volume: signal.volume,
        reason: signal.reason,
        bullish: signal.bullish,
        bearish: signal.bearish,
        isCrypto: signal.isCrypto,
        momentum: signal.momentum,
        price: signal.price,
        timestamp: now,
      })
    )
  )
}

export async function syncTechnicalIndicatorsToConvex({
  convex,
  snapshots,
}: {
  convex: ConvexClient
  snapshots: TechnicalSnapshot[]
}) {
  await Promise.all(
    snapshots.map((snapshot) =>
      convex.mutation(TECHNICAL_INDICATOR_UPSERT_MUTATION, {
        symbol: snapshot.symbol,
        market: snapshot.market,
        timeframe: snapshot.timeframe,
        source: snapshot.source,
        price: snapshot.price,
        momentumPct: snapshot.momentumPct,
        volume: snapshot.volume,
        sma20: snapshot.sma20 ?? undefined,
        sma50: snapshot.sma50 ?? undefined,
        ema12: snapshot.ema12 ?? undefined,
        ema26: snapshot.ema26 ?? undefined,
        rsi14: snapshot.rsi14 ?? undefined,
        timestamp: snapshot.timestamp,
      })
    )
  )
}
