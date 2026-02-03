import { defineSchema, defineTable } from 'convex/server'
import { v } from 'convex/values'

export default defineSchema({
  // Trading data
  trades: defineTable({
    alpacaOrderId: v.string(),
    symbol: v.string(),
    side: v.string(),
    qty: v.number(),
    orderType: v.string(),
    limitPrice: v.optional(v.number()),
    stopPrice: v.optional(v.number()),
    status: v.string(),
    filledQty: v.optional(v.number()),
    filledAvgPrice: v.optional(v.number()),
    notional: v.optional(v.number()),
    approvalId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index('by_symbol', ['symbol'])
    .index('by_status', ['status'])
    .index('by_alpaca_order_id', ['alpacaOrderId'])
    .index('by_created', ['createdAt']),

  positions: defineTable({
    symbol: v.string(),
    qty: v.number(),
    avgEntryPrice: v.number(),
    currentPrice: v.number(),
    marketValue: v.number(),
    unrealizedPl: v.number(),
    unrealizedPlpc: v.number(),
    updatedAt: v.number(),
  }).index('by_symbol', ['symbol']),

  positionEntries: defineTable({
    symbol: v.string(),
    entryTime: v.number(),
    entryPrice: v.number(),
    entrySentiment: v.number(),
    entryReason: v.string(),
    entrySocialVolume: v.optional(v.number()),
    entrySources: v.optional(v.array(v.string())),
    peakPrice: v.optional(v.number()),
    peakSentiment: v.optional(v.number()),
  }).index('by_symbol', ['symbol']),

  stalenessAnalysis: defineTable({
    symbol: v.string(),
    score: v.number(),
    holdDays: v.number(),
    gainPct: v.number(),
    socialVolumeDecay: v.number(),
    shouldExit: v.boolean(),
    reasons: v.array(v.string()),
    updatedAt: v.number(),
  }).index('by_symbol', ['symbol']),

  // Configuration & State
  config: defineTable({
    maxPositionValue: v.number(),
    maxPositions: v.number(),
    minSentimentScore: v.number(),
    minAnalystConfidence: v.number(),
    sellSentimentThreshold: v.optional(v.number()),
    takeProfitPct: v.number(),
    stopLossPct: v.number(),
    positionSizePctOfCash: v.number(),
    dataPollIntervalMs: v.optional(v.number()),
    analystIntervalMs: v.optional(v.number()),
    llmModel: v.string(),
    llmAnalystModel: v.optional(v.string()),
    llmMaxTokens: v.optional(v.number()),
    startingEquity: v.optional(v.number()),
    optionsEnabled: v.optional(v.boolean()),
    optionsMaxPctPerTrade: v.optional(v.number()),
    optionsMinConfidence: v.optional(v.number()),
    optionsMinDte: v.optional(v.number()),
    optionsMaxDte: v.optional(v.number()),
    optionsTargetDelta: v.optional(v.number()),
    optionsMaxPositions: v.optional(v.number()),
    optionsStopLossPct: v.optional(v.number()),
    optionsTakeProfitPct: v.optional(v.number()),
    cryptoEnabled: v.optional(v.boolean()),
    cryptoSymbols: v.optional(v.array(v.string())),
    cryptoMomentumThreshold: v.optional(v.number()),
    cryptoMaxPositionValue: v.optional(v.number()),
    cryptoTakeProfitPct: v.optional(v.number()),
    cryptoStopLossPct: v.optional(v.number()),
    stalePositionEnabled: v.optional(v.boolean()),
    staleMaxHoldDays: v.optional(v.number()),
    staleMinGainPct: v.optional(v.number()),
    staleSocialVolumeDecay: v.optional(v.number()),
    staleNoMentionsHours: v.optional(v.number()),
    updatedAt: v.number(),
  }),

  riskState: defineTable({
    killSwitchActive: v.boolean(),
    killSwitchReason: v.optional(v.string()),
    dailyLossUsd: v.number(),
    dailyLossResetAt: v.number(),
    cooldownUntil: v.optional(v.number()),
  }),

  // Account data (real-time from Alpaca)
  account: defineTable({
    equity: v.number(),
    cash: v.number(),
    buyingPower: v.number(),
    portfolioValue: v.number(),
    updatedAt: v.number(),
  }),

  // Order approvals (MCP pattern)
  orderApprovals: defineTable({
    previewHash: v.string(),
    orderParamsJson: v.string(),
    policyResultJson: v.string(),
    approvalToken: v.string(),
    expiresAt: v.number(),
    usedAt: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_token', ['approvalToken'])
    .index('by_expires', ['expiresAt']),

  // Signals & Research
  signals: defineTable({
    symbol: v.string(),
    source: v.string(),
    sentiment: v.number(),
    volume: v.number(),
    reason: v.optional(v.string()),
    bullish: v.optional(v.number()),
    bearish: v.optional(v.number()),
    score: v.optional(v.number()),
    isCrypto: v.optional(v.boolean()),
    momentum: v.optional(v.number()),
    price: v.optional(v.number()),
    timestamp: v.number(),
  })
    .index('by_timestamp', ['timestamp'])
    .index('by_symbol', ['symbol']),

  signalResearch: defineTable({
    symbol: v.string(),
    verdict: v.union(v.literal('BUY'), v.literal('SKIP'), v.literal('WAIT')),
    confidence: v.number(),
    entryQuality: v.union(
      v.literal('excellent'),
      v.literal('good'),
      v.literal('fair'),
      v.literal('poor')
    ),
    reasoning: v.string(),
    redFlags: v.array(v.string()),
    catalysts: v.array(v.string()),
    sentiment: v.number(),
    timestamp: v.number(),
  })
    .index('by_symbol', ['symbol'])
    .index('by_timestamp', ['timestamp']),

  // Agent state & logs
  agentState: defineTable({
    status: v.string(),
    lastAnalystRun: v.optional(v.number()),
    lastResearchRun: v.optional(v.number()),
    signalCacheJson: v.optional(v.string()),
    errorMessage: v.optional(v.string()),
    updatedAt: v.number(),
  }),

  overnightActivity: defineTable({
    signalsGathered: v.number(),
    signalsResearched: v.number(),
    buySignals: v.number(),
    twitterConfirmations: v.number(),
    premarketPlanReady: v.boolean(),
    lastUpdated: v.number(),
  }),

  premarketPlans: defineTable({
    timestamp: v.number(),
    summary: v.string(),
    recommendations: v.array(
      v.object({
        symbol: v.string(),
        action: v.union(v.literal('BUY'), v.literal('SELL'), v.literal('HOLD'), v.literal('SKIP')),
        confidence: v.number(),
        reasoning: v.string(),
        entry_price: v.optional(v.number()),
        target_price: v.optional(v.number()),
        stop_loss: v.optional(v.number()),
      })
    ),
    highConvictionPlays: v.array(v.string()),
    marketOutlook: v.string(),
  }).index('by_timestamp', ['timestamp']),

  twitterConfirmations: defineTable({
    symbol: v.string(),
    query: v.string(),
    tweetCount: v.number(),
    sentiment: v.number(),
    bullishCount: v.number(),
    bearishCount: v.number(),
    influencerMentions: v.number(),
    averageEngagement: v.number(),
    timestamp: v.number(),
  })
    .index('by_symbol', ['symbol'])
    .index('by_timestamp', ['timestamp']),

  positionHistory: defineTable({
    symbol: v.string(),
    prices: v.array(v.number()),
    timestamps: v.array(v.number()),
    updatedAt: v.number(),
  }).index('by_symbol', ['symbol']),

  activityLogs: defineTable({
    agent: v.string(),
    action: v.string(),
    symbol: v.optional(v.string()),
    detailsJson: v.optional(v.string()),
    timestamp: v.number(),
  })
    .index('by_timestamp', ['timestamp'])
    .index('by_agent', ['agent']),

  rawEvents: defineTable({
    source: v.string(),
    sourceId: v.string(),
    rawContent: v.string(),
    createdAt: v.number(),
  })
    .index('by_source_sourceId', ['source', 'sourceId'])
    .index('by_created', ['createdAt']),

  // MCP Tool logs
  toolLogs: defineTable({
    requestId: v.string(),
    toolName: v.string(),
    inputHash: v.string(),
    inputJson: v.string(),
    outputJson: v.optional(v.string()),
    errorJson: v.optional(v.string()),
    latencyMs: v.optional(v.number()),
    providerCalls: v.optional(v.number()),
    createdAt: v.number(),
  })
    .index('by_tool', ['toolName'])
    .index('by_request', ['requestId'])
    .index('by_created', ['createdAt']),

  // Memory & Journal
  journal: defineTable({
    tradeId: v.optional(v.string()),
    symbol: v.string(),
    side: v.string(),
    entryPrice: v.optional(v.number()),
    exitPrice: v.optional(v.number()),
    qty: v.number(),
    pnlUsd: v.optional(v.number()),
    pnlPct: v.optional(v.number()),
    holdDurationMins: v.optional(v.number()),
    outcome: v.optional(v.string()),
    notes: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index('by_symbol', ['symbol'])
    .index('by_outcome', ['outcome']),

  memoryRules: defineTable({
    ruleType: v.string(),
    description: v.string(),
    conditionsJson: v.optional(v.string()),
    confidence: v.optional(v.number()),
    source: v.string(),
    active: v.boolean(),
    createdAt: v.number(),
  })
    .index('by_type', ['ruleType'])
    .index('by_active', ['active']),

  // External data
  marketClock: defineTable({
    isOpen: v.boolean(),
    nextOpen: v.string(),
    nextClose: v.string(),
    timestamp: v.number(),
  }),

  // Portfolio snapshots
  portfolioSnapshots: defineTable({
    equity: v.number(),
    pl: v.number(),
    plPct: v.number(),
    timestamp: v.number(),
  }).index('by_timestamp', ['timestamp']),
})
