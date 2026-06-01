/**
 * relay/auth.ts — Binance API signing utilities.
 *
 * Futures listen key endpoints (POST/PUT/DELETE /fapi/v1/listenKey)
 * only need the API key in the X-MBX-APIKEY header — no signature.
 * This module provides that + HMAC signing for any future signed endpoints.
 */

const API_KEY = process.env.BINANCE_API_KEY || "";
const API_SECRET = process.env.BINANCE_API_SECRET || "";

export function getApiKey(): string {
  return API_KEY;
}

export function getApiSecret(): string {
  return API_SECRET;
}

/**
 * Binance HMAC-SHA256 signature.
 */
export async function sign(queryString: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(API_SECRET),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, encoder.encode(queryString));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Create Futures listen key.
 * POST /fapi/v1/listenKey — no signature, just API key header.
 */
export async function createListenKey(): Promise<string> {
  if (!API_KEY) throw new Error("BINANCE_API_KEY not set");

  const res = await fetch("https://fapi.binance.com/fapi/v1/listenKey", {
    method: "POST",
    headers: { "X-MBX-APIKEY": API_KEY },
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`listenKey create failed (${res.status}): ${body}`);
  }
  const data = await res.json();
  return data.listenKey as string;
}

/**
 * Renew (ping) Futures listen key.
 * PUT /fapi/v1/listenKey — prevents expiry.
 */
export async function renewListenKey(listenKey: string): Promise<void> {
  if (!API_KEY) throw new Error("BINANCE_API_KEY not set");

  const res = await fetch("https://fapi.binance.com/fapi/v1/listenKey", {
    method: "PUT",
    headers: { "X-MBX-APIKEY": API_KEY, "Content-Type": "application/json" },
    body: JSON.stringify({ listenKey }),
  });
  if (!res.ok) {
    const body = await res.text();
    console.error(`[relay] listenKey renew failed (${res.status}): ${body}`);
  }
}

/**
 * Delete (close) Futures listen key.
 * DELETE /fapi/v1/listenKey
 */
export async function closeListenKey(listenKey: string): Promise<void> {
  if (!API_KEY) return;
  try {
    await fetch("https://fapi.binance.com/fapi/v1/listenKey", {
      method: "DELETE",
      headers: { "X-MBX-APIKEY": API_KEY, "Content-Type": "application/json" },
      body: JSON.stringify({ listenKey }),
    });
  } catch {
    // best-effort cleanup
  }
}

// ── Trade history ─────────────────────────────────────────────

export interface BinanceTrade {
  buyer: boolean;
  commission: string;
  commissionAsset: string;
  id: number;
  maker: boolean;
  orderId: number;
  price: string;
  qty: string;
  quoteQty: string;
  realizedPnl: string;
  side: 'BUY' | 'SELL';
  positionSide: 'BOTH' | 'LONG' | 'SHORT';
  symbol: string;
  time: number;
}

/**
 * Fetch recent fills from Binance Futures.
 * GET /fapi/v1/userTrades — requires HMAC signature.
 */
export async function fetchRecentTrades(
  symbol: string = 'BTCUSDT',
  limit: number = 50,
): Promise<BinanceTrade[]> {
  if (!API_KEY || !API_SECRET) {
    console.warn('[auth] Cannot fetch trades: API credentials not set');
    return [];
  }

  const timestamp = Date.now();
  const queryString = `symbol=${symbol}&limit=${limit}&timestamp=${timestamp}`;
  const signature = await sign(queryString);

  const url = `https://fapi.binance.com/fapi/v1/userTrades?${queryString}&signature=${signature}`;

  try {
    const res = await fetch(url, {
      headers: { 'X-MBX-APIKEY': API_KEY },
    });

    if (!res.ok) {
      const body = await res.text();
      console.error(`[auth] fetchRecentTrades failed (${res.status}): ${body}`);
      return [];
    }

    return await res.json() as BinanceTrade[];
  } catch (err: any) {
    console.error(`[auth] fetchRecentTrades error: ${err.message}`);
    return [];
  }
}
