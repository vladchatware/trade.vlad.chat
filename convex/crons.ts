import { cronJobs } from 'convex/server'
import { api } from './_generated/api'

const crons = cronJobs()

export const CRON_PLAN = [
  {
    name: 'run-trading',
    kind: 'cron',
    schedule: '*/2 13-20 * * 1-5',
    target: 'api.trading.agent.runTrading',
  },
  {
    name: 'run-crypto',
    kind: 'interval',
    schedule: '120s',
    target: 'api.trading.cryptoAgent.runCryptoTrading',
  },
  {
    name: 'agent-v2-cycle',
    kind: 'cron',
    schedule: '*/10 13-20 * * 1-5',
    target: 'api.system.agent.runCycle',
  },
  {
    name: 'sec-edgar-ingest',
    kind: 'cron',
    schedule: '*/5 13-20 * * 1-5',
    target: 'api.system.operations.ingestSecEdgar',
  },
  {
    name: 'market-open-prep',
    kind: 'cron',
    schedule: '0 14 * * 1-5',
    target: 'api.system.operations.marketOpenPrep',
  },
  {
    name: 'market-close-cleanup',
    kind: 'cron',
    schedule: '30 21 * * 1-5',
    target: 'api.system.operations.marketCloseCleanup',
  },
  {
    name: 'midnight-reset',
    kind: 'cron',
    schedule: '0 5 * * *',
    target: 'api.system.operations.midnightReset',
  },
  {
    name: 'hourly-cache-refresh',
    kind: 'cron',
    schedule: '0 * * * *',
    target: 'api.system.operations.hourlyCacheRefresh',
  },
  {
    name: 'cleanup-order-approvals',
    kind: 'interval',
    schedule: '15m',
    target: 'api.trading.orderApprovals.cleanupExpired',
  },
  {
    name: 'compute-staleness',
    kind: 'interval',
    schedule: '10m',
    target: 'api.portfolio.staleness.compute',
  },
  {
    name: 'overnight-activity-rollup',
    kind: 'cron',
    schedule: '0 * * * *',
    target: 'api.portfolio.overnight.computeOvernightActivity',
  },
  {
    name: 'premarket-plan',
    kind: 'cron',
    schedule: '30 12 * * 1-5',
    target: 'api.portfolio.overnight.generatePremarketPlan',
  },
] as const

crons.cron('run-trading', '*/2 13-20 * * 1-5', api.trading.agent.runTrading, {})
crons.interval('run-crypto', { seconds: 120 }, api.trading.cryptoAgent.runCryptoTrading, {})
crons.cron('agent-v2-cycle', '*/10 13-20 * * 1-5', api.system.agent.runCycle, {})
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
