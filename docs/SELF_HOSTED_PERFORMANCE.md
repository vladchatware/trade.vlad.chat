# Self-Hosted Performance: Ingestion, Crons & Inference Latency

Analysis of throughput and latency characteristics when running Convex
self-hosted (Docker, SQLite) on a single local machine.

## Pipeline Overview

```
External APIs -> Worker -> Convex DB -> Cron/Agent -> LLM -> Policy -> Alpaca Order
```

Each stage has its own speed ceiling. The system is designed for
**minute-scale swing trading**, not sub-second execution.

---

## Stage 1: Data Ingestion (Worker -> Convex)

### Convex Mutation Speed (self-hosted, SQLite)

| Metric | Estimate |
|---|---|
| Single mutation (localhost) | ~1-5 ms |
| Convex cloud median | <20 ms |
| SQLite write throughput | 1,000+ writes/sec (small docs) |

Local self-hosting eliminates network RTT. **Convex is not the ingestion
bottleneck.**

### External API Latency (the actual bottleneck)

| Source | Behavior | Wall Clock |
|---|---|---|
| Alpaca account + positions + clock | 3 parallel fetches | ~200-500 ms |
| StockTwits trending | 1 fetch | ~200-400 ms |
| StockTwits sentiment (10 symbols) | Sequential + 250 ms sleep + 1 Alpaca price fetch each | **~5-8 s** |
| Crypto bars (if enabled) | Sequential per symbol | ~200 ms/symbol |
| Technical snapshots | Sequential per symbol | ~200 ms/symbol |
| **Total sync cycle** | | **~8-15 s** |

The 250 ms sleep in `gatherStocktwitsSignals` (`worker/agent/data-sources.ts:205`)
adds 2.5 s for 10 symbols. Each `getSentiment` also calls `getLatestStockPrice`,
adding ~200 ms per symbol.

### Is It Fast Enough for Real-Time Relay?

**No.** The sync cycle takes 8-15 s, repeating every 60 s
(`dataPollIntervalMs`). Data freshness is minute-scale.

This is fine for sentiment-based swing trades but not for HFT or scalping.

### How to Make It Faster

| Change | Savings |
|---|---|
| Parallelize StockTwits sentiment fetches | ~5 s |
| Remove 250 ms sleep | ~2.5 s |
| Use Alpaca WebSocket streams for prices | Eliminates REST polling |
| Batch Convex mutations (1 mutation for N signals) | Fewer round-trips |

With those changes ingestion could drop to ~1-2 s per cycle and the interval
could safely drop to 10-15 s.

---

## Stage 2: Cron Execution Speed

### Convex Cron Capabilities

- `crons.interval()` supports **seconds-level** granularity (minimum 1 s)
- `crons.cron()` supports an optional 6th field for seconds
- **At most one run of each cron executes at a time.** If a run is still
  going when the next fires, it gets skipped.
- Self-hosted: no concurrent-scheduled-job cap (cloud free tier caps at 10)

### Current Schedule vs. Headroom

| Job | Interval | Typical Duration | Headroom |
|---|---|---|---|
| `runTrading` | 2 min | ~2-10 s | Could run every 30 s |
| `compute-staleness` | 10 min | <1 s | Plenty |
| `cleanup-order-approvals` | 15 min | <100 ms | Plenty |
| `hourly-cache-refresh` | 60 min | varies | Plenty |
| `overnight-activity-rollup` | 60 min | <1 s | Plenty |

`runTrading` could safely fire every 30 seconds. The limiting factor is the
Alpaca API calls within the actions, not Convex scheduling.

---

## Stage 3: Agent Inference (The Real Bottleneck)

### LLM Call Path

1. `runCycle` gathers snapshot via queries (~50 ms locally)
2. Builds prompt (`JSON.stringify(snapshot)`)
3. Calls `tradingAgent.generateObject()` -> Vercel AI Gateway -> model
4. Waits for structured JSON output
5. Logs result

### Estimated Latency by Model

| Model | Input Tokens (~) | Output Tokens (~) | Expected Latency |
|---|---|---|---|
| Kimi K2.5 | 500-2000 | 50-100 | 2-5 s |
| Grok 4.1 Fast Reasoning | 500-2000 | 50-100 | 1-3 s |
| DeepSeek V3.2 Thinking | 500-2000 | 50-100 | 3-8 s |

The worker guards this with a **30 s timeout** (`orchestrator.ts:224`) and an
`inFlight` lock (`orchestrator.ts:215`).

### Signal Research Is Slower

Each `researchSignal` call creates a fresh thread and calls the LLM. For 5
symbols processed sequentially: **10-40 s total**.

### The Math

The LLM is **10-100x slower** than everything else:

- Convex mutations: milliseconds
- External API calls: hundreds of milliseconds
- LLM inference: seconds

---

## End-to-End: Signal -> Trade Timeline

### Current (minute-scale)

```
T+0 s       Worker fetches StockTwits trending
T+8 s       Worker finishes gathering signals + prices
T+8.1 s     Worker writes signals to Convex (milliseconds)
...          Waiting for next cron fire
T+120 s     runTrading cron fires (worst case: 112 s stale)
T+120.1 s   Queries config, risk, account, positions, clock
T+120.2 s   Fetches top 5 signals, picks candidate
T+120.3 s   Calls previewOrder -> Alpaca API (~300 ms)
T+120.6 s   Policy engine evaluates (~1 ms)
T+120.7 s   Creates approval token
T+120.8 s   Calls submitOrder -> Alpaca API (~300 ms)
T+121.1 s   Order submitted

TOTAL: ~2 minutes (dominated by cron wait)
```

### Optimized (seconds-scale, achievable)

```
T+0 s       Worker fetches StockTwits (parallel)
T+2 s       All signals gathered
T+2.1 s     Written to Convex
T+12 s      runTrading cron fires (10 s interval)
T+12.5 s    Queries + candidate selection
T+12.8 s    Preview + policy
T+13.1 s    Order submitted

TOTAL: ~13 seconds
```

---

## Summary

| Component | Current Speed | Theoretical Floor | Bottleneck |
|---|---|---|---|
| Convex mutation (local) | ~1-5 ms | <1 ms | Not a bottleneck |
| Convex query (local) | ~1-5 ms | <1 ms | Not a bottleneck |
| Worker sync cycle | ~8-15 s | ~1-2 s | StockTwits sequential + sleeps |
| Cron dispatch | 2 min | 1 s | Config choice |
| LLM inference | 2-8 s/call | ~1-2 s | **The real bottleneck** |
| Alpaca order execution | 200-500 ms | ~100 ms | External API |
| **Signal-to-trade** | **~2 min** | **~5-10 s** | Cron interval + ingestion |

## Alpaca API Rate Limits

- Standard: **200 requests/min** (burst: 10 req/s)
- With $9 unlimited data plan: **1,000 requests/min**
- Current usage: ~15-25 requests/sync cycle = well within limits at 60 s
  interval; would need monitoring if interval drops below 15 s

## What Would Need to Change for ~10 s Latency

1. Parallelize StockTwits sentiment fetches, drop the 250 ms sleep
2. Switch `runTrading` cron to every 10-15 seconds
3. Accept that LLM agent decisions will always lag by 2-8 seconds
4. Use Alpaca WebSocket streams for real-time price updates
