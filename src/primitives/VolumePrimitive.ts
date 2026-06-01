import type {
  ISeriesPrimitive,
  SeriesAttachedParameter,
  IPanePrimitivePaneView,
  IPrimitivePaneRenderer,
  Time,
  IChartApi,
} from 'lightweight-charts'
import { CanvasRenderingTarget2D } from 'fancy-canvas'
import type { Candle } from '../types'

interface VolumeBar {
  centerX: number
  heightPct: number
  color: string
}

/**
 * Draws volume histogram bars in the bottom 28% of the chart pane.
 * No price scale — pure Canvas2D rendering via primitive.
 */
export class VolumePrimitive implements ISeriesPrimitive<Time> {
  private _chart: IChartApi | null = null
  private _requestUpdate: (() => void) | null = null
  private _bars: VolumeBar[] = []
  private _candles: Candle[] = []
  private _maxVol = 1

  updateData(candles: Candle[]): void {
    this._candles = candles
    if (candles.length > 0) {
      this._maxVol = Math.max(1, ...candles.map(c => c.volume))
    }
    this._requestUpdate?.()
  }

  attached(param: SeriesAttachedParameter<Time>): void {
    this._chart = param.chart as unknown as IChartApi
    this._requestUpdate = param.requestUpdate
  }

  detached(): void {
    this._chart = null
    this._requestUpdate = null
  }

  updateAllViews(): void {
    const chart = this._chart
    if (!chart || this._candles.length < 2) {
      this._bars = []
      return
    }

    const timeScale = chart.timeScale()
    this._bars = []

    for (const c of this._candles) {
      const t = c.time / 1000
      const x = timeScale.timeToCoordinate(t as Time)
      if (x === null) continue

      this._bars.push({
        centerX: x,
        heightPct: c.volume / this._maxVol,
        color: c.close >= c.open
          ? 'rgba(38, 166, 154, 0.5)'
          : 'rgba(239, 83, 80, 0.5)',
      })
    }
  }

  paneViews(): readonly IPanePrimitivePaneView[] {
    if (this._bars.length === 0) return []
    return [{
      zOrder: () => 'bottom' as const,
      renderer: (): IPrimitivePaneRenderer => ({
        draw: (target: CanvasRenderingTarget2D) => {
          target.useBitmapCoordinateSpace(({ context: ctx, bitmapSize, horizontalPixelRatio: hpr, verticalPixelRatio: vpr }) => {
            const chart = this._chart
            if (!chart || this._bars.length < 2) return

            // Volume sits in bottom 28% of pane
            const paneHeight = bitmapSize.height / vpr
            const volHeight = paneHeight * 0.28

            // Get bar spacing for width calculation
            const barSpacing = chart.timeScale().options().barSpacing
            const barWidth = Math.max(1, Math.round(barSpacing * hpr * 0.6))

            for (const bar of this._bars) {
              const cx = Math.round(bar.centerX * hpr)
              const lx = cx - Math.floor(barWidth / 2)
              const h = Math.max(1, Math.round(bar.heightPct * volHeight * vpr))
              const y = Math.round(bitmapSize.height - h)
              ctx.fillStyle = bar.color
              ctx.fillRect(lx, y, barWidth, h)
            }
          })
        },
      }),
    }]
  }
}
