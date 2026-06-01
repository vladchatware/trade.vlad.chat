import { useState, useEffect, useRef, useMemo } from 'react'
import { Chart } from './components/Chart'
import { TradeOverlay } from './components/TradeOverlay'
import { StartPauseButton } from './components/StartPauseButton'
import { PositionCard } from './components/PositionCard'
import { LiquidationScreen } from './components/LiquidationScreen'
import { TradeHistory } from './components/TradeHistory'
import { ErrorBoundary } from './components/ErrorBoundary'
import { SignalDisplay } from './components/SignalDisplay'
import { useCandleStream } from './hooks/useCandleStream'
import { useRegimeSignal } from './hooks/useRegimeSignal'
import { useTrade } from './hooks/useTrade'
import { useTradeStream } from './hooks/useTradeStream'
import { useSound } from './hooks/useSound'
import { useSRLevels } from './hooks/useSRLevels'
import { useMonteCarlo } from './hooks/useMonteCarlo'
import { getActiveKillZones } from './lib/killZones'
import { DARK, LIGHT, type ThemeColors } from './lib/theme'
import type { KillZone, Regime } from './types'

export default function App() {
  const [themeMode, setThemeMode] = useState<'dark' | 'light'>(
    typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
  )
  const [isRunning, setIsRunning] = useState(false)
  const [tf, setTf] = useState<'5m' | '15m'>('5m')
  const signal = useRegimeSignal()
  const [killZones, setKillZones] = useState<KillZone[]>([])
  const regime: Regime = signal.regime
  const candles = useCandleStream('btcusdt', tf)
  const srLevels = useSRLevels(candles)
  const mcResult = useMonteCarlo(candles)
  const { position, balance, highScore, liquidated, trades, handleTap, updatePrice, restart } = useTrade()
  const strategyTrades = useTradeStream()
  const sound = useSound()
  const [soundEnabled, setSoundEnabled] = useState(true)
  const prevPosRef = useRef(position)

  useEffect(() => {
    setKillZones(getActiveKillZones())
    const interval = setInterval(() => {
      setKillZones(getActiveKillZones())
    }, 60_000)
    return () => clearInterval(interval)
  }, [])

  // Follow system color scheme
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)')
    const handler = (e: MediaQueryListEvent) => setThemeMode(e.matches ? 'dark' : 'light')
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Enrich kill zones with session high/low from candle data
  const killZonesWithHL = useMemo(() =>
    killZones.map(zone => {
      if (candles.length === 0) return zone
      const zoneCandles = candles.filter(c => c.time >= zone.start && c.time < zone.end)
      if (zoneCandles.length === 0) return zone
      return {
        ...zone,
        high: Math.max(...zoneCandles.map(c => c.high)),
        low: Math.min(...zoneCandles.map(c => c.low)),
      }
    }),
    [killZones, candles]
  )

  // Filter S/R by bias: bearish → nearest resistances above, bullish → nearest supports below
  const filteredSr = useMemo(() => {
    if (srLevels.length === 0 || candles.length === 0) return srLevels
    const currentPrice = candles[candles.length - 1].close
    const bias = signal.bias

    if (bias === 'short' || signal.rawRegime?.toLowerCase().includes('down')) {
      // Bearish: closest resistances above price
      return srLevels
        .filter(l => l.type === 'resistance' && l.price > currentPrice)
        .sort((a, b) => a.price - b.price)
        .slice(0, 2)
    } else if (bias === 'long' || signal.rawRegime?.toLowerCase().includes('up')) {
      // Bullish: closest supports below price
      return srLevels
        .filter(l => l.type === 'support' && l.price < currentPrice)
        .sort((a, b) => b.price - a.price)
        .slice(0, 2)
    }
    // Watch-only / sideways: show closest level above (resistance) and below (support)
    const rAbove = srLevels
      .filter(l => l.type === 'resistance' && l.price > currentPrice)
      .sort((a, b) => a.price - b.price)
      .slice(0, 1)
    const sBelow = srLevels
      .filter(l => l.type === 'support' && l.price < currentPrice)
      .sort((a, b) => b.price - a.price)
      .slice(0, 1)
    return [...sBelow, ...rAbove]
  }, [srLevels, signal.bias, signal.rawRegime, candles])

  // Update unrealized PnL and auto-trigger SL/TP on each new candle
  useEffect(() => {
    if (candles.length > 0 && position) {
      updatePrice(candles[candles.length - 1].close)
    }
  }, [candles, position?.entryPrice])

  // Sound effects on trade events
  useEffect(() => {
    if (trades.length === 0) return
    const lastTrade = trades[0]
    switch (lastTrade.reason) {
      case 'sl': sound.play('sl'); break
      case 'tp': sound.play('tp'); break
      case 'tap':
        if (lastTrade.side) sound.play('close')
        break
    }
  }, [trades.length])

  // Liquidation sound
  useEffect(() => {
    if (liquidated) sound.play('liquidation')
  }, [liquidated])

  // Open sound — when a new position appears
  useEffect(() => {
    if (position && !prevPosRef.current) {
      sound.play('open')
    }
    prevPosRef.current = position
  }, [position])

  const onTap = () => {
    if (candles.length === 0 || !isRunning || liquidated) return
    sound.init() // Ensure AudioContext is unlocked (Safari/iOS requirement)
    handleTap(candles[candles.length - 1].close, regime)
  }

  const theme = themeMode === 'dark' ? DARK : LIGHT

  return (
    <div className={`relative w-full h-dvh overflow-hidden ${themeMode === 'light' ? 'bg-white' : 'bg-black'}`}>
      {/* Balance scoreboard — floats on top of chart */}
      <div className="absolute top-2 left-0 right-0 z-20 flex justify-center pointer-events-none">
        <div className="text-center">
          <div
            className="text-2xl font-bold font-mono tracking-tight"
            style={{ color: themeMode === 'dark' ? '#fff' : '#111' }}
          >
            ${balance.toFixed(2)}
          </div>
          <div
            className="text-[9px] tracking-widest uppercase mt-0.5"
            style={{ color: theme.textMuted }}
          >
            Binance · Best ${highScore.toFixed(2)}
          </div>
        </div>
      </div>

      {/* Signal banner — the core of the game */}
      <SignalDisplay
        bias={signal.bias}
        regime={regime}
        rawRegime={signal.rawRegime}
        session={signal.session}
        directions={signal.directions}
        alignmentScore={signal.alignmentScore}
        connected={signal.connected}
        mcResult={mcResult}
        theme={theme}
      />

      {/* Chart — full screen, edge to edge */}
      <div className="absolute inset-0">
        <ErrorBoundary>
          <Chart candles={candles} killZones={killZonesWithHL} position={position} regime={regime} srLevels={filteredSr} mcResult={mcResult} bias={regime} theme={theme} />
        </ErrorBoundary>
      </div>

      {/* Touch overlay — always visible, gated by isRunning */}
      {!liquidated && (
        <TradeOverlay onTap={onTap} hasPosition={position !== null} regime={regime} paused={!isRunning} />
      )}

      {/* Position card */}
      {position && !liquidated && (
        <div className="absolute bottom-16 left-4 right-4 z-20">
          <PositionCard position={position} balance={balance} theme={theme} />
        </div>
      )}

      {/* Liquidation = death screen */}
      {liquidated && (
        <LiquidationScreen balance={balance} highScore={highScore} onRestart={restart} />
      )}

      {/* Trade history toggle — merge PWA + strategy trades */}
      <TradeHistory trades={[...trades, ...strategyTrades]} theme={theme} />

      {/* Bottom bar: Start/Pause + controls */}
      <div className="absolute bottom-3 left-4 right-4 z-20 flex flex-col items-center gap-2">
        {/* Timeframe + Sound controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => setTf(tf === '5m' ? '15m' : '5m')}
            className="px-2 py-0.5 text-[10px] font-mono rounded-full border transition-colors uppercase tracking-wider"
            style={{
              color: theme.textMuted,
              borderColor: theme.textMuted + '44',
            }}
          >
            {tf}
          </button>
          <button
            onClick={() => { const v = sound.toggle(); setSoundEnabled(v); }}
            className={`px-2 py-0.5 text-[10px] rounded-full border transition-all ${
              soundEnabled ? '' : 'opacity-40'
            }`}
            style={{
              color: theme.textMuted,
              borderColor: theme.textMuted + (soundEnabled ? '66' : '22'),
            }}
            title={soundEnabled ? 'Mute' : 'Unmute'}
          >
            ♪
          </button>
        </div>
        <StartPauseButton
          isRunning={isRunning}
          onToggle={() => setIsRunning(r => !r)}
          theme={theme}
        />
      </div>
    </div>
  )
}
