/**
 * Fetches House committee membership from unitedstates/congress-legislators GitHub.
 * Writes an intermediate public/committee-membership-raw.json (bioguide → committee names).
 *
 * Usage: node scripts/fetch-committees.mjs
 * Next:  node scripts/apply-committees.mjs
 */

import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const MEMBERSHIP_URL =
  "https://raw.githubusercontent.com/unitedstates/congress-legislators/main/committee-membership-current.json";
const COMMITTEES_URL =
  "https://raw.githubusercontent.com/unitedstates/congress-legislators/main/committees-current.json";

console.log("Fetching committee data from unitedstates/congress-legislators…");

let membership, committees;
try {
  const [r1, r2] = await Promise.all([fetch(MEMBERSHIP_URL), fetch(COMMITTEES_URL)]);
  if (!r1.ok) throw new Error(`membership HTTP ${r1.status}`);
  if (!r2.ok) throw new Error(`committees HTTP ${r2.status}`);
  [membership, committees] = await Promise.all([r1.json(), r2.json()]);
} catch (err) {
  console.error("Fetch failed:", err.message);
  process.exit(1);
}

// Build thomas_id → committee name (House full committees only, not subcommittees)
// House full committee thomas_ids are exactly 4 chars starting with "HS"
const committeeNames = {};
for (const c of committees) {
  if (c.thomas_id && c.thomas_id.startsWith("HS") && c.thomas_id.length === 4) {
    committeeNames[c.thomas_id] = c.name.replace(/^House Committee on /, "").replace(/^House /, "");
  }
}
console.log(`Found ${Object.keys(committeeNames).length} House standing committees.`);

// Build bioguide → [committee names]
// membership is keyed by thomas_id → array of {bioguide, rank, title, party}
const bioguideToCommittees = {};
for (const [thomasId, members] of Object.entries(membership)) {
  const name = committeeNames[thomasId];
  if (!name) continue;
  for (const member of members) {
    const bg = member.bioguide;
    if (!bg) continue;
    if (!bioguideToCommittees[bg]) bioguideToCommittees[bg] = [];
    if (!bioguideToCommittees[bg].includes(name)) {
      bioguideToCommittees[bg].push(name);
    }
  }
}

writeFileSync(
  join(ROOT, "public", "committee-membership-raw.json"),
  JSON.stringify(bioguideToCommittees, null, 2)
);
console.log(`Done. ${Object.keys(bioguideToCommittees).length} members with committee data.`);
console.log("Output: public/committee-membership-raw.json");
console.log("Next:   node scripts/apply-committees.mjs");
