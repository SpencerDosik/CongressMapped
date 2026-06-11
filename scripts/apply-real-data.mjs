/**
 * Applies real 2024 election margins and real ACS median income to districtData.ts.
 *
 * Sources:
 *   - Margins: data-research/work/margins_2024.json (computed from MIT/Ballotpedia CSV)
 *   - Income:  data-research/income-by-cd.json (ACS 5-year estimates, raw dollars)
 *
 * Run from repo root: node scripts/apply-real-data.mjs
 */

import { readFileSync, writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";

const __dir = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dir, "..");

const margins = JSON.parse(readFileSync(join(ROOT, "data-research/work/margins_2024.json"), "utf8"));
const incomeRaw = JSON.parse(readFileSync(join(ROOT, "data-research/income-by-cd.json"), "utf8"));

// Convert income from raw dollars to $K (integer)
const income = {};
for (const [id, dollars] of Object.entries(incomeRaw)) {
  income[id] = Math.round(dollars / 1000);
}

let src = readFileSync(join(ROOT, "lib/districtData.ts"), "utf8");

let replaced = 0;
let missingMargin = [];
let missingIncome = [];

// Replace each district entry's margin and income
src = src.replace(/"([A-Z]{2}-\d{2})"\s*:\s*\{([^}]+)\}/g, (full, distId, body) => {
  let newBody = body;

  // Replace margin
  if (margins[distId] !== undefined) {
    newBody = newBody.replace(/margin:\s*-?\d+(\.\d+)?/, `margin: ${margins[distId]}`);
    replaced++;
  } else {
    missingMargin.push(distId);
  }

  // Replace income
  if (income[distId] !== undefined) {
    newBody = newBody.replace(/income:\s*\d+(\.\d+)?/, `income: ${income[distId]}`);
  } else {
    missingIncome.push(distId);
  }

  return `"${distId}": {${newBody}}`;
});

writeFileSync(join(ROOT, "lib/districtData.ts"), src, "utf8");

console.log(`Updated margins for ${replaced} districts`);
if (missingMargin.length) console.log("No margin data (kept estimated):", missingMargin);
if (missingIncome.length) console.log("No income data (kept estimated):", missingIncome);
