/**
 * Applies urban% and median household income from public/wikipedia-district-data.json
 * into lib/districtData.ts.
 *
 * Overwrites urbanPct and income for every district that has Wikipedia data.
 * Leaves entries unchanged if Wikipedia returned null for that field.
 *
 * Usage: node scripts/apply-wikipedia-district-data.mjs
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const wikiData = JSON.parse(
  readFileSync(join(ROOT, "public", "wikipedia-district-data.json"), "utf8")
);

let src = readFileSync(join(ROOT, "lib", "districtData.ts"), "utf8");

let updatedUrban = 0;
let updatedIncome = 0;
const missingUrban = [];
const missingIncome = [];

src = src.replace(/"([A-Z]{2}-\d{2})"\s*:\s*\{([^}]+)\}/g, (full, distId, body) => {
  const entry = wikiData[distId];
  if (!entry) return full;

  // Update urbanPct
  if (entry.urbanPct !== null && entry.urbanPct !== undefined) {
    if (/urbanPct\s*:/.test(body)) {
      body = body.replace(/urbanPct\s*:\s*[\d.]+/, `urbanPct: ${entry.urbanPct}`);
    } else {
      // Insert after income field
      body = body.replace(/(income\s*:\s*[\d.]+)/, `$1, urbanPct: ${entry.urbanPct}`);
    }
    updatedUrban++;
  } else {
    missingUrban.push(distId);
  }

  // Update income (Wikipedia has more accurate district-level data than state estimates)
  if (entry.income !== null && entry.income !== undefined) {
    body = body.replace(/income\s*:\s*[\d.]+/, `income: ${entry.income}`);
    updatedIncome++;
  } else {
    missingIncome.push(distId);
  }

  return `"${distId}": {${body}}`;
});

writeFileSync(join(ROOT, "lib", "districtData.ts"), src, "utf8");

console.log(`Updated urbanPct for ${updatedUrban} districts.`);
console.log(`Updated income for ${updatedIncome} districts.`);
if (missingUrban.length) console.log(`No urban% for ${missingUrban.length}: ${missingUrban.join(", ")}`);
if (missingIncome.length) console.log(`No income for ${missingIncome.length}: ${missingIncome.join(", ")}`);
console.log("Done.");
