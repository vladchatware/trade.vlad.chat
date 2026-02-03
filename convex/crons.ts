import { cronJobs } from 'convex/server'
import { api } from './_generated/api'

const crons = cronJobs()

// Data gathering every 30 seconds - updates positions and account from Alpaca to Convex
// Convex then pushes real-time updates to all connected clients via WebSocket
crons.interval('gather-data', { seconds: 30 }, api.tradingAgent.gatherData, {})

// Trading logic every 2 minutes during market hours
crons.cron('run-trading', '*/2 13-20 * * 1-5', api.tradingAgent.runTrading, {})

// SEC Edgar ingestion every 5 minutes during market hours
crons.cron('sec-edgar-ingest', '*/5 13-20 * * 1-5', api.cronTasks.ingestSecEdgar, {})

// Market open prep (cleanup approvals, log risk state)
crons.cron('market-open-prep', '0 14 * * 1-5', api.cronTasks.marketOpenPrep, {})

// Market close cleanup
crons.cron('market-close-cleanup', '30 21 * * 1-5', api.cronTasks.marketCloseCleanup, {})

// Overnight activity rollup (hourly)
crons.cron('overnight-activity-rollup', '0 * * * *', api.overnight.computeOvernightActivity, {})

// Premarket plan generation (7:30am ET / 12:30 UTC on weekdays)
crons.cron('premarket-plan', '30 12 * * 1-5', api.overnight.generatePremarketPlan, {})

// Midnight reset (daily loss, approvals cleanup)
crons.cron('midnight-reset', '0 5 * * *', api.cronTasks.midnightReset, {})

// Hourly cache refresh
crons.cron('hourly-cache-refresh', '0 * * * *', api.cronTasks.hourlyCacheRefresh, {})

// Crypto trading (24/7) - every 2 minutes
crons.interval('run-crypto', { seconds: 120 }, api.cryptoAgent.runCryptoTrading, {})

// Staleness analysis - every 10 minutes
crons.interval('compute-staleness', { seconds: 600 }, api.staleness.compute, {})

export default crons
