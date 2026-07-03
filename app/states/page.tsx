"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getAllDistricts } from "@/lib/districtData";
import { PARTY_COLORS } from "@/lib/colors";
import { STATE_NAMES, AT_LARGE_STATES } from "@/lib/stateFips";

const ALL = getAllDistricts();

type SortKey = "name" | "seats" | "rCount" | "dCount" | "margin" | "income" | "competitive" | "freshmen";

type StateRow = {
  code: string;
  name: string;
  seats: number;
  rCount: number;
  dCount: number;
  vacantCount: number;
  freshmenCount: number;
  competitiveCount: number;
  closestMargin: number;
  avgMargin: number;
  avgIncome: number;
  districts: ReturnType<typeof getAllDistricts>;
};

function buildStateRows(): StateRow[] {
  const byState: Record<string, ReturnType<typeof getAllDistricts>> = {};
  for (const d of ALL) {
    const [state] = d.districtId.split("-");
    if (!byState[state]) byState[state] = [];
    byState[state].push(d);
  }
  return Object.entries(byState).map(([code, districts]) => {
    const nonVacant = districts.filter(d => d.data.party !== "Vacant");
    const rCount = districts.filter(d => d.data.party === "Republican").length;
    const dCount = districts.filter(d => d.data.party === "Democrat" || d.data.party === "Independent").length;
    const vacantCount = districts.filter(d => d.data.party === "Vacant").length;
    const freshmenCount = nonVacant.filter(d => d.data.termStart >= 2025).length;
    const competitiveCount = nonVacant.filter(d => Math.abs(d.data.margin) < 10).length;
    const margins = nonVacant.map(d => d.data.margin);
    const closestMargin = margins.length ? Math.min(...margins.map(m => Math.abs(m))) : 100;
    const avgMargin = margins.length ? margins.reduce((s, m) => s + m, 0) / margins.length : 0;
    const avgIncome = districts.length ? districts.reduce((s, d) => s + d.data.income, 0) / districts.length : 0;
    return {
      code,
      name: STATE_NAMES[code] ?? code,
      seats: districts.length,
      rCount,
      dCount,
      vacantCount,
      freshmenCount,
      competitiveCount,
      closestMargin,
      avgMargin,
      avgIncome,
      districts,
    };
  });
}

const STATE_ROWS = buildStateRows();

