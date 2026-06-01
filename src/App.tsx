import { useState, useEffect } from 'react'
import { Chart } from './components/Chart'
import { TradeOverlay } from './components/TradeOverlay'
import { StartPauseButton } from './components/StartPauseButton'
import { PositionCard } from './components/PositionCard'
import { LiquidationScreen } from './components/LiquidationScreen'
import { TradeHistory } from './components/TradeHistory'
import { ErrorBoundary } from './components/ErrorBoundary'
import { useCandleStream } from './hooks/useCandleStream'
import { useRegimeSignal } from './hooks/useRegimeSignal'
import { useTrade } from './hooks/useTrade'
import { useTradeStream } from './hooks/useTradeStream'
import { getActiveKillZones } from './lib/killZones'
import type { KillZone, Regime } from './types'

export default function App() {
  const [isRunning, setIsRunning] = useState(false)
  const signal = useRegimeSignal()
  const [killZones, setKillZones] = useState<KillZone[]>([])
  // regime comes from the relay WebSocket; falls back to 'sideways' before first signal
  const regime: Regime = signal.regime
  const candles = useCandleStream('btcusdt', '5m')
  const { position, balance, highScore, liquidated, trades, handleTap, updatePrice, restart } = useTrade()
  const strategyTrades = useTradeStream()

  useEffect(() => {
    setKillZones(getActiveKillZones())
    const interval = setInterval(() => {
      setKillZones(getActiveKillZones())
    }, 60_000)
    return () => clearInterval(interval)
  }, [])

  // Update unrealized PnL and auto-trigger SL/TP on each new candle
  useEffect(() => {
    if (candles.length > 0 && position) {
      updatePrice(candles[candles.length - 1].close)
    }
  }, [candles, position?.entryPrice])

  const onTap = () => {
    if (candles.length === 0 || !isRunning || liquidated) return
    handleTap(candles[candles.length - 1].close, regime)
  }

  return (
    <div className="relative w-full h-dvh bg-black overflow-hidden">
      {/* Balance scoreboard — floats on top of chart */}
      <div className="absolute top-2 left-0 right-0 z-20 flex justify-center pointer-events-none">
        <div className="text-center">
          <div className="text-2xl font-bold font-mono text-white tracking-tight">
            ${balance.toFixed(2)}
          </div>
          <div className="text-[9px] text-white/25 tracking-widest uppercase mt-0.5">
            Balance · Best ${highScore.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Chart — full screen, edge to edge */}
      <div className="absolute inset-0">
        <ErrorBoundary>
          <Chart candles={candles} killZones={killZones} position={position} regime={regime} />
        </ErrorBoundary>
      </div>

      {/* Touch overlay — always visible, gated by isRunning */}
      {!liquidated && (
        <TradeOverlay onTap={onTap} hasPosition={position !== null} regime={regime} paused={!isRunning} />
      )}

      {/* Position card */}
      {position && !liquidated && (
        <div className="absolute bottom-16 left-4 right-4 z-20">
          <PositionCard position={position} balance={balance} />
        </div>
      )}

      {/* Liquidation = death screen */}
      {liquidated && (
        <LiquidationScreen balance={balance} highScore={highScore} onRestart={restart} />
      )}

      {/* Trade history toggle — merge PWA + strategy trades */}
      <TradeHistory trades={[...trades, ...strategyTrades]} />

      {/* Bottom bar: Start/Pause + signal status */}
      <div className="absolute bottom-3 left-4 right-4 z-20 flex justify-center">
        <StartPauseButton
          isRunning={isRunning}
          onToggle={() => setIsRunning(r => !r)}
          signalConnected={signal.connected}
          regime={regime}
          alignmentScore={signal.alignmentScore}
        />
      </div>
    </div>
  )
}
