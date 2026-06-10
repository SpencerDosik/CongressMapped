"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { getAllDistricts } from "@/lib/districtData";
import { PARTY_COLORS } from "@/lib/colors";
import { STATE_NAMES, AT_LARGE_STATES } from "@/lib/stateFips";
import { Party } from "@/lib/types";

type SortKey = "districtId" | "repName" | "party" | "margin" | "pvi" | "income" | "tenure";
type SortDir = "asc" | "desc";

const PARTY_SHORT: Record<Party, string> = {
  Republican: "R",
  Democrat: "D",
  Independent: "I",
  Vacant: "V",
  Unknown: "?",
};

function marginLabel(margin: number): string {
  if (margin === 0) return "Tie";
  return `${margin > 0 ? "R" : "D"} +${Math.abs(margin)}%`;
}

function pviLabel(pvi: number): string {
  if (pvi === 0) return "EVEN";
  return `${pvi > 0 ? "R" : "D"}+${Math.abs(pvi)}`;
}

function districtDisplay(districtId: string): string {
  const [state, num] = districtId.split("-");
  if (AT_LARGE_STATES.has(state)) return `${state} AL`;
  return `${state}-${parseInt(num ?? "0", 10)}`;
}

const ALL = getAllDistricts();

const SORT_FNS: Record<SortKey, (a: typeof ALL[0], b: typeof ALL[0]) => number> = {
  districtId: (a, b) => a.districtId.localeCompare(b.districtId),
  repName:    (a, b) => a.data.repName.localeCompare(b.data.repName),
  party:      (a, b) => a.data.party.localeCompare(b.data.party),
  margin:     (a, b) => a.data.margin - b.data.margin,
  pvi:        (a, b) => a.data.pvi - b.data.pvi,
  income:     (a, b) => a.data.income - b.data.income,
  tenure:     (a, b) => (a.data.termStart - b.data.termStart), // lower termStart = more tenure
};

