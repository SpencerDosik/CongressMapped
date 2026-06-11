/**
 * Fetches urban % for every House district from Wikipedia infoboxes.
 *
 * Wikipedia's congressional district articles (e.g. "California's 1st congressional
 * district") contain a {{United States congressional district infobox}} with:
 *   | urban   = 85.3%
 *
 * Run from repo root:
 *   node scripts/fetch-urban-pct.mjs
 *
 * Output: public/urban-pct.json  — Record<districtId, urbanPct (0–100)>
 * Then run:
 *   node scripts/apply-urban-pct.mjs
 * to write the values into lib/districtData.ts
 */

import { writeFileSync, existsSync, readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT = join(ROOT, "public", "urban-pct.json");
const CHECKPOINT = join(ROOT, "data-research", "work", "urban-pct-checkpoint.json");

// ── District ID → Wikipedia page title ───────────────────────────────────────

const ORDINALS = [
  "", "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th", "9th", "10th",
  "11th", "12th", "13th", "14th", "15th", "16th", "17th", "18th", "19th",
  "20th", "21st", "22nd", "23rd", "24th", "25th", "26th", "27th", "28th",
  "29th", "30th", "31st", "32nd", "33rd", "34th", "35th", "36th", "37th",
  "38th", "39th", "40th", "41st", "42nd", "43rd", "44th", "45th", "46th",
  "47th", "48th", "49th", "50th", "51st", "52nd", "53rd",
];

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

function wikiTitle(districtId) {
  const [state, num] = districtId.split("-");
  const stateName = STATE_NAMES[state];
  if (!stateName) return null;
  const n = parseInt(num, 10);
  if (AT_LARGE.has(state) || n === 0) {
    return `${stateName}'s at-large congressional district`;
  }
  const ord = ORDINALS[n];
  if (!ord) return null;
  return `${stateName}'s ${ord} congressional district`;
}

// ── Wikipedia API fetch ───────────────────────────────────────────────────────

async function fetchWikitext(title) {
  const url = new URL("https://en.wikipedia.org/w/api.php");
  url.searchParams.set("action", "parse");
  url.searchParams.set("page", title);
  url.searchParams.set("prop", "wikitext");
  url.searchParams.set("format", "json");
  url.searchParams.set("redirects", "1");

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": "CongressMapped/1.0 (data pipeline; contact via github)" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const json = await res.json();
  if (json.error) throw new Error(json.error.info);
  return json.parse?.wikitext?.["*"] ?? null;
}

function parseUrbanPct(wikitext) {
  // Match: | urban   = 85.3% or | urban = 85.3 or |urban=85.3%
  const m = wikitext.match(/\|\s*urban\s*=\s*([\d.]+)\s*%?/i);
  if (!m) return null;
  const v = parseFloat(m[1]);
  return isNaN(v) ? null : v;
}

// ── Main ──────────────────────────────────────────────────────────────────────

// Build list of all district IDs from districtData.ts
const srcTs = readFileSync(join(ROOT, "lib", "districtData.ts"), "utf8");
const districtIds = [...srcTs.matchAll(/"([A-Z]{2}-\d{2})"\s*:/g)].map(m => m[1]);
console.log(`Total districts: ${districtIds.length}`);

// Resume from checkpoint if it exists
const checkpoint = existsSync(CHECKPOINT)
  ? JSON.parse(readFileSync(CHECKPOINT, "utf8"))
  : {};

const results = { ...checkpoint };
const remaining = districtIds.filter(id => !(id in results));
console.log(`Already fetched: ${Object.keys(checkpoint).length}, Remaining: ${remaining.length}`);

let successCount = 0;
let failCount = 0;

for (let i = 0; i < remaining.length; i++) {
  const id = remaining[i];
  const title = wikiTitle(id);
  if (!title) {
    console.warn(`  [skip] ${id} — no title mapping`);
    results[id] = null;
    continue;
  }

  try {
    const wikitext = await fetchWikitext(title);
    if (!wikitext) {
      console.warn(`  [miss] ${id} — no wikitext`);
      results[id] = null;
    } else {
      const pct = parseUrbanPct(wikitext);
      if (pct === null) {
        console.warn(`  [miss] ${id} — urban% not found in infobox ("${title}")`);
        results[id] = null;
      } else {
        console.log(`  [ok]   ${id} = ${pct}%`);
        results[id] = pct;
        successCount++;
      }
    }
  } catch (err) {
    console.error(`  [err]  ${id}: ${err.message}`);
    results[id] = null;
    failCount++;
  }

  // Save checkpoint every 25 fetches
  if ((i + 1) % 25 === 0) {
    writeFileSync(CHECKPOINT, JSON.stringify(results, null, 2));
    console.log(`  → checkpoint saved (${i + 1}/${remaining.length})`);
  }

  // Polite delay: 300ms between requests
  await new Promise(r => setTimeout(r, 300));
}

// Write final output
writeFileSync(OUT, JSON.stringify(results, null, 2));
writeFileSync(CHECKPOINT, JSON.stringify(results, null, 2));

const found = Object.values(results).filter(v => v !== null).length;
console.log(`\nDone. ${found}/${districtIds.length} districts have urban% data.`);
console.log(`Output: public/urban-pct.json`);
console.log(`\nNext step: node scripts/apply-urban-pct.mjs`);