export default function StatesPage() {
  const pathname = usePathname();
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortDir, setSortDir] = useState<1 | -1>(1);
  const [search, setSearch] = useState("");

  const rows = useMemo(() => {
    const filtered = STATE_ROWS.filter(r =>
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.code.toLowerCase().includes(search.toLowerCase())
    );
    return [...filtered].sort((a, b) => {
      let av = 0, bv = 0;
      if (sortKey === "name") return sortDir * a.name.localeCompare(b.name);
      if (sortKey === "seats") { av = a.seats; bv = b.seats; }
      else if (sortKey === "rCount") { av = a.rCount; bv = b.rCount; }
      else if (sortKey === "dCount") { av = a.dCount; bv = b.dCount; }
      else if (sortKey === "margin") { av = a.avgMargin; bv = b.avgMargin; }
      else if (sortKey === "income") { av = a.avgIncome; bv = b.avgIncome; }
      else if (sortKey === "competitive") { av = a.competitiveCount; bv = b.competitiveCount; }
      else if (sortKey === "freshmen") { av = a.freshmenCount; bv = b.freshmenCount; }
      return sortDir * (av - bv);
    });
  }, [sortKey, sortDir, search]);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir(d => (d === 1 ? -1 : 1));
    else { setSortKey(key); setSortDir(key === "name" ? 1 : -1); }
  }

  function SortBtn({ k, label }: { k: SortKey; label: string }) {
    const active = sortKey === k;
    return (
      <button
        onClick={() => toggleSort(k)}
        className="text-[10px] font-bold uppercase tracking-widest transition-colors whitespace-nowrap"
        style={{ color: active ? "#a5b4fc" : "#475569" }}
      >
        {label}{active ? (sortDir === 1 ? " ▲" : " ▼") : ""}
      </button>
    );
  }

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
        <p className="text-slate-600 text-[11px]">{rows.length} states</p>
      </header>

      {/* Title + Search */}
      <div className="px-6 pt-6 pb-4 shrink-0">
        <h1 className="text-xl font-bold text-white mb-1">State Delegations</h1>
        <p className="text-slate-500 text-[13px] mb-4">
          House representation by state. Click any row to view on the map.
        </p>
        <input
          type="text"
          placeholder="Filter by state..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="px-3 py-2 rounded-lg text-[13px] bg-slate-800/60 border border-slate-700/40 text-slate-200 placeholder-slate-600 outline-none focus:border-indigo-500/50 w-56"
        />
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto px-6 pb-8">
        {/* Header row */}
        <div
          className="grid gap-4 px-4 py-2 mb-1 text-[10px] sticky top-0 z-10"
          style={{
            gridTemplateColumns: "1.6fr 0.5fr 2.5fr 0.6fr 0.6fr 0.8fr 0.8fr",
            backgroundColor: "#0d1117",
            borderBottom: "1px solid rgba(30,41,59,0.6)",
          }}
        >
          <SortBtn k="name" label="State" />
          <SortBtn k="seats" label="Seats" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-slate-700">Delegation</span>
          <SortBtn k="competitive" label="Comp." />
          <SortBtn k="freshmen" label="Fresh." />
          <SortBtn k="margin" label="Avg Lean" />
          <SortBtn k="income" label="Avg Income" />
        </div>

        <div className="space-y-1">
          {rows.map((row) => {
            const leanR = row.rCount > row.dCount;
            const leanD = row.dCount > row.rCount;
            const tied = row.rCount === row.dCount;

            return (
              <a
                key={row.code}
                href={`/house?s=${row.code}`}
                className="grid gap-4 px-4 py-3 rounded-xl transition-colors group items-center"
                style={{
                  gridTemplateColumns: "1.6fr 0.5fr 2.5fr 0.6fr 0.6fr 0.8fr 0.8fr",
                  backgroundColor: "rgba(13,17,23,0.6)",
                  border: "1px solid rgba(30,41,59,0.5)",
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "rgba(30,41,59,0.6)"; }}
                onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "rgba(13,17,23,0.6)"; }}
              >
                {/* State name */}
                <div className="min-w-0">
                  <span className="text-white font-semibold text-[13px]">{row.name}</span>
                  <span className="text-slate-600 text-[11px] ml-2">{row.code}</span>
                </div>

                {/* Seat count */}
                <span className="text-slate-400 text-[12px] font-semibold tabular-nums">{row.seats}</span>

                {/* Delegation bar */}
                <div className="flex items-center gap-2">
                  {/* Dot grid */}
                  <div className="flex flex-wrap gap-0.5" style={{ maxWidth: 160 }}>
                    {row.districts.map((d) => (
                      <div
                        key={d.districtId}
                        className="w-2 h-2 rounded-sm shrink-0"
                        style={{
                          backgroundColor:
                            d.data.party === "Republican" ? PARTY_COLORS.Republican :
                            d.data.party === "Democrat" ? PARTY_COLORS.Democrat :
                            d.data.party === "Independent" ? PARTY_COLORS.Independent :
                            "#374151",
                          opacity: d.data.party === "Vacant" ? 0.3 : 0.85,
                        }}
                        title={`${d.districtId}: ${d.data.repName} (${d.data.party})`}
                      />
                    ))}
                  </div>
                  {/* Count label */}
                  <span className="text-[11px] shrink-0" style={{
                    color: leanR ? PARTY_COLORS.Republican : leanD ? PARTY_COLORS.Democrat : "#94a3b8"
                  }}>
                    {row.rCount > 0 && <span style={{ color: PARTY_COLORS.Republican }}>{row.rCount}R</span>}
                    {row.rCount > 0 && row.dCount > 0 && <span className="text-slate-700 mx-0.5">–</span>}
                    {row.dCount > 0 && <span style={{ color: PARTY_COLORS.Democrat }}>{row.dCount}D</span>}
                    {tied && row.rCount === 0 && row.dCount === 0 && <span className="text-slate-600">{row.vacantCount}V</span>}
                  </span>
                </div>

                {/* Competitive seats */}
                <span className="text-[12px] tabular-nums" style={{ color: row.competitiveCount > 0 ? "#f59e0b" : "#475569" }}>
                  {row.competitiveCount > 0 ? row.competitiveCount : "—"}
                </span>

                {/* Freshmen */}
                <span className="text-[12px] tabular-nums" style={{ color: row.freshmenCount > 0 ? "#a5b4fc" : "#475569" }}>
                  {row.freshmenCount > 0 ? row.freshmenCount : "—"}
                </span>

                {/* Avg lean */}
                <span
                  className="text-[12px] font-semibold tabular-nums"
                  style={{ color: row.avgMargin > 3 ? PARTY_COLORS.Republican : row.avgMargin < -3 ? PARTY_COLORS.Democrat : "#94a3b8" }}
                >
                  {row.avgMargin > 0 ? "R" : "D"} {Math.abs(row.avgMargin).toFixed(1)}%
                </span>

                {/* Avg income */}
                <span className="text-slate-400 text-[12px] tabular-nums">
                  ${Math.round(row.avgIncome)}k
                </span>
              </a>
            );
          })}
        </div>
      </div>

      <footer className="px-6 py-3 border-t border-slate-800/60 shrink-0">
        <p className="text-[10px] text-slate-700">
          119th Congress · Seat counts include vacant seats. Click any row to view state on the map.
        </p>
      </footer>
    </div>
  );
}
