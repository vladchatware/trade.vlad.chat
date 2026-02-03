import { cronJobs } from 'convex/server'
import { api } from './_generated/api'

const crons = cronJobs()

crons.cron('run-trading', '*/2 13-20 * * 1-5', api.trading.agent.runTrading, {})
crons.cron('sec-edgar-ingest', '*/5 13-20 * * 1-5', api.system.operations.ingestSecEdgar, {})
crons.cron('market-open-prep', '0 14 * * 1-5', api.system.operations.marketOpenPrep, {})
crons.cron('market-close-cleanup', '30 21 * * 1-5', api.system.operations.marketCloseCleanup, {})
crons.cron('midnight-reset', '0 5 * * *', api.system.operations.midnightReset, {})
crons.cron('hourly-cache-refresh', '0 * * * *', api.system.operations.hourlyCacheRefresh, {})
crons.interval(
  'cleanup-order-approvals',
  { minutes: 15 },
  api.trading.orderApprovals.cleanupExpired,
  {}
)
crons.interval('compute-staleness', { minutes: 10 }, api.portfolio.staleness.compute, {})
crons.cron(
  'overnight-activity-rollup',
  '0 * * * *',
  api.portfolio.overnight.computeOvernightActivity,
  {}
)
crons.cron('premarket-plan', '30 12 * * 1-5', api.portfolio.overnight.generatePremarketPlan, {})

export default crons
