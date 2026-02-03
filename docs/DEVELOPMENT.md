# Development

## Local Services

You will typically run three services:

1. Cloudflare MCP server (Wrangler)
2. Agent worker (Bun)
3. Optional UI (Next + Convex and/or dashboard)

## Prereqs

- Node.js 18+
- Bun 1.1+
- Wrangler (via `npx wrangler`)

## Environment Files

- `.env.local` — Next/Convex and local developer settings
- `.dev.vars` — secrets for Wrangler/Agent

Recommended `.dev.vars` keys:

```
ALPACA_API_KEY=...
ALPACA_API_SECRET=...
ALPACA_PAPER=true
AI_GATEWAY_API_KEY=...
AI_GATEWAY_URL=...
KILL_SWITCH_SECRET=...
```

## D1 Migrations (local)

```
npx wrangler d1 migrations apply mahoraga-db --local
```

## Start MCP Server

```
npx wrangler dev --config wrangler.toml
```

MCP is available at `http://localhost:8787/mcp`.

## Start Agent

```
AGENT_PORT=3010 MCP_URL=http://localhost:8787/mcp bun run worker/index.ts
```

## Optional UI

```
npm run dev
```

## Troubleshooting

- `D1_ERROR: no such table` → run local migrations.
- `Failed to connect MCP` → ensure Wrangler server is running.
- `port in use` → set `AGENT_PORT` or stop the existing process.
