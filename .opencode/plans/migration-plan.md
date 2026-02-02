# MAHORAGA Migration Plan
## Next.js + Convex + Vercel AI Gateway

**Last Updated:** February 2026  
**Status:** Ready for Implementation

---

## Executive Summary

This plan migrates MAHORAGA from a Cloudflare Workers + Vite + D1 SQLite architecture to a modern stack using:
- **Next.js 15** (App Router, React 19) for dashboard
- **Convex** (real-time database + scheduled jobs) for backend
- **Vercel AI Gateway** for LLM calls (replacing direct OpenAI)
- **Bun** for package management and fast builds
- **Turborepo** for monorepo management

---

## Phase Breakdown

### Phase 1: Project Setup (Day 1)
**Goal:** Establish monorepo structure with quality tooling

**Tasks:**
1. Initialize Turborepo with Bun workspaces
2. Create package structure (convex/, dashboard/, shared/)
3. Configure Biome for linting/formatting
4. Setup Lefthook for git hooks
5. Create `.cursor/rules.md` with coding standards
6. Setup GitHub Actions CI pipeline

**Files to Create:**
- `package.json` (root workspace)
- `turbo.json`
- `.cursor/rules.md`
- `.github/workflows/ci.yml`
- `biome.json`
- `lefthook.yml`

**Quality Gates:**
- Strict TypeScript config
- No `any` types policy
- Pre-commit hooks for linting
- CI must pass before merge

---

### Phase 2: Convex Backend (Days 2-4)
**Goal:** Migrate Cloudflare Workers + D1 to Convex

**Database Schema Migration:**

| D1 Table | Convex Collection | Purpose |
|----------|------------------|---------|
| `trades` | `trades` | Order history |
| `positions` | `positions` | Current holdings |
| `order_approvals` | `orderApprovals` | Two-step order safety |
| `risk_state` | `riskState` | Kill switch, daily loss |
| `config` | `config` | Trading parameters |
| `signals` | `signals` | Trading signals |
| `signalResearch` | `signalResearch` | LLM analysis results |
| `activityLogs` | `activityLogs` | Agent activity |
| `toolLogs` | `toolLogs` | MCP tool usage |
| `journal` | `journal` | Trade journal |
| `portfolioSnapshots` | `portfolioSnapshots` | Performance tracking |

**MCP Tools Migration:**

| Original Tool | Convex Action | Complexity |
|--------------|---------------|------------|
| `accounts-get` | `actions.getAccount` | Low |
| `positions-list` | `actions.getPositions` | Low |
| `positions-close` | `actions.closePosition` | Low |
| `orders-preview` | `actions.previewOrder` | Medium |
| `orders-submit` | `actions.submitOrder` | Medium |
| `market-clock` | `actions.getMarketClock` | Low |
| `market-quote` | `actions.getQuote` | Low |
| `technicals-get` | `actions.getTechnicals` | Medium |

---

### Phase 3: Agent Logic Migration (Days 5-6)
**Goal:** Port `agent-v1.mjs` to Convex scheduled actions

**Architecture Changes:**

**Before (Node.js process):**
```
agent-v1.mjs
├── HTTP server for dashboard API
├── setInterval() for data gathering (60s)
├── setInterval() for trading logic (120s)
└── File-based JSON logs
```

**After (Convex scheduled actions):**
```
convex/crons.ts
├── gather-data (every 60s)
├── run-trading (market hours, every 2min)
└── run-crypto (24/7, every 2min)
```

---

### Phase 4: Vercel AI Gateway (Day 7)
**Goal:** Replace direct OpenAI calls with Vercel AI Gateway

**Configuration:**
```typescript
// packages/convex/providers/llm.ts
const VERCEL_AI_GATEWAY_URL = process.env.VERCEL_AI_GATEWAY_URL
const VERCEL_AI_GATEWAY_TOKEN = process.env.VERCEL_AI_GATEWAY_TOKEN
```

**Supported Models:**
- Kimi K2.5
- Grox X4
- DeepSeek V3.4

**Cost Tracking:**
```typescript
// Automatic cost tracking per LLM call
await ctx.runMutation(internal.costs.track, {
  model: 'gpt-4o-mini',
  tokensIn: usage.prompt_tokens,
  tokensOut: usage.completion_tokens,
  costUsd: calculateCost('gpt-4o-mini', usage),
})
```