export default function RankingsPage() {
  const [sortKey, setSortKey] = useState<SortKey>("margin");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [partyFilter, setPartyFilter] = useState<Party | "All">("All");
  const [search, setSearch] = useState("");

  const sorted = useMemo(() => {
    let rows = ALL;

    if (partyFilter !== "All") {
      rows = rows.filter((r) => r.data.party === partyFilter);
    }

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(
        (r) =>
          r.districtId.toLowerCase().includes(q) ||
          r.data.repName.toLowerCase().includes(q) ||
          (STATE_NAMES[r.districtId.split("-")[0]] ?? "").toLowerCase().includes(q)
      );
    }

    const fn = SORT_FNS[sortKey];
    rows = [...rows].sort((a, b) => {
      const v = fn(a, b);
      return sortDir === "asc" ? v : -v;
    });

    return rows;
  }, [sortKey, sortDir, partyFilter, search]);

  function handleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (col !== sortKey) return <span className="opacity-30 ml-1 text-[9px]">↕</span>;
    return <span className="ml-1 text-indigo-400 text-[9px]">{sortDir === "asc" ? "↑" : "↓"}</span>;
  }

  const headerBtn =
    "px-3 py-2 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap cursor-pointer select-none hover:text-slate-300 transition-colors";

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#0a0e14", color: "#e2e8f0" }}>

      {/* Header */}
      <header
        className="flex items-center justify-between px-6 py-3 shrink-0 z-10"
        style={{ backgroundColor: "#0d1117", borderBottom: "1px solid rgba(30,41,59,0.8)" }}
      >
        <div className="flex items-center gap-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Menu
          </Link>
          <span className="text-slate-700">/</span>
          <h1 className="text-white font-semibold text-sm">District Rankings</h1>
        </div>
        <p className="text-slate-600 text-[11px]">119th Congress · {sorted.length} of {ALL.length} districts</p>
      </header>

      {/* Controls */}
      <div
        className="flex items-center gap-3 px-6 py-3 shrink-0"
        style={{ backgroundColor: "#0d1117", borderBottom: "1px solid rgba(30,41,59,0.6)" }}
      >
        {/* Search */}
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
          style={{ backgroundColor: "rgba(15,23,42,0.8)", border: "1px solid rgba(51,65,85,0.5)" }}
        >
          <svg className="w-3.5 h-3.5 text-slate-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            placeholder="Rep name, district, or state…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-transparent text-slate-300 text-xs placeholder-slate-600 outline-none w-40"
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-slate-600 hover:text-slate-400 text-xs">✕</button>
          )}
        </div>

        {/* Party filter */}
        {(["All", "Republican", "Democrat", "Independent", "Vacant"] as const).map((p) => {
          const active = partyFilter === p;
          const color = p === "All" ? undefined : PARTY_COLORS[p as Party];
          return (
            <button
              key={p}
              onClick={() => setPartyFilter(p)}
              className="px-3 py-1.5 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap"
              style={active ? {
                backgroundColor: color ? `${color}25` : "rgba(99,102,241,0.2)",
                color: color ?? "#a5b4fc",
                border: `1px solid ${color ? `${color}50` : "rgba(99,102,241,0.4)"}`,
              } : {
                backgroundColor: "transparent",
                color: "#475569",
                border: "1px solid transparent",
              }}
            >
              {p === "All" ? "All" : PARTY_SHORT[p as Party]} {p !== "All" && p}
            </button>
          );
        })}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-sm">
          <thead className="sticky top-0 z-10" style={{ backgroundColor: "#0d1117", borderBottom: "1px solid rgba(30,41,59,0.8)" }}>
            <tr>
              <th className={headerBtn} onClick={() => handleSort("districtId")}>
                District <SortIcon col="districtId" />
              </th>
              <th className={headerBtn} onClick={() => handleSort("repName")}>
                Representative <SortIcon col="repName" />
              </th>
              <th className={headerBtn} onClick={() => handleSort("party")}>
                Party <SortIcon col="party" />
              </th>
              <th className={`${headerBtn} text-right`} onClick={() => handleSort("margin")}>
                2024 Margin <SortIcon col="margin" />
              </th>
              <th className={`${headerBtn} text-right`} onClick={() => handleSort("pvi")}>
                Computed PVI <SortIcon col="pvi" />
              </th>
              <th className={`${headerBtn} text-right`} onClick={() => handleSort("income")}>
                Med. Income <SortIcon col="income" />
              </th>
              <th className={`${headerBtn} text-right`} onClick={() => handleSort("tenure")}>
                Tenure <SortIcon col="tenure" />
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(({ districtId, data }, i) => {
              const partyColor = PARTY_COLORS[data.party] ?? "#64748B";
              const tenure = Math.max(0, 2026 - data.termStart);
              const [state] = districtId.split("-");
              const stateName = STATE_NAMES[state] ?? state;

              return (
                <tr
                  key={districtId}
                  className="group border-b transition-colors cursor-pointer"
                  style={{
                    borderColor: "rgba(30,41,59,0.5)",
                    backgroundColor: i % 2 === 0 ? "transparent" : "rgba(15,23,42,0.3)",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLTableRowElement).style.backgroundColor = "rgba(30,41,59,0.6)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLTableRowElement).style.backgroundColor =
                      i % 2 === 0 ? "transparent" : "rgba(15,23,42,0.3)";
                  }}
                  onClick={() => window.open(`/house?d=${districtId}`, "_self")}
                >
                  {/* District */}
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-1 h-6 rounded-full shrink-0" style={{ backgroundColor: partyColor }} />
                      <div>
                        <p className="text-white font-semibold text-[12px] tabular-nums">{districtDisplay(districtId)}</p>
                        <p className="text-slate-600 text-[10px]">{stateName}</p>
                      </div>
                    </div>
                  </td>

                  {/* Rep */}
                  <td className="px-3 py-2.5">
                    <p className="text-slate-200 text-[12px] truncate max-w-[200px]">{data.repName}</p>
                  </td>

                  {/* Party */}
                  <td className="px-3 py-2.5">
                    <span
                      className="text-[11px] font-semibold px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: `${partyColor}18`, color: partyColor }}
                    >
                      {PARTY_SHORT[data.party]}
                    </span>
                  </td>

                  {/* Margin */}
                  <td className="px-3 py-2.5 text-right">
                    <span
                      className="text-[12px] font-semibold tabular-nums"
                      style={{ color: data.margin > 0 ? PARTY_COLORS.Republican : data.margin < 0 ? PARTY_COLORS.Democrat : "#F59E0B" }}
                    >
                      {marginLabel(data.margin)}
                    </span>
                  </td>

                  {/* PVI */}
                  <td className="px-3 py-2.5 text-right">
                    <span
                      className="text-[12px] tabular-nums"
                      style={{ color: data.pvi > 0 ? PARTY_COLORS.Republican : data.pvi < 0 ? PARTY_COLORS.Democrat : "#94a3b8" }}
                    >
                      {pviLabel(data.pvi)}
                    </span>
                  </td>

                  {/* Income */}
                  <td className="px-3 py-2.5 text-right">
                    <span className="text-slate-300 text-[12px] tabular-nums">
                      ${(data.income * 1000).toLocaleString()}
                    </span>
                  </td>

                  {/* Tenure */}
                  <td className="px-3 py-2.5 text-right">
                    <span className="text-slate-400 text-[12px] tabular-nums">
                      {tenure < 1 ? "< 1 yr" : `${tenure} yr`}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {sorted.length === 0 && (
          <div className="flex items-center justify-center py-20 text-slate-600 text-sm">
            No districts match the current filter.
          </div>
        )}
      </div>
    </div>
  );
}
