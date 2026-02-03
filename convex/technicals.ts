import { v } from 'convex/values'
import { action } from './_generated/server'
import { createAlpacaClient } from './providers/alpaca'
import { type Bar, computeTechnicals, detectSignals } from './providers/technicals'

export async function fetchTechnicals(symbol: string, timeframe: string, limit: number) {
  const client = createAlpacaClient()
  const bars = await client.getBars(symbol, timeframe, { limit })
  const technicals = computeTechnicals(symbol, bars as Bar[])
  const signals = detectSignals(technicals)

  return {
    symbol,
    timeframe,
    bars: bars.length,
    technicals,
    signals,
  }
}

export const get = action({
  args: {
    symbol: v.string(),
    timeframe: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (_ctx, args) => {
    const timeframe = args.timeframe ?? '1Day'
    const limit = args.limit ?? 250
    return fetchTechnicals(args.symbol, timeframe, limit)
  },
})
