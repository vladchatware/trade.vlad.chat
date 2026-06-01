/**
 * signalReader.ts — Read comp regime signal from the mtf-confluence Python script.
 *
 * Spawns comp03-mtf-confluence.py and parses its stderr JSON output.
 * Maps the raw signal to a simplified shape the PWA can consume.
 *
 * Raw signal shape (from comp03 stderr):
 * {
 *   "comp": "mtf-confluence",
 *   "session": "...",
 *   "bias": "...",
 *   "timeframes": { "4H": {price, vwap, vwap_position, regime}, ... },
 *   "alignment": { score: 0-1, directions: {"4H": "bullish"|"bearish"|"flat", ...} },
 *   "regime": "trending"|"ranging"|"volatile"|"transitional"|"sparse",
 *   "confluence_zones": [...]
 * }
 */

import { spawnSync } from "bun";

export type PwaRegime = "bullish" | "bearish" | "sideways";

export interface CompSignal {
  /** Raw comp03 regime classification */
  rawRegime: string;
  /** Alignment score 0–1 */
  alignmentScore: number;
  /** Per-TF direction */
  directions: Record<string, string>;
  /** Mapped PWA regime */
  regime: PwaRegime;
  /** Timestamp of the signal read */
  timestamp: number;
  /** Session name (Asia, London, etc.) */
  session: string;
  /** Called bias */
  bias: string;
  /** Price snapshot per timeframe */
  timeframes: Record<string, { price: number; regime: string }>;
}

interface Comp03Signal {
  comp: string;
  session: string;
  bias: string;
  timeframes: Record<string, { price: number; vwap: number; vwap_position: string; regime: string }>;
  alignment: { score: number; directions: Record<string, string> };
  regime: string;
  confluence_zones: Array<{ price: number; strength: string; sources: string[]; direction: string }>;
}

/**
 * Map comp03 alignment directions to a simple bullish/bearish/sideways regime.
 *
 * Logic:
 *  - If alignmentScore >= 0.6 and 2+ of the 3 TFs (4H, 1H, 15M) agree → that direction
 *  - If alignmentScore >= 0.4 and 3/3 agree → that direction
 *  - Otherwise → sideways
 */
function mapRegime(signal: Comp03Signal): PwaRegime {
  const dirs = Object.values(signal.alignment.directions).filter(Boolean);
  const bullish = dirs.filter((d) => d === "bullish").length;
  const bearish = dirs.filter((d) => d === "bearish").length;
  const score = signal.alignment.score;

  if (bullish >= 2 && score >= 0.6) return "bullish";
  if (bearish >= 2 && score >= 0.6) return "bearish";
  if (dirs.length >= 3 && (bullish === 3 || bearish === 3) && score >= 0.4) {
    return bullish === 3 ? "bullish" : "bearish";
  }
  return "sideways";
}

/**
 * Run the comp03-mtf-confluence.py script and return the parsed signal.
 *
 * @param session - trading session label (default: "Asia")
 * @param bias    - called bias (default: "watch-only")
 * @param symbol  - trading pair (default: "BTCUSDT")
 */
export async function readSignal(
  session = "Asia",
  bias = "watch-only",
  symbol = "BTCUSDT"
): Promise<CompSignal> {
  const script = "/Users/vlad/.hermes/scripts/comp03-mtf-confluence.py";

  const proc = spawnSync([
    "python3.11",
    script,
    "--session", session,
    "--bias", bias,
    "--symbol", symbol,
  ]);

  const exitCode = proc.exitCode ?? -1;
  const stderr = proc.stderr.toString();

  // Check for script errors: non-zero exit or explicit error in stderr
  if (exitCode !== 0 || stderr.includes("ERROR") || stderr.includes("Traceback")) {
    if (stderr.includes("Traceback") || stderr.includes("Error:")) {
      throw new Error(`comp03 script failed (exit ${exitCode}): ${stderr.split("\n").slice(0, 5).join("; ")}`);
    }
  }

  const stderrText = proc.stderr.toString().trim();

  let raw: Comp03Signal;
  try {
    // Find the first JSON block in stderr (there may be chart lib warnings before it)
    const jsonStart = stderrText.indexOf("{");
    const jsonEnd = stderrText.lastIndexOf("}") + 1;
    if (jsonStart === -1 || jsonEnd <= jsonStart) {
      throw new Error("no JSON found in stderr output");
    }
    raw = JSON.parse(stderrText.slice(jsonStart, jsonEnd)) as Comp03Signal;
  } catch (e) {
    throw new Error(`failed to parse comp03 signal: ${e}`);
  }

  const timeframes: Record<string, { price: number; regime: string }> = {};
  for (const [tf, v] of Object.entries(raw.timeframes)) {
    timeframes[tf] = { price: v.price, regime: v.regime };
  }

  return {
    rawRegime: raw.regime,
    alignmentScore: raw.alignment.score,
    directions: raw.alignment.directions,
    regime: mapRegime(raw),
    timestamp: Date.now(),
    session: raw.session,
    bias: raw.bias,
    timeframes,
  };
}

/**
 * Parse a raw signal JSON string (e.g. from a file or pipe).
 */
export function parseSignal(json: string): CompSignal {
  const raw = JSON.parse(json) as Comp03Signal;
  const timeframes: Record<string, { price: number; regime: string }> = {};
  for (const [tf, v] of Object.entries(raw.timeframes)) {
    timeframes[tf] = { price: v.price, regime: v.regime };
  }
  return {
    rawRegime: raw.regime,
    alignmentScore: raw.alignment.score,
    directions: raw.alignment.directions,
    regime: mapRegime(raw),
    timestamp: Date.now(),
    session: raw.session,
    bias: raw.bias,
    timeframes,
  };
}
