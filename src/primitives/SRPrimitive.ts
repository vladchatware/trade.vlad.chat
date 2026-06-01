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
import type { SRLevel } from '../types'

interface SRLine {
  y: number
  color: string
  label: string
  strength: number
}

const COLORS = {
  support: '#bc8cff',
  resistance: '#58a6ff',
}

export class SRPrimitive implements ISeriesPrimitive<Time> {
  private _chart: IChartApi | null = null
  private _series: ISeriesApi<'Candlestick'> | null = null
  private _requestUpdate: (() => void) | null = null
  private _levels: SRLevel[] = []
  private _lines: SRLine[] = []

  updateData(levels: SRLevel[]): void {
    this._levels = levels
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

  updateAllViews(): void {
    const chart = this._chart
    const series = this._series
    if (!chart || !series || this._levels.length === 0) {
      this._lines = []
      return
    }

    this._lines = []
    for (const lvl of this._levels) {
      const y = series.priceToCoordinate(lvl.price)
      if (y === null) continue

      this._lines.push({
        y,
        color: lvl.type === 'support' ? COLORS.support : COLORS.resistance,
        label: `${lvl.type === 'support' ? 'S' : 'R'} ${lvl.price.toFixed(0)}`,
        strength: lvl.strength,
      })
    }
  }

  paneViews(): readonly IPanePrimitivePaneView[] {
    if (this._lines.length === 0) return []

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
                if (this._lines.length === 0) return

                const chartRightX = bitmapSize.width

                for (const line of this._lines) {
                  const yCoord = Math.round(line.y * vpr)

                  const alpha = Math.min(1, 0.3 + line.strength * 0.2)
                  const alphaHex = Math.round(alpha * 255).toString(16).padStart(2, '0')

                  // Short tick at right edge
                  const tickLen = Math.round(20 * hpr)
                  const tickLeft = chartRightX - tickLen

                  ctx.strokeStyle = line.color + alphaHex
                  ctx.lineWidth = Math.max(1, Math.round(1 * vpr))
                  ctx.setLineDash([
                    Math.max(3, Math.round(4 * hpr)),
                    Math.max(2, Math.round(3 * hpr)),
                  ])
                  ctx.beginPath()
                  ctx.moveTo(tickLeft, yCoord)
                  ctx.lineTo(chartRightX, yCoord)
                  ctx.stroke()
                  ctx.setLineDash([])

                  // Label left of the tick
                  const fontSize = Math.max(10, Math.floor(11 * vpr))
                  ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, monospace`
                  const textMetrics = ctx.measureText(line.label)
                  const textW = textMetrics.width
                  const padX = Math.max(4, Math.floor(6 * hpr))
                  const padY = Math.max(2, Math.floor(3 * vpr))
                  const labelH = fontSize + padY * 2
                  const labelW = textW + padX * 2

                  const lx = tickLeft - Math.round(labelW)
                  const ly = yCoord - Math.round(labelH / 2)

                  ctx.fillStyle = line.color + alphaHex
                  ctx.fillRect(lx, ly, labelW, labelH)

                  ctx.strokeStyle = line.color + '66'
                  ctx.lineWidth = Math.max(1, Math.round(1 * vpr))
                  ctx.strokeRect(lx, ly, labelW, labelH)

                  ctx.fillStyle = '#ffffff'
                  ctx.textBaseline = 'middle'
                  ctx.textAlign = 'left'
                  ctx.fillText(line.label, lx + padX, ly + labelH / 2)
                }
              },
            )
          },
        }),
      },
    ]
  }
}
