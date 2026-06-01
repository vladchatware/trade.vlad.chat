#!/usr/bin/env bun
/**
 * relay/server.ts — WebSocket relay for comp regime signals.
 *
 * Periodically reads the comp03-mtf-confluence signal and broadcasts
 * the mapped regime (bullish/bearish/sideways) to all connected PWA clients.
 *
 * Usage:
 *   bun run relay/server.ts
 *   # Listens on ws://localhost:3002/signal
 */

import { readSignal, type CompSignal } from "./lib/signalReader.ts";

// ── Config ──
const PORT = 3002;
const FETCH_INTERVAL_MS = 60_000; // 1 minute between refreshes
const BIAS = "watch-only";
const SYMBOL = "BTCUSDT";

// ── Session detection ──
interface SessionDef { label: string; startH: number; startM: number; endH: number; endM: number; }
const SESSIONS: SessionDef[] = [
  { label: 'Asia',   startH: 0,  startM: 0,  endH: 4,  endM: 0  },
  { label: 'London', startH: 6,  startM: 0,  endH: 9,  endM: 0  },
  { label: 'NY AM',  startH: 13, startM: 30, endH: 15, endM: 0  },
  { label: 'NY Ln',  startH: 16, startM: 0,  endH: 17, endM: 0  },
  { label: 'NY PM',  startH: 17, startM: 30, endH: 20, endM: 0  },
];

function getCurrentSession(): string {
  const now = new Date();
  const utcMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  // Active session
  for (const s of SESSIONS) {
    const start = s.startH * 60 + s.startM;
    const end = s.endH * 60 + s.endM;
    if (utcMinutes >= start && utcMinutes < end) return s.label;
  }
  // Between sessions — return upcoming
  let upcoming = SESSIONS[0].label;
  let upcomingStart = Infinity;
  for (const s of SESSIONS) {
    const start = s.startH * 60 + s.startM;
    if (start < utcMinutes) continue; // already passed
    if (start < upcomingStart) {
      upcomingStart = start;
      upcoming = s.label;
    }
  }
  return upcoming;
}

// ── Types ──
interface WsClient {
  socket: WebSocket;
  id: string;
}

// ── State ──
let latestSignal: CompSignal | null = null;
const clients = new Map<WebSocket, WsClient>();

// ── Helpers ──
let idCounter = 0;
function nextId(): string {
  return `client_${++idCounter}`;
}

function broadcast(message: string) {
  if (clients.size === 0) return;
  const data = typeof message === "string" ? message : JSON.stringify(message);
  for (const [ws, c] of clients) {
    try {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(data);
      }
    } catch {
      clients.delete(ws);
    }
  }
}

// ── Signal fetch loop ──
async function fetchAndBroadcast() {
  try {
    const session = getCurrentSession();
    const signal = await readSignal(session, BIAS, SYMBOL);
    latestSignal = signal;

    const payload = JSON.stringify({
      type: "regime",
      regime: signal.regime,
      alignmentScore: signal.alignmentScore,
      directions: signal.directions,
      rawRegime: signal.rawRegime,
      session: signal.session,
      bias: signal.bias,
      timeframes: signal.timeframes,
      timestamp: signal.timestamp,
    });

    console.log(`[relay] ${signal.regime} (raw: ${signal.rawRegime}, score: ${signal.alignmentScore.toFixed(2)})`);
    broadcast(payload);
  } catch (err) {
    console.error("[relay] fetch error:", err instanceof Error ? err.message : String(err));
    // Broadcast error state so clients know the signal is stale
    if (latestSignal) {
      broadcast(JSON.stringify({
        type: "error",
        message: "signal fetch failed, using cached value",
        stale: true,
        timestamp: Date.now(),
      }));
    }
  }
}

// ── WebSocket server ──
const server = Bun.serve<{ clientId: string }>({
  port: PORT,
  fetch(req, server) {
    const url = new URL(req.url);

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    }

    // CORS preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: corsHeaders })
    }

    // WebSocket upgrade path
    if (url.pathname === "/signal") {
      const upgraded = server.upgrade(req, {
        data: { clientId: nextId() },
      });
      if (upgraded) return undefined; // handled by websocket handler
      return new Response("WebSocket upgrade failed", { status: 400 });
    }

    // HTTP health check
    if (url.pathname === "/health") {
      return Response.json({
        ok: true,
        clients: clients.size,
        latestSignal: latestSignal
          ? {
              regime: latestSignal.regime,
              score: latestSignal.alignmentScore,
              raw: latestSignal.rawRegime,
              age: Date.now() - latestSignal.timestamp,
            }
          : null,
      }, { headers: corsHeaders });
    }

    // Send latest signal snapshot on GET /signal/latest
    if (url.pathname === "/signal/latest") {
      if (!latestSignal) {
        return new Response("No signal yet", { status: 503, headers: corsHeaders });
      }
      return Response.json({
        type: "regime",
        regime: latestSignal.regime,
        alignmentScore: latestSignal.alignmentScore,
        directions: latestSignal.directions,
        rawRegime: latestSignal.rawRegime,
        session: latestSignal.session,
        bias: latestSignal.bias,
        timeframes: latestSignal.timeframes,
        timestamp: latestSignal.timestamp,
      }, { headers: corsHeaders });
    }

    return new Response("Not found", { status: 404, headers: corsHeaders });
  },
  websocket: {
    open(ws) {
      const client: WsClient = {
        socket: ws,
        id: ws.data?.clientId ?? nextId(),
      };
      clients.set(ws, client);
      console.log(`[relay] client connected: ${client.id} (${clients.size} total)`);

      // Send latest signal immediately on connect
      if (latestSignal) {
        ws.send(JSON.stringify({
          type: "regime",
          regime: latestSignal.regime,
          alignmentScore: latestSignal.alignmentScore,
          directions: latestSignal.directions,
          rawRegime: latestSignal.rawRegime,
          session: latestSignal.session,
          bias: latestSignal.bias,
          timeframes: latestSignal.timeframes,
          timestamp: latestSignal.timestamp,
        }));
      }
    },
    close(ws) {
      const client = clients.get(ws);
      const id = client?.id ?? "unknown";
      clients.delete(ws);
      console.log(`[relay] client disconnected: ${id} (${clients.size} remaining)`);
    },
    message(ws, message) {
      // Currently we're one-way broadcast. Log any client messages.
      console.log(`[relay] message from ${ws.data?.clientId}: ${message}`);
    },
    drain(ws) {
      // Backpressure not implemented for this simple relay
    },
  },
});

console.log(`[relay] WebSocket server running on ws://localhost:${PORT}/signal`);
console.log(`[relay] HTTP endpoint: http://localhost:${PORT}/health`);
console.log(`[relay] Latest signal: http://localhost:${PORT}/signal/latest`);
console.log(`[relay] Fetch interval: ${FETCH_INTERVAL_MS / 1000}s`);

// ── Start periodic fetch loop ──
fetchAndBroadcast(); // immediate first fetch
const interval = setInterval(fetchAndBroadcast, FETCH_INTERVAL_MS);

// ── Graceful shutdown ──
process.on("SIGINT", () => {
  console.log("\n[relay] shutting down...");
  clearInterval(interval);
  server.stop();
  process.exit(0);
});

process.on("SIGTERM", () => {
  clearInterval(interval);
  server.stop();
  process.exit(0);
});
