# Simple Worker Strategy Plan

## Objective

Ship one deterministic, worker-owned strategy that produces high-quality signals and publishes all technical context to Convex.

## Scope (initial)

- Strategy output only (signal generation + logging), no new execution path.
- Markets: equities + crypto.
- Technical computation:
  - Crypto: realtime from Alpaca websocket stream in Bun worker thread.
  - Equity: rolling 1m bars from Alpaca REST.
- Convex is source of truth for strategy config and stored outputs.

## Strategy v1 (deterministic)

- Inputs per symbol:
  - price, momentum %, SMA20, SMA50, RSI14, volume.
- Bullish signal when all true:
  - `RSI14 <= 35`
  - `SMA20 > SMA50`
  - `momentumPct > 0.5`
- Bearish signal when all true:
  - `RSI14 >= 68`
  - `SMA20 < SMA50`
  - `momentumPct < -0.5`
- Otherwise: no signal.

## Convex data model

- `technicalIndicators` table stores latest computed indicators per `(symbol, market, timeframe)`.
- `signals` stores emitted strategy signals (`source = worker_simple_strategy`).
- Future (not now): `strategyConfigs` for multi-strategy thresholds and symbol universe.

## Rollout plan

1. **Stabilize v1 outputs**
   - Ensure worker computes and syncs technicals each cycle.
   - Ensure strategy emits only deterministic signals.
2. **Configurability**
   - Move thresholds/symbol sets to Convex config.
   - Keep deterministic evaluator in worker.
3. **Observability**
   - Add per-cycle counts: symbols scanned, technicals synced, signals emitted/skipped.
4. **Execution follow-up**
   - Add separate objective to consume these signals in existing execution flow (risk gates unchanged).

## Acceptance criteria

- For configured symbols, Convex shows fresh technical rows with expected fields.
- Strategy emits repeatable signals for identical input snapshots.
- Crypto symbols continue updating from websocket path under normal operation.
- No LLM dependency in signal-generation path.
