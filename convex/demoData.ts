import { mutation } from './_generated/server'

export const seedDemoData = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if we already have portfolio snapshots
    const existing = await ctx.db.query('portfolioSnapshots').first()
    if (existing) {
      return { success: false, message: 'Portfolio data already exists' }
    }

    const startingEquity = 100000
    const now = Date.now()
    const hourMs = 60 * 60 * 1000

    // Generate 24 hours of portfolio history with realistic movement
    let currentEquity = startingEquity
    const snapshots = []

    for (let i = 23; i >= 0; i--) {
      // Random walk with slight upward bias
      const change = (Math.random() - 0.45) * 1500
      currentEquity += change

      const pl = currentEquity - startingEquity
      const plPct = (pl / startingEquity) * 100

      snapshots.push({
        equity: Math.round(currentEquity),
        pl: Math.round(pl),
        plPct: Math.round(plPct * 100) / 100,
        timestamp: now - i * hourMs,
      })
    }

    // Insert all snapshots
    for (const snapshot of snapshots) {
      await ctx.db.insert('portfolioSnapshots', snapshot)
    }

    // Add a demo position
    await ctx.db.insert('positions', {
      symbol: 'AAPL',
      qty: 10,
      avgEntryPrice: 185.5,
      currentPrice: 192.3,
      marketValue: 1923.0,
      unrealizedPl: 68.0,
      unrealizedPlpc: 3.67,
      updatedAt: now,
    })

    // Add a demo crypto position
    await ctx.db.insert('positions', {
      symbol: 'BTC',
      qty: 0.05,
      avgEntryPrice: 42000.0,
      currentPrice: 43500.0,
      marketValue: 2175.0,
      unrealizedPl: 75.0,
      unrealizedPlpc: 3.57,
      updatedAt: now,
    })

    // Add demo position entries
    await ctx.db.insert('positionEntries', {
      symbol: 'AAPL',
      entryTime: now - 6 * hourMs,
      entryPrice: 185.5,
      entrySentiment: 0.62,
      entryReason: 'StockTwits momentum + analyst confirmation',
      entrySocialVolume: 820,
      entrySources: ['StockTwits', 'Analyst'],
      peakPrice: 194.2,
      peakSentiment: 0.71,
    })

    await ctx.db.insert('positionEntries', {
      symbol: 'BTC',
      entryTime: now - 18 * hourMs,
      entryPrice: 42000.0,
      entrySentiment: 0.58,
      entryReason: 'Overnight crypto momentum spike',
      entrySocialVolume: 560,
      entrySources: ['Crypto'],
      peakPrice: 43850.0,
      peakSentiment: 0.66,
    })

    // Add demo staleness analysis
    await ctx.db.insert('stalenessAnalysis', {
      symbol: 'AAPL',
      score: 0.22,
      holdDays: 0.25,
      gainPct: 3.67,
      socialVolumeDecay: 0.12,
      shouldExit: false,
      reasons: ['Recent entry', 'Positive momentum'],
      updatedAt: now,
    })

    await ctx.db.insert('stalenessAnalysis', {
      symbol: 'BTC',
      score: 0.62,
      holdDays: 0.75,
      gainPct: 3.57,
      socialVolumeDecay: 0.48,
      shouldExit: false,
      reasons: ['Crypto volatility elevated'],
      updatedAt: now,
    })

    // Add some demo signals
    const demoSignals = [
      { symbol: 'NVDA', source: 'StockTwits', sentiment: 0.85, timestamp: now - 300000 },
      { symbol: 'TSLA', source: 'Analyst', sentiment: 0.72, timestamp: now - 600000 },
      { symbol: 'BTC', source: 'Crypto', sentiment: 0.78, timestamp: now - 900000 },
    ]

    for (const signal of demoSignals) {
      await ctx.db.insert('signals', {
        ...signal,
        volume: Math.floor(Math.random() * 1000) + 500,
        timestamp: signal.timestamp,
      })
    }

    // Add demo activity logs
    const demoLogs = [
      { agent: 'Analyst', action: 'Scanned 50 stocks', timestamp: now - 60000 },
      { agent: 'Executor', action: 'Bought AAPL', symbol: 'AAPL', timestamp: now - 300000 },
      { agent: 'StockTwits', action: 'Fetched signals', timestamp: now - 600000 },
      { agent: 'Crypto', action: 'Monitoring BTC', symbol: 'BTC', timestamp: now - 900000 },
    ]

    for (const log of demoLogs) {
      await ctx.db.insert('activityLogs', {
        ...log,
        timestamp: log.timestamp,
      })
    }

    return {
      success: true,
      message: `Created ${snapshots.length} portfolio snapshots, 2 positions, 3 signals, 4 activity logs`,
      startingEquity,
      endingEquity: currentEquity,
    }
  },
})

export const clearDemoData = mutation({
  args: {},
  handler: async (ctx) => {
    // Clear all demo data
    const snapshots = await ctx.db.query('portfolioSnapshots').collect()
    for (const s of snapshots) {
      await ctx.db.delete(s._id)
    }

    const positions = await ctx.db.query('positions').collect()
    for (const p of positions) {
      await ctx.db.delete(p._id)
    }

    const signals = await ctx.db.query('signals').collect()
    for (const s of signals) {
      await ctx.db.delete(s._id)
    }

    const logs = await ctx.db.query('activityLogs').collect()
    for (const l of logs) {
      await ctx.db.delete(l._id)
    }

    const positionEntries = await ctx.db.query('positionEntries').collect()
    for (const entry of positionEntries) {
      await ctx.db.delete(entry._id)
    }

    const staleness = await ctx.db.query('stalenessAnalysis').collect()
    for (const item of staleness) {
      await ctx.db.delete(item._id)
    }

    return { success: true, message: 'All demo data cleared' }
  },
})
