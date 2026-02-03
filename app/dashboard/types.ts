export interface Config {
  maxPositionValue: number
  maxPositions: number
  minSentimentScore: number
  minAnalystConfidence: number
  sellSentimentThreshold?: number
  takeProfitPct: number
  stopLossPct: number
  positionSizePctOfCash: number
  dataPollIntervalMs?: number
  analystIntervalMs?: number
  llmModel: string
  llmAnalystModel?: string
  llmMaxTokens?: number
  cryptoEnabled?: boolean
  cryptoSymbols?: string[]
  startingEquity?: number
  optionsEnabled?: boolean
  optionsTargetDelta?: number
  optionsMinDte?: number
  optionsMaxDte?: number
  optionsMaxPctPerTrade?: number
  optionsMinConfidence?: number
  optionsMaxPositions?: number
  optionsStopLossPct?: number
  optionsTakeProfitPct?: number
  cryptoMomentumThreshold?: number
  cryptoMaxPositionValue?: number
  cryptoTakeProfitPct?: number
  cryptoStopLossPct?: number
  stalePositionEnabled?: boolean
  staleMaxHoldDays?: number
  staleMinGainPct?: number
  staleSocialVolumeDecay?: number
  staleNoMentionsHours?: number
}

export interface SignalResearch {
  symbol?: string
  verdict?: string
  entryQuality?: string
  reasoning?: string
  redFlags?: string[]
  confidence?: number
  sentiment?: number
  timestamp?: number
  catalysts?: string[]
}

export interface PositionEntry {
  entry_time: number
  entry_price: number
  entry_sentiment: number
  entry_reason: string
}

export interface StalenessAnalysis {
  score: number
  shouldExit: boolean
}

export interface PositionRow {
  symbol: string
  currentPrice?: number
  avgEntryPrice?: number
  unrealizedPl?: number
  marketValue?: number
  qty?: number
  _id?: string
}

export interface SignalRow {
  _id?: string
  symbol: string
  source?: string
  sentiment?: number
  volume?: number
  reason?: string
  bullish?: number
  bearish?: number
  score?: number
  upvotes?: number
  isCrypto?: boolean
  momentum?: number
  price?: number
}

export interface LogRow {
  _id?: string
  agent?: string
  action?: string
  symbol?: string
  detailsJson?: string
  timestamp?: number
}

export interface LlmStats {
  totalUsd: number
  calls: number
  tokensIn: number
  tokensOut: number
}

export interface OvernightActivity {
  signalsGathered: number
  signalsResearched: number
  buySignals: number
  twitterConfirmations: number
  premarketPlanReady: boolean
  lastUpdated: number
}

export interface PremarketPlan {
  timestamp: number
  summary: string
  recommendations: Array<{
    symbol: string
    action: 'BUY' | 'SELL' | 'HOLD' | 'SKIP'
    confidence: number
    reasoning: string
    entry_price?: number
    target_price?: number
    stop_loss?: number
  }>
  highConvictionPlays: string[]
  marketOutlook: string
}
