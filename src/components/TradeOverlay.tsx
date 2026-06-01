import { useState, useCallback, useEffect, useRef } from 'react'
import type { Regime } from '../types'

interface TradeOverlayProps {
  onTap: () => void
  hasPosition: boolean
  regime: Regime
  paused?: boolean
}

export function TradeOverlay({ onTap, hasPosition, regime, paused }: TradeOverlayProps) {
  const [flash, setFlash] = useState<'long' | 'short' | 'close' | null>(null)
  const [hasKeyboard, setHasKeyboard] = useState(false)

  // Detect desktop via pointer precision
  useEffect(() => {
    const mq = window.matchMedia('(hover: hover) and (pointer: fine)')
    setHasKeyboard(mq.matches)
    const handler = (e: MediaQueryListEvent) => setHasKeyboard(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  // Keyboard: Space to trade
  const onTapRef = useRef(onTap)
  onTapRef.current = onTap
  const pausedRef = useRef(paused)
  pausedRef.current = paused

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.key === ' ') {
        e.preventDefault()
        if (pausedRef.current) return
        onTapRef.current()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [])

  const handleTouch = useCallback((e: React.MouseEvent | React.TouchEvent) => {
    if (paused) return
    e.preventDefault()
    e.stopPropagation()

    // Determine flash color before onTap mutates state
    const isClose = hasPosition
    const dir = !isClose
      ? regime === 'bullish' ? 'long' : regime === 'bearish' ? 'short' : null
      : 'close'

    if (dir) {
      setFlash(dir as 'long' | 'short' | 'close')
      setTimeout(() => setFlash(null), 250)
    }

    onTap()
  }, [onTap, hasPosition, regime, paused])

  const actionKey = hasKeyboard ? 'SPACE' : 'TAP'

  if (paused) {
    return (
      <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
        <div className="text-center select-none">
          <span className="text-white/15 text-sm font-light tracking-widest">
            ▶ Paused — press Start to trade
          </span>
        </div>
      </div>
    )
  }

  const label = hasPosition
    ? `${actionKey} to close`
    : regime === 'bullish'
    ? `${actionKey} LONG`
    : regime === 'bearish'
    ? `${actionKey} SHORT`
    : 'Waiting for regime...'

  const flashBg = flash === 'long' ? 'bg-green-500/20' : flash === 'short' ? 'bg-red-500/20' : flash === 'close' ? 'bg-white/10' : ''

  return (
    <>
      {/* Flash overlay */}
      {flash && (
        <div
          className={`absolute inset-0 z-10 transition-opacity duration-200 ${flashBg}`}
          style={{ opacity: flash ? 0.6 : 0 }}
        />
      )}

      {/* Touch target */}
      <div
        className="absolute inset-0 z-10 flex items-center justify-center"
        onClick={handleTouch}
        onTouchStart={handleTouch}
      >
        <div className="pointer-events-none text-center select-none">
          {regime === 'sideways' && !hasPosition ? (
            <span className="text-white/20 text-sm font-light tracking-widest">
              {label}
            </span>
          ) : (
            <span
              className={[
                'text-base font-semibold tracking-widest uppercase transition-colors duration-150',
                hasPosition
                  ? 'text-white/50'
                  : regime === 'bullish'
                  ? 'text-green-400/60'
                  : regime === 'bearish'
                  ? 'text-red-400/60'
                  : 'text-white/20',
              ].join(' ')}
            >
              {label}
            </span>
          )}
        </div>
      </div>
    </>
  )
}
