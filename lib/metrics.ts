import { DistrictFullData } from "./districtData";
import { FilterMode } from "./types";

export interface Metric {
  id: FilterMode;
  label: string;
  shortLabel: string;
  description: string;
  unit: string;
  getValue: (data: DistrictFullData, stats?: DistrictStats) => number | null;
  format: (value: number) => string;
  higherIsBetter?: boolean;
}

export interface DistrictStats {
  age?: number;
  education?: number;
  poverty?: number;
  population?: number;
}

function partyLean(data: DistrictFullData): number {
  return data.pvi;
}

export const METRICS: Metric[] = [
  {
    id: "margin",
    label: "2024 Election Margin",
    shortLabel: "Margin",
    description: "2024 House election margin: positive = Republican won, negative = Democrat won.",
    unit: "%",
    getValue: (d) => d.margin,
    format: (v) => v === 0 ? "Tie" : `${v > 0 ? "R" : "D"} +${Math.abs(v)}%`,
  },
  {
    id: "pvi",
    label: "Computed PVI",
    shortLabel: "PVI",
    description: "Partisan lean derived from the 2020 and 2024 presidential results. Positive = Republican-leaning, negative = Democrat-leaning.",
    unit: "",
    getValue: partyLean,
    format: (v) => v === 0 ? "EVEN" : `${v > 0 ? "R" : "D"}+${Math.abs(v)}`,
  },
  {
    id: "income",
    label: "Median Household Income",
    shortLabel: "Income",
    description: "Median household income (Census ACS, approximate), in thousands of dollars.",
    unit: "$K",
    getValue: (d) => d.income,
    format: (v) => `$${(v * 1000).toLocaleString()}`,
    higherIsBetter: true,
  },
  {
    id: "tenure",
    label: "Years in Office",
    shortLabel: "Tenure",
    description: "Years the current incumbent has held this seat.",
    unit: "yr",
    getValue: (d) => Math.max(0, 2026 - d.termStart),
    format: (v) => v === 1 ? "1 year" : `${v} years`,
  },
  {
    id: "age",
    label: "Median Age",
    shortLabel: "Median Age",
    description: "Median age of district residents (Census ACS estimate).",
    unit: "yr",
    getValue: (_, stats) => stats?.age ?? null,
    format: (v) => `${v.toFixed(1)} yr`,
  },
  {
    id: "education",
    label: "College Educated",
    shortLabel: "College",
    description: "Share of residents 25+ with a bachelor's degree or higher (Census ACS estimate).",
    unit: "%",
    getValue: (_, stats) => stats?.education ?? null,
    format: (v) => `${v.toFixed(1)}%`,
    higherIsBetter: true,
  },
  {
    id: "poverty",
    label: "Poverty Rate",
    shortLabel: "Poverty",
    description: "Share of residents below the federal poverty line (Census ACS estimate).",
    unit: "%",
    getValue: (_, stats) => stats?.poverty ?? null,
    format: (v) => `${v.toFixed(1)}%`,
    higherIsBetter: false,
  },
];

export const METRICS_BY_ID: Record<FilterMode, Metric> = Object.fromEntries(
  METRICS.map((m) => [m.id, m])
) as Record<FilterMode, Metric>;

export function getMetricValue(
  metricId: FilterMode,
  data: DistrictFullData,
  stats?: DistrictStats
): number | null {
  return METRICS_BY_ID[metricId]?.getValue(data, stats) ?? null;
}

export function formatMetricValue(metricId: FilterMode, value: number): string {
  return METRICS_BY_ID[metricId]?.format(value) ?? String(value);
}
