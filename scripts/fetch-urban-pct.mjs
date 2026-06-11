/**
 * Fetches urban % for every House district from the 2020 Decennial Census
 * via the Census Bureau API (same key as fetch-census-acs.mjs).
 *
 * Uses the 2020 Census Redistricting Data (PL 94-171):
 *   P2_001N = Total population
 *   P2_002N = Urban population (2020 definition: urbanized area + urban cluster ≥ 2,000)
 *
 * Usage: CENSUS_API_KEY=your_key node scripts/fetch-urban-pct.mjs
 * Output: public/urban-pct.json
 * Then: node scripts/apply-urban-pct.mjs
 */

import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const KEY = process.env.CENSUS_API_KEY;
if (!KEY) {
  console.error("ERROR: CENSUS_API_KEY environment variable is not set.");
  console.error("Usage: CENSUS_API_KEY=your_key node scripts/fetch-urban-pct.mjs");
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

const AT_LARGE = new Set(["AK","DE","MT","ND","SD","VT","WY"]);

// The 2020 Census PL file has urban/rural breakdown
// P2_001N = Total, P2_002N = Urban
const url = `https://api.census.gov/data/2020/dec/pl?get=P2_001N,P2_002N&for=congressional%20district:*&in=state:*&key=${KEY}`;

console.log("Fetching 2020 Census urban/rural data for all congressional districts…");

let rows;
try {
  const res = await fetch(url);
  const text = await res.text();
  if (!text.trim().startsWith("[")) {
    console.error(`Census API error (HTTP ${res.status}):`);
    console.error(text.slice(0, 600));
    console.error("\nTrying alternative dataset (DHC)…");

    // Fallback: try DHC file which also has urban/rural in some vintages
    const url2 = `https://api.census.gov/data/2020/dec/dhc?get=P2_001N,P2_002N&for=congressional%20district:*&in=state:*&key=${KEY}`;
    const res2 = await fetch(url2);
    const text2 = await res2.text();
    if (!text2.trim().startsWith("[")) {
      console.error(`DHC also failed (HTTP ${res2.status}):`);
      console.error(text2.slice(0, 400));
      process.exit(1);
    }
    rows = JSON.parse(text2);
    console.log("DHC dataset worked.");
  } else {
    rows = JSON.parse(text);
    console.log("PL dataset worked.");
  }
} catch (err) {
  console.error("Fetch failed:", err.message);
  process.exit(1);
}

const [header, ...dataRows] = rows;
const stateIdx = header.indexOf("state");
const cdIdx    = header.indexOf("congressional district");
const totalIdx = header.indexOf("P2_001N");
const urbanIdx = header.indexOf("P2_002N");

if (totalIdx === -1 || urbanIdx === -1) {
  console.error("Unexpected response columns:", header);
  process.exit(1);
}

const out = {};
let matched = 0;
let skipped = 0;

for (const row of dataRows) {
  const stateFips = row[stateIdx];
  const cdNum     = row[cdIdx];
  const stateAbbr = FIPS_TO_STATE[stateFips];
  if (!stateAbbr) { skipped++; continue; }

  let distNum;
  if (AT_LARGE.has(stateAbbr) && cdNum === "01") {
    distNum = "00";
  } else {
    distNum = cdNum.padStart(2, "0");
  }
  const districtId = `${stateAbbr}-${distNum}`;

  const total = parseInt(row[totalIdx], 10) || 0;
  const urban = parseInt(row[urbanIdx], 10) || 0;

  const urbanPct = total > 0 ? Math.round((urban / total) * 1000) / 10 : null;
  out[districtId] = urbanPct;
  matched++;
}

writeFileSync(join(ROOT, "public", "urban-pct.json"), JSON.stringify(out, null, 2));
console.log(`Done. Matched ${matched} districts, skipped ${skipped}.`);
console.log(`Output: public/urban-pct.json`);
console.log(`Next: node scripts/apply-urban-pct.mjs`);
