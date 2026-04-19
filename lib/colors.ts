import { scaleLinear, scaleSequential } from "d3-scale";
import { interpolateRdBu, interpolateBlues } from "d3-scale-chromatic";
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

// Income color scale optimized for dark backgrounds.
// Low income → muted dark teal; high income → bright amber/yellow.
// Real district-level range ≈ $35K–$175K.
const incomeScale = scaleLinear<string>()
  .domain([35, 65, 100, 175])
  .range(["#0f2336", "#0f766e", "#d97706", "#fde047"])
  .clamp(true);

export function incomeColor(incomeK: number): string {
  return incomeScale(incomeK);
}

// Tenure color scale: faint → saturated blue
const tenureScale = scaleSequential(interpolateBlues).domain([0, 35]);
export function tenureColor(years: number): string {
  return tenureScale(Math.max(0, Math.min(40, years)));
}

// PVI color scale: red (R lean) ↔ blue (D lean)
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
    case "party":   return PARTY_COLORS[party] ?? PARTY_COLORS.Unknown;
    case "margin":  return marginColor(margin);
    case "income":  return incomeColor(income);
    case "tenure":  return tenureColor(tenureYears);
    case "pvi":     return pviColor(pvi);
    default:        return PARTY_COLORS.Unknown;
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
        { label: "< $50K",      color: incomeColor(42) },
        { label: "$65K",        color: incomeColor(65) },
        { label: "$90K",        color: incomeColor(90) },
        { label: "$120K",       color: incomeColor(120) },
        { label: "$150K+",      color: incomeColor(160) },
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
  }
}

export function filterModeLabel(mode: FilterMode): string {
  const labels: Record<FilterMode, string> = {
    party:  "Party",
    margin: "2024 Margin",
    income: "Median Income",
    tenure: "Tenure",
    pvi:    "Cook PVI",
  };
  return labels[mode];
}
