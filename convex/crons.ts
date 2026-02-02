import { cronJobs } from 'convex/server'
import { internal } from './_generated/api'

const crons = cronJobs()

// Data gathering every 60 seconds
crons.interval('gather-data', { seconds: 60 }, internal.agent.gatherData)

// Trading logic every 2 minutes during market hours (9:30 AM - 4:00 PM ET, Mon-Fri)
// Cron schedule: */2 13-20 * * 1-5 (UTC times)
crons.cron('run-trading', '*/2 13-20 * * 1-5', internal.agent.runTrading)

// Crypto trading (24/7) - every 2 minutes
crons.interval('run-crypto', { seconds: 120 }, internal.agent.runCryptoTrading)

export default crons
