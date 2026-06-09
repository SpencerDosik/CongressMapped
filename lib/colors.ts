import { scaleLinear } from "d3-scale";
import { interpolateRdBu } from "d3-scale-chromatic";
import { Party, FilterMode } from "./types";

// Party colors
export const PARTY_COLORS: Record<Party, string> = {
  Republican: "#DC2626",
  Democrat: "#2563EB",
  Independent: "#D97706",
  Vacant: "#374151",
  Unknown: "#64748B",
};

export const PARTY_COLORS_SOFT: Record<Party, string> = {
  Republican: "#EF4444",
  Democrat: "#3B82F6",
  Independent: "#F59E0B",
  Vacant: "#4B5563",
  Unknown: "#94A3B8",
};

// Margin color scale: red (R) ↔ blue (D), center = white/grey
export function marginColor(margin: number): string {
  const clamped = Math.max(-50, Math.min(50, margin));
  const t = (clamped + 50) / 100;
  return interpolateRdBu(1 - t);
}

// Income color scale: low (blue) → mid (teal) → high (amber/yellow)
const incomeScale = scaleLinear<string>()
  .domain([35, 65, 100, 175])
  .range(["#1d4ed8", "#0f766e", "#d97706", "#fde047"])
  .clamp(true);
export function incomeColor(incomeK: number): string { return incomeScale(incomeK); }

// Tenure color scale: new (light blue) → long-serving (deep blue)
const tenureScale = scaleLinear<string>()
  .domain([0, 12, 35])
  .range(["#93c5fd", "#3b82f6", "#1e40af"])
  .clamp(true);
export function tenureColor(years: number): string { return tenureScale(years); }

// PVI color scale: red (R lean) ↔ blue (D lean)
export function pviColor(pvi: number): string {
  const clamped = Math.max(-40, Math.min(40, pvi));
  const t = (clamped + 40) / 80;
  return interpolateRdBu(1 - t);
}

// Age color scale: young (teal) → median (slate) → older (amber)
const ageScale = scaleLinear<string>()
  .domain([30, 38, 46])
  .range(["#2dd4bf", "#64748b", "#f59e0b"])
  .clamp(true);
export function ageColor(age: number): string { return ageScale(age); }

// Education color scale: low (indigo) → high (near-white)
const educationScale = scaleLinear<string>()
  .domain([10, 25, 40, 65])
  .range(["#4338ca", "#818cf8", "#c7d2fe", "#f0f9ff"])
  .clamp(true);
export function educationColor(pct: number): string { return educationScale(pct); }

// Poverty color scale: low (green = good) → high (red = bad)
const povertyScale = scaleLinear<string>()
  .domain([3, 10, 18, 30])
  .range(["#059669", "#f59e0b", "#dc2626", "#fca5a5"])
  .clamp(true);
export function povertyColor(pct: number): string { return povertyScale(pct); }

// Get color for a district based on filter mode
export function getDistrictColor(
  mode: FilterMode,
  party: Party,
  margin: number,
  income: number,
  pvi: number,
  tenureYears: number,
  age?: number,
  education?: number,
  poverty?: number,
): string {
  switch (mode) {
    case "party":     return PARTY_COLORS[party] ?? PARTY_COLORS.Unknown;
    case "margin":    return marginColor(margin);
    case "income":    return incomeColor(income);
    case "tenure":    return tenureColor(tenureYears);
    case "pvi":       return pviColor(pvi);
    case "age":       return age != null ? ageColor(age) : PARTY_COLORS.Unknown;
    case "education": return education != null ? educationColor(education) : PARTY_COLORS.Unknown;
    case "poverty":   return poverty != null ? povertyColor(poverty) : PARTY_COLORS.Unknown;
    default:          return PARTY_COLORS.Unknown;
  }
}

// Legend items for each filter mode
export interface LegendItem {
  label: string;
  color: string;
}

export function getLegendItems(mode: FilterMode): LegendItem[] {
  switch (mode) {
    case "party":
      return [
        { label: "Republican",   color: PARTY_COLORS.Republican },
        { label: "Democrat",     color: PARTY_COLORS.Democrat },
        { label: "Independent",  color: PARTY_COLORS.Independent },
        { label: "Vacant",       color: PARTY_COLORS.Vacant },
      ];
    case "margin":
      return [
        { label: "R +50%",  color: marginColor(50) },
        { label: "R +25%",  color: marginColor(25) },
        { label: "Toss-up", color: marginColor(0) },
        { label: "D +25%",  color: marginColor(-25) },
        { label: "D +50%",  color: marginColor(-50) },
      ];
    case "income":
      return [
        { label: "< $50K",  color: incomeColor(42) },
        { label: "$65K",    color: incomeColor(65) },
        { label: "$90K",    color: incomeColor(90) },
        { label: "$120K",   color: incomeColor(120) },
        { label: "$150K+",  color: incomeColor(160) },
      ];
    case "tenure":
      return [
        { label: "0–2 yrs",   color: tenureColor(1) },
        { label: "4–8 yrs",   color: tenureColor(6) },
        { label: "10–20 yrs", color: tenureColor(15) },
        { label: "20+ yrs",   color: tenureColor(28) },
      ];
    case "pvi":
      return [
        { label: "R+40", color: pviColor(40) },
        { label: "R+20", color: pviColor(20) },
        { label: "Even", color: pviColor(0) },
        { label: "D+20", color: pviColor(-20) },
        { label: "D+40", color: pviColor(-40) },
      ];
    case "age":
      return [
        { label: "< 33 yrs", color: ageColor(31) },
        { label: "35 yrs",   color: ageColor(35) },
        { label: "38 yrs",   color: ageColor(38) },
        { label: "42 yrs",   color: ageColor(42) },
        { label: "46+ yrs",  color: ageColor(47) },
      ];
    case "education":
      return [
        { label: "< 15%", color: educationColor(12) },
        { label: "25%",   color: educationColor(25) },
        { label: "40%",   color: educationColor(40) },
        { label: "55%+",  color: educationColor(58) },
      ];
    case "poverty":
      return [
        { label: "< 5%",  color: povertyColor(4) },
        { label: "10%",   color: povertyColor(10) },
        { label: "18%",   color: povertyColor(18) },
        { label: "25%+",  color: povertyColor(27) },
      ];
  }
}

export function filterModeLabel(mode: FilterMode): string {
  const labels: Record<FilterMode, string> = {
    party:     "Party",
    margin:    "2024 Margin",
    income:    "Median Income",
    tenure:    "Tenure",
    pvi:       "Computed PVI",
    age:       "Median Age",
    education: "College Educated",
    poverty:   "Poverty Rate",
  };
  return labels[mode];
}
