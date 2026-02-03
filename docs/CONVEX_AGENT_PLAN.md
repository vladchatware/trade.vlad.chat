# Convex Agent Fundamentals Plan

## Objective
Rebuild trading decision flow so Convex Agent runs in cron, reads Convex state, and executes through explicit tools.

## Scope
- Keep worker sync-only (ingest -> Convex).
- Move decision logic into Convex Agent action.
- Expose MCP-equivalent tools inside Convex Agent (`accountGet`, `positionsGet`, `marketClock`, `signalsTop`, `tradeBuy`, `tradeSell`).
- Keep Next.js as Convex reader only.

## Implementation Steps
1. Define Convex Agent component in `convex/convex.config.ts`.
2. Define a module-level `Agent` instance in `convex/convexAgent.ts`.
3. Use `createThread` + `agent.generateText` inside `runCycle` action.
4. Feed decision prompt from Convex snapshot.
5. Keep cron entrypoint on `api.convexAgent.runCycle`.
6. Add/maintain tests for prompt contract and decision-cycle scaffolding.

## Status
- [x] Step 1
- [x] Step 2
- [x] Step 3
- [x] Step 4
- [x] Step 5
- [x] Step 6 (prompt contract test)

## Follow-up
- Tighten tool sizing logic (currently fixed qty for buy tool).
- Add action-level integration tests with mocked Convex calls.
- Re-run full Convex typecheck after global TS2589 issue is resolved.
