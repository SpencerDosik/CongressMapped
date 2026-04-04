import { scaleLinear, scaleSequential } from "d3-scale";
import { interpolateRdBu, interpolateYlGn, interpolateBlues, interpolateOranges, interpolatePurples } from "d3-scale-chromatic";
import { Party, FilterMode } from "./types";

// Party colors
export const PARTY_COLORS: Record<Party, string> = {
  Republican: "#DC2626",
  Democrat: "#2563EB",
  Independent: "#7C3AED",
  Unknown: "#64748B",
};

export const PARTY_COLORS_SOFT: Record<Party, string> = {
  Republican: "#EF4444",
  Democrat: "#3B82F6",
  Independent: "#8B5CF6",
  Unknown: "#94A3B8",
};

// Margin color scale: red (R) to blue (D), 0 = white
export function marginColor(margin: number): string {
  // Clamp to [-50, 50]
  const clamped = Math.max(-50, Math.min(50, margin));
  // Convert to [0, 1] where 1 = deep red (+50), 0 = deep blue (-50)
  const t = (clamped + 50) / 100;
  // interpolateRdBu: 0=blue, 1=red — we reverse it
  return interpolateRdBu(1 - t);
}

// Income color scale: light (low) to dark green (high)
// Range roughly $28K (poorest) to $200K (wealthiest)
const incomeScale = scaleSequential(interpolateYlGn).domain([28, 180]);
export function incomeColor(incomeK: number): string {
  return incomeScale(Math.max(28, Math.min(200, incomeK)));
}

// Tenure color scale: light to dark blue
const tenureScale = scaleSequential(interpolateBlues).domain([0, 35]);
export function tenureColor(years: number): string {
  return tenureScale(Math.max(0, Math.min(40, years)));
}

// PVI color scale: red to blue
export function pviColor(pvi: number): string {
  const clamped = Math.max(-40, Math.min(40, pvi));
  const t = (clamped + 40) / 80;
  return interpolateRdBu(1 - t);
}

// Get color for a district based on filter mode
export function getDistrictColor(
  mode: FilterMode,
  party: Party,
  margin: number,
  income: number,
  pvi: number,
  tenureYears: number,
): string {
  switch (mode) {
    case "party":
      return PARTY_COLORS[party] ?? PARTY_COLORS.Unknown;
    case "margin":
      return marginColor(margin);
    case "income":
      return incomeColor(income);
    case "tenure":
      return tenureColor(tenureYears);
    case "pvi":
      return pviColor(pvi);
    default:
      return PARTY_COLORS.Unknown;
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
        { label: "Republican", color: PARTY_COLORS.Republican },
        { label: "Democrat", color: PARTY_COLORS.Democrat },
        { label: "Independent", color: PARTY_COLORS.Independent },
      ];
    case "margin":
      return [
        { label: "R +50%", color: marginColor(50) },
        { label: "R +25%", color: marginColor(25) },
        { label: "Toss-up", color: marginColor(0) },
        { label: "D +25%", color: marginColor(-25) },
        { label: "D +50%", color: marginColor(-50) },
      ];
    case "income":
      return [
        { label: "$28K", color: incomeColor(28) },
        { label: "$60K", color: incomeColor(60) },
        { label: "$100K", color: incomeColor(100) },
        { label: "$150K+", color: incomeColor(150) },
      ];
    case "tenure":
      return [
        { label: "0–2 yrs", color: tenureColor(1) },
        { label: "4–8 yrs", color: tenureColor(6) },
        { label: "10–20 yrs", color: tenureColor(15) },
        { label: "20+ yrs", color: tenureColor(28) },
      ];
    case "pvi":
      return [
        { label: "R+40", color: pviColor(40) },
        { label: "R+20", color: pviColor(20) },
        { label: "Even", color: pviColor(0) },
        { label: "D+20", color: pviColor(-20) },
        { label: "D+40", color: pviColor(-40) },
      ];
  }
}

export function filterModeLabel(mode: FilterMode): string {
  const labels: Record<FilterMode, string> = {
    party: "Party",
    margin: "2024 Margin of Victory",
    income: "Median Household Income",
    tenure: "Years in Office",
    pvi: "Partisan Lean (PVI)",
  };
  return labels[mode];
}
