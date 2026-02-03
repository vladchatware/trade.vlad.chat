# Convex V2 Rewrite Plan

## Goal
Rebuild Convex from a clean baseline and migrate legacy behavior in small, verified slices.

## Baseline (this cycle)
- Clean schema + core state modules (`config`, `status`, `riskState`, `activityLogs`)
- First Convex Agent (`agent.runCycle`) using `Agent + createThread + generateText`
- Minimal cron wiring for agent cycle
- Real execution baseline with approval gating (`tradingActions`, `orderApprovals`, real Alpaca order submit)

## Migration slices (ordered)
1. **State ingestion parity** ✅ (current)
   - Ported: `account`, `positions`, `marketClock`, `portfolioSnapshots`, `positionHistory`, `signalsQueries.create`
   - Worker sync mutations now have first-class Convex targets again
2. **Signal parity** ✅
  - Ported: `signalsQueries` create/top/latest/crypto
  - Ported: `secEdgar.poll/getLatest/ingestCurrentFilings` + `rawEvents.insertIfMissing` + cron wiring ✅
  - Ported: `llmActions.researchSignal` + `providers/llm.completeWithGateway/calculateCost` ✅
  - Ported: `technicals.get` + `providers/technicals` indicator engine ✅
  - Ported: `scraper.scrape` + extraction helpers ✅
  - Note: standalone Convex signal ingestion cron is optional fallback; worker-driven ingestion is canonical.
3. **Risk and approvals parity** ✅ (expanded)
   - Ported `orderApprovals` store + token lifecycle (`create/getByToken/markUsed/cleanupExpired`)
   - `tradingActions.previewOrder` now evaluates policy and mints approval tokens
   - `tradingActions.submitOrder` now enforces kill-switch + approval token validity
   - Ported `policy/engine` module and wired policy evaluation in preview path
4. **Execution parity**
  - Port preview/submit/close actions with tests ✅
  - Ported deterministic trading loop module (`tradingAgent.runTrading`) with helper tests ✅
  - Ported 24/7 crypto loop module (`cryptoAgent.runCryptoTrading`) with helper tests ✅
  - Ported `trades` persistence + order lifecycle writes in `tradingActions` ✅
  - Ported `cronTasks` parity (`operations.ingestSecEdgar/marketOpenPrep/marketCloseCleanup/midnightReset/hourlyCacheRefresh`) ✅
  - Cron wiring now includes trading, crypto, agent, ops, and approvals cleanup jobs ✅
5. **Analytics parity**
  - Ported `dashboardActions.getFullStatus` baseline + derived P/L metrics ✅
  - Ported `staleness.compute` + status exposure + cron wiring ✅
  - Ported `llmCosts.track/getStats` + status LLM stats aggregation ✅
  - Ported `overnight.computeOvernightActivity` + `generatePremarketPlan` + status exposure + cron wiring ✅
  - Pending: advanced dashboard enrichments

## Rules
- One slice per cycle.
- No suppressions unless justified by failing test and documented issue.
- Every slice must ship with targeted tests.

## Compatibility Notes
- Added legacy path shims for `convexAgent.ts` and `cronTasks.ts`.
- Added explicit compatibility shim for `lib/positionEntries.ts` (deprecated; staleness now tracks `trackedSince` directly).
