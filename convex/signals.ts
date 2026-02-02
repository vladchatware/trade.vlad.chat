'use node'

import { v } from 'convex/values'
import { api } from './_generated/api'
import { action, mutation, query } from './_generated/server'

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

// Query: Get top signals
export const getTop = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20
    return await ctx.db.query('signals').order('desc').take(limit)
  },
})

// Query: Get crypto signals
export const getCrypto = query({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 20
    // Filter crypto signals after fetching since we can't query by optional field
    const allSignals = await ctx.db
      .query('signals')
      .order('desc')
      .take(limit * 2)
    return allSignals.filter((s) => s.isCrypto === true).slice(0, limit)
  },
})

// Mutation: Create a signal
export const create = mutation({
  args: {
    symbol: v.string(),
    source: v.string(),
    sentiment: v.number(),
    volume: v.number(),
    reason: v.optional(v.string()),
    bullish: v.optional(v.number()),
    bearish: v.optional(v.number()),
    score: v.optional(v.number()),
    isCrypto: v.optional(v.boolean()),
    momentum: v.optional(v.number()),
    price: v.optional(v.number()),
    timestamp: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert('signals', args)
  },
})

// StockTwits signal gathering - ported from agent-v1.mjs
export const gatherSignals = action({
  args: {},
  handler: async (ctx) => {
    const signals = []
    const trending = await getTrending()

    for (const sym of trending.slice(0, 10)) {
      const messages = await getStream(sym.symbol)
      const sentiment = analyzeSentiment(messages)

      if (sentiment.total >= 5) {
        await ctx.runMutation(api.signals.create, {
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
