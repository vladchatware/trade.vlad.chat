'use node'

import { api } from '../_generated/api'
import { action } from '../_generated/server'

export interface StockTwitsSymbol {
  symbol: string
  title: string
}

export interface StockTwitsMessage {
  entities?: {
    sentiment?: {
      basic?: string
    }
  }
}

export type SentimentSummary = {
  bullish: number
  bearish: number
  total: number
  score: number
}

export function analyzeSentiment(messages: StockTwitsMessage[]): SentimentSummary {
  let bullish = 0
  let bearish = 0

  for (const message of messages) {
    const sentiment = message.entities?.sentiment?.basic
    if (sentiment === 'Bullish') bullish += 1
    if (sentiment === 'Bearish') bearish += 1
  }

  const total = messages.length
  return {
    bullish,
    bearish,
    total,
    score: total > 0 ? (bullish - bearish) / total : 0,
  }
}

export async function getTrendingSymbols(
  fetchImpl: typeof fetch = fetch
): Promise<StockTwitsSymbol[]> {
  try {
    const response = await fetchImpl('https://api.stocktwits.com/api/2/trending/symbols.json')
    if (!response.ok) return []
    const data = (await response.json()) as { symbols?: StockTwitsSymbol[] }
    return data.symbols ?? []
  } catch {
    return []
  }
}

export async function getSymbolStream(
  symbol: string,
  limit = 30,
  fetchImpl: typeof fetch = fetch
): Promise<StockTwitsMessage[]> {
  try {
    const response = await fetchImpl(
      `https://api.stocktwits.com/api/2/streams/symbol/${symbol}.json?limit=${limit}`
    )
    if (!response.ok) return []
    const data = (await response.json()) as { messages?: StockTwitsMessage[] }
    return data.messages ?? []
  } catch {
    return []
  }
}

export const gatherSignals = action({
  args: {},
  handler: async (ctx) => {
    const gathered: string[] = []
    const trending = await getTrendingSymbols()

    for (const item of trending.slice(0, 10)) {
      const messages = await getSymbolStream(item.symbol, 30)
      const sentiment = analyzeSentiment(messages)

      if (sentiment.total >= 5) {
        await ctx.runMutation(api.signals.queries.create, {
          symbol: item.symbol,
          source: 'stocktwits',
          sentiment: sentiment.score,
          volume: sentiment.total,
          bullish: sentiment.bullish,
          bearish: sentiment.bearish,
          reason: `StockTwits: ${sentiment.bullish}B/${sentiment.bearish}b (${(sentiment.score * 100).toFixed(0)}%)`,
          timestamp: Date.now(),
        })
        gathered.push(item.symbol)
      }

      await new Promise((resolve) => setTimeout(resolve, 300))
    }

    return { signalsGathered: gathered.length, symbols: gathered }
  },
})
