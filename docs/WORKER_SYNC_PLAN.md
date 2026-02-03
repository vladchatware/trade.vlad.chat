# Worker Sync-Only Redesign Plan

## Objective

Convert the Bun worker into a **sync-only ingestion process** that keeps Convex state updated from upstream broker/social APIs, and remove all trade-decision / trade-execution logic from the worker.

## References Used

- Legacy runner flow: `main:agent-v1.mjs` (single-process loop with MCP tool calls)
- Current Convex sync shape: `convex/tradingAgent.ts` (`gatherData`) and related mutations (`account`, `positions`, `positionHistory`, `portfolio`)

## Scope

1. Add a dedicated Convex sync module in worker.
2. Replace orchestrator logic with a sync loop:
   - read account/positions/clock from Alpaca
   - read sentiment signals from StockTwits
   - write account/positions/history/snapshot to Convex
   - log sync success/failure
3. Remove worker trading strategy code paths.
4. Add tests proving:
   - sync mapping calls expected Convex mutations
   - worker does not execute trade tools (`trade-buy`, `trade-sell`)

## Implementation Steps

1. **Convex sync port**
   - create `worker/agent/convex-sync.ts`
   - implement account/positions/history/snapshot/clock/signal upserts
2. **Orchestrator rewrite (sync-only)**
   - remove gather-signals and trading loops from worker orchestrator
   - run one periodic `runSyncCycle` on `data_poll_interval_ms`
3. **Delete dead strategy modules**
   - remove worker-only strategy/executor modules no longer referenced
4. **Tests**
   - add `convex-sync.test.ts`
   - replace orchestrator tests with sync-oriented behavior checks

## Validation

- `bun run vitest run worker/agent/convex-sync.test.ts worker/agent/orchestrator.test.ts`
- `bun run typecheck`
- `bunx biome check <touched worker files>`

## Risks / Guardrails

- If `NEXT_PUBLIC_CONVEX_URL` / `CONVEX_URL` is missing, fail-safe: skip sync and log explicit error.
- Preserve existing API surface (`/api/status`, `/api/config`, `/api/logs`) for dashboard compatibility.
