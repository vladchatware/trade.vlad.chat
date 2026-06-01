import { useState, useCallback, useRef } from 'react'
import type { Position, Regime, TradeRecord, TradeCloseReason } from '../types'

const INITIAL_BALANCE = 12.94 // USDT — matches Binance Futures wallet
const STORAGE_KEY = 'flappy-trade-history'
const HIGH_SCORE_KEY = 'flappy-high-score'

function loadHistory(): TradeRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? JSON.parse(raw) : []
  } catch { return [] }
}

function saveHistory(trades: TradeRecord[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trades))
  } catch {}
}

function loadHighScore(): number {
  try {
    const raw = localStorage.getItem(HIGH_SCORE_KEY)
    return raw ? parseFloat(raw) : INITIAL_BALANCE
  } catch { return INITIAL_BALANCE }
}

function saveHighScore(score: number) {
  try {
    localStorage.setItem(HIGH_SCORE_KEY, String(score))
  } catch {}
}

export function useTrade() {
  const [position, setPosition] = useState<Position | null>(null)
  const [balance, setBalance] = useState(INITIAL_BALANCE)
  const [liquidated, setLiquidated] = useState(false)
  const [highScore, setHighScore] = useState(loadHighScore)
  const [trades, setTrades] = useState<TradeRecord[]>(loadHistory)
  const entryTimeRef = useRef<number>(0)
  const tradeIdCounter = useRef(trades.length)

  function recordClose(exitPrice: number, pnl: number, newBalance: number, reason: TradeCloseReason) {
    const entryPrice = position!.entryPrice
    const record: TradeRecord = {
      id: `t${++tradeIdCounter.current}`,
      side: position!.side,
      entryPrice,
      exitPrice,
      margin: position!.margin,
      pnl,
      balanceAfter: newBalance,
      reason,
      openedAt: entryTimeRef.current,
      closedAt: Date.now(),
      source: 'pwa',
    }
    setTrades(prev => {
      const updated = [record, ...prev].slice(0, 100) // keep last 100
      saveHistory(updated)
      return updated
    })
  }

  const openPosition = useCallback((price: number, regime: Regime) => {
    if (regime === 'sideways' || position || liquidated) return
    const margin = balance * 0.1 // 10% of balance per trade
    const leverage = 5
    const positionSize = margin * leverage
    const slPct = 0.005 // 0.5% stop
    const tpPct = 0.015 // 1.5% take profit
    const isLong = regime === 'bullish'

    setPosition({
      side: isLong ? 'long' : 'short',
      entryPrice: price,
      currentPrice: price,
      sl: isLong ? price * (1 - slPct) : price * (1 + slPct),
      tp: isLong ? price * (1 + tpPct) : price * (1 - tpPct),
      margin,
      unrealizedPnl: 0,
    })
    entryTimeRef.current = Date.now()
  }, [position, balance, liquidated])

  const closePosition = useCallback((price: number) => {
    if (!position) return
    const isLong = position.side === 'long'
    const pnlRaw = isLong
      ? (price - position.entryPrice) / position.entryPrice * position.margin * 5
      : (position.entryPrice - price) / position.entryPrice * position.margin * 5
    const newBalance = balance + pnlRaw
    setBalance(newBalance)
    if (newBalance > highScore) {
      setHighScore(newBalance)
      saveHighScore(newBalance)
    }
    if (newBalance <= 0) setLiquidated(true)
    recordClose(price, pnlRaw, newBalance, 'tap')
    setPosition(null)
  }, [position, balance, highScore])

  // Called each tick to update unrealized PnL and auto-close on SL/TP hit
  const updatePrice = useCallback((price: number) => {
    if (!position) return
    const isLong = position.side === 'long'

    // Check SL hit
    if (isLong ? price <= position.sl : price >= position.sl) {
      // Auto-close at SL — loss is margin * 0.5% * 5 = 2.5% of margin
      const loss = position.margin * 0.005 * 5 // SL pct * leverage * margin
      const newBalance = balance - loss
      setBalance(newBalance)
      if (newBalance <= 0) setLiquidated(true)
      recordClose(price, -loss, newBalance, 'sl')
      setPosition(null)
      return
    }

    // Check TP hit
    if (isLong ? price >= position.tp : price <= position.tp) {
      // Auto-close at TP — profit is margin * 1.5% * 5 = 7.5% of margin
      const profit = position.margin * 0.015 * 5
      const newBalance = balance + profit
      setBalance(newBalance)
      if (newBalance > highScore) {
        setHighScore(newBalance)
        saveHighScore(newBalance)
      }
      recordClose(price, profit, newBalance, 'tp')
      setPosition(null)
      return
    }

    const pnl = isLong
      ? (price - position.entryPrice) / position.entryPrice * position.margin * 5
      : (position.entryPrice - price) / position.entryPrice * position.margin * 5
    setPosition(prev => prev ? { ...prev, currentPrice: price, unrealizedPnl: pnl } : null)
  }, [position, balance, highScore])

  const handleTap = useCallback((price: number, regime: Regime) => {
    if (liquidated) {
      // Restart
      setBalance(INITIAL_BALANCE)
      setLiquidated(false)
      setPosition(null)
      return
    }
    if (position) closePosition(price)
    else openPosition(price, regime)
  }, [position, liquidated, openPosition, closePosition])

  const restart = useCallback(() => {
    setBalance(INITIAL_BALANCE)
    setHighScore(loadHighScore())
    setLiquidated(false)
    setPosition(null)
  }, [])

  return { position, balance, highScore, liquidated, trades, handleTap, updatePrice, restart, openPosition, closePosition }
}
