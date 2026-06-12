"use client";

import { useEffect, useRef, useState } from "react";
import { FilterMode } from "@/lib/types";
import { filterModeLabel } from "@/lib/colors";

interface Props {
  filterMode: FilterMode;
  onModeChange: (mode: FilterMode) => void;
  noDataModes?: FilterMode[];
}

interface FilterGroup {
  label: string;
  modes: { mode: FilterMode; desc: string }[];
}

const FILTER_GROUPS: FilterGroup[] = [
  {
    label: "Political",
    modes: [
      { mode: "margin", desc: "2024 general election margin — positive = R won, negative = D won" },
    ],
  },
  {
    label: "Economic",
    modes: [
      { mode: "income",   desc: "Median household income per district (ACS 5-year 2023)" },
      { mode: "poverty",  desc: "Share of population below the federal poverty line (ACS 5-year 2023)" },
    ],
  },
  {
    label: "District",
    modes: [
      { mode: "urban",   desc: "Share of population living in urban areas (2020 Census)" },
      { mode: "college", desc: "Share of adults 25+ with a bachelor's degree or higher (ACS 5-year 2023)" },
    ],
  },
  {
    label: "Representative",
    modes: [
      { mode: "tenure",    desc: "Years the current representative has held the seat" },
      { mode: "age",       desc: "Current age of the representative" },
      { mode: "committee", desc: "Highlight districts whose representative serves on a selected committee" },
    ],
  },
];

export default function FilterTabs({ filterMode, onModeChange, noDataModes = [] }: Props) {
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpenGroup(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const activeStyle = {
    backgroundColor: "rgba(99,102,241,0.25)",
    color: "#a5b4fc",
    border: "1px solid rgba(99,102,241,0.4)",
  };
  const groupInactiveStyle = {
    backgroundColor: "rgba(15,23,42,0.7)",
    border: "1px solid rgba(30,41,59,0.9)",
    color: "#64748b",
  };

  return (
    <div
      ref={containerRef}
      className="flex items-center shrink-0 gap-1.5 px-4 py-2"
      style={{ backgroundColor: "#0d1117", borderBottom: "1px solid rgba(30,41,59,0.8)" }}
    >
      {/* Funnel icon + label */}
      <div className="flex items-center gap-1.5 mr-2 shrink-0">
        <svg className="w-3 h-3 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2a1 1 0 01-.293.707L13 13.414V19a1 1 0 01-.553.894l-4 2A1 1 0 017 21v-7.586L3.293 6.707A1 1 0 013 6V4z"
          />
        </svg>
        <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest select-none">
          View by
        </span>
      </div>

      {/* Party — standalone primary button */}
      <button
        onClick={() => { onModeChange("party"); setOpenGroup(null); }}
        className="px-3 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-all duration-150"
        style={filterMode === "party" ? activeStyle : { backgroundColor: "transparent", color: "#64748b", border: "1px solid transparent" }}
        onMouseEnter={e => { if (filterMode !== "party") (e.currentTarget as HTMLButtonElement).style.color = "#cbd5e1"; }}
        onMouseLeave={e => { if (filterMode !== "party") (e.currentTarget as HTMLButtonElement).style.color = "#64748b"; }}
      >
        Party
      </button>

      {/* Divider */}
      <div className="w-px h-5 bg-slate-700/60 shrink-0" />

      {/* Group dropdowns */}
      {FILTER_GROUPS.map((group) => {
        const isOpen = openGroup === group.label;
        const activeMode = group.modes.find((m) => m.mode === filterMode);
        const hasActive = !!activeMode;

        return (
          <div key={group.label} className="relative shrink-0">
            <button
              onClick={() => setOpenGroup(isOpen ? null : group.label)}
              className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-medium transition-all duration-150"
              style={isOpen || hasActive ? activeStyle : groupInactiveStyle}
              onMouseEnter={e => {
                if (!isOpen && !hasActive)
                  (e.currentTarget as HTMLButtonElement).style.color = "#cbd5e1";
              }}
              onMouseLeave={e => {
                if (!isOpen && !hasActive)
                  (e.currentTarget as HTMLButtonElement).style.color = "#64748b";
              }}
            >
              <span>{activeMode ? filterModeLabel(activeMode.mode) : group.label}</span>
              <svg
                className="w-3 h-3 transition-transform duration-150"
                style={{ transform: isOpen ? "rotate(180deg)" : "rotate(0deg)" }}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {isOpen && (
              <div
                className="absolute top-full mt-1 left-0 rounded-xl overflow-hidden z-50 shadow-2xl shadow-black/60"
                style={{ backgroundColor: "#0d1117", border: "1px solid rgba(51,65,85,0.7)", minWidth: "240px" }}
              >
                {group.modes.map(({ mode, desc }) => {
                  const active = filterMode === mode;
                  return (
                    <button
                      key={mode}
                      onClick={() => { onModeChange(mode); setOpenGroup(null); }}
                      className="w-full flex flex-col items-start px-4 py-3 text-left transition-colors border-b border-slate-800/60 last:border-0"
                      style={{ backgroundColor: active ? "rgba(99,102,241,0.12)" : "transparent" }}
                      onMouseEnter={e => {
                        if (!active)
                          (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(51,65,85,0.4)";
                      }}
                      onMouseLeave={e => {
                        if (!active)
                          (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
                      }}
                    >
                      <span className="flex items-center gap-1.5 text-[12px] font-semibold" style={{ color: active ? "#a5b4fc" : "#cbd5e1" }}>
                        {filterModeLabel(mode)}
                        {active && <span className="text-[10px] text-indigo-400">✓</span>}
                        {noDataModes.includes(mode) && (
                          <span className="text-[9px] px-1.5 py-0.5 rounded-full font-medium" style={{ backgroundColor: "rgba(245,158,11,0.15)", color: "#f59e0b", border: "1px solid rgba(245,158,11,0.3)" }}>
                            no data
                          </span>
                        )}
                      </span>
                      <span className="text-[11px] text-slate-600 mt-0.5 leading-snug">{desc}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
