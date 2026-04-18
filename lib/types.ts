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
  margin: number; // 2024 margin: positive = R won, negative = D won (integer %)
  income: number; // Median HH income in $K (Census ACS ~2022)
  pvi: number; // Cook PVI equivalent: positive = R lean, negative = D lean
  termStart: number; // Year current incumbent first won this seat
  party: Party;
  caucus?: string;    // For independents who caucus with a party
  repElect?: string;  // Representative-elect for vacant seats
}

export type FilterMode =
  | "party"
  | "margin"
  | "income"
  | "tenure"
  | "pvi";

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
