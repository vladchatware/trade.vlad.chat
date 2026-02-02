'use node'

import { internal } from './_generated/api'
import { action } from './_generated/server'
import { createAlpacaClient } from './providers/alpaca'

export const getFullStatus = action({
  args: {},
  handler: async (ctx) => {
    // Fetch data from database through queries
    const [config, riskState, signals, logs, positions] = await Promise.all([
      ctx.runQuery(internal.config.get),
      ctx.runQuery(internal.riskState.get),
      ctx.runQuery(internal.signals.getTop, { limit: 20, minSentiment: 0 }),
      ctx.runQuery(internal.activityLogs.getRecent, { limit: 50 }),
      ctx.runQuery(internal.positions.getAll),
    ])

    // Fetch account data from Alpaca
    let account = null
    try {
      const alpaca = createAlpacaClient()
      const alpacaAccount = await alpaca.getAccount()
      account = {
        portfolioValue: alpacaAccount.portfolio_value,
        cash: alpacaAccount.cash,
        buyingPower: alpacaAccount.buying_power,
        equity: alpacaAccount.equity,
      }
    } catch (error) {
      console.error('Failed to fetch Alpaca account:', error)
    }

    return {
      config,
      riskState,
      signals,
      logs,
      positions,
      account,
    }
  },
})
