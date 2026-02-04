# Worker Deep Dive (Assessment)

## Why this exists

The worker is currently hard to reason about because responsibilities are mixed across ingestion, execution, scheduling, and API surface in one orchestration path.

This document maps what we have and a concrete cleanup path.

## Current shape

- Entry point: `worker/index.ts`
  - Instantiates orchestrator.
  - Starts local HTTP API (`worker/agent/api.ts`).
  - Starts loops via `orchestrator.run()`.
- Core engine: `worker/agent/orchestrator.ts`
  - Sync loop (account/positions/clock/signals -> Convex).
  - Trading decision loop (`system/agent:runCycle`).
  - Crypto execution loop (`trading/cryptoAgent:runCryptoTrading`).
  - In-memory status model for dashboard API.
- Data acquisition: `worker/agent/data-sources.ts`
  - StockTwits pull.
  - Alpaca REST snapshot pull.
  - Alpaca crypto realtime worker thread (`crypto-stream.worker.ts`) + cache.
- Convex bridge: `worker/agent/convex-sync.ts`
  - HTTP mutations/actions to Convex.
- Local persistence:
  - Config file: `agent-config.json`.
  - Logs file: `agent-logs.json`.

## Main pain points

1. **Too much orchestration in one file**
   - `worker/agent/orchestrator.ts` owns loop policy, concurrency locks, timeout policy, status model, and side-effect execution.
   - This makes change risk high and testing broader than needed.

2. **Mixed concerns in data-sources**
   - `worker/agent/data-sources.ts` combines:
     - stock/equity sentiment collection,
     - broker snapshots,
     - crypto momentum math,
     - websocket subscription lifecycle.
   - This should be split by domain and update cadence.

3. **Dual persistence model is implicit**
   - Local JSON (`agent-config.json`, `agent-logs.json`) + Convex state both exist.
   - Intended authority is Convex, but worker still treats local files as first-class runtime state.

4. **HTTP API is still tightly coupled to orchestrator internals**
   - `worker/agent/api.ts` exposes live status by calling orchestrator internals directly.
   - No explicit contract layer/versioning for API payload shape.

5. **Loop intervals are derived, not explicit policy**
   - Crypto loop interval is derived from analyst interval (`max(5s, min(analyst, 15s))`).
   - Operational tuning should be explicit and independently configurable.

## What is solid already

- Crypto stream was moved to a separate Bun worker thread (`worker/agent/crypto-stream.worker.ts`), which is the right direction for responsiveness.
- Convex cron dependency for crypto/agent loops was removed; worker drives fast cycles.
- Timeout/in-flight protections are present for execution loops.

## Refactor plan (practical)

### Phase 1: Structure and boundaries (low risk)

- Split `orchestrator.ts` into:
  - `loops/sync-loop.ts`
  - `loops/trading-loop.ts`
  - `loops/crypto-loop.ts`
  - `status/store.ts` (in-memory status model)
- Keep existing behavior and payloads unchanged.

### Phase 2: Data-source separation

- Split `data-sources.ts` into:
  - `sources/stocktwits.ts`
  - `sources/alpaca-snapshot.ts`
  - `sources/crypto-momentum.ts`
  - `sources/crypto-stream-client.ts` (main-thread facade)
  - `sources/crypto-stream.worker.ts` (already exists)

### Phase 3: Configuration and runtime policy

- Add explicit worker runtime settings in config:
  - `crypto_loop_interval_ms`
  - `trading_loop_interval_ms`
  - `loop_timeout_trading_ms`
  - `loop_timeout_crypto_ms`
- Stop deriving loop intervals from unrelated settings.

### Phase 4: API contract hardening

- Move API response types to `worker/agent/contracts.ts`.
- Validate outgoing payload shape in one place.
- Keep API thin; no direct orchestration logic in route handlers.

## Recommended immediate next objective

**Objective:** Extract loop runners out of `orchestrator.ts` without changing behavior.

Success criteria:
- `orchestrator.ts` becomes a wiring file only.
- Existing tests pass unchanged.
- No route payload changes.
