# Architecture

## Canonical Stack

1. **Next.js app** (`app/`, `components/`) for the operator dashboard (read from Convex)
2. **Bun worker** (`worker/`) for market/account/signal ingestion into Convex (no trade decisioning)
3. **Convex backend** (`convex/`) for state, risk controls, and cron-based trading agent execution

## Data/Control Flow

1. Worker reads broker + social data directly from upstream APIs and writes to Convex.
2. Convex cron jobs run deterministic trading loops and the Convex Agent.
3. Convex stores portfolio, logs, config, and derived status.
4. Next.js subscribes to Convex in real time for dashboard updates (read path only).

## Convex Cron Jobs

All cron jobs are registered in `convex/crons.ts`.

- `run-trading` (`*/2 13-20 * * 1-5`) -> `api.trading.agent.runTrading`
- `run-crypto` (every 120s) -> `api.trading.cryptoAgent.runCryptoTrading`
- `agent-v2-cycle` (`*/10 13-20 * * 1-5`) -> `api.system.agent.runCycle`
- `sec-edgar-ingest` (`*/5 13-20 * * 1-5`) -> `api.system.operations.ingestSecEdgar`
- `market-open-prep` (`0 14 * * 1-5`) -> `api.system.operations.marketOpenPrep`
- `market-close-cleanup` (`30 21 * * 1-5`) -> `api.system.operations.marketCloseCleanup`
- `midnight-reset` (`0 5 * * *`) -> `api.system.operations.midnightReset`
- `hourly-cache-refresh` (`0 * * * *`) -> `api.system.operations.hourlyCacheRefresh`
- `cleanup-order-approvals` (every 15m) -> `api.trading.orderApprovals.cleanupExpired`
- `compute-staleness` (every 10m) -> `api.portfolio.staleness.compute`
- `overnight-activity-rollup` (`0 * * * *`) -> `api.portfolio.overnight.computeOvernightActivity`
- `premarket-plan` (`30 12 * * 1-5`) -> `api.portfolio.overnight.generatePremarketPlan`

## Notes

- Worker requires Alpaca credentials and Convex URL for ingestion.
- Next.js is not in the worker data path.
