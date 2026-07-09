"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getAllDistricts } from "@/lib/districtData";
import { PARTY_COLORS } from "@/lib/colors";
import { STATE_NAMES, AT_LARGE_STATES } from "@/lib/stateFips";
import { Party } from "@/lib/types";
import DistrictPanel from "@/components/DistrictPanel";
import RepProfile from "@/components/RepProfile";
import ElectionSparkline, { HistoryPoint } from "@/components/ElectionSparkline";

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

type SortKey = "margin" | "pvi" | "state" | "tenure";

export default function CompetitivePage() {
  const pathname = usePathname();
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [partyFilter, setPartyFilter] = useState<"All" | "R" | "D">("All");
  const [sortKey, setSortKey] = useState<SortKey>("margin");
  const [freshmanOnly, setFreshmanOnly] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [historyData, setHistoryData] = useState<Record<string, HistoryPoint[]> | null>(null);

  useEffect(() => {
    fetch("/election-history.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Record<string, HistoryPoint[]> | null) => setHistoryData(d))
      .catch(() => {});
  }, []);

  const districts = useMemo(() => {
    const q = search.toLowerCase();
    return ALL
      .filter((d) => {
        const cat = CATEGORIES.find((c) => c.test(d.data.margin));
        if (!cat) return false;
        if (selectedCat && cat.label !== selectedCat) return false;
        if (partyFilter === "R" && d.data.margin <= 0) return false;
        if (partyFilter === "D" && d.data.margin >= 0) return false;
        if (freshmanOnly && d.data.termStart < 2025) return false;
        if (q && !d.data.repName.toLowerCase().includes(q) && !d.districtId.toLowerCase().includes(q)) return false;
        return true;
      })
      .sort((a, b) => {
        if (sortKey === "margin") return Math.abs(a.data.margin) - Math.abs(b.data.margin);
        if (sortKey === "pvi") return Math.abs(a.data.pvi) - Math.abs(b.data.pvi);
        if (sortKey === "state") return a.districtId.localeCompare(b.districtId);
        if (sortKey === "tenure") return a.data.termStart - b.data.termStart;
        return 0;
      });
  }, [selectedCat, partyFilter, sortKey, freshmanOnly]);

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
            {(["/house", "/rankings", "/compare", "/graph", "/competitive", "/states", "/committees", "/freshmen"] as const).map((href) => {
              const label = { "/house": "Map", "/rankings": "Rankings", "/compare": "Compare", "/graph": "Graph", "/competitive": "Races", "/states": "States", "/committees": "Cmtes", "/freshmen": "Class" }[href];
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
        <div className="flex items-baseline justify-between gap-4 mb-1">
          <h1 className="text-xl font-bold text-white">Competitive Races — 2026</h1>
          <input
            type="text"
            placeholder="Search rep or district..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg text-[12px] bg-slate-800/60 border border-slate-700/40 text-slate-200 placeholder-slate-600 outline-none focus:border-indigo-500/50 w-44"
          />
        </div>
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

        {/* Party filter + Freshman filter */}
        <div className="flex flex-wrap gap-2 items-center">
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
          <div className="w-px h-4 bg-slate-800 mx-1" />
          <button
            onClick={() => setFreshmanOnly(f => !f)}
            className="px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all"
            style={freshmanOnly ? {
              backgroundColor: "rgba(99,102,241,0.15)",
              color: "#a5b4fc",
              border: "1px solid rgba(99,102,241,0.35)",
            } : {
              backgroundColor: "transparent",
              color: "#475569",
              border: "1px solid transparent",
            }}
          >
            Freshmen only
          </button>
        </div>

        {/* Sort options */}
        <div className="flex items-center gap-1 mt-2">
          <span className="text-[10px] text-slate-700 uppercase tracking-widest mr-1">Sort:</span>
          {(["margin", "pvi", "state", "tenure"] as SortKey[]).map((k) => {
            const labels: Record<SortKey, string> = { margin: "Margin", pvi: "PVI", state: "State", tenure: "Tenure" };
            return (
              <button
                key={k}
                onClick={() => setSortKey(k)}
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
                <div
                  key={districtId}
                  onClick={() => setSelectedId(districtId)}
                  className="flex items-center gap-4 px-4 py-3 rounded-xl transition-colors group cursor-pointer"
                  style={{ backgroundColor: selectedId === districtId ? "rgba(30,41,59,0.6)" : "rgba(13,17,23,0.6)", border: `1px solid ${selectedId === districtId ? "rgba(99,102,241,0.4)" : "rgba(30,41,59,0.5)"}` }}
                  onMouseEnter={(e) => { if (selectedId !== districtId) (e.currentTarget as HTMLDivElement).style.backgroundColor = "rgba(30,41,59,0.6)"; }}
                  onMouseLeave={(e) => { if (selectedId !== districtId) (e.currentTarget as HTMLDivElement).style.backgroundColor = "rgba(13,17,23,0.6)"; }}
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
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-white font-bold text-[13px] tabular-nums">{districtDisplay(districtId)}</span>
                        <span className="text-slate-600 text-[11px]">{stateName}</span>
                        {data.termStart >= 2025 && (
                          <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide"
                            style={{ backgroundColor: "rgba(99,102,241,0.15)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.3)" }}>
                            Fresh.
                          </span>
                        )}
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

                  {/* Election history sparkline */}
                  {historyData && (() => {
                    const hist = historyData[districtId];
                    return hist && hist.length >= 2 ? (
                      <div className="shrink-0 w-28 hidden md:block">
                        <ElectionSparkline history={hist} current={data.margin} partyColor={partyColor} width={112} height={32} />
                        <p className="text-[8px] text-slate-700 text-center mt-0.5">history</p>
                      </div>
                    ) : (
                      <div className="shrink-0 w-28 hidden md:block" />
                    );
                  })()}

                  {/* Tenure (shown only when sorting by tenure) */}
                  {sortKey === "tenure" && (
                    <div className="shrink-0 text-right w-14">
                      <p className="text-[11px] font-semibold tabular-nums text-slate-400">{data.termStart}</p>
                      <p className="text-[10px] text-slate-600">since</p>
                    </div>
                  )}

                  {/* Map link */}
                  <a
                    href={`/house?d=${districtId}`}
                    onClick={(e) => e.stopPropagation()}
                    title="View on map"
                    className="text-slate-700 hover:text-slate-300 transition-colors shrink-0 p-1"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 9m0 8V9m0 0L9 7" />
                    </svg>
                  </a>
                </div>
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

      {/* District panel overlay */}
      {selectedId && (() => {
        const entry = ALL.find(d => d.districtId === selectedId);
        if (!entry) return null;
        return (
          <>
            <div
              className="fixed inset-0 z-40 bg-black/40"
              onClick={() => { setSelectedId(null); setShowProfile(false); }}
            />
            <div className="fixed inset-y-0 right-0 z-50">
              <DistrictPanel
                districtId={selectedId}
                repName={entry.data.repName}
                data={entry.data}
                onClose={() => { setSelectedId(null); setShowProfile(false); }}
                onShowProfile={() => setShowProfile(true)}
              />
            </div>
            {showProfile && (
              <RepProfile
                districtId={selectedId}
                repName={entry.data.repName}
                data={entry.data}
                onClose={() => setShowProfile(false)}
              />
            )}
          </>
        );
      })()}
    </div>
  );
}
