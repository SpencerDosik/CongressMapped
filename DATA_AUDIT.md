# DATA_AUDIT.md -- Phase 0 Repo Audit

Date: 2026-06-06  
Branch: `claude/house-districts-map-visualizer-BZtB7`

---

## CRITICAL ISSUES (must resolve before any Phase 1 work)

### ISSUE 1: Map Boundary Vintage -- 118th Congress, NOT 119th

`public/districts.json` contains `CDSESSN: "118"` on every feature and uses the property key `CD118FP` (e.g. `CD118FP: "29"`). The file is the **118th Congress TIGER/Line boundary set** (drawn after the 2020 Census redistricting cycle and used for the 2022 and 2024 elections).

The 119th Congress (seated January 2025) uses the **same district lines** for most states, because redistricting mid-cycle is rare. However, five states drew new maps that took effect for the 2024 general election (119th Congress seats):

| State | Change |
|-------|--------|
| Alabama | New map ordered by federal court (Milligan) -- 1 new majority-Black district |
| Georgia | New map ordered by federal court (Alpha Phi Alpha) |
| Louisiana | New map ordered by federal court (Robinson) -- 1 new majority-Black district |
| New York | New map drawn by court-appointed special master |
| North Carolina | New map after Supreme Court ended independent-state-legislature doctrine |

**The current `districts.json` may show the WRONG boundaries for AL-02, GA, LA-06, NY, and NC.** This affects map accuracy, centroid placement, and any district-level data alignment.

**Required decision before proceeding:**  
Replace `districts.json` with a 119th Congress boundary file (Census Bureau TIGER/Line 2024 or equivalent) OR confirm that the 2022-cycle TIGER file was used for 2024 elections in those states and the boundaries are correct despite the `CD118FP` label.

---

### ISSUE 2: Margin Sign Convention Conflict

**Current codebase** (`lib/types.ts` line 19, `lib/districtData.ts` line 12):
```
positive margin = Republican won
negative margin = Democrat won
```
Example: `AL-01` Barry Moore (R) has `margin: 32`.

**Build prompt invariant #2** specifies the opposite:
```
A Democrat who won by 4.3 points is +4.3
A Republican who won by 4.3 is -4.3
```

These are **mutually exclusive conventions**. Flipping to the build-prompt convention would require:
- Inverting all 435 margin values in `lib/districtData.ts`
- Inverting all 435 PVI values (currently positive = R lean)
- Flipping the color scale direction in `lib/colors.ts` (currently red=positive)
- Updating all margin-related UI labels and legend text
- Updating `lib/types.ts` comment

**Required decision before proceeding:**  
Confirm which convention to use. The current convention (R=positive) matches Cook Political Report's margin reporting style. The build-prompt convention (D=positive) is the signed-difference style (winner minus loser from the Democratic candidate's perspective).

---

## Current Data Inventory

### `public/districts.json`
- Size: 899 KB, single-line JSON (no newlines)
- Features: 437 (435 voting districts + DC non-voting + PR resident commissioner)
- Vintage: 118th Congress TIGER/Line (CDSESSN: "118")
- Properties per feature: `STATEFP`, `CD118FP`, `AFFGEOID`, `GEOID`, `NAMELSAD`, `LSAD`, `CDSESSN`, `ALAND`, `AWATER`
- States/territories: 52 FIPS codes (50 states + DC + PR)
- District ID construction: `toDistrictId(STATEFP, CD118FP)` in `HouseMap.tsx`

### `lib/districtData.ts` -- `DISTRICT_DATA`
- Type: `Record<string, DistrictFullData>` (435 entries)
- Fields: `repName`, `party`, `margin`, `income`, `pvi`, `termStart`, optional `caucus`, `electionDate`, `electionStatus`
- Margin: integer percent, positive = R won, negative = D won (see ISSUE 2)
- Income: state median HH income +/- district variation, $K, approximate (not real Census ACS)
- PVI: Cook-style lean estimated from 2020+2024 presidential results, positive = R, negative = D
- Current composition: 218R / 214D / 1I / 3 Vacant (as of April 2026)
- Special elections tracked: CA-01, CA-14, TX-23

### `public/district-stats.json` — REMOVED (June 2026)
- Was model-estimated age/education/poverty generated with random noise, not real Census data
- Deleted along with `scripts/generate-district-stats.mjs` and the age/education/poverty filter modes,
  per the no-fabricated-data rule. `scripts/fetch-district-stats.mjs` remains — it fetches real ACS
  data and can repopulate the file (and re-justify those filters) when run outside the sandbox
- The `/api/demographics/[districtId]/route.ts` server route CAN fetch real ACS data at runtime

