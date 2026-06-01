import { readSignal } from "./relay/lib/signalReader.ts";

// Also test the raw spawnSync
import { spawnSync } from "bun";

const script = "/Users/vlad/.hermes/scripts/comp03-mtf-confluence.py";
const proc = spawnSync(["python3.11", script, "--session", "Test", "--bias", "watch-only", "--symbol", "BTCUSDT"]);

console.log("EXIT:", proc.exitCode);
console.log("STDOUT:", proc.stdout.toString().substring(0, 100));

const stderr = proc.stderr.toString();
console.log("STDERR LEN:", stderr.length);
console.log("STDERR chars:", JSON.stringify(stderr.substring(0, 50)));
console.log("STDERR ends with:", JSON.stringify(stderr.substring(stderr.length - 20)));

// Now try parsing
const stderrText = stderr.trim();
const jsonStart = stderrText.lastIndexOf("{");
const jsonEnd = stderrText.lastIndexOf("}") + 1;
console.log("jsonStart:", jsonStart, "jsonEnd:", jsonEnd);
const json = stderrText.slice(jsonStart, jsonEnd);
console.log("JSON to parse:", json.substring(0, 80) + "...");
try {
  const parsed = JSON.parse(json);
  console.log("PARSED OK:", parsed.regime, parsed.alignment.score);
} catch(e) {
  console.log("PARSE ERROR:", e);
}

// Now try signalReader
try {
  const signal = await readSignal("Test", "watch-only", "BTCUSDT");
  console.log("SIGNAL OK:", signal.regime, signal.alignmentScore);
} catch (e) {
  console.error("SIGNAL FAIL:", e instanceof Error ? e.message : String(e));
}
