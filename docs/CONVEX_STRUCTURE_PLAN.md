# Convex Structure Plan (Flat Domains, No `features/`)

## Objective
Reorganize `convex/` into maintainable domain folders without changing runtime behavior or Convex API names.

## Target Layout
- `convex/trading/` - trading loops, order actions, approvals, risk policy wiring
- `convex/signals/` - signal ingestion/research, SEC/scraper/technicals helpers
- `convex/portfolio/` - account, positions, history, snapshots, staleness
- `convex/system/` - config, status, logs, crons, operations, agent orchestration
- `convex/shared/` - providers + shared helpers/shims only
- `convex/tests/` - tests grouped by domain
- Root `convex/*.ts` files remain as thin re-export entrypoints for stable `api.<module>.*` paths

## Phased Execution
### Phase 1 - Mapping + Safety Guardrails
- Create old->new path mapping table. ✅
- Mark Node-runtime entrypoints that must keep `'use node'` at root facades. ✅
- Freeze API entry filenames at root. ✅

## Phase 1 Output

### 1) Frozen Root API Entry Files (must remain at `convex/<name>.ts`)
`account`, `activityLogs`, `agent`, `config`, `convexAgent`, `cronTasks`, `crons`, `cryptoAgent`,
`dashboardActions`, `llmActions`, `llmCosts`, `marketClock`, `operations`, `orderApprovals`,
`overnight`, `portfolio`, `positionHistory`, `positions`, `rawEvents`, `riskState`, `schema`,
`scraper`, `secEdgar`, `signals`, `signalsQueries`, `staleness`, `status`, `technicals`,
`trades`, `tradingActions`, `tradingAgent`.

### 2) Node-Runtime Root Facades (must keep `'use node'`)
`agent.ts`, `convexAgent.ts`, `cronTasks.ts`, `cryptoAgent.ts`, `dashboardActions.ts`,
`llmActions.ts`, `operations.ts`, `scraper.ts`, `secEdgar.ts`, `signals.ts`, `technicals.ts`,
`tradingActions.ts`, `tradingAgent.ts`.

### 3) Old -> New Mapping Table (implementation target paths)

#### Trading Domain
- `convex/tradingActions.ts` -> `convex/trading/actions.ts`
- `convex/tradingAgent.ts` -> `convex/trading/agent.ts`
- `convex/cryptoAgent.ts` -> `convex/trading/cryptoAgent.ts`
- `convex/orderApprovals.ts` -> `convex/trading/orderApprovals.ts`
- `convex/trades.ts` -> `convex/trading/trades.ts`
- `convex/policy/engine.ts` -> `convex/trading/policy/engine.ts`

#### Signals Domain
- `convex/signals.ts` -> `convex/signals/ingestion.ts`
- `convex/signalsQueries.ts` -> `convex/signals/queries.ts`
- `convex/llmActions.ts` -> `convex/signals/research.ts`
- `convex/secEdgar.ts` -> `convex/signals/secEdgar.ts`
- `convex/rawEvents.ts` -> `convex/signals/rawEvents.ts`
- `convex/scraper.ts` -> `convex/signals/scraper.ts`
- `convex/technicals.ts` -> `convex/signals/technicals.ts`

#### Portfolio Domain
- `convex/account.ts` -> `convex/portfolio/account.ts`
- `convex/positions.ts` -> `convex/portfolio/positions.ts`
- `convex/positionHistory.ts` -> `convex/portfolio/positionHistory.ts`
- `convex/portfolio.ts` -> `convex/portfolio/snapshots.ts`
- `convex/marketClock.ts` -> `convex/portfolio/marketClock.ts`
- `convex/staleness.ts` -> `convex/portfolio/staleness.ts`
- `convex/overnight.ts` -> `convex/portfolio/overnight.ts`

#### System Domain
- `convex/agent.ts` -> `convex/system/agent.ts`
- `convex/convexAgent.ts` -> removed (merged into `convex/system/agent.ts`)
- `convex/cronTasks.ts` -> removed (merged into `convex/system/operations.ts`)
- `convex/crons.ts` -> `convex/system/crons.ts`
- `convex/operations.ts` -> `convex/system/operations.ts`
- `convex/status.ts` -> `convex/system/status.ts`
- `convex/config.ts` -> `convex/system/config.ts`
- `convex/riskState.ts` -> `convex/system/riskState.ts`
- `convex/activityLogs.ts` -> `convex/system/activityLogs.ts`
- `convex/llmCosts.ts` -> `convex/system/llmCosts.ts`

#### Shared/Internal
- `convex/providers/alpaca.ts` -> `convex/shared/providers/alpaca.ts`
- `convex/providers/llm.ts` -> `convex/shared/providers/llm.ts`
- `convex/providers/technicals.ts` -> `convex/shared/providers/technicals.ts`
- `convex/lib/positionEntries.ts` -> `convex/shared/compat/positionEntries.ts`
- `convex/schema.ts` -> `convex/schema.ts` (no move)
- `convex/convex.config.ts` -> `convex/convex.config.ts` (no move)

### 4) Test Mapping Rule
- `convex/*.test.ts` and nested tests -> `convex/tests/**` grouped by domain.
- Keep import style explicit:
  - public-surface tests import from `../<root-module>`
  - internal-helper tests import from `../<domain-path>/<file>`

### Phase 2 - File Moves (No Logic Changes)
- Move implementation files into domain folders. ✅
- Keep root entry files as re-export facades. ✅
- Move tests into `convex/tests/` and update import paths. ✅

### Phase 3 - Import/Runtime Cleanup
- Fix relative imports after moves.
- Ensure providers/policy/lib paths resolve.
- Ensure Node runtime files are correctly annotated.

### Phase 4 - Validation Gate
- `bun run typecheck`
- `bun run test convex/tests`
- `bunx biome check convex`
- `bunx convex dev --once`

### Phase 5 - Final Cleanup
- Remove obsolete compatibility shims only if no imports remain.
- Add/update `convex/README.md` with contribution rules.

## Non-Goals
- No behavior change.
- No API renaming.
- No config/schema semantic changes.

## Rollback Plan
If any phase breaks runtime or typing, restore phase with `git restore` and retry with narrower move slices.
