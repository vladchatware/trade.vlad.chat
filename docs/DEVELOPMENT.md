# Development

## Prereqs

- Node.js 18+
- Bun 1.1+

## Setup

1. Install deps:

```bash
bun install
```

2. Create env files:
- `.env.local`

3. Start the main stack:

```bash
bun run dev
```

This runs Convex, Next.js, and worker together.

## Worker Runtime Notes

- Worker ingestion is API-direct (Alpaca + StockTwits) and writes to Convex.
- It requires `CONVEX_URL` (or `NEXT_PUBLIC_CONVEX_URL`) plus Alpaca credentials.
- Trading decisions/execution are scheduled by Convex crons (`convex/crons.ts`), not by the worker.

## Helpful Commands

- `bun run next:dev`
- `bun run convex:dev`
- `bun run worker:dev`
- `bun run test`
- `bun run typecheck`
- `bun run lint`
