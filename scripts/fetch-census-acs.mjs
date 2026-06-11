/**
 * Fetches ACS 5-year demographic data for all 435 congressional districts
 * from the Census Bureau API and writes public/census-acs.json.
 *
 * Requires CENSUS_API_KEY environment variable.
 * Usage: CENSUS_API_KEY=your_key node scripts/fetch-census-acs.mjs
 *
 * Variables fetched (ACS 5-year 2023):
 *   B15003_001E — Population 25+ (base for education)
 *   B15003_022E — Bachelor's degree
 *   B15003_023E — Master's degree
 *   B15003_024E — Professional school degree
 *   B15003_025E — Doctorate degree
 *   B17001_001E — Total for whom poverty status is determined
 *   B17001_002E — Income below poverty level
 */

import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const KEY = process.env.CENSUS_API_KEY;
if (!KEY) {
  console.error("ERROR: CENSUS_API_KEY environment variable is not set.");
  console.error("Usage: CENSUS_API_KEY=your_key node scripts/fetch-census-acs.mjs");
  process.exit(1);
}

// FIPS → state abbreviation
const FIPS_TO_STATE = {
  "01":"AL","02":"AK","04":"AZ","05":"AR","06":"CA","08":"CO","09":"CT",
  "10":"DE","12":"FL","13":"GA","15":"HI","16":"ID","17":"IL","18":"IN",
  "19":"IA","20":"KS","21":"KY","22":"LA","23":"ME","24":"MD","25":"MA",
  "26":"MI","27":"MN","28":"MS","29":"MO","30":"MT","31":"NE","32":"NV",
  "33":"NH","34":"NJ","35":"NM","36":"NY","37":"NC","38":"ND","39":"OH",
  "40":"OK","41":"OR","42":"PA","44":"RI","45":"SC","46":"SD","47":"TN",
  "48":"TX","49":"UT","50":"VT","51":"VA","53":"WA","54":"WV","55":"WI",
  "56":"WY",
};

// States with only one at-large seat (we store as XX-00, Census codes as 01)
const AT_LARGE = new Set(["AK","DE","MT","ND","SD","VT","WY"]);
// Note: HI and ME have 2 seats so they're NOT at-large

const VARS = [
  "B15003_001E", // base: pop 25+
  "B15003_022E", // bachelor's
  "B15003_023E", // master's
  "B15003_024E", // professional
  "B15003_025E", // doctorate
  "B17001_001E", // base: poverty universe
  "B17001_002E", // below poverty
].join(",");

const url = `https://api.census.gov/data/2023/acs/acs5?get=${VARS}&for=congressional%20district:*&in=state:*&key=${KEY}`;

console.log("Fetching ACS 5-year 2023 data for all congressional districts…");

let rows;
try {
  const res = await fetch(url);
  if (!res.ok) {
    const text = await res.text();
    console.error(`Census API error ${res.status}: ${text}`);
    process.exit(1);
  }
  rows = await res.json();
} catch (err) {
  console.error("Fetch failed:", err.message);
  process.exit(1);
}

// First row is the header
const [header, ...dataRows] = rows;
const idxOf = (v) => header.indexOf(v);

const out = {};
let matched = 0;
let skipped = 0;

for (const row of dataRows) {
  const stateFips = row[header.indexOf("state")];
  const cdNum    = row[header.indexOf("congressional district")];
  const stateAbbr = FIPS_TO_STATE[stateFips];
  if (!stateAbbr) { skipped++; continue; }

  // Map Census CD number to our districtId
  // At-large states: Census "01" → our "XX-00"
  // Regular: Census "01" → "XX-01", etc.
  let distNum;
  if (AT_LARGE.has(stateAbbr) && cdNum === "01") {
    distNum = "00";
  } else {
    distNum = cdNum.padStart(2, "0");
  }
  const districtId = `${stateAbbr}-${distNum}`;

  const base25    = parseInt(row[idxOf("B15003_001E")], 10) || 0;
  const bach      = parseInt(row[idxOf("B15003_022E")], 10) || 0;
  const master    = parseInt(row[idxOf("B15003_023E")], 10) || 0;
  const prof      = parseInt(row[idxOf("B15003_024E")], 10) || 0;
  const doc       = parseInt(row[idxOf("B15003_025E")], 10) || 0;
  const povBase   = parseInt(row[idxOf("B17001_001E")], 10) || 0;
  const povBelow  = parseInt(row[idxOf("B17001_002E")], 10) || 0;

  const collegePct = base25 > 0
    ? Math.round(((bach + master + prof + doc) / base25) * 1000) / 10
    : null;
  const povertyPct = povBase > 0
    ? Math.round((povBelow / povBase) * 1000) / 10
    : null;

  out[districtId] = { collegePct, povertyPct };
  matched++;
}

writeFileSync(join(ROOT, "public", "census-acs.json"), JSON.stringify(out, null, 2));
console.log(`Done. Matched ${matched} districts, skipped ${skipped} rows.`);
console.log(`Output: public/census-acs.json`);
console.log(`Next: node scripts/apply-census-acs.mjs`);
