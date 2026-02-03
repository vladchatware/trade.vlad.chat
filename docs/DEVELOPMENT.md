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

The worker expects `MCP_URL` (default `http://localhost:8787/mcp`).

If using the in-repo MCP server, start it separately:

```bash
bunx wrangler dev --config wrangler.toml
```

## Helpful Commands

- `bun run next:dev`
- `bun run convex:dev`
- `bun run worker/index.ts`
- `bun run test`
- `bun run typecheck`
- `bun run lint`
