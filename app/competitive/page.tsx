"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getAllDistricts } from "@/lib/districtData";
import { PARTY_COLORS } from "@/lib/colors";
import { STATE_NAMES, AT_LARGE_STATES } from "@/lib/stateFips";
import { Party } from "@/lib/types";

const ALL = getAllDistricts().filter((d) => d.data.party !== "Vacant");

type Category = {
  label: string;
  description: string;
  color: string;
  test: (margin: number) => boolean;
};

const CATEGORIES: Category[] = [
  { label: "Toss-Up",      description: "|margin| < 5%",   color: "#f59e0b", test: (m) => Math.abs(m) < 5 },
  { label: "Competitive R", description: "R +5–10%",        color: "#f87171", test: (m) => m >= 5 && m < 10 },
  { label: "Competitive D", description: "D +5–10%",        color: "#60a5fa", test: (m) => m > -10 && m <= -5 },
  { label: "Lean R",        description: "R +10–20%",       color: "#ef4444", test: (m) => m >= 10 && m < 20 },
  { label: "Lean D",        description: "D +10–20%",       color: "#3b82f6", test: (m) => m > -20 && m <= -10 },
  { label: "Likely R",      description: "R +20–35%",       color: "#dc2626", test: (m) => m >= 20 && m < 35 },
  { label: "Likely D",      description: "D +20–35%",       color: "#1d4ed8", test: (m) => m > -35 && m <= -20 },
];

function pviLabel(pvi: number): string {
  if (pvi === 0) return "EVEN";
  return `${pvi > 0 ? "R" : "D"}+${Math.abs(pvi)}`;
}

function districtDisplay(districtId: string): string {
  const [state, num] = districtId.split("-");
  if (AT_LARGE_STATES.has(state)) return `${state} AL`;
  return `${state}-${parseInt(num ?? "0", 10)}`;
}

