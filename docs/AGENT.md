# Worker Runtime

The worker is a Bun process that ingests broker/social state into Convex.

## Entry Point

- `worker/index.ts`

## Run

```bash
bun run worker/index.ts
```

or via root script:

```bash
bun run worker:dev
```

## Required env

- `CONVEX_URL` (or `NEXT_PUBLIC_CONVEX_URL`)
- `ALPACA_API_KEY`, `ALPACA_API_SECRET`, `ALPACA_PAPER`

Optional:

- none (worker reads upstream APIs directly)

## API

The worker exposes a small status/config API on `AGENT_PORT` (default 3010):

- `GET /api/status`
- `GET /api/logs`
- `GET /api/costs`
- `GET /api/config`
- `POST /api/config`
- `GET /api/setup/status`
- `POST /api/setup/keys`
