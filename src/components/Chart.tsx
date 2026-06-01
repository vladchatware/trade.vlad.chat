import { useEffect, useRef } from 'react'
import {
  createChart,
  CandlestickSeries,
  LineSeries,
  createSeriesMarkers,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type LineData,
  type LineStyle,
  type Time,
} from 'lightweight-charts'
import type { Candle, KillZone, Position, Regime, SRLevel, MCResult } from '../types'
import { KillZonePrimitive } from './KillZonePrimitive'
import { VolumePrimitive } from '../primitives/VolumePrimitive'
import { SRPrimitive } from '../primitives/SRPrimitive'
import { MCPrimitive } from '../primitives/MCPrimitive'

/* ------------------------------------------------------------------ */
/*  Props                                                              */
/* ------------------------------------------------------------------ */

interface ChartProps {
  candles: Candle[]
  killZones: KillZone[]
  position: Position | null
  regime: Regime
  srLevels: SRLevel[]
  mcResult: MCResult | null
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
  vwap: '#e1e1e1',
  volumeUp: 'rgba(38, 166, 154, 0.5)',
  volumeDown: 'rgba(239, 83, 80, 0.5)',
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function candleToLw(c: Candle): CandlestickData {
  return {
    time: (c.time / 1000) as Time,
    open: c.open,
    high: c.high,
    low: c.low,
    close: c.close,
  }
}

/** Compute VWAP for a rolling window of candles. Returns one value per candle. */
function computeVWAP(candles: Candle[]): (LineData & { candleTime: number })[] {
  let cumTPV = 0
  let cumV = 0
  const result: (LineData & { candleTime: number })[] = []
  for (const c of candles) {
    const tp = (c.high + c.low + c.close) / 3
    cumTPV += tp * c.volume
    cumV += c.volume
    const vwap = cumV > 0 ? cumTPV / cumV : c.close
    result.push({ time: (c.time / 1000) as Time, value: vwap, candleTime: c.time })
  }
  return result
}

/* ------------------------------------------------------------------ */
/*  Chart component                                                    */
/* ------------------------------------------------------------------ */

export function Chart({ candles, killZones, position, regime, srLevels, mcResult }: ChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const chartRef = useRef<IChartApi | null>(null)
  const candleSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null)
  const vwapSeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
  const volumeSeriesRef = useRef<ISeriesApi<'Line'> | null>(null)
  const kzPrimitiveRef = useRef<KillZonePrimitive | null>(null)
  const volPrimitiveRef = useRef<VolumePrimitive | null>(null)
  const srPrimitiveRef = useRef<SRPrimitive | null>(null)
  const mcPrimitiveRef = useRef<MCPrimitive | null>(null)
  const markersRef = useRef<ReturnType<typeof createSeriesMarkers<Time>> | null>(null)

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
        timeVisible: true,
        secondsVisible: false,
      },
      width: container.clientWidth,
      height: container.clientHeight,
    })

    const candleSeries = chart.addSeries(CandlestickSeries, {
      upColor: COLORS.up,
      downColor: COLORS.down,
      borderUpColor: COLORS.up,
      borderDownColor: COLORS.down,
      wickUpColor: COLORS.up,
      wickDownColor: COLORS.down,
      priceFormat: { type: 'price', precision: 1, minMove: 0.1 },
    })

    // VWAP overlay on same pane
    const vwapSeries = chart.addSeries(LineSeries, {
      color: COLORS.vwap,
      lineWidth: 1,
      lineStyle: 2 as LineStyle, // Dashed
      lastValueVisible: false,
      priceLineVisible: false,
      priceFormat: { type: 'price', precision: 1, minMove: 0.1 },
    })

    // Volume bars — custom primitive, no price scale
    const volumeSeries = chart.addSeries(LineSeries, {
      color: 'transparent',
      lastValueVisible: false,
      priceLineVisible: false,
    })
    const volPrimitive = new VolumePrimitive()
    volumeSeries.attachPrimitive(volPrimitive)

    // Kill zone primitive — shaded rectangles
    const kzPrimitive = new KillZonePrimitive(killZones)
    candleSeries.attachPrimitive(kzPrimitive as any)

    // S/R levels primitive — horizontal dashed lines
    const srPrimitive = new SRPrimitive()
    candleSeries.attachPrimitive(srPrimitive as any)
    srPrimitive.updateData(srLevels)

    // Monte Carlo primitive — projection bands
    const mcPrimitive = new MCPrimitive()
    candleSeries.attachPrimitive(mcPrimitive as any)
    mcPrimitive.updateData(mcResult, candles)

    // Markers for position entry
    const markers = createSeriesMarkers(candleSeries, [])

    chartRef.current = chart
    candleSeriesRef.current = candleSeries
    vwapSeriesRef.current = vwapSeries
    volumeSeriesRef.current = volumeSeries
    kzPrimitiveRef.current = kzPrimitive
    volPrimitiveRef.current = volPrimitive
    srPrimitiveRef.current = srPrimitive
    mcPrimitiveRef.current = mcPrimitive
    markersRef.current = markers

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
      candleSeriesRef.current = null
      vwapSeriesRef.current = null
      volumeSeriesRef.current = null
      kzPrimitiveRef.current = null
      volPrimitiveRef.current = null
      markersRef.current = null
      srPrimitiveRef.current = null
      mcPrimitiveRef.current = null
    }
  }, [])

  // ---- (2) Set candle data, preserving user's scroll position ----
  useEffect(() => {
    const chart = chartRef.current
    const series = candleSeriesRef.current
    if (!series || candles.length === 0) return

    // Save user's scroll position (time + price) before data update
    const prevLogicalRange = chart?.timeScale().getVisibleLogicalRange()
    const prevPriceRange = chart?.priceScale('right').getVisiblePriceRange()

    const data = candles.map(candleToLw).sort((a, b) => Number(a.time) - Number(b.time))
    series.setData(data)

    // Restore time scale — stable across data appends
    if (prevLogicalRange) {
      chart?.timeScale().setVisibleLogicalRange(prevLogicalRange)
    }

    // Restore price scale — prevents auto-scale from snapping back
    if (prevPriceRange) {
      chart?.priceScale('right').setVisiblePriceRange(prevPriceRange)
    }
  }, [candles])

  // ---- (2b) Transparent series extends time + set initial zoom, run once ----
  const padSetRef = useRef(false)
  useEffect(() => {
    const chart = chartRef.current
    if (!chart || candles.length < 5 || padSetRef.current) return

    const first = candles[0]
    const last = candles[candles.length - 1]
    const dataRangeSec = (last.time - first.time) / 1000
    const futureTime = (last.time / 1000 + dataRangeSec * 0.4) as Time
    const midTime = ((first.time + last.time) / 2 / 1000) as Time

    // Transparent series extends auto-scale range so MC space is accounted for
    const pad = chart.addSeries(LineSeries, {
      color: 'transparent',
      lastValueVisible: false,
      priceLineVisible: false,
    })
    pad.setData([
      { time: (first.time / 1000) as Time, value: last.close },
      { time: futureTime, value: last.close },
    ])

    // Pin initial zoom (last candle at 55%, MC space on right)
    chart.timeScale().setVisibleRange({
      from: midTime,
      to: futureTime,
    })

    padSetRef.current = true
  }, [candles])

  // ---- (3) VWAP ----
  useEffect(() => {
    const series = vwapSeriesRef.current
    if (!series || candles.length === 0) return
    const vwapData = computeVWAP(candles)
    series.setData(vwapData)
  }, [candles])

  // ---- (4) Volume primitive data ----
  useEffect(() => {
    volPrimitiveRef.current?.updateData(candles)
  }, [candles])

  // ---- (5) Kill zone primitive update ----
  useEffect(() => {
    kzPrimitiveRef.current?.updateData(killZones)
  }, [killZones, candles])

  // ---- (5b) S/R levels primitive update ----
  useEffect(() => {
    srPrimitiveRef.current?.updateData(srLevels)
  }, [srLevels])

  // ---- (5c) Monte Carlo primitive update ----
  useEffect(() => {
    mcPrimitiveRef.current?.updateData(mcResult, candles)
  }, [mcResult, candles])

  // ---- (6) Position markers ----
  useEffect(() => {
    const series = candleSeriesRef.current
    if (!series) return

    // Initialize markers plugin once
    if (!markersRef.current) {
      markersRef.current = createSeriesMarkers(series, [])
    }

    const markers: any[] = []

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
  }, [candles, position])

  // ---- (7) Price lines for SL/TP ----
  useEffect(() => {
    const series = candleSeriesRef.current
    if (!series) return

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
  }, [position])

  // ---- (8) Chart style by regime ----
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
