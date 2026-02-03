import { DEFAULT_LLM_ANALYST_MODEL, DEFAULT_LLM_MODEL } from './llmCatalog'

export type TradingConfig = {
  maxPositionValue: number
  maxPositions: number
  minSentimentScore: number
  minAnalystConfidence: number
  minVolume: number
  sellSentimentThreshold: number
  takeProfitPct: number
  stopLossPct: number
  positionSizePctOfCash: number
  dataPollIntervalMs: number
  analystIntervalMs: number
  llmModel: string
  llmAnalystModel: string
  llmMaxTokens: number
  startingEquity: number
  optionsEnabled: boolean
  optionsMaxPctPerTrade: number
  optionsMinConfidence: number
  optionsMinDte: number
  optionsMaxDte: number
  optionsTargetDelta: number
  optionsMaxPositions: number
  optionsStopLossPct: number
  optionsTakeProfitPct: number
  cryptoEnabled: boolean
  cryptoSymbols: string[]
  cryptoMomentumThreshold: number
  cryptoMaxPositionValue: number
  cryptoTakeProfitPct: number
  cryptoStopLossPct: number
  stalePositionEnabled: boolean
  staleMaxHoldDays: number
  staleMinGainPct: number
  staleSocialVolumeDecay: number
  staleNoMentionsHours: number
}

export const DEFAULT_TRADING_CONFIG: TradingConfig = {
  maxPositionValue: 2000,
  maxPositions: 3,
  minSentimentScore: 0.4,
  minAnalystConfidence: 0.8,
  minVolume: 10,
  sellSentimentThreshold: 0,
  takeProfitPct: 8,
  stopLossPct: 4,
  positionSizePctOfCash: 20,
  dataPollIntervalMs: 60_000,
  analystIntervalMs: 120_000,
  llmModel: DEFAULT_LLM_MODEL,
  llmAnalystModel: DEFAULT_LLM_ANALYST_MODEL,
  llmMaxTokens: 500,
  startingEquity: 100000,
  optionsEnabled: false,
  optionsMaxPctPerTrade: 2,
  optionsMinConfidence: 0.75,
  optionsMinDte: 7,
  optionsMaxDte: 45,
  optionsTargetDelta: 0.35,
  optionsMaxPositions: 3,
  optionsStopLossPct: 50,
  optionsTakeProfitPct: 100,
  cryptoEnabled: false,
  cryptoSymbols: ['BTC/USD', 'ETH/USD', 'SOL/USD'],
  cryptoMomentumThreshold: 2,
  cryptoMaxPositionValue: 1000,
  cryptoTakeProfitPct: 10,
  cryptoStopLossPct: 5,
  stalePositionEnabled: true,
  staleMaxHoldDays: 3,
  staleMinGainPct: 5,
  staleSocialVolumeDecay: 0.3,
  staleNoMentionsHours: 8,
}

export function withTradingConfigDefaults(overrides: Partial<TradingConfig> = {}): TradingConfig {
  return { ...DEFAULT_TRADING_CONFIG, ...overrides }
}

export type WorkerAgentConfig = {
  mcp_url: string
  data_poll_interval_ms: number
  analyst_interval_ms: number
  max_position_value: number
  max_positions: number
  min_sentiment_score: number
  min_volume: number
  take_profit_pct: number
  stop_loss_pct: number
  position_size_pct_of_cash: number
  crypto_enabled: boolean
  crypto_symbols: string[]
  crypto_momentum_threshold: number
  crypto_max_position_value: number
  crypto_take_profit_pct: number
  crypto_stop_loss_pct: number
  llm_model: string
  llm_analyst_model: string
  llm_max_tokens: number
  starting_equity: number
}

export function toWorkerAgentConfig(
  config: Partial<TradingConfig>,
  mcpUrl: string
): WorkerAgentConfig {
  const merged = withTradingConfigDefaults(config)
  return {
    mcp_url: mcpUrl,
    data_poll_interval_ms: merged.dataPollIntervalMs,
    analyst_interval_ms: merged.analystIntervalMs,
    max_position_value: merged.maxPositionValue,
    max_positions: merged.maxPositions,
    min_sentiment_score: merged.minSentimentScore,
    min_volume: merged.minVolume,
    take_profit_pct: merged.takeProfitPct,
    stop_loss_pct: merged.stopLossPct,
    position_size_pct_of_cash: merged.positionSizePctOfCash,
    crypto_enabled: merged.cryptoEnabled,
    crypto_symbols: merged.cryptoSymbols,
    crypto_momentum_threshold: merged.cryptoMomentumThreshold,
    crypto_max_position_value: merged.cryptoMaxPositionValue,
    crypto_take_profit_pct: merged.cryptoTakeProfitPct,
    crypto_stop_loss_pct: merged.cryptoStopLossPct,
    llm_model: merged.llmModel,
    llm_analyst_model: merged.llmAnalystModel,
    llm_max_tokens: merged.llmMaxTokens,
    starting_equity: merged.startingEquity,
  }
}
