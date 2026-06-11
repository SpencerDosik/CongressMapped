import { DistrictFullData } from "./districtData";
import { FilterMode } from "./types";

export interface Metric {
  id: FilterMode;
  label: string;
  shortLabel: string;
  description: string;
  unit: string;
  getValue: (data: DistrictFullData) => number | null;
  format: (value: number) => string;
  higherIsBetter?: boolean;
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
];

export const METRICS_BY_ID: Record<FilterMode, Metric> = Object.fromEntries(
  METRICS.map((m) => [m.id, m])
) as Record<FilterMode, Metric>;

export function getMetricValue(
  metricId: FilterMode,
  data: DistrictFullData,
): number | null {
  return METRICS_BY_ID[metricId]?.getValue(data) ?? null;
}

export function formatMetricValue(metricId: FilterMode, value: number): string {
  return METRICS_BY_ID[metricId]?.format(value) ?? String(value);
}
