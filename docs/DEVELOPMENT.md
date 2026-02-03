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
- `.dev.vars`

3. Start the main stack:

```bash
bun run dev
```

This runs Convex, Next.js, and worker together.

## Worker MCP dependency

The worker expects `MCP_URL` (default `http://localhost:3000/api/mcp`).
This endpoint is served by Next.js (`app/api/mcp/route.ts`), so it comes up automatically with `bun run dev`.

## Helpful Commands

- `bun run next:dev`
- `bun run convex:dev`
- `bun run worker:dev`
- `bun run test`
- `bun run typecheck`
- `bun run lint`
