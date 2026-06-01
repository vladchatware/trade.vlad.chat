export interface Candle {
  time: number
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export interface KillZone {
  label: string
  start: number
  end: number
  color: string
}

export interface Position {
  side: 'long' | 'short'
  entryPrice: number
  currentPrice: number
  sl: number
  tp: number
  margin: number
  unrealizedPnl: number
}

export type TradeCloseReason = 'tap' | 'sl' | 'tp' | 'liquidation'

export interface TradeRecord {
  id: string
  side: 'long' | 'short'
  entryPrice: number
  exitPrice: number
  margin: number
  pnl: number
  balanceAfter: number
  reason: TradeCloseReason
  openedAt: number
  closedAt: number
  /** 'pwa' = tap-to-trade simulation, 'strategy' = real Binance Futures fill */
  source?: 'pwa' | 'strategy'
  /** Strategy trade details (only when source='strategy') */
  qty?: number
  symbol?: string
  orderType?: string
}

/** Trade event received via WebSocket from the strategy relay. */
export interface StrategyTrade {
  id: string
  side: 'buy' | 'sell'
  direction: 'long' | 'short'
  price: number
  qty: number
  pnl: number
  commission: number
  commissionAsset: string
  status: 'filled' | 'partial'
  timestamp: number
  reason: 'entry' | 'sl' | 'tp'
  symbol: string
  source: 'strategy'
  reduceOnly: boolean
  orderType: string
  orderId: number
  tradeId: number
}

export type Regime = 'bullish' | 'bearish' | 'sideways'
export type TradeMode = 'strategy' | 'touch'
