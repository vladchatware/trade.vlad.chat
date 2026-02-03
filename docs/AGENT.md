# Worker Runtime

The worker is a Bun process that runs the orchestration loop.

## Entry Point

- `worker/index.ts`

## Run

```bash
bun run worker/index.ts
```

or via root script:

```bash
bun run worker/index.ts
```

## Required env

- `MCP_URL` (default: `http://localhost:8787/mcp`)
- `ALPACA_API_KEY`, `ALPACA_API_SECRET`, `ALPACA_PAPER`
- `AI_GATEWAY_API_KEY`, `AI_GATEWAY_URL`
- `KILL_SWITCH_SECRET`

Optional:

- `ALPACA_MCP_URL` for delegated Alpaca tool calls

## API

The worker exposes a small status/config API on `AGENT_PORT` (default 3010):

- `GET /api/status`
- `GET /api/logs`
- `GET /api/costs`
- `GET /api/config`
- `POST /api/config`
- `GET /api/setup/status`
- `POST /api/setup/keys`
