# Architecture

## Canonical Stack

1. **Next.js app** (`app/`, `components/`) for the operator dashboard
2. **Next.js MCP endpoint** (`app/api/mcp/route.ts`) for tool serving via `mcp-handler`
3. **Convex backend** (`convex/`) for state, trading data, and cron-based automation
4. **Bun worker** (`worker/`) for continuous orchestration and agent loops

## Data/Control Flow

1. Worker gathers signals and account context through MCP tools.
2. Worker executes trade decisions via MCP tools.
3. Convex stores portfolio, logs, config, and derived status.
4. Next.js subscribes to Convex in real time for dashboard updates.

## Notes

- The worker depends on `MCP_URL`, defaulting to `http://localhost:3000/api/mcp`.
- MCP is now hosted in Next.js, so no separate Wrangler process is required for local development.
