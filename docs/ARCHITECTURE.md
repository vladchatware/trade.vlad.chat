# Architecture

## High-Level Overview

```
┌───────────────────────────────────────────────────────────────────────┐
│                               Agent (Bun)                             │
│  - Signal ingestion (StockTwits, crypto momentum)                     │
│  - Trading logic + risk rules                                         │
│  - Dashboard API (/api/status, /api/logs, /api/config)                │
└───────────────────────────────┬───────────────────────────────────────┘
                                │ MCP Tool Calls
                                ▼
┌───────────────────────────────────────────────────────────────────────┐
│                     MCP Router (dual MCP optional)                    │
│  - Local MCP (custom tools: risk, memory, research, events)           │
│  - Alpaca MCP (market data, account, positions, quotes)               │
└───────────────────────────────┬───────────────────────────────────────┘
                                │
                                ▼
┌───────────────────────────────────────────────────────────────────────┐
│                        Cloudflare Worker MCP                          │
│  - Policy engine + kill switch                                        │
│  - D1 storage (memory, events, trades)                                │
│  - Alpaca provider integration                                         │
└───────────────────────────────────────────────────────────────────────┘

Optional UI:
- Next.js app (root) for base UI
- Dashboard app (dashboard/) for agent logs
```

## Data Flow

1. The agent polls signals (StockTwits + crypto momentum).
2. The agent calls MCP tools for account state, quotes, and order actions.
3. A router decides if a tool call goes to Alpaca MCP or the local MCP.
4. The local MCP enforces policy, logs to D1, and handles memory/events.
5. Results are published to the dashboard API (`/api/status`, `/api/logs`).

## Key Components

- `worker/` — Bun agent runtime and dashboard API server.
- `src/` — Cloudflare Worker MCP server (tools, policy, storage, providers).
- `dashboard/` — optional UI for logs and monitoring.
- `convex/` — app-level data and demo data for UI.

## Notes

- Alpaca MCP delegation is optional and controlled by `ALPACA_MCP_URL`.
- The agent can run with only the local MCP if Alpaca MCP is not available.
