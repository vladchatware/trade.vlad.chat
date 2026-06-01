import { spawnSync } from "bun";

const script = "/Users/vlad/.hermes/scripts/comp03-mtf-confluence.py";

const proc = spawnSync(["python3.11", script, "--session", "Test", "--bias", "watch-only", "--symbol", "BTCUSDT"]);

const stderr = proc.stderr.toString();
console.log("=== FULL STDERR ===");
console.log(stderr);
console.log("=== END ===");
console.log("First char:", JSON.stringify(stderr[0]));
console.log("Last char:", JSON.stringify(stderr[stderr.length - 1]));
console.log("JSON starts at:", stderr.indexOf("{"));
console.log("JSON ends at:", stderr.lastIndexOf("}"));