---

### Phase 5: Next.js Dashboard (Days 8-10)
**Goal:** Migrate Vite dashboard to Next.js 15

**Component Migration:**

| Original | New Location | Changes |
|----------|--------------|---------|
| `App.tsx` | `app/page.tsx` | Server Component + Client Component split |
| `types.ts` | `shared/src/types/` | Shared across packages |
| `Panel.tsx` | `app/components/Panel.tsx` | No changes |
| `SettingsModal.tsx` | `app/components/SettingsModal.tsx` | Use Convex mutations |
| `LineChart.tsx` | `app/components/LineChart.tsx` | No changes |

**Data Fetching Pattern:**
```typescript
// Server Component for initial data
// app/page.tsx
export default async function DashboardPage() {
  const initialStatus = await fetchQuery(api.status.get, {})
  return <DashboardClient initialStatus={initialStatus} />
}

// Client Component for real-time updates
// app/dashboard-client.tsx
'use client'
export function DashboardClient({ initialStatus }) {
  const status = useQuery(api.status.get, {}, { 
    initialData: initialStatus 
  })
  // Automatic real-time updates via Convex
  return <DashboardUI status={status} />
}
```

---

### Phase 6: Testing & Quality (Days 11-12)
**Goal:** Ensure reliability with comprehensive tests

**Testing Strategy:**
- Unit tests for Convex actions (80% coverage)
- Integration tests for trading flows
- Component tests for dashboard UI
- E2E tests for critical user journeys

**Quality Tools:**
- Biome for linting/formatting
- TypeScript strict mode
- Lefthook for pre-commit hooks
- GitHub Actions for CI/CD

---

### Phase 7: Production Deployment (Day 13)
**Goal:** Deploy to production with monitoring

**Deployment Steps:**
1. Deploy Convex backend to production
2. Deploy Next.js dashboard to Vercel
3. Configure production environment variables
4. Enable production cron jobs
5. Setup monitoring and alerts

**Monitoring:**
- Vercel Analytics for dashboard
- Convex Dashboard for backend metrics
- AI Gateway for LLM usage and costs
- Custom alerts for trading errors

---

## Final Project Structure

```
mahoraga/
├── packages/
│   ├── convex/           # Convex backend
│   │   ├── convex/      # Functions, schema, crons
│   │   └── package.json
│   ├── dashboard/        # Next.js dashboard
│   │   ├── app/         # App Router pages
│   │   ├── components/  # UI components
│   │   └── package.json
│   └── shared/           # Shared types & utils
│       └── package.json
├── .cursor/
│   └── rules.md         # Coding standards
├── .github/
│   └── workflows/       # CI/CD pipeline
├── turbo.json           # Turborepo config
└── package.json         # Root workspace
```

---

## Key Benefits of Migration

1. **Real-time Dashboard**: No more polling, automatic data sync
2. **Better Developer Experience**: Type-safe Convex, hot reloading
3. **Scalability**: Serverless scheduled actions vs persistent process
4. **Cost Optimization**: AI Gateway observability and caching
5. **Modern Stack**: Next.js 15, React 19, App Router
6. **Quality**: Strict TypeScript, automated testing, CI/CD

---

## Migration Timeline

| Phase | Duration | Focus |
|-------|----------|-------|
| 1 | Day 1 | Project setup, tooling, CI/CD |
| 2 | Days 2-4 | Convex schema, MCP tools, data layer |
| 3 | Days 5-6 | Agent logic migration |
| 4 | Day 7 | AI Gateway integration |
| 5 | Days 8-10 | Next.js dashboard |
| 6 | Days 11-12 | Testing, quality assurance |
| 7 | Day 13 | Production deployment |

**Total: ~2 weeks for complete migration**

---

## Prerequisites

- Vercel account with AI Gateway configured
- Convex account and CLI installed
- Alpaca API keys (paper trading for testing)
- Bun installed locally
- GitHub repository with Actions enabled

---

**Status:** Ready for implementation. Each phase can be completed independently with clear deliverables and quality gates.
