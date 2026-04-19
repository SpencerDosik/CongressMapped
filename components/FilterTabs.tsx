"use client";

import { Fragment } from "react";
import { FilterMode } from "@/lib/types";
import { filterModeLabel } from "@/lib/colors";

interface Props {
  filterMode: FilterMode;
  onModeChange: (mode: FilterMode) => void;
}

interface FilterSpec {
  mode: FilterMode;
  desc: string;
}

interface FilterCategory {
  label: string;
  filters: FilterSpec[];
}

const CATEGORIES: FilterCategory[] = [
  {
    label: "Partisanship",
    filters: [
      { mode: "party",       desc: "Party affiliation" },
      { mode: "competitive", desc: "Battleground / competitive races" },
      { mode: "margin",      desc: "2024 election result" },
      { mode: "pvi",         desc: "Partisan lean (Cook PVI)" },
    ],
  },
  {
    label: "Demographic",
    filters: [
      { mode: "income", desc: "Median household income" },
    ],
  },
  {
    label: "Representative",
    filters: [
      { mode: "tenure", desc: "Years in current seat" },
    ],
  },
];

export default function FilterTabs({ filterMode, onModeChange }: Props) {
  return (
    <div
      className="flex items-center shrink-0 gap-2 px-4 py-2 overflow-x-auto"
      style={{
        backgroundColor: "#0d1117",
        borderBottom: "1px solid rgba(30,41,59,0.8)",
      }}
    >
      {/* "Filter by" label */}
      <div className="flex items-center gap-1.5 mr-1 shrink-0">
        <svg className="w-3 h-3 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z"
          />
        </svg>
        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest whitespace-nowrap select-none">
          Filter by
        </span>
      </div>

      {CATEGORIES.map((category, ci) => (
        <Fragment key={category.label}>
          {ci > 0 && <div className="w-px h-5 bg-slate-700/60 shrink-0" />}

          {/* Category pill group */}
          <div
            className="flex items-center gap-0.5 px-1.5 py-1 rounded-lg shrink-0"
            style={{
              backgroundColor: "rgba(15,23,42,0.7)",
              border: "1px solid rgba(30,41,59,0.9)",
            }}
          >
            {category.filters.map(({ mode, desc }) => {
              const active = filterMode === mode;
              return (
                <button
                  key={mode}
                  onClick={() => onModeChange(mode)}
                  title={desc}
                  className="relative px-3 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-all duration-150"
                  style={
                    active
                      ? {
                          backgroundColor: "rgba(99,102,241,0.25)",
                          color: "#a5b4fc",
                          border: "1px solid rgba(99,102,241,0.4)",
                        }
                      : {
                          backgroundColor: "transparent",
                          color: "#64748b",
                          border: "1px solid transparent",
                        }
                  }
                  onMouseEnter={e => {
                    if (!active) (e.currentTarget as HTMLButtonElement).style.color = "#cbd5e1";
                  }}
                  onMouseLeave={e => {
                    if (!active) (e.currentTarget as HTMLButtonElement).style.color = "#64748b";
                  }}
                >
                  {filterModeLabel(mode)}
                </button>
              );
            })}
          </div>
        </Fragment>
      ))}
    </div>
  );
}
