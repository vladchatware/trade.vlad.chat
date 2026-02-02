import { query } from './_generated/server'

export const get = query({
  args: {},
  handler: async (ctx) => {
    // Fetch data from database
    const [config, riskState, signals, logs, positions] = await Promise.all([
      ctx.db.query('config').first(),
      ctx.db.query('riskState').first(),
      ctx.db.query('signals').order('desc').take(20),
      ctx.db.query('activityLogs').order('desc').take(50),
      ctx.db.query('positions').collect(),
    ])

    // Fetch account data from Alpaca (through action)
    // Note: We can't call actions directly from queries, so we return null for account
    // The client will need to fetch this separately or we use a different approach

    return {
      config,
      riskState,
      signals,
      logs,
      positions,
      account: null, // Will be populated by client-side fetch or separate action
    }
  },
})
