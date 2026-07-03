/**
 * Fetches House member stats from the ProPublica Congress API.
 * Produces public/propublica-data.json with:
 *   { "CA-13": { missedVotesPct, partyUnityPct, billsSponsored, billsCosponsored } }
 *
 * Usage:
 *   PROPUBLICA_API_KEY=yourkey node scripts/fetch-propublica.mjs
 *
 * Free API key: https://www.propublica.org/datastore/api/propublica-congress-api
 */

import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, "..", "public");

const API_KEY = process.env.PROPUBLICA_API_KEY;
if (!API_KEY) {
  console.error("Error: PROPUBLICA_API_KEY environment variable not set.");
  console.error("Get a free key at https://www.propublica.org/datastore/api/propublica-congress-api");
  process.exit(1);
}

const CONGRESS = 119;

async function fetchMembers() {
  const url = `https://api.propublica.org/congress/v1/${CONGRESS}/house/members.json`;
  console.log(`Fetching ${url} ...`);
  const res = await fetch(url, { headers: { "X-API-Key": API_KEY } });
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  const json = await res.json();
  return json.results?.[0]?.members ?? [];
}

// Convert ProPublica state + district to our district ID format (e.g., "CA-13")
function toDistrictId(state, district) {
  if (!state || district == null) return null;
  const num = String(district).padStart(2, "0");
  return `${state}-${num}`;
}

async function main() {
  const members = await fetchMembers();
  console.log(`Got ${members.length} members.`);

  const output = {};

  for (const m of members) {
    const districtId = toDistrictId(m.state, m.district);
    if (!districtId) continue;

    const entry = {};
    if (m.missed_votes_pct != null) entry.missedVotesPct = +m.missed_votes_pct;
    if (m.votes_with_party_pct != null) entry.partyUnityPct = +m.votes_with_party_pct;
    if (m.bills_sponsored != null) entry.billsSponsored = +m.bills_sponsored;
    if (m.bills_cosponsored != null) entry.billsCosponsored = +m.bills_cosponsored;
    if (m.total_votes != null) entry.totalVotes = +m.total_votes;
    if (m.seniority != null) entry.seniority = m.seniority;

    output[districtId] = entry;
  }

  const outPath = join(PUBLIC, "propublica-data.json");
  writeFileSync(outPath, JSON.stringify(output, null, 2));
  console.log(`Wrote ${Object.keys(output).length} entries to ${outPath}`);
}

main().catch(e => { console.error(e); process.exit(1); });
