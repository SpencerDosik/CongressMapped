/**
 * Downloads 1976–2018 House election results from MIT Election Data Science Lab (MEDSL)
 * constituency-returns repository, and writes public/election-history.json:
 *   Record<districtId, {year: number; margin: number}[]>
 *
 * margin convention: positive = R won, negative = D won (matches districtData.ts)
 *
 * Usage: node scripts/fetch-election-history.mjs
 *
 * Only includes general elections (gen) from 2000 onwards.
 * Note: 2020 and 2022 data not included here — boundaries changed after 2022 redistricting
 * so comparisons across that boundary are approximate regardless.
 */

import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

// MEDSL constituency-returns: 1976-2018 House election results (CSV, ~3.7 MB)
const CSV_URL =
  "https://raw.githubusercontent.com/MEDSL/constituency-returns/master/1976-2018-house.csv";

console.log("Fetching MIT Election Lab 1976-2018 House constituency returns (~3.7 MB)…");
console.log("Source: github.com/MEDSL/constituency-returns");

let text;
try {
  const res = await fetch(CSV_URL);
  if (!res.ok) {
    console.error(`HTTP ${res.status}: ${res.statusText}`);
    process.exit(1);
  }
  text = await res.text();
} catch (err) {
  console.error("Fetch failed:", err.message);
  process.exit(1);
}

// Parse CSV (first row is header)
const lines = text.trim().split("\n");

// Remove surrounding quotes from a CSV value
function unquote(s) {
  return s ? s.replace(/^"|"$/g, "").trim() : "";
}

// Parse a CSV line, handling quoted fields
function parseCSVLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      inQuotes = !inQuotes;
    } else if (c === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += c;
    }
  }
  result.push(current.trim());
  return result;
}

const headers = parseCSVLine(lines[0]).map(unquote);
console.log(`Columns: ${headers.slice(0, 8).join(", ")} ...`);

function col(name) {
  const i = headers.indexOf(name);
  if (i === -1) throw new Error(`Column "${name}" not found`);
  return i;
}

const yearIdx    = col("year");
const statePoIdx = col("state_po");
const distIdx    = col("district");
const stageIdx   = col("stage");
const specialIdx = col("special");
const writeInIdx = col("writein");
const partyIdx   = col("party");
const votesIdx   = col("candidatevotes");
const totalIdx   = col("totalvotes");

// States that are at-large
const AT_LARGE_ALL = new Set(["AK", "DE", "MT", "ND", "SD", "VT", "WY"]);
// MT had 2 seats from 2023 onwards (post-2022 redistricting); before that it was at-large
const MT_AT_LARGE_YEARS = new Set([2002, 2004, 2006, 2008, 2010, 2012, 2014, 2016, 2018]);

// key: "year|state|district" → {R, D, total}
const races = new Map();

let rowCount = 0;
for (let i = 1; i < lines.length; i++) {
  const row = parseCSVLine(lines[i]).map(unquote);
  if (row.length < headers.length) continue;

  const stage = row[stageIdx]?.toLowerCase();
  if (stage !== "gen") continue;

  const special = row[specialIdx]?.toUpperCase();
  if (special === "TRUE") continue;

  const writeIn = row[writeInIdx]?.toUpperCase();
  if (writeIn === "TRUE") continue;

  const year = parseInt(row[yearIdx]);
  if (year < 2000) continue;

  const state = row[statePoIdx];
  if (!state || state === "NA") continue;

  const district = parseInt(row[distIdx]) || 0;
  const party = row[partyIdx]?.toLowerCase();
  const votes = parseInt(row[votesIdx]) || 0;
  const total = parseInt(row[totalIdx]) || 0;

  const key = `${year}|${state}|${district}`;
  if (!races.has(key)) {
    races.set(key, { year, state, district, R: 0, D: 0, total: 0 });
  }
  const race = races.get(key);
  if (party === "republican") race.R += votes;
  else if (party === "democrat") race.D += votes;
  race.total = Math.max(race.total, total);
  rowCount++;
}

console.log(`Processed ${rowCount} valid rows across ${races.size} races.`);

const out = {};

for (const { year, state, district, R, D, total } of races.values()) {
  if (total === 0) continue;

  let distNum;
  if ((AT_LARGE_ALL.has(state) && district <= 1) ||
      (state === "MT" && MT_AT_LARGE_YEARS.has(year) && district === 1)) {
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

const outPath = join(ROOT, "public", "election-history.json");
writeFileSync(outPath, JSON.stringify(out));

const districtCount = Object.keys(out).length;
const total2018 = Object.values(out).filter(pts => pts.some(p => p.year === 2018)).length;
console.log(`Done. Generated history for ${districtCount} district IDs (${total2018} have 2018 data).`);
console.log(`Note: Data covers 2000-2018 only. 2020/2022 data available separately from MEDSL.`);
console.log(`Output: ${outPath}`);
