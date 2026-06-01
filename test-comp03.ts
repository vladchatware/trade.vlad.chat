import { spawnSync } from "bun";

const script = "/Users/vlad/.hermes/scripts/comp03-mtf-confluence.py";

const proc = spawnSync(["python3.11", script, "--session", "Test", "--bias", "watch-only", "--symbol", "BTCUSDT"]);

console.log("EXIT:", proc.exitCode);
console.log("=== STDOUT ===");
console.log(proc.stdout.toString().substring(0, 500));
console.log("=== STDERR (last 2k) ===");
const stderr = proc.stderr.toString();
console.log(stderr.substring(Math.max(0, stderr.length - 2000)));
console.log("=== STDERR LENGTH ===", stderr.length);
