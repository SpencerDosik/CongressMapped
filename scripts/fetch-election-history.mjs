/**
 * Downloads 1976–2022 House election results from MIT Election Data Science Lab (MEDSL)
 * and writes public/election-history.json:
 *   Record<districtId, {year: number; margin: number}[]>
 *
 * margin convention: positive = R won, negative = D won (matches districtData.ts)
 *
 * Usage: node scripts/fetch-election-history.mjs
 *
 * Only includes general elections (stage=GEN) starting from 2000.
 * Note: district boundaries change every redistricting cycle — comparisons
 * across 2002/2012/2022 boundaries are approximate.
 */

import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const MIT_URL =
  "https://raw.githubusercontent.com/MEDSL/2022-elections-official/main/dataverse_files/1976-2022-house.tab";

console.log("Fetching MIT Election Lab congressional election data (~8 MB)…");
console.log("This may take 10–30 seconds depending on network speed.");

let text;
try {
  const res = await fetch(MIT_URL);
  if (!res.ok) {
    console.error(`HTTP ${res.status}: ${res.statusText}`);
    console.error("If this fails, manually download 1976-2022-house.tab from:");
    console.error("https://dataverse.harvard.edu/dataset.xhtml?persistentId=doi:10.7910/DVN/IG0UN2");
    console.error("Place it in scripts/ and re-run with LOCAL_FILE=scripts/1976-2022-house.tab");
    process.exit(1);
  }
  text = await res.text();
} catch (err) {
  console.error("Fetch failed:", err.message);
  process.exit(1);
}

const lines = text.split("\n");
const header = lines[0].split("\t").map((h) => h.trim().replace(/^"|"$/g, ""));

const idx = (name) => {
  const i = header.indexOf(name);
  if (i === -1) throw new Error(`Column "${name}" not found. Headers: ${header.slice(0, 10).join(", ")}`);
  return i;
};

const yearIdx    = idx("year");
const stateIdx   = idx("state_po");
const distIdx    = idx("district");
const stageIdx   = idx("stage");
const specialIdx = idx("special");
const writeInIdx = idx("writein");
const partyIdx   = idx("party_simplified");
const votesIdx   = idx("candidatevotes");
const totalIdx   = idx("totalvotes");

// States that are at-large for the entire period (or most of it)
const AT_LARGE_ALL = new Set(["AK", "DE", "ND", "SD", "VT", "WY"]);
// MT was at-large 2003–2022; now has 2 seats (post-2022 redistricting)
// We map MT district 1 → MT-00 for years 2002–2022
const MT_AT_LARGE_YEARS = new Set([2002, 2004, 2006, 2008, 2010, 2012, 2014, 2016, 2018, 2020, 2022]);

// key: "year|state|district" → {R, D, total}
const races = new Map();

let rowCount = 0;
for (let i = 1; i < lines.length; i++) {
  const row = lines[i].split("\t");
  if (row.length < header.length) continue;

  const stage = row[stageIdx]?.trim().toUpperCase();
  if (stage !== "GEN") continue;

  const special = row[specialIdx]?.trim().toUpperCase();
  if (special === "TRUE") continue;

  const writeIn = row[writeInIdx]?.trim().toUpperCase();
  if (writeIn === "TRUE") continue;

  const year = parseInt(row[yearIdx]);
  if (year < 2000) continue;

  const state = row[stateIdx]?.trim();
  if (!state) continue;

  const district = parseInt(row[distIdx]) || 0;
  const party = row[partyIdx]?.trim().toUpperCase();
  const votes = parseInt(row[votesIdx]) || 0;
  const total = parseInt(row[totalIdx]) || 0;

  const key = `${year}|${state}|${district}`;
  if (!races.has(key)) {
    races.set(key, { year, state, district, R: 0, D: 0, total: 0 });
  }
  const race = races.get(key);
  if (party === "REPUBLICAN") race.R += votes;
  else if (party === "DEMOCRAT") race.D += votes;
  race.total = Math.max(race.total, total);
  rowCount++;
}

console.log(`Processed ${rowCount} valid rows across ${races.size} races.`);

const out = {};

for (const { year, state, district, R, D, total } of races.values()) {
  if (total === 0) continue;

  let distNum;
  if (AT_LARGE_ALL.has(state) && district <= 1) {
    distNum = "00";
  } else if (state === "MT" && district === 1 && MT_AT_LARGE_YEARS.has(year)) {
    distNum = "00";
  } else {
    distNum = String(district).padStart(2, "0");
  }

  const districtId = `${state}-${distNum}`;
  if (!out[districtId]) out[districtId] = [];

  const margin = Math.round(((R - D) / total) * 1000) / 10;
  out[districtId].push({ year, margin });
}

// Sort by year
for (const key of Object.keys(out)) {
  out[key].sort((a, b) => a.year - b.year);
}

writeFileSync(join(ROOT, "public", "election-history.json"), JSON.stringify(out));
console.log(`Done. Generated history for ${Object.keys(out).length} district IDs.`);
console.log("Output: public/election-history.json");
