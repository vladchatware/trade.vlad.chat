# trade.vlad.chat Agent Rules (Codex)

Use this file as the operating policy for autonomous or semi-autonomous Codex runs in this repository.

## Core Cycle

Every run must follow this cycle:

1. **Pick one objective**
   - Exactly one measurable objective per cycle (bug fix, refactor slice, test gap, docs gap).
2. **Lock scope**
   - Touch only files needed for the chosen objective.
   - Do not include opportunistic cleanup unless explicitly requested.
3. **Timebox**
   - Target 45-90 minutes.
   - If unfinished, stop with a clean handoff and next-step plan.
4. **Validate**
   - Run targeted checks for touched areas (typecheck/tests/lint/build as relevant).
   - Report commands and outcomes.
5. **Commit gate**
   - Only propose commit when objective + validation are complete.
   - Use small atomic commits.
6. **Cycle report**
   - Always output: objective, changed files, validation results, risks, next cycle candidate.
   - Keep reports laconic: short bullets, no long narrative.

## Communication Contract (Laconic + Robust)

- Be concise by default:
  - Use short, direct sentences.
  - Prefer bullets over paragraphs.
  - Skip non-essential background unless asked.
- Be robust by default:
  - State assumptions explicitly.
  - Call out blockers immediately.
  - Do not claim success without validation evidence.
- Response size targets:
  - Normal update: 5-10 lines.
  - Substantial change: 12-20 lines max.
  - Include extra detail only when requested.

## Decision Rules

- If two options are both viable, choose the safer/simpler one.
- If a change increases risk, add a guardrail or test in the same cycle.
- If uncertain, stop and present 2-3 concrete options with tradeoffs.

## Architecture Guardrails (Keep It Tight)

- Single source of truth for config defaults:
  - Put canonical defaults in one shared module.
  - Derive worker/UI/Convex shapes from that source; do not duplicate values.
- Keep one persistence path for runtime config:
  - Prefer Convex as durable source.
  - Treat local JSON as temporary cache/fallback only, not a second authority.
- Keep env loading minimal:
  - Do not re-load `.env.local` manually when runtime already does it.
  - Add loaders only for truly missing sources.

## Complexity Budget

- Prefer pure functions and small factories over classes unless lifecycle/state requires a class.
- Do not introduce wrapper layers that only forward 1-2 calls.
- Keep cyclomatic complexity low:
  - Split branches into helpers early.
  - Favor table-driven maps/strategies over nested conditionals.
- If complexity increases, add a short note explaining why it is unavoidable.

## Safety Rules (Trading/Critical Logic)

- Never merge behavior-changing trade execution logic without:
  - explicit risk-limit verification, and
  - evidence from dry-run/simulation or equivalent test path.
- Prefer fail-safe behavior when config/env is missing.
- Keep kill-switch and risk controls intact; do not weaken guardrails in the same cycle as feature work.
- Ensure decision/execution path is observable:
  - log cycle start/skip reason,
  - candidate selection reason,
  - submit success/failure reason.

## Work-in-Progress Limits

- Max 1 in-progress objective per working branch.
- If blocked for >15 minutes, switch to an unblock cycle:
  - improve observability/logging,
  - add a reproducible test,
  - document blocker + options.

## Branch and Commit Conventions

- Branch names: `codex/<short-scope>`
- Conventional commits:
  - `feat(scope): ...`
  - `fix(scope): ...`
  - `refactor(scope): ...`
  - `test(scope): ...`
  - `docs(scope): ...`

## Default Validation Checklist

Use the smallest set that proves correctness for the change:

- `bun run typecheck`
- `bun run test` (or targeted test command)
- `bun run lint` (or targeted lint command)
- `bunx convex dev --once` when Convex functions/types are affected

## Required Output Template (end of each cycle)

```md
Objective: <single objective>
Status: <done|partial|blocked>

Changed files:
- path/to/file

Validation:
- <command> -> <pass|fail> (<short note>)

Risks/Notes:
- <key risk or assumption>

Next cycle candidate:
- <one clear next objective>
```

Keep this template terse and evidence-first.
