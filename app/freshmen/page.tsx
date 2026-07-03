"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getAllDistricts } from "@/lib/districtData";
import { PARTY_COLORS } from "@/lib/colors";
import { STATE_NAMES, AT_LARGE_STATES } from "@/lib/stateFips";
import { Party } from "@/lib/types";

const FRESHMEN = getAllDistricts().filter(
  d => d.data.termStart >= 2025 && d.data.party !== "Vacant"
);

function pviLabel(pvi: number): string {
  if (pvi === 0) return "EVEN";
  return `${pvi > 0 ? "R" : "D"}+${Math.abs(pvi)}`;
}

function districtDisplay(districtId: string): string {
  const [state, num] = districtId.split("-");
  if (AT_LARGE_STATES.has(state)) return `${state} AL`;
  return `${state}-${parseInt(num ?? "0", 10)}`;
}

function competitivenessLabel(absMargin: number): { label: string; color: string } | null {
  if (absMargin < 5) return { label: "Toss-Up", color: "#f59e0b" };
  if (absMargin < 10) return { label: "Competitive", color: "#f97316" };
  if (absMargin < 20) return { label: "Lean", color: "#ef4444" };
  return null;
}

type SortKey = "margin" | "pvi" | "state" | "name";

export default function FreshmenPage() {
  const pathname = usePathname();
  const [partyFilter, setPartyFilter] = useState<"All" | "R" | "D">("All");
  const [sortKey, setSortKey] = useState<SortKey>("margin");
  const [search, setSearch] = useState("");

  const districts = useMemo(() => {
    const q = search.toLowerCase();
    return FRESHMEN
      .filter(d => {
        if (partyFilter === "R" && d.data.margin <= 0) return false;
        if (partyFilter === "D" && d.data.margin >= 0) return false;
        if (q && !d.data.repName.toLowerCase().includes(q) && !d.districtId.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortKey === "margin") return Math.abs(a.data.margin) - Math.abs(b.data.margin);
        if (sortKey === "pvi") return Math.abs(a.data.pvi) - Math.abs(b.data.pvi);
        if (sortKey === "state") return a.districtId.localeCompare(b.districtId);
        if (sortKey === "name") return a.data.repName.localeCompare(b.data.repName);
        return 0;
      });
  }, [partyFilter, sortKey, search]);

  const rCount = FRESHMEN.filter(d => d.data.party === "Republican").length;
  const dCount = FRESHMEN.filter(d => d.data.party === "Democrat" || d.data.party === "Independent").length;
  const competitive = FRESHMEN.filter(d => Math.abs(d.data.margin) < 10).length;

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
        <p className="text-slate-600 text-[11px]">{districts.length} shown</p>
      </header>

      {/* Title + stats + filters */}
      <div className="px-6 pt-6 pb-4 shrink-0">
        <h1 className="text-xl font-bold text-white mb-1">Freshman Class of 2025</h1>
        <p className="text-slate-500 text-[13px] mb-4">
          Members elected for the first time in November 2024. All face their first re-election in November 2026.
        </p>

        {/* Class stats */}
        <div className="flex flex-wrap gap-4 mb-5">
          <div className="px-3 py-2 rounded-lg" style={{ backgroundColor: "rgba(13,17,23,0.6)", border: "1px solid rgba(30,41,59,0.5)" }}>
            <p className="text-[10px] text-slate-600 uppercase tracking-widest">Total</p>
            <p className="text-lg font-bold text-white">{FRESHMEN.length}</p>
          </div>
          <div className="px-3 py-2 rounded-lg" style={{ backgroundColor: "rgba(13,17,23,0.6)", border: "1px solid rgba(30,41,59,0.5)" }}>
            <p className="text-[10px] text-slate-600 uppercase tracking-widest">Republicans</p>
            <p className="text-lg font-bold" style={{ color: PARTY_COLORS.Republican }}>{rCount}</p>
          </div>
          <div className="px-3 py-2 rounded-lg" style={{ backgroundColor: "rgba(13,17,23,0.6)", border: "1px solid rgba(30,41,59,0.5)" }}>
            <p className="text-[10px] text-slate-600 uppercase tracking-widest">Democrats</p>
            <p className="text-lg font-bold" style={{ color: PARTY_COLORS.Democrat }}>{dCount}</p>
          </div>
          <div className="px-3 py-2 rounded-lg" style={{ backgroundColor: "rgba(13,17,23,0.6)", border: "1px solid rgba(245,158,11,0.3)" }}>
            <p className="text-[10px] text-slate-600 uppercase tracking-widest">Competitive (±10%)</p>
            <p className="text-lg font-bold text-amber-400">{competitive}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex gap-2">
            {(["All", "R", "D"] as const).map(p => (
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
                {p === "All" ? "All" : p === "R" ? "R-held" : "D-held"}
              </button>
            ))}
          </div>

          <div className="w-px h-4 bg-slate-800" />

          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-700 uppercase tracking-widest">Sort:</span>
            {(["margin", "pvi", "state", "name"] as SortKey[]).map(k => {
              const labels: Record<SortKey, string> = { margin: "Margin", pvi: "PVI", state: "State", name: "Name" };
              return (
                <button key={k} onClick={() => setSortKey(k)}
                  className="px-2 py-1 rounded text-[11px] font-medium transition-all"
                  style={sortKey === k ? {
                    backgroundColor: "rgba(99,102,241,0.15)",
                    color: "#a5b4fc",
                    border: "1px solid rgba(99,102,241,0.3)",
                  } : {
                    backgroundColor: "transparent",
                    color: "#475569",
                    border: "1px solid transparent",
                  }}
                >
                  {labels[k]}
                </button>
              );
            })}
          </div>

          <input
            type="text"
            placeholder="Search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg text-[12px] bg-slate-800/60 border border-slate-700/40 text-slate-200 placeholder-slate-600 outline-none focus:border-indigo-500/50 w-36"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-auto px-6 pb-8">
        {districts.length === 0 ? (
          <div className="flex items-center justify-center py-20 text-slate-600 text-sm">
            No members match the current filter.
          </div>
        ) : (
          <div className="space-y-1">
            {districts.map(({ districtId, data }) => {
              const partyColor = PARTY_COLORS[data.party as Party] ?? "#64748b";
              const absMargin = Math.abs(data.margin);
              const [state] = districtId.split("-");
              const stateName = STATE_NAMES[state] ?? state;
              const comp = competitivenessLabel(absMargin);

              return (
                <a
                  key={districtId}
                  href={`/house?d=${districtId}`}
                  className="flex items-center gap-4 px-4 py-3 rounded-xl transition-colors group"
                  style={{ backgroundColor: "rgba(13,17,23,0.6)", border: "1px solid rgba(30,41,59,0.5)" }}
                  onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "rgba(30,41,59,0.6)"; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "rgba(13,17,23,0.6)"; }}
                >
                  {/* Competitiveness badge or spacer */}
                  <div className="shrink-0 w-20 text-center">
                    {comp ? (
                      <span
                        className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                        style={{ backgroundColor: `${comp.color}18`, color: comp.color, border: `1px solid ${comp.color}33` }}
                      >
                        {comp.label}
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-700">&nbsp;</span>
                    )}
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
                      {data.margin > 0 ? "R" : "D"} +{absMargin.toFixed(1)}%
                    </p>
                    <p className="text-[10px] text-slate-600">2024 margin</p>
                  </div>

                  {/* PVI */}
                  <div className="shrink-0 text-right w-14">
                    <p className="text-[11px] font-semibold tabular-nums"
                      style={{ color: data.pvi > 0 ? PARTY_COLORS.Republican : data.pvi < 0 ? PARTY_COLORS.Democrat : "#94a3b8" }}>
                      {pviLabel(data.pvi)}
                    </p>
                    <p className="text-[10px] text-slate-600">PVI</p>
                  </div>

                  <div className="text-slate-700 group-hover:text-slate-400 transition-colors text-sm shrink-0">→</div>
                </a>
              );
            })}
          </div>
        )}
      </div>

      <footer className="px-6 py-3 border-t border-slate-800/60 shrink-0">
        <p className="text-[10px] text-slate-700">
          119th Congress · Members first elected November 2024. Margins from 2024 general election results.
        </p>
      </footer>
    </div>
  );
}
