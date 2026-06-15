/**
 * Fetches racial/ethnic demographics for every House district from Wikipedia infoboxes.
 * Fields: percent_white, percent_hispanic, percent_black, percent_asian,
 *         percent_more_than_one_race, percent_other_race
 *
 * Usage: node scripts/fetch-demographics.mjs
 * Output: public/district-demographics.json
 */

import { writeFileSync, readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT = join(ROOT, "public", "district-demographics.json");
const CHECKPOINT = join(ROOT, "public", "district-demographics.checkpoint.json");

const STATE_NAMES = {
  AL: "Alabama", AK: "Alaska", AZ: "Arizona", AR: "Arkansas", CA: "California",
  CO: "Colorado", CT: "Connecticut", DE: "Delaware", FL: "Florida", GA: "Georgia",
  HI: "Hawaii", ID: "Idaho", IL: "Illinois", IN: "Indiana", IA: "Iowa",
  KS: "Kansas", KY: "Kentucky", LA: "Louisiana", ME: "Maine", MD: "Maryland",
  MA: "Massachusetts", MI: "Michigan", MN: "Minnesota", MS: "Mississippi",
  MO: "Missouri", MT: "Montana", NE: "Nebraska", NV: "Nevada", NH: "New Hampshire",
  NJ: "New Jersey", NM: "New Mexico", NY: "New York", NC: "North Carolina",
  ND: "North Dakota", OH: "Ohio", OK: "Oklahoma", OR: "Oregon", PA: "Pennsylvania",
  RI: "Rhode Island", SC: "South Carolina", SD: "South Dakota", TN: "Tennessee",
  TX: "Texas", UT: "Utah", VT: "Vermont", VA: "Virginia", WA: "Washington",
  WV: "West Virginia", WI: "Wisconsin", WY: "Wyoming",
};

const AT_LARGE = new Set(["AK", "DE", "ND", "SD", "VT", "WY"]);

function ordinal(n) {
  if (n === 1) return "1st";
  if (n === 2) return "2nd";
  if (n === 3) return "3rd";
  return `${n}th`;
}

function wikiPageTitle(districtId) {
  const [state, numStr] = districtId.split("-");
  const stateName = STATE_NAMES[state];
  if (!stateName) return null;
  if (AT_LARGE.has(state)) return `${stateName}'s at-large congressional district`;
  return `${stateName}'s ${ordinal(parseInt(numStr, 10))} congressional district`;
}

function parseWikitext(wikitext) {
  const result = {};
  const fields = {
    white: /\|\s*percent\s+white\s*=\s*([\d.]+)/i,
    hispanic: /\|\s*percent\s+hispanic\s*=\s*([\d.]+)/i,
    black: /\|\s*percent\s+black\s*=\s*([\d.]+)/i,
    asian: /\|\s*percent\s+asian\s*=\s*([\d.]+)/i,
    multiracial: /\|\s*percent\s+more\s+than\s+one\s+race\s*=\s*([\d.]+)/i,
    other: /\|\s*percent\s+other\s+race\s*=\s*([\d.]+)/i,
    native: /\|\s*percent\s+(?:american\s+indian|native\s+american)\s*=\s*([\d.]+)/i,
    pacific: /\|\s*percent\s+pacific\s+islander\s*=\s*([\d.]+)/i,
  };

  for (const line of wikitext.split("\n")) {
    for (const [key, pattern] of Object.entries(fields)) {
      if (result[key] === undefined) {
        const m = line.match(pattern);
        if (m) result[key] = parseFloat(m[1]);
      }
    }
  }

  return Object.keys(result).length > 0 ? result : null;
}

async function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

async function fetchDistrict(districtId, retries = 4) {
  const title = wikiPageTitle(districtId);
  if (!title) return null;

  const url = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(title)}&prop=wikitext&format=json&redirects=1`;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "CongressMapped/1.0 (spencerdosik@gmail.com)" } });
      if (res.status === 429) {
        const wait = Math.pow(2, attempt) * 2000;
        console.log(`  [429] waiting ${wait / 1000}s…`);
        await sleep(wait);
        continue;
      }
      if (!res.ok) return null;
      const data = await res.json();
      if (data.error || !data.parse?.wikitext?.["*"]) return null;
      return parseWikitext(data.parse.wikitext["*"]);
    } catch {
      if (attempt < retries) await sleep(1000);
    }
  }
  return null;
}

const districtDataSrc = readFileSync(join(ROOT, "lib", "districtData.ts"), "utf8");
const districtIds = [...districtDataSrc.matchAll(/"([A-Z]{2}-\d{2})"\s*:/g)].map(m => m[1]);
const checkpoint = existsSync(CHECKPOINT) ? JSON.parse(readFileSync(CHECKPOINT, "utf8")) : {};
const results = { ...checkpoint };
const remaining = districtIds.filter(id => !(id in results));

console.log(`Total: ${districtIds.length} | Done: ${Object.keys(results).length} | Left: ${remaining.length}`);

for (let i = 0; i < remaining.length; i++) {
  const id = remaining[i];
  const demo = await fetchDistrict(id);
  results[id] = demo;

  const fields = demo ? Object.entries(demo).map(([k, v]) => `${k}=${v}%`).join(" ") : "no data";
  console.log(`[${Object.keys(results).length}/${districtIds.length}] ${id}: ${fields}`);

  if (i % 10 === 9) writeFileSync(CHECKPOINT, JSON.stringify(results, null, 2));
  if (i < remaining.length - 1) await sleep(800);
}

writeFileSync(OUT, JSON.stringify(results, null, 2));
try { import("fs").then(fs => fs.unlinkSync(CHECKPOINT)); } catch {}

const withData = Object.values(results).filter(v => v !== null).length;
console.log(`\nDone! ${withData}/${districtIds.length} districts with demographic data.`);
