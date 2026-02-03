# MAHORAGA

Autonomous trading system built around **Next.js + Convex + Bun worker**.

## Runtime Layout

- `app/` + `components/` — Next.js dashboard UI
- `app/api/mcp/route.ts` — local MCP server hosted inside Next.js via `mcp-handler`
- `convex/` — data model, actions, queries, and scheduled jobs
- `worker/` — Bun worker/orchestrator for continuous execution

## Quick Start

### 1) Install

```bash
bun install
```

### 2) Configure env

Create:
- `.env.local` for Next/Convex/worker + MCP env

Required keys (minimum):

```bash
ALPACA_API_KEY=...
ALPACA_API_SECRET=...
ALPACA_PAPER=true
AI_GATEWAY_API_KEY=...
AI_GATEWAY_URL=https://ai-gateway.vercel.sh/v1
KILL_SWITCH_SECRET=...
NEXT_PUBLIC_CONVEX_URL=...
```

### 3) Start the stack

```bash
bun run dev
```

This starts:
- Convex dev server
- Next.js dashboard
- Bun worker

### 4) Ensure MCP server is running for worker tools

The worker expects `MCP_URL` and now defaults to `http://localhost:3000/api/mcp`, which is served by the Next.js app in `bun run dev`.

## Scripts

- `bun run dev` — Convex + Next.js + worker
- `bun run convex:dev` — Convex only
- `bun run next:dev` — Next.js only
- `bun run worker:dev` — worker only
- `bun run build` — Next.js production build
- `bun run test` — unit tests
- `bun run typecheck` — TypeScript checks
- `bun run lint` — Biome checks

## Current Direction

- Keep: Next.js dashboard, Convex backend, Bun worker
- Removed: legacy Vite dashboard and old `agent-v1.mjs`
