"use client";

import { useEffect, useRef, useState } from "react";
import { FilterMode } from "@/lib/types";
import { filterModeLabel } from "@/lib/colors";

interface Props {
  filterMode: FilterMode;
  onModeChange: (mode: FilterMode) => void;
}

// Always-visible primary filters
const PRIMARY: FilterMode[] = ["party", "margin"];

// Secondary filters behind the "More" dropdown
const SECONDARY: { mode: FilterMode; desc: string }[] = [
  { mode: "pvi",       desc: "Computed PVI — structural partisan lean, derived from 2020+2024 presidential results" },
  { mode: "income",    desc: "Median household income per district (Census ACS)" },
  { mode: "tenure",    desc: "Years the current rep has held the seat" },
  { mode: "age",       desc: "Median age of district residents (Census ACS estimate)" },
  { mode: "education", desc: "Share of residents with a bachelor's degree or higher" },
  { mode: "poverty",   desc: "Share of residents below the federal poverty line" },
];

const SECONDARY_MODES = new Set<FilterMode>(SECONDARY.map((s) => s.mode));

export default function FilterTabs({ filterMode, onModeChange }: Props) {
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeSecondary = SECONDARY_MODES.has(filterMode) ? filterMode : null;

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false);
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
  const inactiveStyle = {
    backgroundColor: "transparent",
    color: "#64748b",
    border: "1px solid transparent",
  };

  return (
    <div
      className="flex items-center shrink-0 gap-1.5 px-4 py-2"
      style={{
        backgroundColor: "#0d1117",
        borderBottom: "1px solid rgba(30,41,59,0.8)",
      }}
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

      {/* Primary filter buttons */}
      <div
        className="flex items-center gap-0.5 px-1.5 py-1 rounded-lg shrink-0"
        style={{ backgroundColor: "rgba(15,23,42,0.7)", border: "1px solid rgba(30,41,59,0.9)" }}
      >
        {PRIMARY.map((mode) => {
          const active = filterMode === mode;
          return (
            <button
              key={mode}
              onClick={() => onModeChange(mode)}
              className="px-3 py-1 rounded-md text-[11px] font-medium whitespace-nowrap transition-all duration-150"
              style={active ? activeStyle : inactiveStyle}
              onMouseEnter={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.color = "#cbd5e1"; }}
              onMouseLeave={e => { if (!active) (e.currentTarget as HTMLButtonElement).style.color = "#64748b"; }}
            >
              {filterModeLabel(mode)}
            </button>
          );
        })}
      </div>

      {/* Divider */}
      <div className="w-px h-5 bg-slate-700/60 shrink-0" />

      {/* "More" dropdown */}
      <div ref={dropdownRef} className="relative shrink-0">
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-medium transition-all duration-150"
          style={
            open || activeSecondary
              ? { ...activeStyle, border: "1px solid rgba(99,102,241,0.4)" }
              : { backgroundColor: "rgba(15,23,42,0.7)", border: "1px solid rgba(30,41,59,0.9)", color: "#64748b" }
          }
          onMouseEnter={e => {
            if (!open && !activeSecondary)
              (e.currentTarget as HTMLButtonElement).style.color = "#cbd5e1";
          }}
          onMouseLeave={e => {
            if (!open && !activeSecondary)
              (e.currentTarget as HTMLButtonElement).style.color = "#64748b";
          }}
        >
          <span>{activeSecondary ? filterModeLabel(activeSecondary) : "More"}</span>
          <svg
            className="w-3 h-3 transition-transform duration-150"
            style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          <div
            className="absolute top-full mt-1 left-0 rounded-xl overflow-hidden z-50 shadow-2xl shadow-black/60"
            style={{
              backgroundColor: "#0d1117",
              border: "1px solid rgba(51,65,85,0.7)",
              minWidth: "220px",
            }}
          >
            {SECONDARY.map(({ mode, desc }) => {
              const active = filterMode === mode;
              return (
                <button
                  key={mode}
                  onClick={() => { onModeChange(mode); setOpen(false); }}
                  className="w-full flex flex-col items-start px-4 py-3 text-left transition-colors border-b border-slate-800/60 last:border-0"
                  style={{
                    backgroundColor: active ? "rgba(99,102,241,0.12)" : "transparent",
                  }}
                  onMouseEnter={e => {
                    if (!active)
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(51,65,85,0.4)";
                  }}
                  onMouseLeave={e => {
                    if (!active)
                      (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
                  }}
                >
                  <span
                    className="text-[12px] font-semibold"
                    style={{ color: active ? "#a5b4fc" : "#cbd5e1" }}
                  >
                    {filterModeLabel(mode)}
                    {active && <span className="ml-2 text-[10px] text-indigo-400">✓</span>}
                  </span>
                  <span className="text-[11px] text-slate-600 mt-0.5 leading-snug">{desc}</span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
