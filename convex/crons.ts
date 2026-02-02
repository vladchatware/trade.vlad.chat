import { cronJobs } from 'convex/server'
import { api } from './_generated/api'

const crons = cronJobs()

// Data gathering every 60 seconds
crons.interval('gather-data', { seconds: 60 }, api.tradingAgent.gatherData)

// Trading logic every 2 minutes during market hours
crons.cron('run-trading', '*/2 13-20 * * 1-5', api.tradingAgent.runTrading)

// Crypto trading (24/7) - every 2 minutes
crons.interval('run-crypto', { seconds: 120 }, api.cryptoAgent.runCryptoTrading)

export default crons
