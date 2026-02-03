# MAHORAGA Migration Plan (Comprehensive)

## 0) Scope and Goals
- Achieve feature parity between the legacy Cloudflare Workers + Vite dashboard and the new Next.js + Convex stack.
- Preserve existing UI/UX affordances, trading controls, and data visibility.
- Maintain operational safety (approvals, risk guards) and data integrity.

## 1) Dashboard UI Parity
- Restore Setup Wizard flow in Next.js (risk disclaimer + API key entry).
- Restore Notification Bell for overnight activity + premarket plan.
- Reintroduce advanced position tooltips (entry data + staleness).
- Reinstate full footer indicators (options/crypto status).
- Validate component-level parity (Panel/Metric/LineChart/Tooltip) vs legacy dashboard.

## 2) Config/Settings Parity
- Expand config model to include missing fields:
  - data_poll_interval_ms, analyst_interval_ms
  - sell_sentiment_threshold
  - llm_analyst_model, llm_max_tokens
  - options trading config
  - crypto trading config
  - stale position management config
  - starting_equity
- Update SettingsModal to surface full config set.
- Ensure updates are persisted via Convex mutation.

## 3) Data Model + Status Parity
- Extend Convex schema and status response to include:
  - overnightActivity
  - premarketPlan
  - stalenessAnalysis
  - positionEntries
  - twitterConfirmations
  - positionHistory
- Maintain stable return shapes for dashboard consumption.

## 4) Backend/Provider Parity
- Port missing providers:
  - technicals (indicators + signals)
  - scraper (domain-limited fetch + extract)
  - SEC Edgar provider
- Reintegrate MCP agent tooling if still required.
- Reintroduce approval-token logic if order approvals are used.
- Confirm provider outputs match UI expectations.

## 5) Cron/Task Parity
- Add market open prep, close cleanup, daily resets, cache refresh.
- Reinstate event ingestion for SEC Edgar.
- Ensure scheduling aligns with market hours and risk state.

## 6) Testing + Validation
- Validate UI parity through manual smoke checklist.
- Add/adjust tests for config updates and status response shape.
- Confirm non-regression of existing Next.js and Convex features.

## 7) Documentation
- Update README/MIGRATION_COMPLETE.md with final parity status.
- Document remaining differences or intentional exclusions.
