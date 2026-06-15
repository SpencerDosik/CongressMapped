/**
 * Fetches urban% and median household income for every House district from Wikipedia.
 * Parses the infobox fields:
 *   | percent urban = XX.XX
 *   | median income = $XX,XXX
 *
 * Usage: node scripts/fetch-wikipedia-district-data.mjs
 * Output: public/wikipedia-district-data.json
 * Then:   node scripts/apply-wikipedia-district-data.mjs
 */

import { writeFileSync, readFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT = join(ROOT, "public", "wikipedia-district-data.json");
const CHECKPOINT = join(ROOT, "public", "wikipedia-district-data.checkpoint.json");

// State abbreviation → full name (Wikipedia page naming)
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

// These states use at-large (single district, stored as -00)
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

  if (AT_LARGE.has(state)) {
    return `${stateName}'s at-large congressional district`;
  }

  const num = parseInt(numStr, 10);
  return `${stateName}'s ${ordinal(num)} congressional district`;
}

function parseWikitext(wikitext) {
  const result = { urbanPct: null, income: null };

  for (const line of wikitext.split("\n")) {
    const trimmed = line.trim();

    // urban%: "| percent urban = 66.82" or "|percent urban = 99.99"
    const urbanMatch = trimmed.match(/\|\s*percent\s+urban\s*=\s*([\d.]+)/i);
    if (urbanMatch) {
      const val = parseFloat(urbanMatch[1]);
      if (!isNaN(val)) result.urbanPct = Math.round(val * 10) / 10;
    }

    // income: "| median income = $153,117" (may have <ref>...)
    const incomeMatch = trimmed.match(/\|\s*median\s+income\s*=\s*\$?([\d,]+)/i);
    if (incomeMatch) {
      const val = parseInt(incomeMatch[1].replace(/,/g, ""), 10);
      if (!isNaN(val)) result.income = Math.round(val / 1000); // store in $K to match existing format
    }
  }

  return result;
}

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

async function fetchDistrict(districtId, retries = 4) {
  const title = wikiPageTitle(districtId);
  if (!title) return { urbanPct: null, income: null };

  const url = `https://en.wikipedia.org/w/api.php?action=parse&page=${encodeURIComponent(title)}&prop=wikitext&format=json&redirects=1`;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(url, { headers: { "User-Agent": "CongressMapped/1.0 (educational project; spencerdosik@gmail.com)" } });

      if (res.status === 429) {
        const wait = Math.pow(2, attempt) * 2000; // 2s, 4s, 8s, 16s
        console.log(`  [rate limited] waiting ${wait / 1000}s before retry…`);
        await sleep(wait);
        continue;
      }

      if (!res.ok) return { urbanPct: null, income: null };
      const data = await res.json();
      if (data.error || !data.parse?.wikitext?.["*"]) return { urbanPct: null, income: null };
      return parseWikitext(data.parse.wikitext["*"]);
    } catch {
      if (attempt < retries) await sleep(1000);
    }
  }
  return { urbanPct: null, income: null };
}

// Load all district IDs from districtData.ts
const districtDataSrc = readFileSync(join(ROOT, "lib", "districtData.ts"), "utf8");
const districtIds = [...districtDataSrc.matchAll(/"([A-Z]{2}-\d{2})"\s*:/g)].map(m => m[1]);

// Load checkpoint if exists
const checkpoint = existsSync(CHECKPOINT) ? JSON.parse(readFileSync(CHECKPOINT, "utf8")) : {};
const results = { ...checkpoint };
const remaining = districtIds.filter(id => !(id in results));

console.log(`Total districts: ${districtIds.length}`);
console.log(`Already fetched: ${Object.keys(results).length}`);
console.log(`Remaining: ${remaining.length}`);

// Fetch sequentially with 800ms gap — Wikipedia rate limit is strict
const DELAY = 800;

for (let i = 0; i < remaining.length; i++) {
  const id = remaining[i];
  const { urbanPct, income } = await fetchDistrict(id);
  results[id] = { urbanPct, income };

  const status = urbanPct !== null || income !== null
    ? `urban=${urbanPct ?? "—"}  income=$${income !== null ? income + "k" : "—"}`
    : "no data";
  console.log(`[${Object.keys(results).length}/${districtIds.length}] ${id}: ${status}`);

  // Save checkpoint after every 10 districts
  if (i % 10 === 9) writeFileSync(CHECKPOINT, JSON.stringify(results, null, 2));

  if (i < remaining.length - 1) await sleep(DELAY);
}

// Write final output
writeFileSync(OUT, JSON.stringify(results, null, 2));
// Clean up checkpoint
import { unlinkSync } from "fs";
try { unlinkSync(CHECKPOINT); } catch {}

const withUrban = Object.values(results).filter(v => v.urbanPct !== null).length;
const withIncome = Object.values(results).filter(v => v.income !== null).length;
console.log(`\nDone!`);
console.log(`  Urban%:  ${withUrban}/${districtIds.length} districts`);
console.log(`  Income:  ${withIncome}/${districtIds.length} districts`);
console.log(`Output: public/wikipedia-district-data.json`);
console.log(`Next:   node scripts/apply-wikipedia-district-data.mjs`);
