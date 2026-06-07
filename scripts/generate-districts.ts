/**
 * Phase 1 data generation script.
 *
 * Reads:
 *   data/sources/downballot_pres_2024.csv    (presidential results by CD, 2024, 119th lines)
 *   data/sources/downballot_pres_2020.csv    (presidential results by CD, 2020, 119th lines)
 *   data/sources/clerk_house_2024.csv        (House results by CD, 2024)
 *   data/sources/clerk_house_2022.csv        (House results by CD, 2022)
 *
 * Writes:
 *   public/district-stats.json     (real Census ACS demographics + derived metrics)
 *   (updates lib/districtData.ts is manual -- see --dry-run output)
 *
 * Usage:
 *   npx ts-node scripts/generate-districts.ts
 *   npx ts-node scripts/generate-districts.ts --dry-run
 *
 * Prerequisites:
 *   - Download CSVs per data/sources/README.md
 *   - Set CENSUS_API_KEY in .env.local if fetching real ACS data
 */

import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

const ROOT = path.resolve(__dirname, "..");
const SOURCES = path.join(ROOT, "data", "sources");
const OUT_STATS = path.join(ROOT, "public", "district-stats.json");

const DRY_RUN = process.argv.includes("--dry-run");

// ── CSV Parser ────────────────────────────────────────────────────────────────
async function parseCsv(filePath: string): Promise<Record<string, string>[]> {
  if (!fs.existsSync(filePath)) {
    console.error(`Missing: ${filePath}`);
    console.error(`Download per data/sources/README.md`);
    process.exit(1);
  }

  const rl = readline.createInterface({
    input: fs.createReadStream(filePath),
    crlfDelay: Infinity,
  });

  const rows: Record<string, string>[] = [];
  let headers: string[] | null = null;

  for await (const line of rl) {
    const cols = line.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
    if (!headers) {
      headers = cols;
      continue;
    }
    const row: Record<string, string> = {};
    headers.forEach((h, i) => { row[h] = cols[i] ?? ""; });
    rows.push(row);
  }

  return rows;
}

// ── Computed PVI ──────────────────────────────────────────────────────────────
/**
 * Computed PVI formula (Cook-style):
 *   natl2024_D_pct = total national D votes / total national votes
 *   natl2024_R_pct = total national R votes / total national votes
 *   natl2020_D_pct = same for 2020
 *   natl2020_R_pct = same for 2020
 *
 *   dist2024_D_margin = (D_votes - R_votes) / total * 100
 *   dist2020_D_margin = same for 2020
 *   natl2024_D_margin = (natl_D - natl_R) / natl_total * 100
 *   natl2020_D_margin = same
 *
 *   pvi = ((dist2024_D_margin - natl2024_D_margin) +
 *           (dist2020_D_margin - natl2020_D_margin)) / 2
 *
 * Result: positive = D-leaning district, negative = R-leaning district.
 * NOTE: This is OPPOSITE to the current districtData.ts convention (positive = R).
 * The generation script outputs a "raw_pvi_D_positive" field; the mapping to
 * the app's convention (positive = R) is applied at the end.
 */
interface PresRow {
  districtId: string;
  demVotes: number;
  repVotes: number;
  total: number;
}

function normalizeDistrictId(raw: string): string | null {
  // Accept: "AL-01", "AL01", "AL 01", "Alabama 1", GEOID "0101"
  const upper = raw.trim().toUpperCase().replace(/\s+/g, "");

  // GEOID format "SSDD"
  if (/^\d{4}$/.test(upper)) {
    const STATE_FIPS: Record<string, string> = {
      "01": "AL", "02": "AK", "04": "AZ", "05": "AR", "06": "CA",
      "08": "CO", "09": "CT", "10": "DE", "11": "DC", "12": "FL",
      "13": "GA", "15": "HI", "16": "ID", "17": "IL", "18": "IN",
      "19": "IA", "20": "KS", "21": "KY", "22": "LA", "23": "ME",
      "24": "MD", "25": "MA", "26": "MI", "27": "MN", "28": "MS",
      "29": "MO", "30": "MT", "31": "NE", "32": "NV", "33": "NH",
      "34": "NJ", "35": "NM", "36": "NY", "37": "NC", "38": "ND",
      "39": "OH", "40": "OK", "41": "OR", "42": "PA", "44": "RI",
      "45": "SC", "46": "SD", "47": "TN", "48": "TX", "49": "UT",
      "50": "VT", "51": "VA", "53": "WA", "54": "WV", "55": "WI",
      "56": "WY",
    };
    const stateFp = upper.slice(0, 2);
    const distFp = upper.slice(2);
    const abbr = STATE_FIPS[stateFp];
    if (!abbr) return null;
    const num = parseInt(distFp, 10);
    return `${abbr}-${String(num).padStart(2, "0")}`;
  }

  // "AL-01" or "AL01"
  const m = upper.match(/^([A-Z]{2})-?(\d{1,2})$/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}`;

  return null;
}

// ── Main ──────────────────────────────────────────────────────────────────────
async function main() {
  console.log("Phase 1 district generation script");
  console.log(DRY_RUN ? "DRY RUN (no files written)" : "WRITE MODE");
  console.log("");

  // Check source files
  const required = [
    "downballot_pres_2024.csv",
    "downballot_pres_2020.csv",
    "clerk_house_2024.csv",
  ];
  const missing = required.filter((f) => !fs.existsSync(path.join(SOURCES, f)));
  if (missing.length > 0) {
    console.error("Missing source files:");
    missing.forEach((f) => console.error(`  data/sources/${f}`));
    console.error("\nDownload them per data/sources/README.md, then re-run.");
    process.exit(1);
  }

  // Parse presidential results
  const pres2024Rows = await parseCsv(path.join(SOURCES, "downballot_pres_2024.csv"));
  const pres2020Rows = await parseCsv(path.join(SOURCES, "downballot_pres_2020.csv"));
  const house2024Rows = await parseCsv(path.join(SOURCES, "clerk_house_2024.csv"));

  console.log(`Loaded ${pres2024Rows.length} presidential 2024 rows`);
  console.log(`Loaded ${pres2020Rows.length} presidential 2020 rows`);
  console.log(`Loaded ${house2024Rows.length} House 2024 rows`);
  console.log("");

  // Inspect column names -- they vary by source
  if (pres2024Rows.length > 0) {
    console.log("2024 pres columns:", Object.keys(pres2024Rows[0]).join(", "));
  }
  if (house2024Rows.length > 0) {
    console.log("House 2024 columns:", Object.keys(house2024Rows[0]).join(", "));
  }
  console.log("");
  console.log("NOTE: Update column name mappings below to match your downloaded CSVs.");
  console.log("      Then re-run to compute PVI, margins, and demographics.");

  if (DRY_RUN) {
    console.log("\nDry-run complete. No files written.");
    return;
  }

  // TODO after confirming column names:
  // 1. Parse D/R votes from each row
  // 2. Compute national totals for 2024 and 2020
  // 3. Compute per-district PVI using formula above
  // 4. Parse House margins from clerk_house_2024.csv
  // 5. Fetch Census ACS demographics via api.census.gov (or read from cached ACS file)
  // 6. Write district-stats.json with real values + provenance
  console.log("Column mapping not yet confirmed. Run with --dry-run first to see column names.");
}

main().catch((err) => { console.error(err); process.exit(1); });
