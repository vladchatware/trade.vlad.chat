# MAHORAGA Trading Agent - Migration Complete

## Overview
Successfully migrated from Cloudflare Workers + Vite to Next.js 15 + Convex + Vercel AI Gateway

## Architecture

### Backend (Convex)
- **Database**: Real-time Convex with 13 collections
- **Trading Engine**: Serverless scheduled actions
- **AI Gateway**: Vercel AI Gateway with cost tracking
- **Policy Engine**: Risk management with kill switch

### Frontend (Next.js 15)
- **Dashboard**: Real-time trading dashboard
- **Components**: Panel, Metric, SettingsModal
- **Styling**: Tailwind CSS v4 with custom design tokens

## Quick Start

```bash
# Install dependencies
bun install

# Setup Convex
cd packages/convex
cp .env.example .env
# Add your ALPACA_API_KEY, ALPACA_API_SECRET, VERCEL_AI_GATEWAY_URL

# Run Convex dev server
bun run convex:dev

# Run Dashboard (new terminal)
bun run dashboard:dev
```

## Environment Variables

### Convex
- `ALPACA_API_KEY` - Alpaca API key
- `ALPACA_API_SECRET` - Alpaca API secret
- `ALPACA_PAPER` - Use paper trading (true/false)
- `VERCEL_AI_GATEWAY_URL` - Vercel AI Gateway endpoint
- `VERCEL_AI_GATEWAY_TOKEN` - AI Gateway auth token

### Dashboard
- `NEXT_PUBLIC_CONVEX_URL` - Convex deployment URL

## Deployment

### Convex
```bash
cd packages/convex
bun run convex:deploy
```

### Dashboard (Vercel)
```bash
cd packages/dashboard
bun run build
# Deploy to Vercel
```

## Features

- Real-time position tracking
- Automated trading with stop-loss/take-profit
- LLM-powered signal research
- 24/7 crypto trading
- Cost tracking and analytics
- Risk management with kill switch
- Two-step order approval

## Project Structure

```
mahoraga/
├── packages/
│   ├── convex/          # Convex backend
│   ├── dashboard/       # Next.js 15 dashboard
│   └── shared/          # Shared types
├── .cursor/
│   └── rules.md         # Coding standards
└── .github/
    └── workflows/       # CI/CD
```

## Migration Summary

| Phase | Status |
|-------|--------|
| 1. Project Setup | Complete |
| 2. Convex Backend | Complete |
| 3. Agent Logic | Complete |
| 4. AI Gateway | Complete |
| 5. Next.js Dashboard | Complete |
| 6. Testing | Complete |
| 7. Documentation | Complete |

Total: 7/7 phases (100%)
