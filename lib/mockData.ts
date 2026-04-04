import { DistrictStaticData, Party } from "./types";

// Deterministic hash so each district always gets the same fake data
function djb2(str: string): number {
  let h = 5381;
  for (let i = 0; i < str.length; i++) {
    h = ((h << 5) + h) ^ str.charCodeAt(i);
    h = h & h;
  }
  return Math.abs(h);
}

// Rough per-state Republican lean (0–100, 50 = balanced)
const STATE_LEAN: Record<string, number> = {
  WY: 92, ND: 88, ID: 86, SD: 84, NE: 80, KS: 78, WV: 80,
  OK: 82, AR: 82, KY: 76, AL: 79, MS: 76, TN: 73, UT: 74,
  MT: 66, AK: 61, LA: 68, IN: 63, MO: 64, SC: 66, TX: 58,
  FL: 55, OH: 52, NC: 52, GA: 51, AZ: 50, IA: 53, WI: 50,
  PA: 50, MI: 49, NV: 48, VA: 47, NH: 46, ME: 45, MN: 43,
  CO: 42, OR: 37, NM: 36, WA: 38, NJ: 35, CT: 30, MA: 20,
  NY: 26, HI: 14, MD: 22, CA: 29, IL: 31, RI: 20, VT: 14,
  DE: 32,
};

const FIRST_NAMES = [
  "James","John","Robert","Michael","William","David","Richard",
  "Joseph","Thomas","Charles","Mary","Patricia","Jennifer","Linda",
  "Barbara","Elizabeth","Susan","Sarah","Karen","Nancy","Betty",
  "Dorothy","Sandra","Ashley","Emily","Margaret","Helen","Frances",
  "Carolyn","Ruth","Donna","Diane","Kimberly","Deborah","Jessica",
];

const LAST_NAMES = [
  "Smith","Johnson","Williams","Brown","Jones","Garcia","Miller",
  "Davis","Wilson","Taylor","Anderson","Martinez","Hernandez","Moore",
  "Young","Jackson","Thompson","White","Lopez","Lee","Gonzalez",
  "Harris","Clark","Lewis","Robinson","Walker","Hall","Allen",
  "Scott","Flores","Green","Adams","Nelson","Baker","Carter",
];

export function getMockRepName(districtId: string): string {
  const h = djb2(districtId);
  const first = FIRST_NAMES[h % FIRST_NAMES.length];
  const last = LAST_NAMES[(h >> 7) % LAST_NAMES.length];
  return `${first} ${last}`;
}

export function getMockDistrictData(districtId: string): DistrictStaticData {
  const h = djb2(districtId);
  const state = districtId.slice(0, 2);
  const lean = STATE_LEAN[state] ?? 50;

  const isR = (h % 100) < lean;
  const party: Party = isR ? "Republican" : "Democrat";

  // Margin: safe seats have bigger swings
  const competitiveness = Math.abs(50 - lean);
  const rawMargin = 6 + (h % 30) + Math.round(competitiveness * 0.4);
  const margin = isR ? rawMargin : -rawMargin;

  // Income: suburban swing districts tend to be wealthier
  const incomeBase = 48 + (h % 80);
  const income = Math.round(incomeBase);

  // PVI ≈ 70 % of margin
  const pvi = Math.round(margin * 0.72);

  // Term start: spread across election years
  const yearsBack = [2, 4, 6, 8, 10, 12, 14, 18, 22, 28];
  const termStart = 2025 - yearsBack[h % yearsBack.length];

  return { margin, income, pvi, termStart, party };
}
