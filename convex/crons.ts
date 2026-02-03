import { cronJobs } from 'convex/server'
import { api } from './_generated/api'

const crons = cronJobs()

export const CRON_PLAN = [
  {
    name: 'run-trading',
    kind: 'cron',
    schedule: '*/2 13-20 * * 1-5',
    target: 'api.tradingAgent.runTrading',
  },
  {
    name: 'run-crypto',
    kind: 'interval',
    schedule: '120s',
    target: 'api.cryptoAgent.runCryptoTrading',
  },
  {
    name: 'agent-v2-cycle',
    kind: 'cron',
    schedule: '*/10 13-20 * * 1-5',
    target: 'api.agent.runCycle',
  },
  {
    name: 'sec-edgar-ingest',
    kind: 'cron',
    schedule: '*/5 13-20 * * 1-5',
    target: 'api.operations.ingestSecEdgar',
  },
  {
    name: 'market-open-prep',
    kind: 'cron',
    schedule: '0 14 * * 1-5',
    target: 'api.operations.marketOpenPrep',
  },
  {
    name: 'market-close-cleanup',
    kind: 'cron',
    schedule: '30 21 * * 1-5',
    target: 'api.operations.marketCloseCleanup',
  },
  {
    name: 'midnight-reset',
    kind: 'cron',
    schedule: '0 5 * * *',
    target: 'api.operations.midnightReset',
  },
  {
    name: 'hourly-cache-refresh',
    kind: 'cron',
    schedule: '0 * * * *',
    target: 'api.operations.hourlyCacheRefresh',
  },
  {
    name: 'cleanup-order-approvals',
    kind: 'interval',
    schedule: '15m',
    target: 'api.orderApprovals.cleanupExpired',
  },
  {
    name: 'compute-staleness',
    kind: 'interval',
    schedule: '10m',
    target: 'api.staleness.compute',
  },
  {
    name: 'overnight-activity-rollup',
    kind: 'cron',
    schedule: '0 * * * *',
    target: 'api.overnight.computeOvernightActivity',
  },
  {
    name: 'premarket-plan',
    kind: 'cron',
    schedule: '30 12 * * 1-5',
    target: 'api.overnight.generatePremarketPlan',
  },
] as const

crons.cron('run-trading', '*/2 13-20 * * 1-5', api.tradingAgent.runTrading, {})
crons.interval('run-crypto', { seconds: 120 }, api.cryptoAgent.runCryptoTrading, {})
crons.cron('agent-v2-cycle', '*/10 13-20 * * 1-5', api.agent.runCycle, {})
crons.cron('sec-edgar-ingest', '*/5 13-20 * * 1-5', api.operations.ingestSecEdgar, {})
crons.cron('market-open-prep', '0 14 * * 1-5', api.operations.marketOpenPrep, {})
crons.cron('market-close-cleanup', '30 21 * * 1-5', api.operations.marketCloseCleanup, {})
crons.cron('midnight-reset', '0 5 * * *', api.operations.midnightReset, {})
crons.cron('hourly-cache-refresh', '0 * * * *', api.operations.hourlyCacheRefresh, {})
crons.interval('cleanup-order-approvals', { minutes: 15 }, api.orderApprovals.cleanupExpired, {})
crons.interval('compute-staleness', { minutes: 10 }, api.staleness.compute, {})
crons.cron('overnight-activity-rollup', '0 * * * *', api.overnight.computeOvernightActivity, {})
crons.cron('premarket-plan', '30 12 * * 1-5', api.overnight.generatePremarketPlan, {})

export default crons
