/**
 * Fetches Census ACS 5-Year data for all US congressional districts.
 * Outputs public/district-stats.json
 *
 * Run: node scripts/fetch-district-stats.mjs
 */

import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, "..", "public");

// FIPS → state abbreviation
const FIPS_TO_STATE = {
  "01":"AL","02":"AK","04":"AZ","05":"AR","06":"CA","08":"CO","09":"CT","10":"DE",
  "11":"DC","12":"FL","13":"GA","15":"HI","16":"ID","17":"IL","18":"IN","19":"IA",
  "20":"KS","21":"KY","22":"LA","23":"ME","24":"MD","25":"MA","26":"MI","27":"MN",
  "28":"MS","29":"MO","30":"MT","31":"NE","32":"NV","33":"NH","34":"NJ","35":"NM",
  "36":"NY","37":"NC","38":"ND","39":"OH","40":"OK","41":"OR","42":"PA","44":"RI",
  "45":"SC","46":"SD","47":"TN","48":"TX","49":"UT","50":"VT","51":"VA","53":"WA",
  "54":"WV","55":"WI","56":"WY",
};

// At-large states (district 00)
const AT_LARGE = new Set(["AK","DE","MT","ND","SD","VT","WY","DC"]);

const ACS_BASE = "https://api.census.gov/data/2022/acs/acs5";

// Variables:
// B01002_001E = Median age
// B15003_022E = Bachelor's degree (25+)
// B15003_001E = Total population 25+ (education denominator)
// B17001_002E = Below poverty line
// B17001_001E = Poverty universe (all people for whom poverty status determined)
// B01001_001E = Total population
const VARS = "B01002_001E,B15003_022E,B15003_001E,B17001_002E,B17001_001E,B01001_001E";

async function fetchForState(stateFips) {
  const url = `${ACS_BASE}?get=${VARS}&for=congressional+district:*&in=state:${stateFips}`;
  const res = await fetch(url);
  if (!res.ok) {
    console.warn(`  HTTP ${res.status} for state ${stateFips}`);
    return [];
  }
  return res.json();
}

async function main() {
  const stats = {};
  let fetched = 0;
  let errors = 0;

  const stateFipsList = Object.keys(FIPS_TO_STATE).filter(f => f !== "11"); // skip DC

  for (const fips of stateFipsList) {
    const stateAbbr = FIPS_TO_STATE[fips];
    try {
      const rows = await fetchForState(fips);
      if (!Array.isArray(rows) || rows.length < 2) continue;

      const headers = rows[0]; // first row is header
      const iAge = headers.indexOf("B01002_001E");
      const iBach = headers.indexOf("B15003_022E");
      const iEduTotal = headers.indexOf("B15003_001E");
      const iPovBelow = headers.indexOf("B17001_002E");
      const iPovTotal = headers.indexOf("B17001_001E");
      const iPop = headers.indexOf("B01001_001E");
      const iDistrict = headers.indexOf("congressional district");

      for (let r = 1; r < rows.length; r++) {
        const row = rows[r];
        const distNum = row[iDistrict];
        if (!distNum) continue;

        const districtId = AT_LARGE.has(stateAbbr)
          ? `${stateAbbr}-00`
          : `${stateAbbr}-${String(parseInt(distNum, 10)).padStart(2, "0")}`;

        const age = parseFloat(row[iAge]);
        const bach = parseInt(row[iBach], 10);
        const eduTotal = parseInt(row[iEduTotal], 10);
        const povBelow = parseInt(row[iPovBelow], 10);
        const povTotal = parseInt(row[iPovTotal], 10);
        const pop = parseInt(row[iPop], 10);

        stats[districtId] = {
          age: isFinite(age) ? Math.round(age * 10) / 10 : null,
          education: (eduTotal > 0 && isFinite(bach)) ? Math.round((bach / eduTotal) * 1000) / 10 : null,
          poverty: (povTotal > 0 && isFinite(povBelow)) ? Math.round((povBelow / povTotal) * 1000) / 10 : null,
          population: isFinite(pop) ? pop : null,
        };
        fetched++;
      }
    } catch (err) {
      console.warn(`  Error for ${stateAbbr}: ${err.message}`);
      errors++;
    }

    // Small delay to be polite to Census API
    await new Promise(r => setTimeout(r, 150));
  }

  const outPath = join(PUBLIC, "district-stats.json");
  writeFileSync(outPath, JSON.stringify(stats, null, 2));

  console.log(`\nDone.`);
  console.log(`  public/district-stats.json — ${fetched} districts (${errors} state errors)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
