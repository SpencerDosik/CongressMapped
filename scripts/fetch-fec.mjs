/**
 * Fetches 2024 House candidate fundraising totals from the FEC open API.
 * Produces public/fec-data.json with:
 *   { "CA-13": { raised, spent, cashOnHand, debts } }
 *   All dollar values in dollars (not thousands).
 *
 * Usage:
 *   FEC_API_KEY=yourkey node scripts/fetch-fec.mjs
 *
 * Free API key (api.data.gov): https://api.data.gov/signup/
 * The FEC API is free and open — the key just lifts rate limits.
 * Use "DEMO_KEY" for low-volume testing (very restrictive rate limits).
 */

import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, "..", "public");

const API_KEY = process.env.FEC_API_KEY ?? "DEMO_KEY";
const BASE = "https://api.open.fec.gov/v1";

async function fetchJSON(url) {
  console.log(`Fetching ${url} ...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${await res.text()}`);
  return res.json();
}

async function fetchAllPages(endpoint, params) {
  const results = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const qs = new URLSearchParams({ ...params, page, api_key: API_KEY, per_page: 100 });
    const data = await fetchJSON(`${BASE}${endpoint}?${qs}`);
    results.push(...(data.results ?? []));
    totalPages = data.pagination?.pages ?? 1;
    page++;
    if (page <= totalPages) await new Promise(r => setTimeout(r, 500)); // rate limit
  }
  return results;
}

// Determine district ID from candidate data
function toDistrictId(candidate) {
  if (!candidate.state || !candidate.district) return null;
  const num = String(candidate.district).padStart(2, "0");
  return `${candidate.state}-${num}`;
}

async function main() {
  // Fetch all 2024 House winners (current office holders)
  const candidates = await fetchAllPages("/candidates/", {
    office: "H",
    election_year: 2024,
    has_raised_funds: true,
    sort: "-total_receipts",
  });

  console.log(`Got ${candidates.length} candidates.`);

  // Group by district, pick the winner (candidate_status = C for active)
  const byDistrict = {};

  for (const c of candidates) {
    const districtId = toDistrictId(c);
    if (!districtId) continue;

    // We'll take the top fundraiser per district as a proxy for the winner
    // A more robust approach: cross-reference with district data for party match
    if (!byDistrict[districtId]) {
      byDistrict[districtId] = {
        raised: c.total_receipts ?? 0,
        spent: c.total_disbursements ?? 0,
        cashOnHand: c.cash_on_hand_end_period ?? 0,
        debts: c.total_debts_owed_by_committee ?? 0,
        candidateName: c.name,
        party: c.party,
      };
    }
  }

  const outPath = join(PUBLIC, "fec-data.json");
  writeFileSync(outPath, JSON.stringify(byDistrict, null, 2));
  console.log(`Wrote ${Object.keys(byDistrict).length} entries to ${outPath}`);
}

main().catch(e => { console.error(e); process.exit(1); });
