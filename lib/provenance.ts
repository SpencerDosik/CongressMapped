export type SourceCode =
  | "downballot-2024"      // The Downballot presidential results, 2024, 119th lines
  | "downballot-2020"      // The Downballot presidential results, 2020, recalculated to 119th lines
  | "acs5-2024"            // Census ACS 5-year, 2024 vintage, congressional districts
  | "clerk-house-2024"     // Clerk of the U.S. House, 2024 election statistics
  | "clerk-house-2022"     // Clerk of the U.S. House, 2022 election statistics (prior-boundary for 5 remapped states)
  | "clerk-house-2020"     // Clerk of the U.S. House, 2020 election statistics (prior-boundary for 5 remapped states)
  | "computed-pvi"         // Computed PVI derived from downballot-2024 and downballot-2020
  | "congress-legislators" // unitedstates/congress-legislators dataset (gh-pages branch)
  | "fec-api"              // FEC Open API v1, live at request time
  | "congress-api"         // Congress.gov API v3, live at request time
  | "census-acs-runtime"   // Census ACS, fetched by the demographics API route at request time
  | "model-estimate";      // Model-estimated (stopgap only -- must not appear in production data)

export interface Provenance {
  source: SourceCode;
  asOf: string;          // ISO date string, e.g. "2024-11-15"
  approximate?: boolean; // true when the value carries a known caveat (turnout, old-line House margins)
  note?: string;         // short human-readable caveat, shown in the UI DataSources component
}

// boundaryChanged flag for the five states that drew new maps for the 119th Congress.
// House results from 2020 and 2022 in these states were run on different lines
// and must not be presented as directly comparable to current districts.
export const BOUNDARY_CHANGED_STATES = new Set(["AL", "GA", "LA", "NY", "NC"]);

export function isBoundaryChanged(stateAbbr: string): boolean {
  return BOUNDARY_CHANGED_STATES.has(stateAbbr);
}
