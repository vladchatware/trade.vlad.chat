import type {
  ISeriesPrimitive,
  SeriesAttachedParameter,
  IPanePrimitivePaneView,
  IPrimitivePaneRenderer,
  Time,
  IChartApi,
  ISeriesApi,
} from 'lightweight-charts'
import { CanvasRenderingTarget2D } from 'fancy-canvas'
import type { MCResult } from '../lib/monteCarlo'
import type { Candle } from '../types'

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const MC_BAND_FILL = 'rgba(46, 160, 67, 0.18)'     // 25-75 band
const MC_BAND_LIGHT = 'rgba(26, 83, 37, 0.12)'     // 10-90 band
const MC_MEDIAN = '#f0883e'                         // median line
const MC_PATH = 'rgba(88, 166, 255, 0.15)'          // sample paths
const SEPARATOR = 'rgba(72, 79, 88, 0.4)'           // now line

/* ------------------------------------------------------------------ */
/*  MCPrimitive                                                        */
/* ------------------------------------------------------------------ */

export class MCPrimitive implements ISeriesPrimitive<Time> {
  private _chart: IChartApi | null = null
  private _series: ISeriesApi<'Candlestick'> | null = null
  private _requestUpdate: (() => void) | null = null
  private _mc: MCResult | null = null
  private _candles: Candle[] = []

  updateData(mc: MCResult | null, candles: Candle[]): void {
    this._mc = mc
    this._candles = candles
    this._requestUpdate?.()
  }

  attached(param: SeriesAttachedParameter<Time>): void {
    this._chart = param.chart as unknown as IChartApi
    this._series = param.series as unknown as ISeriesApi<'Candlestick'>
    this._requestUpdate = param.requestUpdate
  }

  detached(): void {
    this._chart = null
    this._series = null
    this._requestUpdate = null
  }

  paneViews(): readonly IPanePrimitivePaneView[] {
    if (!this._mc || this._candles.length < 5) return []

    return [
      {
        zOrder: () => 'bottom' as const,
        renderer: (): IPrimitivePaneRenderer => ({
          draw: (target: CanvasRenderingTarget2D) => {
            target.useBitmapCoordinateSpace(
              ({
                context: ctx,
                bitmapSize,
                horizontalPixelRatio: hpr,
                verticalPixelRatio: vpr,
              }) => {
                const chart = this._chart
                const series = this._series
                const mc = this._mc
                const candles = this._candles
                if (!chart || !series || !mc || candles.length < 5) return

                const timeScale = chart.timeScale()
                const lastCandle = candles[candles.length - 1]
                const lastX = timeScale.timeToCoordinate((lastCandle.time / 1000) as Time)
                if (lastX === null) return

                const barSpacing = timeScale.options().barSpacing
                const stepPx = barSpacing * hpr

                // Build future x positions (pixel coordinates in bitmap space)
                const xs: number[] = []
                for (let i = 0; i <= mc.nSteps; i++) {
                  xs.push(Math.round(lastX * hpr + i * stepPx))
                }

                const lastVisibleX = bitmapSize.width
                const clippedXs = xs.map(x => Math.min(x, lastVisibleX))

                // Separator line at current time
                ctx.strokeStyle = SEPARATOR
                ctx.lineWidth = Math.max(1, Math.round(1 * vpr))
                ctx.setLineDash([Math.round(4 * hpr), Math.round(4 * hpr)])
                ctx.beginPath()
                ctx.moveTo(clippedXs[0], 0)
                ctx.lineTo(clippedXs[0], bitmapSize.height)
                ctx.stroke()
                ctx.setLineDash([])

                // Convert MC price paths to y coordinates
                const ys = {
                  median: mc.median.map(p => series.priceToCoordinate(p)),
                  lower25: mc.lower25.map(p => series.priceToCoordinate(p)),
                  upper75: mc.upper75.map(p => series.priceToCoordinate(p)),
                  lower10: mc.lower10.map(p => series.priceToCoordinate(p)),
                  upper90: mc.upper90.map(p => series.priceToCoordinate(p)),
                }

                // 10-90 band (faintest, drawn first)
                for (let s = 0; s < mc.nSteps; s++) {
                  if (ys.lower10[s] === null || ys.upper90[s] === null) continue
                  if (s >= clippedXs.length - 1) break
                  const x0 = clippedXs[s]
                  const x1 = clippedXs[s + 1]
                  const w = Math.max(1, x1 - x0)
                  const top = Math.round(Math.min(ys.upper90[s]!, ys.lower10[s]!) * vpr)
                  const bot = Math.round(Math.max(ys.upper90[s]!, ys.lower10[s]!) * vpr)
                  ctx.fillStyle = MC_BAND_LIGHT
                  ctx.fillRect(x0, top, w, Math.max(1, bot - top))
                }

                // 25-75 band (medium)
                for (let s = 0; s < mc.nSteps; s++) {
                  if (ys.lower25[s] === null || ys.upper75[s] === null) continue
                  if (s >= clippedXs.length - 1) break
                  const x0 = clippedXs[s]
                  const x1 = clippedXs[s + 1]
                  const w = Math.max(1, x1 - x0)
                  const top = Math.round(Math.min(ys.upper75[s]!, ys.lower25[s]!) * vpr)
                  const bot = Math.round(Math.max(ys.upper75[s]!, ys.lower25[s]!) * vpr)
                  ctx.fillStyle = MC_BAND_FILL
                  ctx.fillRect(x0, top, w, Math.max(1, bot - top))
                }

                // Median line
                ctx.strokeStyle = MC_MEDIAN
                ctx.lineWidth = Math.max(1, Math.round(1.5 * vpr))
                ctx.beginPath()
                let started = false
                for (let s = 0; s <= mc.nSteps; s++) {
                  if (ys.median[s] === null) continue
                  if (s >= clippedXs.length) break
                  const x = clippedXs[s]
                  const y = Math.round(ys.median[s]! * vpr)
                  if (!started) {
                    ctx.moveTo(x, y)
                    started = true
                  } else {
                    ctx.lineTo(x, y)
                  }
                }
                ctx.stroke()

                // Stats box moved to SignalDisplay React component (top-left)
              },
            )
          },
        }),
      },
    ]
  }
}
