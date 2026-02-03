# Agent Runtime (Bun)

The agent runs as a Bun process with a small HTTP API for the dashboard.

## Entry Point

- `worker/index.ts`
- Modules live under `worker/agent/`

## Start

```
AGENT_PORT=3010 MCP_URL=http://localhost:8787/mcp bun run worker/index.ts
```

If you want to delegate Alpaca tools to Alpaca MCP, add:

```
ALPACA_MCP_URL=http://localhost:YOUR_ALPACA_MCP_PORT/mcp
```

## API Endpoints

- `GET /api/status` — full agent status (signals, logs, config)
- `GET /api/logs` — recent logs
- `GET /api/costs` — usage costs
- `GET /api/config` — current agent config
- `POST /api/config` — update agent config
- `GET /api/setup/status` — environment health flags
- `POST /api/setup/keys` — write `.dev.vars` keys (optional)

## Config File

Runtime config is stored in `agent-config.json` at repo root.

Key fields:
- `crypto_enabled`: enable crypto trading logic
- `crypto_symbols`: list of crypto pairs (e.g., `BTC/USD`)
- `data_poll_interval_ms`: signal polling interval
- `analyst_interval_ms`: trading loop interval

## MCP Tool Routing

The agent calls tools using a router that can send some calls to Alpaca MCP:

Delegated (Alpaca MCP):
- `account-get` → `get_account_info`
- `positions-get` → `get_all_positions`
- `market-clock` → `get_market_clock`
- `market-quote` → `get_stock_snapshot` / `get_crypto_snapshot`

Local (custom MCP):
- risk tools (`risk-status`, kill switch)
- memory/journal tools
- events/news/research tools

## Environment Variables

- `ALPACA_API_KEY`, `ALPACA_API_SECRET`, `ALPACA_PAPER`
- `OPENAI_API_KEY` (fallback)
- `AI_GATEWAY_API_KEY`, `AI_GATEWAY_URL` (preferred)
- `KILL_SWITCH_SECRET`
- `ALPACA_MCP_URL` (optional)
