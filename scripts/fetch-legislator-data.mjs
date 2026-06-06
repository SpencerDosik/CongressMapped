/**
 * One-time script: downloads congress-legislators data and generates
 * public/legislator-meta.json and public/committee-data.json
 *
 * Run: node scripts/fetch-legislator-data.mjs
 */

import { writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const PUBLIC = join(__dirname, "..", "public");

const BASE =
  "https://raw.githubusercontent.com/unitedstates/congress-legislators/gh-pages";

async function fetchJSON(url) {
  console.log(`Fetching ${url} ...`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${url}`);
  return res.json();
}

// Build district key "CA-03" from a term entry
function districtKey(term) {
  const state = term.state;
  const district = term.district;
  // At-large districts have district = 0 in the data
  const num = String(district ?? 0).padStart(2, "0");
  return `${state}-${num}`;
}

// Find the most recent House term for a legislator
function currentHouseTerm(terms) {
  for (let i = terms.length - 1; i >= 0; i--) {
    if (terms[i].type === "rep") return terms[i];
  }
  return null;
}

async function main() {
  // ── 1. legislators-current.json ──────────────────────────────────────────
  const legislators = await fetchJSON(`${BASE}/legislators-current.json`);

  const legislatorMeta = {};

  for (const leg of legislators) {
    const term = currentHouseTerm(leg.terms ?? []);
    if (!term) continue; // skip senators

    const key = districtKey(term);
    legislatorMeta[key] = {
      bioguide: leg.id?.bioguide ?? null,
      fecIds: leg.id?.fec ?? [],
      phone: term.phone ?? null,
      url: term.url ?? null,
      office: term.office ?? null,
      contactForm: term.contact_form ?? null,
      twitter: leg.social?.twitter ?? null,
      facebook: leg.social?.facebook ?? null,
      youtube: leg.social?.youtube ?? null,
      birthday: leg.bio?.birthday ?? null,
      gender: leg.bio?.gender ?? null,
      religion: leg.bio?.religion ?? null,
    };
  }

  // ── 2. committees-current.json ───────────────────────────────────────────
  const committees = await fetchJSON(`${BASE}/committees-current.json`);

  // Build lookup: thomas_id → { name, jurisdiction }
  const committeeInfo = {};
  for (const c of committees) {
    const key = c.thomas_id ?? c.committee_id;
    if (!key) continue;
    committeeInfo[key] = {
      name: c.name,
      type: c.type ?? "standing",
    };
    // Index subcommittees too (parent_thomas_id prefix + subcommittee thomas_id)
    for (const sub of c.subcommittees ?? []) {
      const subKey = key + sub.thomas_id;
      committeeInfo[subKey] = {
        name: sub.name,
        type: "subcommittee",
        parent: c.name,
      };
    }
  }

  // ── 3. committee-membership-current.json ────────────────────────────────
  const membership = await fetchJSON(
    `${BASE}/committee-membership-current.json`
  );

  // Invert: bioguide → [{ committeeKey, rank, title }]
  const bioguideToCommittees = {};
  for (const [committeeKey, members] of Object.entries(membership)) {
    for (const member of members) {
      const bg = member.bioguide;
      if (!bg) continue;
      if (!bioguideToCommittees[bg]) bioguideToCommittees[bg] = [];
      bioguideToCommittees[bg].push({
        code: committeeKey,
        rank: member.rank ?? null,
        title: member.title ?? null,
      });
    }
  }

  // Build committee-data.json: districtId → [{ code, name, type, rank, title, parent? }]
  const committeeData = {};
  for (const [districtId, meta] of Object.entries(legislatorMeta)) {
    const bg = meta.bioguide;
    if (!bg) continue;
    const assignments = bioguideToCommittees[bg] ?? [];
    committeeData[districtId] = assignments
      .map((a) => {
        const info = committeeInfo[a.code];
        if (!info) return null;
        return {
          code: a.code,
          name: info.name,
          type: info.type,
          rank: a.rank,
          title: a.title,
          parent: info.parent ?? null,
        };
      })
      .filter(Boolean)
      .sort((a, b) => {
        // Full committees before subcommittees, then by rank
        if (a.type !== b.type) return a.type === "subcommittee" ? 1 : -1;
        return (a.rank ?? 99) - (b.rank ?? 99);
      });
  }

  // ── Write outputs ────────────────────────────────────────────────────────
  const metaPath = join(PUBLIC, "legislator-meta.json");
  const committeePath = join(PUBLIC, "committee-data.json");

  writeFileSync(metaPath, JSON.stringify(legislatorMeta, null, 2));
  writeFileSync(committeePath, JSON.stringify(committeeData, null, 2));

  const repsFound = Object.keys(legislatorMeta).length;
  const withCommittees = Object.values(committeeData).filter(
    (v) => v.length > 0
  ).length;

  console.log(`\nDone.`);
  console.log(`  public/legislator-meta.json  — ${repsFound} representatives`);
  console.log(
    `  public/committee-data.json   — ${withCommittees} reps with committee data`
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
