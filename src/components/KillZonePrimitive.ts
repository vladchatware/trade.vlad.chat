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
import type { KillZone } from '../types'

interface ZoneRect {
  x1: number
  x2: number
  label: string
  color: string
  /** Bitmap-space y for session high (top of box, null = full height) */
  topY: number | null
  /** Bitmap-space y for session low (bottom of box, null = full height) */
  bottomY: number | null
}

/**
 * Lightweight-charts primitive that draws semi-transparent shaded
 * rectangles (pipes) for each kill zone, clipped to session high/low.
 */
export class KillZonePrimitive implements ISeriesPrimitive<Time> {
  private _chart: IChartApi | null = null
  private _series: ISeriesApi<'Candlestick'> | null = null
  private _requestUpdate: (() => void) | null = null
  private _zones: KillZone[] = []
  private _rects: ZoneRect[] = []

  constructor(zones: KillZone[]) {
    this._zones = zones
  }

  updateData(zones: KillZone[]) {
    this._zones = zones
    this._requestUpdate?.()
  }

  attached(param: SeriesAttachedParameter<Time, 'Candlestick'>): void {
    this._chart = param.chart as unknown as IChartApi
    this._series = param.series as unknown as ISeriesApi<'Candlestick'>
    this._requestUpdate = param.requestUpdate
  }

  detached(): void {
    this._chart = null
    this._series = null
    this._requestUpdate = null
  }

  updateAllViews(): void {
    if (!this._chart || !this._series) return
    const timeScale = this._chart.timeScale()
    const visibleRange = timeScale.getVisibleRange()
    if (!visibleRange) {
      this._rects = []
      return
    }

    const visStart = visibleRange.from as number
    const visEnd = visibleRange.to as number

    this._rects = []
    for (const zone of this._zones) {
      const zStart = zone.start / 1000
      const zEnd = zone.end / 1000

      // Skip if zone is entirely outside the visible range
      if (zEnd <= visStart || zStart >= visEnd) continue

      // Clamp to visible range so partial zones render from edge
      const drawStart = Math.max(zStart, visStart)
      const drawEnd = Math.min(zEnd, visEnd)

      const x1 = timeScale.timeToCoordinate(drawStart as Time)
      const x2 = timeScale.timeToCoordinate(drawEnd as Time)
      if (x1 === null || x2 === null) continue

      // Compute vertical clipping from session high/low
      let topY: number | null = null
      let bottomY: number | null = null
      if (zone.high !== undefined && zone.low !== undefined) {
        const yHigh = this._series.priceToCoordinate(zone.high)
        const yLow = this._series.priceToCoordinate(zone.low)
        if (yHigh !== null && yLow !== null) {
          topY = yHigh
          bottomY = yLow
        }
      }

      this._rects.push({ x1, x2, label: zone.label, color: zone.color, topY, bottomY })
    }
  }

  paneViews(): readonly IPanePrimitivePaneView[] {
    if (this._rects.length === 0) return []
    return [{
      zOrder: () => 'bottom' as const,
      renderer: (): IPrimitivePaneRenderer => ({
        draw: (target: CanvasRenderingTarget2D) => {
          target.useBitmapCoordinateSpace(({ context: ctx, bitmapSize, horizontalPixelRatio, verticalPixelRatio }) => {
            const h = bitmapSize.height
            const hpr = horizontalPixelRatio
            const vpr = verticalPixelRatio

            for (const rect of this._rects) {
              const left = Math.round(rect.x1 * hpr)
              const right = Math.round(rect.x2 * hpr)
              const w = right - left
              if (w < 1) continue

              // Vertical bounds — clipped by session high/low or full height
              const top = rect.topY !== null ? Math.round(rect.topY * vpr) : 0
              const bottom = rect.bottomY !== null ? Math.round(rect.bottomY * vpr) : h
              const boxH = Math.max(1, bottom - top)

              // Fill — 30% opacity
              ctx.fillStyle = rect.color + '4D'
              ctx.fillRect(left, top, w, boxH)

              // Top edge accent — 60%
              ctx.fillStyle = rect.color + '99'
              ctx.fillRect(left, top, w, Math.max(2, Math.floor(2 * vpr)))
              // Bottom edge — same
              ctx.fillRect(left, bottom - Math.max(2, Math.floor(2 * vpr)), w, Math.max(2, Math.floor(2 * vpr)))

              // Side edges — 50%
              ctx.fillStyle = rect.color + '80'
              ctx.fillRect(left, top, Math.max(1, Math.floor(1 * hpr)), boxH)
              ctx.fillRect(right - Math.max(1, Math.floor(1 * hpr)), top, Math.max(1, Math.floor(1 * hpr)), boxH)

              // Label — top-left of zone
              if (w > 30) {
                ctx.font = `${Math.max(9, Math.floor(10 * vpr))}px -apple-system, BlinkMacSystemFont, monospace`
                ctx.fillStyle = rect.color + 'CC'
                ctx.textBaseline = 'top'
                ctx.fillText(rect.label, left + Math.max(3, Math.floor(3 * hpr)), top + Math.max(3, Math.floor(3 * vpr)))
              }
            }
          })
        },
      }),
    }]
  }
}
