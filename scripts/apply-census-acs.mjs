/**
 * Applies collegePct and povertyPct from public/census-acs.json
 * into lib/districtData.ts.
 *
 * Run after fetch-census-acs.mjs has populated the JSON file.
 * Usage: node scripts/apply-census-acs.mjs
 */

import { readFileSync, writeFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");

const acsRaw = JSON.parse(readFileSync(join(ROOT, "public", "census-acs.json"), "utf8"));
let src = readFileSync(join(ROOT, "lib", "districtData.ts"), "utf8");

let replaced = 0;
const missing = [];

src = src.replace(/"([A-Z]{2}-\d{2})"\s*:\s*\{([^}]+)\}/g, (full, distId, body) => {
  const acs = acsRaw[distId];
  if (!acs) { missing.push(distId); return full; }

  let newBody = body;

  // collegePct: replace if present, else insert after pvi
  if (/collegePct\s*:/.test(newBody)) {
    if (acs.collegePct !== null)
      newBody = newBody.replace(/collegePct\s*:\s*[\d.]+/, `collegePct: ${acs.collegePct}`);
  } else if (acs.collegePct !== null) {
    newBody = newBody.replace(/(pvi\s*:\s*[-\d.]+)/, `$1, collegePct: ${acs.collegePct}`);
  }

  // povertyPct: replace if present, else insert after collegePct (or pvi)
  if (/povertyPct\s*:/.test(newBody)) {
    if (acs.povertyPct !== null)
      newBody = newBody.replace(/povertyPct\s*:\s*[\d.]+/, `povertyPct: ${acs.povertyPct}`);
  } else if (acs.povertyPct !== null) {
    const anchor = /collegePct\s*:\s*[\d.]+/.test(newBody) ? /collegePct\s*:\s*[\d.]+/ : /pvi\s*:\s*[-\d.]+/;
    newBody = newBody.replace(anchor, (m) => `${m}, povertyPct: ${acs.povertyPct}`);
  }

  if (newBody !== body) replaced++;
  return `"${distId}": {${newBody}}`;
});

writeFileSync(join(ROOT, "lib", "districtData.ts"), src, "utf8");
console.log(`Updated collegePct/povertyPct for ${replaced} districts.`);
if (missing.length) console.log(`No ACS data for ${missing.length} districts:`, missing.join(", "));
console.log("Done.");