### `public/legislator-meta.json`
- Entries: 439 (includes delegates and resident commissioner)
- Keyed by districtId (e.g. `"WA-01"`)
- Fields: `bioguide`, `fecIds`, `phone`, `url`, `office`, `contactForm`, `twitter`, `facebook`, `youtube`, `birthday`, `gender`, `religion`
- Source: `unitedstates/congress-legislators` dataset (gh-pages branch), fetched by `scripts/fetch-legislator-data.mjs`
- Many `religion` and `twitter` fields are null

### `public/committee-data.json`
- Entries: 435+ (keyed by districtId)
- Each entry: array of `{ code, name, type, rank, title, parent }`
- Types: `"house"` (full committee) and `"subcommittee"`
- Source: `unitedstates/congress-legislators` dataset

### `lib/apiCache.ts`
- In-memory TTL cache, 1-hour default, max 1000 entries before eviction sweep
- Used by all three server routes

### Server API Routes

| Route | Source | Cache TTL | Key fields returned |
|-------|--------|-----------|---------------------|
| `/api/congress/[bioguideId]` | Congress.gov API v3 | 1 hour | sponsored, cosponsored, becameLaw, totalSponsored, totalCosponsored, cosponsorNetwork |
| `/api/demographics/[districtId]` | Census ACS 5-year 2022 | 1 week | population, medianAge, medianIncome, pctWhite, pctBlack, pctHispanic, pctCollegeEducated, pctPoverty |
| `/api/fec/[districtId]` | FEC Open API v1 | 24 hours | name, party, raised, spent, cashOnHand, topIndustries, allCandidates |

### Environment Variables

| Variable | Status | Used by |
|----------|--------|---------|
| `CONGRESS_GOV_API_KEY` | Set in `.env.local` | `/api/congress/` route |
| `FEC_API_KEY` | NOT SET -- falls back to `"DEMO_KEY"` (rate-limited) | `/api/fec/` route |
| `CENSUS_API_KEY` | NOT SET -- Census ACS is publicly accessible without a key | `/api/demographics/` route |

### Missing Infrastructure

| Item | Status | Notes |
|------|--------|-------|
| `lib/storage.ts` | NOT CREATED | localStorage abstraction with schema version |
| `lib/metrics.ts` | NOT CREATED | Shared metric definitions for rankings/comparison |
| `lib/provenance.ts` | NOT CREATED | Provenance type and source-code enum |
| `data/sources/` directory | NOT CREATED | Placeholder for downballot presidential CSVs |
| `.env.example` | NOT CREATED | Template for required environment variables |
| `/compare` route | NOT CREATED | Side-by-side district comparison |
| `/rankings` route | NOT CREATED | District ranking tables |

---

## Dependency Inventory

**Runtime:**  
`next`, `react`, `react-dom`, `react-simple-maps`, `d3-scale`, `d3-scale-chromatic`, `d3-color`, `d3-interpolate`, `d3-geo`, `topojson-client`, `@types/d3-geo`

**Dev only:**  
`typescript`, `tailwindcss`, `eslint`, `eslint-config-next`, `autoprefixer`, `postcss`, all `@types/*`

**Notable absences:** No charting library (intentional -- all visuals are custom SVG/CSS). No state management library. No test framework.

---

## Map Rendering Architecture

- `components/HouseMap.tsx`: main map using `react-simple-maps` `ComposableMap` + `ZoomableGroup` + `Geographies`
- Projection: `geoAlbersUsa` (built into react-simple-maps)
- District coloring: `lib/colors.ts` `getDistrictColor(districtId, filterMode, districtStats)`
- At zoom >= 4: district number labels via overlaid `ComposableMap` with `Annotation` at `geoCentroid`
- At zoom < 4: state abbreviation labels via second overlaid `ComposableMap`
- At-large states: `AT_LARGE_STATES = Set(["AK","DE","ND","SD","VT","WY"])` -- NOTE: MT (now 2 districts) and HI (2 districts) may need verification

---

## PVI Labeling

- Current label in UI: "Cook PVI"
- Build prompt requires renaming to "Computed PVI" with a methodology note
- Current values are estimates from 2020+2024 presidential results in `lib/districtData.ts`
- No downballot presidential CSV data exists in the repo yet

---

## Awaiting User Decision

**Before any Phase 1 code is written, please confirm:**

1. **Boundary vintage**: Should `districts.json` be replaced with a 119th Congress boundary file? Or is the 118th Congress TIGER file correct for the 2024 election map (since 119th Congress uses same lines as 2024 elections in most states)?

2. **Margin sign convention**: Keep current (positive = R won) or flip to build-prompt spec (positive = D won)?
