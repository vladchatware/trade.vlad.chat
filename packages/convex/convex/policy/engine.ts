export interface PolicyConfig {
  maxPositionPctEquity: number
  maxNotionalPerTrade: number
  maxDailyLossPct: number
  cooldownMinutes: number
  maxOpenPositions: number
  approvalTtlSeconds: number
}

export interface PolicyContext {
  order: {
    symbol: string
    side: 'buy' | 'sell'
    qty?: number
    notional?: number
    estimatedPrice: number
  }
  account: {
    equity: number
    cash: number
    buyingPower: number
  }
  positions: Array<{
    symbol: string
    qty: number
    marketValue: number
  }>
  clock: {
    isOpen: boolean
  }
  riskState: {
    killSwitchActive: boolean
    cooldownUntil?: number
    dailyLossUsd: number
  }
}

export interface PolicyViolation {
  rule: string
  message: string
  currentValue: string | number | boolean
  limitValue: string | number | boolean
}

export interface PolicyWarning {
  rule: string
  message: string
}

export interface PolicyResult {
  allowed: boolean
  violations: PolicyViolation[]
  warnings: PolicyWarning[]
}

export class PolicyEngine {
  private config: PolicyConfig

  constructor(config: Partial<PolicyConfig> = {}) {
    this.config = {
      maxPositionPctEquity: 0.2,
      maxNotionalPerTrade: 5000,
      maxDailyLossPct: 0.02,
      cooldownMinutes: 30,
      maxOpenPositions: 10,
      approvalTtlSeconds: 300,
      ...config,
    }
  }

  evaluate(ctx: PolicyContext): PolicyResult {
    const violations: PolicyViolation[] = []
    const warnings: PolicyWarning[] = []

    this.checkKillSwitch(ctx, violations)
    this.checkCooldown(ctx, violations)
    this.checkDailyLossLimit(ctx, violations)
    this.checkTradingHours(ctx, violations)
    this.checkMaxPositions(ctx, violations)
    this.checkNotionalLimit(ctx, violations)
    this.checkPositionSize(ctx, violations, warnings)
    this.checkBuyingPower(ctx, violations)

    return {
      allowed: violations.length === 0,
      violations,
      warnings,
    }
  }

  private checkKillSwitch(ctx: PolicyContext, violations: PolicyViolation[]): void {
    if (ctx.riskState.killSwitchActive) {
      violations.push({
        rule: 'kill_switch',
        message: 'Trading halted: Kill switch is active',
        currentValue: true,
        limitValue: false,
      })
    }
  }

  private checkCooldown(ctx: PolicyContext, violations: PolicyViolation[]): void {
    if (ctx.riskState.cooldownUntil && Date.now() < ctx.riskState.cooldownUntil) {
      const remaining = Math.ceil((ctx.riskState.cooldownUntil - Date.now()) / 60000)
      violations.push({
        rule: 'cooldown',
        message: `In cooldown period. ${remaining} minutes remaining.`,
        currentValue: 'active',
        limitValue: 'expired',
      })
    }
  }

  private checkDailyLossLimit(ctx: PolicyContext, violations: PolicyViolation[]): void {
    const dailyLossPct = ctx.riskState.dailyLossUsd / ctx.account.equity
    if (dailyLossPct >= this.config.maxDailyLossPct) {
      violations.push({
        rule: 'daily_loss_limit',
        message: `Daily loss limit exceeded: ${(dailyLossPct * 100).toFixed(2)}%`,
        currentValue: dailyLossPct,
        limitValue: this.config.maxDailyLossPct,
      })
    }
  }

  private checkTradingHours(ctx: PolicyContext, violations: PolicyViolation[]): void {
    if (!ctx.clock.isOpen && ctx.order.side === 'buy') {
      violations.push({
        rule: 'market_hours',
        message: 'Market is closed. Buy orders not allowed.',
        currentValue: 'closed',
        limitValue: 'open',
      })
    }
  }

  private checkMaxPositions(ctx: PolicyContext, violations: PolicyViolation[]): void {
    const heldSymbols = new Set(ctx.positions.map((p) => p.symbol))
    const isNewPosition = !heldSymbols.has(ctx.order.symbol)

    if (isNewPosition && ctx.positions.length >= this.config.maxOpenPositions) {
      violations.push({
        rule: 'max_positions',
        message: `Maximum positions reached: ${this.config.maxOpenPositions}`,
        currentValue: ctx.positions.length,
        limitValue: this.config.maxOpenPositions,
      })
    }
  }

  private checkNotionalLimit(ctx: PolicyContext, violations: PolicyViolation[]): void {
    const notional = ctx.order.notional || ctx.order.qty! * ctx.order.estimatedPrice

    if (notional > this.config.maxNotionalPerTrade) {
      violations.push({
        rule: 'max_notional',
        message: `Order exceeds maximum notional: $${this.config.maxNotionalPerTrade}`,
        currentValue: notional,
        limitValue: this.config.maxNotionalPerTrade,
      })
    }
  }

  private checkPositionSize(
    ctx: PolicyContext,
    violations: PolicyViolation[],
    warnings: PolicyWarning[]
  ): void {
    if (ctx.order.side === 'buy') {
      const notional = ctx.order.notional || ctx.order.qty! * ctx.order.estimatedPrice
      const positionPct = notional / ctx.account.equity

      if (positionPct > this.config.maxPositionPctEquity) {
        violations.push({
          rule: 'position_size',
          message: `Position size exceeds ${(this.config.maxPositionPctEquity * 100).toFixed(0)}% of equity`,
          currentValue: positionPct,
          limitValue: this.config.maxPositionPctEquity,
        })
      } else if (positionPct > this.config.maxPositionPctEquity * 0.8) {
        warnings.push({
          rule: 'position_size_warning',
          message: `Position size approaching limit: ${(positionPct * 100).toFixed(1)}%`,
        })
      }
    }
  }

  private checkBuyingPower(ctx: PolicyContext, violations: PolicyViolation[]): void {
    if (ctx.order.side === 'buy') {
      const notional = ctx.order.notional || ctx.order.qty! * ctx.order.estimatedPrice

      if (notional > ctx.account.buyingPower) {
        violations.push({
          rule: 'buying_power',
          message: 'Insufficient buying power',
          currentValue: notional,
          limitValue: ctx.account.buyingPower,
        })
      }
    }
  }
}

export function createPolicyEngine(config?: Partial<PolicyConfig>): PolicyEngine {
  return new PolicyEngine(config)
}
