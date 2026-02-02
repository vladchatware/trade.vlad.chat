import { query } from './_generated/server'

export const get = query({
  args: {},
  handler: async (ctx) => {
    const [config, riskState, signals, logs, positions] = await Promise.all([
      ctx.db.query('config').first(),
      ctx.db.query('riskState').first(),
      ctx.db.query('signals').order('desc').take(20),
      ctx.db.query('activityLogs').order('desc').take(50),
      ctx.db.query('positions').collect(),
    ])

    return {
      config,
      riskState,
      signals,
      logs,
      positions,
    }
  },
})
