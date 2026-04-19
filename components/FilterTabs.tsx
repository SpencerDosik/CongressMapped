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
  preview: React.ReactNode;
}

interface FilterCategory {
  label: string;
  filters: FilterSpec[];
}

const CATEGORIES: FilterCategory[] = [
  {
    label: "Partisanship",
    filters: [
      {
        mode: "party",
        desc: "Party affiliation",
        preview: (
          <span className="flex gap-0.5">
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
            <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
          </span>
        ),
      },
      {
        mode: "margin",
        desc: "2024 election result",
        preview: (
          <span
            className="w-7 h-2 rounded-sm inline-block"
            style={{ background: "linear-gradient(to right, #DC2626, #f8f8f8, #2563EB)" }}
          />
        ),
      },
      {
        mode: "pvi",
        desc: "Partisan lean (Cook PVI)",
        preview: (
          <span
            className="w-7 h-2 rounded-sm inline-block"
            style={{ background: "linear-gradient(to right, #DC2626, #f8f8f8, #2563EB)" }}
          />
        ),
      },
    ],
  },
  {
    label: "Demographic",
    filters: [
      {
        mode: "income",
        desc: "Median household income",
        preview: (
          <span
            className="w-7 h-2 rounded-sm inline-block"
            style={{ background: "linear-gradient(to right, #fefce8, #4ade80, #166534)" }}
          />
        ),
      },
    ],
  },
  {
    label: "Representative",
    filters: [
      {
        mode: "tenure",
        desc: "Years in current seat",
        preview: (
          <span
            className="w-7 h-2 rounded-sm inline-block"
            style={{ background: "linear-gradient(to right, #eff6ff, #93c5fd, #1e3a8a)" }}
          />
        ),
      },
    ],
  },
];

export default function FilterTabs({ filterMode, onModeChange }: Props) {
  return (
    <div
      className="flex items-center shrink-0 border-b border-slate-700/50 px-4 overflow-x-auto"
      style={{ backgroundColor: "#0d1117" }}
    >
      {CATEGORIES.map((category, ci) => (
        <Fragment key={category.label}>
          {ci > 0 && (
            <div className="w-px h-4 bg-slate-700/60 mx-3 shrink-0" />
          )}
          <div className="flex items-center gap-0.5">
            <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mr-1.5 shrink-0 select-none">
              {category.label}
            </span>
            {category.filters.map(({ mode, desc }) => {
              const active = filterMode === mode;
              return (
                <button
                  key={mode}
                  onClick={() => onModeChange(mode)}
                  title={desc}
                  className={`
                    relative flex items-center gap-1.5 px-3 py-2.5 text-xs font-medium whitespace-nowrap
                    transition-all duration-150 shrink-0
                    ${active ? "text-white" : "text-slate-500 hover:text-slate-300"}
                  `}
                >
                  <span>{filterModeLabel(mode)}</span>
                  {active && (
                    <span className="absolute bottom-0 left-1 right-1 h-0.5 bg-indigo-400 rounded-t-full" />
                  )}
                </button>
              );
            })}
          </div>
        </Fragment>
      ))}
    </div>
  );
}
