import { cron } from './_generated/server'

// Data gathering every 60 seconds
export const gatherData = cron({
  name: 'gather-data',
  schedule: '*/1 * * * *',
  handler: async (ctx) => {
    await ctx.runAction(internal.agent.gatherData)
  },
})

// Trading logic every 2 minutes during market hours
export const runTrading = cron({
  name: 'run-trading',
  schedule: '*/2 13-20 * * 1-5',
  handler: async (ctx) => {
    const clock = await ctx.runAction(internal.actions.getMarketClock)
    if (clock.isOpen) {
      await ctx.runAction(internal.agent.runTrading)
    }
  },
})

// Crypto trading (24/7)
export const runCryptoTrading = cron({
  name: 'run-crypto',
  schedule: '*/2 * * * *',
  handler: async (ctx) => {
    const config = await ctx.runQuery(internal.config.get)
    if (config?.cryptoEnabled) {
      await ctx.runAction(internal.agent.runCryptoTrading)
    }
  },
})
