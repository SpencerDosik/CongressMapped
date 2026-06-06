/**
 * Generates public/district-stats.json from existing districtData.
 * Uses correlations between income/PVI and demographics (Census ACS 5-year patterns).
 * These are model-based estimates; replace with Census API data when available.
 *
 * Run: node scripts/generate-district-stats.mjs
 */

import { writeFileSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, "..", "public");

// Read districtData from the compiled TypeScript (using the raw TS source)
// We'll parse out the DISTRICT_DATA object entries manually
const srcPath = join(__dirname, "..", "lib", "districtData.ts");
const src = readFileSync(srcPath, "utf-8");

// Extract all district entries via regex
// Pattern: "XX-NN": { repName: "...", party: "...", margin: N, income: N, pvi: N, termStart: N, ... }
const entryRegex = /"([A-Z]{2}-\d{2})"\s*:\s*\{[^}]+\}/g;
const marginRegex = /margin:\s*(-?\d+)/;
const incomeRegex = /income:\s*(\d+)/;
const pviRegex = /pvi:\s*(-?\d+)/;

const districts = {};
let match;
while ((match = entryRegex.exec(src)) !== null) {
  const id = match[0].split('"')[1];
  const block = match[0];
  const marginM = marginRegex.exec(block);
  const incomeM = incomeRegex.exec(block);
  const pviM = pviRegex.exec(block);
  if (!marginM || !incomeM || !pviM) continue;
  districts[id] = {
    margin: parseInt(marginM[1], 10),
    income: parseInt(incomeM[1], 10),
    pvi: parseInt(pviM[1], 10),
  };
}

// Generate estimated stats based on known correlations:
// Age: national median ~38; lower in younger (often D-urban) districts, higher in rural/retirement
// Education: strong correlation with income and D-lean
// Poverty: inverse correlation with income

function clamp(v, min, max) { return Math.max(min, Math.min(max, v)); }

const stats = {};
for (const [id, d] of Object.entries(districts)) {
  const incomeK = d.income;
  const pvi = d.pvi;

  // Age: 34–48 range; rural R districts older, urban D younger on average
  // National median ~38.5; R-lean adds age (rural), D-lean subtracts slightly (urban, immigration)
  const agePvi = pvi * 0.08;          // R-lean → slightly older
  const ageIncome = -(incomeK - 75) * 0.02; // higher income → younger (working age professionals)
  const age = clamp(38.5 + agePvi + ageIncome + (Math.random() * 2 - 1), 32, 50);

  // Education (% with bachelor's): 15–60%
  // Strong positive correlation with income and D-lean
  const eduIncome = (incomeK - 60) * 0.35;  // income is the strongest predictor
  const eduPvi = -pvi * 0.2;              // D-lean → more educated (urban college districts)
  const education = clamp(28 + eduIncome + eduPvi + (Math.random() * 3 - 1.5), 10, 65);

  // Poverty (%): 4–30%
  // Strong inverse correlation with income
  const povIncome = -(incomeK - 60) * 0.25;
  const povPvi = Math.abs(pvi) * 0.05; // extreme districts (both R and D) have more poverty
  const poverty = clamp(12 + povIncome + povPvi + (Math.random() * 2 - 1), 3, 30);

  // Population: approximate from seats apportionment ~760k per district
  const population = Math.round(760000 + (Math.random() * 100000 - 50000));

  stats[id] = {
    age: Math.round(age * 10) / 10,
    education: Math.round(education * 10) / 10,
    poverty: Math.round(poverty * 10) / 10,
    population,
  };
}

const outPath = join(PUBLIC, "district-stats.json");
writeFileSync(outPath, JSON.stringify(stats, null, 2));
console.log(`Generated ${Object.keys(stats).length} district entries → public/district-stats.json`);
console.log("Note: Values are model-based estimates. Replace with Census ACS data for production accuracy.");
