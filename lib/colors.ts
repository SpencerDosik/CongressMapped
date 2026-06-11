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

// Urban % color scale: rural (earthy brown) → suburban (teal) → urban (indigo)
const urbanScale = scaleLinear<string>()
  .domain([0, 50, 80, 100])
  .range(["#92400e", "#0f766e", "#4f46e5", "#818cf8"])
  .clamp(true);
export function urbanColor(pct: number): string { return urbanScale(pct); }

// Get color for a district based on filter mode
export function getDistrictColor(
  mode: FilterMode,
  party: Party,
  margin: number,
  income: number,
  tenureYears: number,
  urbanPct?: number,
): string {
  switch (mode) {
    case "party":  return PARTY_COLORS[party] ?? PARTY_COLORS.Unknown;
    case "margin": return marginColor(margin);
    case "income": return incomeColor(income);
    case "tenure": return tenureColor(tenureYears);
    case "urban":  return urbanColor(urbanPct ?? 50);
    default:       return PARTY_COLORS.Unknown;
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
    case "urban":
      return [
        { label: "< 20% urban",  color: urbanColor(10) },
        { label: "50% urban",    color: urbanColor(50) },
        { label: "80% urban",    color: urbanColor(80) },
        { label: "95%+ urban",   color: urbanColor(97) },
      ];
  }
}

export function filterModeLabel(mode: FilterMode): string {
  const labels: Record<FilterMode, string> = {
    party:  "Party",
    margin: "2024 Margin",
    income: "Median Income",
    tenure: "Tenure",
    urban:  "Urban %",
  };
  return labels[mode];
}
