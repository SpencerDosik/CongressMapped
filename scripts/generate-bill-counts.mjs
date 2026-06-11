/**
 * Generates public/bill-counts.json — per-member legislative activity counts
 * from the Congress.gov API (https://api.congress.gov/).
 *
 * For each bioguide ID found in public/legislator-meta.json:
 *   - sponsored:   pagination.count of /member/{id}/sponsored-legislation?limit=1
 *   - cosponsored: pagination.count of /member/{id}/cosponsored-legislation?limit=1
 *   - becameLaw:   count of items on the FIRST page (limit=250) of
 *                  /member/{id}/sponsored-legislation whose latestAction.text
 *                  contains "Became Public Law".
 *
 * NOTE: becameLaw is APPROXIMATE — we only scan one page of up to 250 sponsored
 * bills, so members who have sponsored more than 250 bills may be undercounted.
 * (Counting exactly would require paging through every sponsored bill.)
 *
 * Requires a Congress.gov API key (free: https://api.congress.gov/sign-up/),
 * read from the CONGRESS_GOV_API_KEY env var or from .env.local.
 *
 * Run: CONGRESS_GOV_API_KEY=xxxx node scripts/generate-bill-counts.mjs
 *
 * Output shape (keyed by bioguide ID):
 *   { "B001234": { "sponsored": 42, "cosponsored": 310, "becameLaw": 2 }, ... }
 */

import { readFileSync, writeFileSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PUBLIC = join(ROOT, "public");

const API_BASE = "https://api.congress.gov/v3";
const REQUEST_DELAY_MS = 150; // be polite — stay well under the 5,000 req/hr cap
const MAX_RETRIES = 5;

// ── API key: env var, falling back to .env.local ─────────────────────────────

function loadApiKey() {
  if (process.env.CONGRESS_GOV_API_KEY) return process.env.CONGRESS_GOV_API_KEY.trim();

  const envPath = join(ROOT, ".env.local");
  if (existsSync(envPath)) {
    for (const line of readFileSync(envPath, "utf8").split("\n")) {
      const m = line.match(/^\s*CONGRESS_GOV_API_KEY\s*=\s*(.+?)\s*$/);
      if (m) return m[1].replace(/^["']|["']$/g, "");
    }
  }
  return null;
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function redact(url) {
  return url.replace(/api_key=[^&]+/, "api_key=***");
}

// ── Fetch with 429 backoff ────────────────────────────────────────────────────

async function fetchJSON(url, attempt = 0) {
  let res;
  try {
    res = await fetch(url);
  } catch (err) {
    if (attempt >= MAX_RETRIES) throw err;
    const wait = Math.min(60_000, 1_000 * 2 ** attempt);
    console.log(`  network error (${err.message}) — retrying in ${wait}ms`);
    await sleep(wait);
    return fetchJSON(url, attempt + 1);
  }

  if (res.status === 429) {
    if (attempt >= MAX_RETRIES) throw new Error(`Rate limited too many times: ${redact(url)}`);
    const retryAfter = Number(res.headers.get("retry-after"));
    const wait = Number.isFinite(retryAfter) && retryAfter > 0
      ? retryAfter * 1_000
      : Math.min(60_000, 2_000 * 2 ** attempt);
    console.log(`  429 rate limited — backing off ${wait}ms`);
    await sleep(wait);
    return fetchJSON(url, attempt + 1);
  }

  if (!res.ok) throw new Error(`HTTP ${res.status}: ${redact(url)}`);
  return res.json();
}

// ── Per-member counts ─────────────────────────────────────────────────────────

async function fetchMemberCounts(bioguide, apiKey) {
  const base = `${API_BASE}/member/${bioguide}`;

  // Total counts come from pagination.count — no need to page through results.
  const sponsoredMeta = await fetchJSON(
    `${base}/sponsored-legislation?format=json&limit=1&api_key=${apiKey}`
  );
  await sleep(REQUEST_DELAY_MS);

  const cosponsoredMeta = await fetchJSON(
    `${base}/cosponsored-legislation?format=json&limit=1&api_key=${apiKey}`
  );
  await sleep(REQUEST_DELAY_MS);

  // becameLaw: scan the first page (up to 250) of sponsored bills. Approximate
  // for members with >250 sponsored bills — see header comment.
  const firstPage = await fetchJSON(
    `${base}/sponsored-legislation?format=json&limit=250&api_key=${apiKey}`
  );
  await sleep(REQUEST_DELAY_MS);

  const items = firstPage.sponsoredLegislation ?? [];
  const becameLaw = items.filter((bill) =>
    (bill?.latestAction?.text ?? "").includes("Became Public Law")
  ).length;

  return {
    sponsored: sponsoredMeta.pagination?.count ?? 0,
    cosponsored: cosponsoredMeta.pagination?.count ?? 0,
    becameLaw,
  };
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  const apiKey = loadApiKey();
  if (!apiKey) {
    console.error(
      "Missing API key. Set CONGRESS_GOV_API_KEY in the environment or in .env.local.\n" +
        "Get a free key at https://api.congress.gov/sign-up/"
    );
    process.exit(1);
  }

  const metaPath = join(PUBLIC, "legislator-meta.json");
  if (!existsSync(metaPath)) {
    console.error(`Missing ${metaPath} — run scripts/fetch-legislator-data.mjs first.`);
    process.exit(1);
  }

  const meta = JSON.parse(readFileSync(metaPath, "utf8"));
  const bioguides = [
    ...new Set(
      Object.values(meta)
        .map((m) => m?.bioguide)
        .filter(Boolean)
    ),
  ].sort();

  console.log(`Fetching bill counts for ${bioguides.length} members (3 requests each)...`);

  const result = {};
  let failures = 0;

  for (let i = 0; i < bioguides.length; i++) {
    const id = bioguides[i];
    try {
      const counts = await fetchMemberCounts(id, apiKey);
      result[id] = counts;
      console.log(
        `[${i + 1}/${bioguides.length}] ${id}  sponsored=${counts.sponsored}  ` +
          `cosponsored=${counts.cosponsored}  becameLaw≈${counts.becameLaw}`
      );
    } catch (err) {
      failures++;
      console.error(`[${i + 1}/${bioguides.length}] ${id}  FAILED: ${err.message}`);
    }
  }

  const outPath = join(PUBLIC, "bill-counts.json");
  writeFileSync(outPath, JSON.stringify(result, null, 1));
  console.log(
    `\nWrote ${Object.keys(result).length} members to ${outPath}` +
      (failures ? ` (${failures} failed — re-run to retry)` : "")
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
