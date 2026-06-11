export type Party = "Republican" | "Democrat" | "Independent" | "Vacant" | "Unknown";

export interface Representative {
  bioguideId: string;
  name: string;
  firstName: string;
  lastName: string;
  party: Party;
  state: string;
  district: number; // 0 = at-large
  districtId: string; // "AL-01", "AK-00"
  termStart: string; // ISO date of current term start
  birthday?: string;
  photoUrl?: string;
  website?: string;
}

export interface DistrictStaticData {
  margin: number;    // 2024 margin: positive = R won, negative = D won
  income: number;    // Median HH income in $K (ACS 5-year)
  pvi: number;       // Estimated PVI (not a map filter — kept for ideology chart reference only)
  urbanPct?: number;   // % urban population (2020 Census) — optional until fetch-urban-pct.mjs is run
  collegePct?: number; // % of adults 25+ with bachelor's degree or higher (ACS 5-year 2023)
  povertyPct?: number; // % of population below the federal poverty line (ACS 5-year 2023)
  termStart: number; // Year current incumbent first won this seat
  party: Party;
  caucus?: string;        // For independents who caucus with a party
  repElect?: string;      // Representative-elect for vacant seats
  electionDate?: string;  // Scheduled special election date (ISO, e.g. "2025-09-23")
  electionStatus?: string; // Human-readable status (e.g. "Primary: June 10 · General: Sept 23")
}

export type FilterMode =
  | "party"
  | "margin"
  | "income"
  | "tenure"
  | "urban"
  | "college"
  | "poverty"
  | "age";

export interface DistrictData {
  districtId: string;
  state: string;
  district: number;
  rep?: Representative;
  static: DistrictStaticData;
}

export interface TooltipData {
  x: number;
  y: number;
  districtId: string;
  name?: string;
  party?: Party;
  margin?: number;
  income?: number;
}
