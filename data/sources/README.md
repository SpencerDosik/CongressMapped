# data/sources

Static CSV files downloaded manually from The Downballot (https://the-db.co/presbycd).
These are one-time downloads used by `scripts/generate-districts.ts` to compute Computed PVI,
presidential swing, turnout, and presidential flip flags.

## Required files

### downballot_pres_2024.csv
Presidential results by congressional district, 2024 election, on current (119th Congress) lines.
Download from: https://the-db.co/presbycd (2024 table)

### downballot_pres_2020.csv
Presidential results by congressional district, 2020 election, recalculated to current (119th Congress) lines.
Download from: https://the-db.co/presbycd (2020 recalculated table)

Both CSVs must be on current (119th Congress) boundaries so swing and historical presidential comparisons
are boundary-consistent across all 435 districts.

## Expected columns

The generation script expects at minimum:
- A district identifier (state abbreviation + district number, or GEOID)
- Democratic presidential votes
- Republican presidential votes
- Total votes (or derivable from Dem + Rep)

Check the exact column headers when you download and update `scripts/generate-districts.ts` to match.

## Notes

- These files are small and static; commit them after download.
- Do not use the Downballot margin column directly for the House margin filter. That column is
  presidential, not House. House margins come from the Clerk of the House results.
- The 2020 table has already been recalculated to current 119th lines by The Downballot,
  so presidential 2020 vs 2024 comparisons are clean for all 435 districts.
