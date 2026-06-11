/**
 * Applies urban % from public/urban-pct.json into lib/districtData.ts.
 * Run after fetch-urban-pct.mjs has populated the JSON file.
 *
 * Usage: node scripts/apply-urban-pct.mjs
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const urbanRaw = JSON.parse(readFileSync(join(ROOT, "public", "urban-pct.json"), "utf8"));
let src = readFileSync(join(ROOT, "lib", "districtData.ts"), "utf8");

let replaced = 0;
const missing = [];

// Replace or insert urbanPct field in each district entry
src = src.replace(/"([A-Z]{2}-\d{2})"\s*:\s*\{([^}]+)\}/g, (full, distId, body) => {
  const pct = urbanRaw[distId];

  if (pct === null || pct === undefined) {
    missing.push(distId);
    return full; // keep unchanged
  }

  const rounded = Math.round(pct * 10) / 10; // 1 decimal place

  // Replace existing urbanPct if present, otherwise insert after income
  if (/urbanPct\s*:/.test(body)) {
    body = body.replace(/urbanPct\s*:\s*[\d.]+/, `urbanPct: ${rounded}`);
  } else {
    body = body.replace(/(income\s*:\s*[\d.]+)/, `$1, urbanPct: ${rounded}`);
  }

  replaced++;
  return `"${distId}": {${body}}`;
});

writeFileSync(join(ROOT, "lib", "districtData.ts"), src, "utf8");

console.log(`Updated urbanPct for ${replaced} districts.`);
if (missing.length) console.log(`No data for ${missing.length} districts:`, missing.join(", "));
console.log("Done. Now add urbanPct to DistrictStaticData type and enable the filter.");
