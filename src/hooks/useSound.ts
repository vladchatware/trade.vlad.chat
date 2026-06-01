import { useRef, useCallback } from 'react'

type SoundName = 'open' | 'close' | 'sl' | 'tp' | 'liquidation'

interface SoundConfig {
  freq: number
  duration: number
  volume: number
  type: OscillatorType
}

const SOUNDS: Record<SoundName, SoundConfig> = {
  open:         { freq: 880, duration: 0.1,  volume: 0.15, type: 'triangle' },
  close:        { freq: 660, duration: 0.15, volume: 0.15, type: 'triangle' },
  sl:           { freq: 330, duration: 0.35, volume: 0.25, type: 'sawtooth' },
  tp:           { freq: 1320, duration: 0.25, volume: 0.15, type: 'sine' },
  liquidation:  { freq: 150, duration: 0.7,  volume: 0.35, type: 'sawtooth' },
}

export function useSound() {
  const ctxRef = useRef<AudioContext | null>(null)
  const enabledRef = useRef(true)

  const init = useCallback(() => {
    if (!ctxRef.current) {
      const AC = (window.AudioContext || (window as any).webkitAudioContext)
      ctxRef.current = new AC()
    }
    if (ctxRef.current.state === 'suspended') {
      ctxRef.current.resume()
    }
  }, [])

  const play = useCallback((name: SoundName) => {
    if (!enabledRef.current) return
    try {
      init()
      const ctx = ctxRef.current!
      const cfg = SOUNDS[name]
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = cfg.type
      osc.frequency.setValueAtTime(cfg.freq, ctx.currentTime)
      gain.gain.setValueAtTime(cfg.volume, ctx.currentTime)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + cfg.duration)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start()
      osc.stop(ctx.currentTime + cfg.duration)
    } catch { /* audio not available */ }
  }, [init])

  const toggle = useCallback(() => {
    enabledRef.current = !enabledRef.current
    return enabledRef.current
  }, [])

  return { play, toggle, init }
}