export default function CompetitivePage() {
  const pathname = usePathname();
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [partyFilter, setPartyFilter] = useState<"All" | "R" | "D">("All");

  const districts = useMemo(() => {
    return ALL
      .filter((d) => {
        const cat = CATEGORIES.find((c) => c.test(d.data.margin));
        if (!cat) return false;
        if (selectedCat && cat.label !== selectedCat) return false;
        if (partyFilter === "R" && d.data.margin <= 0) return false;
        if (partyFilter === "D" && d.data.margin >= 0) return false;
        return true;
      })
      .sort((a, b) => Math.abs(a.data.margin) - Math.abs(b.data.margin));
  }, [selectedCat, partyFilter]);

  const counts = useMemo(() => {
    const m: Record<string, number> = {};
    for (const cat of CATEGORIES) {
      m[cat.label] = ALL.filter((d) => cat.test(d.data.margin)).length;
    }
    return m;
  }, []);

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#0a0e14", color: "#e2e8f0" }}>

      {/* Header */}
      <header
        className="flex items-center justify-between px-6 py-3 shrink-0 z-10"
        style={{ backgroundColor: "#0d1117", borderBottom: "1px solid rgba(30,41,59,0.8)" }}
      >
        <div className="flex items-center gap-3">
          <Link href="/" className="text-slate-400 hover:text-white transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div className="flex items-center gap-0.5">
            {(["/house", "/rankings", "/compare", "/graph", "/competitive"] as const).map((href) => {
              const label = { "/house": "Map", "/rankings": "Rankings", "/compare": "Compare", "/graph": "Graph", "/competitive": "Races" }[href];
              const active = pathname === href;
              return (
                <a key={href} href={href}
                  className="px-2 py-1 rounded text-[10px] font-medium transition-colors"
                  style={{ color: active ? "#a5b4fc" : "#64748b", backgroundColor: active ? "rgba(99,102,241,0.12)" : "transparent" }}>
                  {label}
                </a>
              );
            })}
          </div>
        </div>
        <p className="text-slate-600 text-[11px]">{districts.length} districts shown · based on 2024 results</p>
      </header>

      {/* Title + category chips */}
      <div className="px-6 pt-6 pb-4 shrink-0">
        <h1 className="text-xl font-bold text-white mb-1">Competitive Races — 2026</h1>
        <p className="text-slate-500 text-[13px] mb-5">
          Districts where the 2024 margin was under 35 points. Sorted by margin (closest first).
        </p>

        {/* Category filter */}
        <div className="flex flex-wrap gap-2 mb-3">
          <button
            onClick={() => setSelectedCat(null)}
            className="px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all"
            style={selectedCat === null ? {
              backgroundColor: "rgba(99,102,241,0.22)",
              color: "#a5b4fc",
              border: "1px solid rgba(99,102,241,0.4)",
            } : {
              backgroundColor: "transparent",
              color: "#475569",
              border: "1px solid rgba(30,41,59,0.8)",
            }}
          >
            All categories
          </button>
          {CATEGORIES.map((cat) => (
            <button
              key={cat.label}
              onClick={() => setSelectedCat(selectedCat === cat.label ? null : cat.label)}
              className="px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all"
              style={selectedCat === cat.label ? {
                backgroundColor: `${cat.color}22`,
                color: cat.color,
                border: `1px solid ${cat.color}55`,
              } : {
                backgroundColor: "transparent",
                color: "#475569",
                border: "1px solid rgba(30,41,59,0.8)",
              }}
            >
              {cat.label}
              <span className="ml-1.5 text-[10px] opacity-60">({counts[cat.label] ?? 0})</span>
            </button>
          ))}
        </div>

        {/* Party filter */}
        <div className="flex gap-2">
          {(["All", "R", "D"] as const).map((p) => (
            <button
              key={p}
              onClick={() => setPartyFilter(p)}
              className="px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all"
              style={partyFilter === p ? {
                backgroundColor: p === "R" ? `${PARTY_COLORS.Republican}22` : p === "D" ? `${PARTY_COLORS.Democrat}22` : "rgba(99,102,241,0.2)",
                color: p === "R" ? PARTY_COLORS.Republican : p === "D" ? PARTY_COLORS.Democrat : "#a5b4fc",
                border: `1px solid ${p === "R" ? `${PARTY_COLORS.Republican}50` : p === "D" ? `${PARTY_COLORS.Democrat}50` : "rgba(99,102,241,0.4)"}`,
              } : {
                backgroundColor: "transparent",
                color: "#475569",
                border: "1px solid transparent",
              }}
            >
              {p === "All" ? "All seats" : p === "R" ? "R-held" : "D-held"}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 pb-8">
        {districts.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-slate-600 text-sm">
            No districts match the current filter.
          </div>
        ) : (
          <div className="space-y-1">
            {districts.map(({ districtId, data }) => {
              const cat = CATEGORIES.find((c) => c.test(data.margin));
              if (!cat) return null;
              const partyColor = PARTY_COLORS[data.party as Party] ?? "#64748B";
              const absMargin = Math.abs(data.margin);
              const [state] = districtId.split("-");
              const stateName = STATE_NAMES[state] ?? state;

              return (
                <a
                  key={districtId}
                  href={`/house?d=${districtId}`}
                  className="flex items-center gap-4 px-4 py-3 rounded-xl transition-colors group"
                  style={{ backgroundColor: "rgba(13,17,23,0.6)", border: "1px solid rgba(30,41,59,0.5)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "rgba(30,41,59,0.6)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "rgba(13,17,23,0.6)"; }}
                >
                  {/* Competitiveness bar */}
                  <div className="shrink-0 w-16 text-center">
                    <div
                      className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: `${cat.color}18`, color: cat.color, border: `1px solid ${cat.color}33` }}
                    >
                      {cat.label}
                    </div>
                  </div>

                  {/* District + rep */}
                  <div className="flex items-center gap-2.5 flex-1 min-w-0">
                    <div className="w-1 h-8 rounded-full shrink-0" style={{ backgroundColor: partyColor }} />
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white font-bold text-[13px] tabular-nums">{districtDisplay(districtId)}</span>
                        <span className="text-slate-600 text-[11px]">{stateName}</span>
                      </div>
                      <p className="text-slate-400 text-[11px] truncate">{data.repName}</p>
                    </div>
                  </div>

                  {/* Margin */}
                  <div className="shrink-0 text-right w-24">
                    <p className="text-[12px] font-bold" style={{ color: data.margin > 0 ? PARTY_COLORS.Republican : PARTY_COLORS.Democrat }}>
                      {data.margin > 0 ? "R" : "D"} +{absMargin}%
                    </p>
                    <p className="text-[10px] text-slate-600">2024 margin</p>
                  </div>

                  {/* PVI */}
                  <div className="shrink-0 text-right w-16">
                    <p className="text-[11px] font-semibold tabular-nums"
                      style={{ color: data.pvi > 0 ? PARTY_COLORS.Republican : data.pvi < 0 ? PARTY_COLORS.Democrat : "#94a3b8" }}>
                      {pviLabel(data.pvi)}
                    </p>
                    <p className="text-[10px] text-slate-600">PVI</p>
                  </div>

                  {/* Arrow */}
                  <div className="text-slate-700 group-hover:text-slate-400 transition-colors text-sm shrink-0">→</div>
                </a>
              );
            })}
          </div>
        )}
      </div>

      <footer className="px-6 py-3 border-t border-slate-800/60 shrink-0">
        <p className="text-[10px] text-slate-700">
          Race ratings based on 2024 House general election results. PVI is estimated from 2024 presidential/House vote patterns. Boundaries reflect 2022 redistricting.
        </p>
      </footer>
    </div>
  );
}
