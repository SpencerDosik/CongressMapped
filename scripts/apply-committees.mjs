/**
 * Reads public/committee-membership-raw.json (from fetch-committees.mjs)
 * and public/legislator-meta.json, then writes public/committees.json:
 *   { committees: string[], districts: Record<districtId, string[]> }
 *
 * Usage: node scripts/apply-committees.mjs
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const raw = JSON.parse(
  readFileSync(join(ROOT, "public", "committee-membership-raw.json"), "utf-8")
);
const legMeta = JSON.parse(
  readFileSync(join(ROOT, "public", "legislator-meta.json"), "utf-8")
);

const districts = {};
const allCommittees = new Set();

for (const [districtId, meta] of Object.entries(legMeta)) {
  const bioguide = meta.bioguide;
  if (!bioguide) continue;
  const cs = raw[bioguide] ?? [];
  if (cs.length > 0) {
    districts[districtId] = cs;
    for (const c of cs) allCommittees.add(c);
  }
}

const sortedCommittees = [...allCommittees].sort();

writeFileSync(
  join(ROOT, "public", "committees.json"),
  JSON.stringify({ committees: sortedCommittees, districts })
);
console.log(`Done. ${Object.keys(districts).length} districts mapped to committees.`);
console.log(`${sortedCommittees.length} unique committees.`);
console.log("Output: public/committees.json");
