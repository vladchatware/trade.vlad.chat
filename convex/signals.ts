'use node'

import { api } from './_generated/api'
import { action } from './_generated/server'

// StockTwits API response types
interface StockTwitsSymbol {
  symbol: string
  title: string
}

interface StockTwitsMessage {
  entities?: {
    sentiment?: {
      basic: string
    }
  }
}

// Fetch trending symbols from StockTwits
async function getTrending(): Promise<StockTwitsSymbol[]> {
  try {
    const res = await fetch('https://api.stocktwits.com/api/2/trending/symbols.json')
    if (!res.ok) return []
    const data = await res.json()
    return data.symbols || []
  } catch {
    return []
  }
}

// Fetch message stream for a symbol
async function getStream(symbol: string): Promise<StockTwitsMessage[]> {
  try {
    const res = await fetch(
      `https://api.stocktwits.com/api/2/streams/symbol/${symbol}.json?limit=30`
    )
    if (!res.ok) return []
    const data = await res.json()
    return data.messages || []
  } catch {
    return []
  }
}

// Analyze sentiment from messages
function analyzeSentiment(messages: StockTwitsMessage[]) {
  let bullish = 0
  let bearish = 0

  for (const msg of messages) {
    const sentiment = msg.entities?.sentiment?.basic
    if (sentiment === 'Bullish') bullish++
    else if (sentiment === 'Bearish') bearish++
  }

  const total = messages.length
  return {
    bullish,
    bearish,
    total,
    score: total > 0 ? (bullish - bearish) / total : 0,
  }
}

// StockTwits signal gathering
export const gatherSignals = action({
  args: {},
  handler: async (ctx) => {
    const signals = []
    const trending = await getTrending()

    for (const sym of trending.slice(0, 10)) {
      const messages = await getStream(sym.symbol)
      const sentiment = analyzeSentiment(messages)

      if (sentiment.total >= 5) {
        await ctx.runMutation(api.signalsQueries.create, {
          symbol: sym.symbol,
          source: 'stocktwits',
          sentiment: sentiment.score,
          volume: sentiment.total,
          bullish: sentiment.bullish,
          bearish: sentiment.bearish,
          reason: `StockTwits: ${sentiment.bullish}B/${sentiment.bearish}b (${(sentiment.score * 100).toFixed(0)}%)`,
          timestamp: Date.now(),
        })
        signals.push(sym.symbol)
      }

      // Rate limit: 300ms delay between requests
      await new Promise((resolve) => setTimeout(resolve, 300))
    }

    return { signalsGathered: signals.length, symbols: signals }
  },
})
