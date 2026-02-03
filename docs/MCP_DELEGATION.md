# MCP Delegation (Alpaca MCP)

We can delegate Alpaca-specific tooling to Alpaca's official MCP server to reduce maintenance.

## Why Delegate

- Offload market data and trading API surface to Alpaca.
- Reduce drift with Alpaca API changes.
- Keep our custom tools focused on policy, memory, and research.

## Current Routing

The agent uses a router to choose between:

- **Local MCP** (`MCP_URL`) — custom tools and policy enforcement
- **Alpaca MCP** (`ALPACA_MCP_URL`) — commodity Alpaca endpoints

Mapped tools (phase 1):

- `account-get` → `get_account_info`
- `positions-get` → `get_all_positions`
- `market-clock` → `get_market_clock`
- `market-quote` → `get_stock_snapshot` / `get_crypto_snapshot`

## Enabling Delegation

Set:

```
ALPACA_MCP_URL=http://localhost:PORT/mcp
```

If Alpaca MCP is unavailable, the router falls back to local MCP.

## Recommended Next Steps

- Decide whether order execution should be delegated or remain local.
- If delegating orders, confirm risk checks still occur before submission.
- Add additional mappings as needed (quotes batch, bars, options data).
