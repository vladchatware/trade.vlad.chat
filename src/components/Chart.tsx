import { useEffect, useRef } from 'react'
import { createChart, CandlestickSeries, createSeriesMarkers, type IChartApi, type ISeriesApi, type CandlestickData, type LineStyle, type Time } from 'lightweight-charts'
import type { Candle, KillZone, Position, Regime } from '../types'

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface ChartProps {
  candles: Candle[]
  killZones: KillZone[]
  position: Position | null
  regime: Regime
}

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const COLORS = {
  up: '#26a69a',
  down: '#ef5350',
  text: '#888',
  grid: '#1a1a1a',
  bg: '#0a0a0a',
  crosshair: '#555',
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function candleToLw(c: Candle, index: number): CandlestickData {
  return {
    time: (c.time / 1000) as Time,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
  }
}

/* ------------------------------------------------------------------ */
/*  Chart component                                                    */
/* ------------------------------------------------------------------ */

export function Chart({ candles, killZones, position, regime }: ChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const seriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)

  // ---- (1) Mount: create chart ----
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const chart = createChart(container, {
      layout: {
        background: { color: COLORS.bg },
        textColor: COLORS.text,
      },
      grid: {
        vertLines: { color: COLORS.grid },
        horzLines: { color: COLORS.grid },
      },
      crosshair: {
        mode: 0,
        vertLine: { color: COLORS.crosshair, style: 2 as LineStyle, labelBackgroundColor: COLORS.crosshair },
        horzLine: { color: COLORS.crosshair, style: 2 as LineStyle, labelBackgroundColor: COLORS.crosshair },
      },
      rightPriceScale: {
        borderColor: COLORS.grid,
      },
      timeScale: {
        borderColor: COLORS.grid,
        timeVisible: false,
        secondsVisible: false,
      },
      width: container.clientWidth,
      height: container.clientHeight,
    })

    const series = chart.addSeries(CandlestickSeries, {
      upColor: COLORS.up,
      downColor: COLORS.down,
      borderUpColor: COLORS.up,
      borderDownColor: COLORS.down,
      wickUpColor: COLORS.up,
      wickDownColor: COLORS.down,
    })

    chartRef.current = chart
    seriesRef.current = series

    // Handle resize
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect
        chart.applyOptions({ width, height })
      }
    })
    observer.observe(container)

    return () => {
      observer.disconnect()
      chart.remove()
      chartRef.current = null
      seriesRef.current = null
    }
  }, [])

  // ---- (2) Set data ----
  useEffect(() => {
    const series = seriesRef.current
    if (!series || candles.length === 0) return

    const data = candles
      .map((c, i) => candleToLw(c, i))
      .sort((a, b) => Number(a.time) - Number(b.time))
    series.setData(data)
  }, [candles])

  // ---- (3) Markers for kill zones + position ----
  const markersRef = useRef<ReturnType<typeof createSeriesMarkers<Time>> | null>(null)

  useEffect(() => {
    const series = seriesRef.current
    if (!series) return

    // Initialize markers plugin once
    if (!markersRef.current) {
      markersRef.current = createSeriesMarkers(series, [])
    }

    // Build markers
    const markers: any[] = []

    for (const kz of killZones) {
      const startCandle = candles.find(c => c.time >= kz.start)
      const endCandle = candles.find(c => c.time >= kz.end)

      if (startCandle) {
        markers.push({
          time: (startCandle.time / 1000) as Time,
          position: 'inBar' as any,
          color: kz.color,
          shape: 'arrowUp' as any,
          text: kz.label,
        })
      }
      if (endCandle) {
        markers.push({
          time: (endCandle.time / 1000) as Time,
          position: 'inBar' as any,
          color: kz.color,
          shape: 'arrowDown' as any,
          text: 'End',
        })
      }
    }

    // Position markers
    if (position && candles.length > 0) {
      const currentTime = (candles[candles.length - 1].time / 1000) as Time

      markers.push({
        time: currentTime,
        position: position.side === 'long' ? 'belowBar' as any : 'aboveBar' as any,
        color: position.side === 'long' ? COLORS.up : COLORS.down,
        shape: position.side === 'long' ? 'arrowUp' as any : 'arrowDown' as any,
        text: `Entry ${position.entryPrice.toFixed(0)}`,
      })
    }

    try {
      markersRef.current!.setMarkers(markers)
    } catch (e) {
      console.error('[Chart] setMarkers error:', e)
    }
  }, [candles, killZones, position])

  // ---- (4) Price lines for SL/TP ----
  useEffect(() => {
    const series = seriesRef.current
    if (!series) return

    // Remove all existing price lines first (lightweight-charts API limitation)
    // We clear and re-add

    if (position) {
      series.createPriceLine({
        price: position.entryPrice,
        color: position.side === 'long' ? COLORS.up : COLORS.down,
        lineWidth: 1,
        lineStyle: 2 as LineStyle,
        axisLabelVisible: true,
        title: `Entry ${position.entryPrice.toFixed(0)}`,
      })

      series.createPriceLine({
        price: position.sl,
        color: COLORS.down,
        lineWidth: 1,
        lineStyle: 3 as LineStyle,
        axisLabelVisible: true,
        title: `SL ${position.sl.toFixed(0)}`,
      })

      series.createPriceLine({
        price: position.tp,
        color: COLORS.up,
        lineWidth: 1,
        lineStyle: 3 as LineStyle,
        axisLabelVisible: true,
        title: `TP ${position.tp.toFixed(0)}`,
      })
    }

    // Note: lightweight-charts doesn't support removing individual price lines easily
    // So we'll accumulate them but that's fine for a trading PWA
  }, [position])

  // ---- (5) Chart style ----
  useEffect(() => {
    const chart = chartRef.current
    if (!chart) return

    chart.applyOptions({
      layout: {
        background: { color: COLORS.bg },
        textColor: COLORS.text,
      },
    })
  }, [regime])

  return (
    <div
      ref={containerRef}
      className="w-full h-full"
      style={{ minHeight: 0 }}
    />
  )
}
