"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getAllDistricts, getDistrictData, getRepName } from "@/lib/districtData";
import { PARTY_COLORS } from "@/lib/colors";
import { STATE_NAMES, AT_LARGE_STATES } from "@/lib/stateFips";
import { Party } from "@/lib/types";
import DistrictPanel from "@/components/DistrictPanel";
import RepProfile from "@/components/RepProfile";
import ElectionSparkline, { HistoryPoint } from "@/components/ElectionSparkline";

type SortKey =
  | "districtId" | "repName" | "party" | "margin"
  | "income" | "poverty" | "college" | "urban" | "age" | "tenure";
type SortDir = "asc" | "desc";

const PARTY_SHORT: Record<Party, string> = {
  Republican: "R", Democrat: "D", Independent: "I", Vacant: "V", Unknown: "?",
};

function marginLabel(m: number): string {
  if (m === 0) return "Tie";
  return `${m > 0 ? "R" : "D"} +${Math.abs(m)}%`;
}

function districtDisplay(districtId: string): string {
  const [state, num] = districtId.split("-");
  if (AT_LARGE_STATES.has(state)) return `${state} AL`;
  return `${state}-${parseInt(num ?? "0", 10)}`;
}

function ageFromBirthday(birthday: string): number {
  const born = new Date(birthday);
  const today = new Date();
  let age = today.getFullYear() - born.getFullYear();
  const m = today.getMonth() - born.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < born.getDate())) age--;
  return age;
}

const ALL = getAllDistricts();

export default function RankingsPage() {
  const pathname = usePathname();
  const [sortKey, setSortKey] = useState<SortKey>("margin");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [partyFilter, setPartyFilter] = useState<Party | "All">("All");
  const [freshmanOnly, setFreshmanOnly] = useState(false);
  const [competitive, setCompetitive] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [meta, setMeta] = useState<Record<string, { birthday: string | null }> | null>(null);
  const [historyData, setHistoryData] = useState<Record<string, HistoryPoint[]> | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/legislator-meta.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setMeta(d))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/election-history.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((d: Record<string, HistoryPoint[]> | null) => setHistoryData(d))
      .catch(() => {});
  }, []);

  // "/" focuses search bar
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const ageMap = useMemo<Record<string, number>>(() => {
    if (!meta) return {};
    const m: Record<string, number> = {};
    for (const [id, v] of Object.entries(meta)) {
      if (v.birthday) m[id] = ageFromBirthday(v.birthday);
    }
    return m;
  }, [meta]);

  const sorted = useMemo(() => {
    let rows = ALL;

    if (partyFilter !== "All") rows = rows.filter((r) => r.data.party === partyFilter);
    if (freshmanOnly) rows = rows.filter((r) => r.data.termStart >= 2025);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      rows = rows.filter(
        (r) =>
          r.districtId.toLowerCase().includes(q) ||
          r.data.repName.toLowerCase().includes(q) ||
          (STATE_NAMES[r.districtId.split("-")[0]] ?? "").toLowerCase().includes(q)
      );
    }

    return [...rows].sort((a, b) => {
      if (competitive) return Math.abs(a.data.margin) - Math.abs(b.data.margin);
      let v = 0;
      switch (sortKey) {
        case "districtId": v = a.districtId.localeCompare(b.districtId); break;
        case "repName":    v = a.data.repName.localeCompare(b.data.repName); break;
        case "party":      v = a.data.party.localeCompare(b.data.party); break;
        case "margin":     v = a.data.margin - b.data.margin; break;
        case "income":     v = a.data.income - b.data.income; break;
        case "poverty":    v = (a.data.povertyPct ?? -1) - (b.data.povertyPct ?? -1); break;
        case "college":    v = (a.data.collegePct ?? -1) - (b.data.collegePct ?? -1); break;
        case "urban":      v = (a.data.urbanPct ?? -1) - (b.data.urbanPct ?? -1); break;
        case "age":        v = (ageMap[a.districtId] ?? -1) - (ageMap[b.districtId] ?? -1); break;
        case "tenure":     v = a.data.termStart - b.data.termStart; break;
      }
      return sortDir === "asc" ? v : -v;
    });
  }, [sortKey, sortDir, partyFilter, freshmanOnly, competitive, search, ageMap]);

  // Pre-compute heat ranges for each numeric column from filtered rows
  const heatRange = useMemo(() => {
    function range(vals: (number | null | undefined)[]) {
      const ns = vals.filter((v): v is number => v != null);
      return ns.length ? { min: Math.min(...ns), max: Math.max(...ns) } : { min: 0, max: 1 };
    }
    return {
      absMargin: range(sorted.map((r) => Math.abs(r.data.margin))),
      income:    range(sorted.map((r) => r.data.income)),
      poverty:   range(sorted.map((r) => r.data.povertyPct)),
      college:   range(sorted.map((r) => r.data.collegePct)),
      urban:     range(sorted.map((r) => r.data.urbanPct)),
      age:       range(sorted.map((r) => ageMap[r.districtId])),
      tenure:    range(sorted.map((r) => Math.max(0, 2026 - r.data.termStart))),
    };
  }, [sorted, ageMap]);

  function pct(value: number | null | undefined, key: keyof typeof heatRange): number {
    if (value == null) return 0;
    const { min, max } = heatRange[key];
    return max === min ? 0.5 : (value - min) / (max - min);
  }

  function cellBg(p: number, rgb: string): string {
    return `rgba(${rgb},${(p * 0.32).toFixed(2)})`;
  }

  function handleSort(key: SortKey) {
    setCompetitive(false);
    if (key === sortKey) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir("desc"); }
  }

  function SortIcon({ col }: { col: SortKey }) {
    if (competitive || col !== sortKey)
      return <span className="opacity-30 ml-1 text-[9px]">↕</span>;
    return (
      <span className="ml-1 text-indigo-400 text-[9px]">
        {sortDir === "asc" ? "↑" : "↓"}
      </span>
    );
  }

  const TH = "px-3 py-2 text-left text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap cursor-pointer select-none hover:text-slate-300 transition-colors";

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
        <p className="text-slate-600 text-[11px]">119th Congress · {sorted.length} of {ALL.length} districts</p>
      </header>

      {/* Controls */}
      <div
        className="flex flex-wrap items-center gap-2 px-6 py-3 shrink-0"
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
            ref={searchRef}
            type="text"
            placeholder="Name, district, state… (/)"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") { setSearch(""); (e.target as HTMLInputElement).blur(); }
            }}
            className="bg-transparent text-slate-300 text-xs placeholder-slate-600 outline-none w-44"
          />
          {search && (
            <button onClick={() => setSearch("")} className="text-slate-600 hover:text-slate-400 text-xs">✕</button>
          )}
        </div>

        <div className="w-px h-4 bg-slate-700/40 shrink-0" />

        {/* Party chips */}
        {(["All", "Republican", "Democrat", "Independent", "Vacant"] as const).map((p) => {
          const active = partyFilter === p;
          const color = p === "All" ? undefined : PARTY_COLORS[p as Party];
          return (
            <button
              key={p}
              onClick={() => setPartyFilter(p)}
              className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap"
              style={active ? {
                backgroundColor: color ? `${color}25` : "rgba(99,102,241,0.2)",
                color: color ?? "#a5b4fc",
                border: `1px solid ${color ? `${color}50` : "rgba(99,102,241,0.4)"}`,
              } : {
                backgroundColor: "transparent", color: "#475569", border: "1px solid transparent",
              }}
            >
              {p === "All" ? "All" : `${PARTY_SHORT[p as Party]} ${p}`}
            </button>
          );
        })}

        <div className="w-px h-4 bg-slate-700/40 shrink-0" />

        {/* Freshman filter */}
        <button
          onClick={() => setFreshmanOnly((f) => !f)}
          className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap"
          style={freshmanOnly ? {
            backgroundColor: "rgba(99,102,241,0.2)", color: "#a5b4fc",
            border: "1px solid rgba(99,102,241,0.4)",
          } : {
            backgroundColor: "transparent", color: "#475569", border: "1px solid rgba(30,41,59,0.6)",
          }}
        >
          Freshman
        </button>

        {/* Most competitive preset */}
        <button
          onClick={() => setCompetitive((c) => !c)}
          className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap"
          style={competitive ? {
            backgroundColor: "rgba(245,158,11,0.15)", color: "#fbbf24",
            border: "1px solid rgba(245,158,11,0.35)",
          } : {
            backgroundColor: "transparent", color: "#475569", border: "1px solid rgba(30,41,59,0.6)",
          }}
        >
          Most Competitive
        </button>

        {historyData && (
          <button
            onClick={() => setShowHistory((h) => !h)}
            className="px-2.5 py-1.5 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap"
            style={showHistory ? {
              backgroundColor: "rgba(99,102,241,0.15)", color: "#a5b4fc",
              border: "1px solid rgba(99,102,241,0.3)",
            } : {
              backgroundColor: "transparent", color: "#475569", border: "1px solid rgba(30,41,59,0.6)",
            }}
          >
            History
          </button>
        )}
      </div>

      {/* Table */}
      <div className="flex-1 overflow-auto">
        <table className="w-full border-collapse text-sm" style={{ minWidth: showHistory ? "1100px" : "960px" }}>
          <thead className="sticky top-0 z-10" style={{ backgroundColor: "#0d1117", borderBottom: "1px solid rgba(30,41,59,0.8)" }}>
            <tr>
              <th className={TH} onClick={() => handleSort("districtId")}>District <SortIcon col="districtId" /></th>
              <th className={TH} onClick={() => handleSort("repName")}>Representative <SortIcon col="repName" /></th>
              <th className={TH} onClick={() => handleSort("party")}>Party <SortIcon col="party" /></th>
              <th className={`${TH} text-right`} onClick={() => handleSort("margin")}>2024 Margin <SortIcon col="margin" /></th>
              <th className={`${TH} text-right`} onClick={() => handleSort("income")}>Med. Income <SortIcon col="income" /></th>
              <th className={`${TH} text-right`} onClick={() => handleSort("poverty")}>Poverty % <SortIcon col="poverty" /></th>
              <th className={`${TH} text-right`} onClick={() => handleSort("college")}>College % <SortIcon col="college" /></th>
              <th className={`${TH} text-right`} onClick={() => handleSort("urban")}>Urban % <SortIcon col="urban" /></th>
              <th className={`${TH} text-right`} onClick={() => handleSort("age")}>Age <SortIcon col="age" /></th>
              <th className={`${TH} text-right`} onClick={() => handleSort("tenure")}>Tenure <SortIcon col="tenure" /></th>
              {showHistory && <th className={`${TH} text-center`}>Election History</th>}
            </tr>
          </thead>
          <tbody>
            {sorted.map(({ districtId, data }, i) => {
              const partyColor = PARTY_COLORS[data.party] ?? "#64748B";
              const tenure = Math.max(0, 2026 - data.termStart);
              const [state] = districtId.split("-");
              const stateName = STATE_NAMES[state] ?? state;
              const age = ageMap[districtId];
              const absMargin = Math.abs(data.margin);
              const marginRgb = data.margin > 0 ? "239,68,68" : data.margin < 0 ? "59,130,246" : "245,158,11";

              return (
                <tr
                  key={districtId}
                  className="border-b cursor-pointer"
                  style={{
                    borderColor: "rgba(30,41,59,0.5)",
                    backgroundColor: i % 2 === 0 ? "transparent" : "rgba(15,23,42,0.3)",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = "rgba(30,41,59,0.6)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.backgroundColor = i % 2 === 0 ? "transparent" : "rgba(15,23,42,0.3)"; }}
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

                  {/* Representative */}
                  <td className="px-3 py-2.5">
                    <button
                      className="text-slate-200 text-[12px] truncate max-w-[200px] hover:text-indigo-300 hover:underline text-left transition-colors"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedId(districtId);
                        setShowProfile(false);
                      }}
                    >
                      {data.repName}
                    </button>
                  </td>

                  {/* Party */}
                  <td className="px-3 py-2.5">
                    <span className="text-[11px] font-semibold px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: `${partyColor}18`, color: partyColor }}>
                      {PARTY_SHORT[data.party]}
                    </span>
                  </td>

                  {/* Margin */}
                  <td className="px-3 py-2.5 text-right"
                    style={{ backgroundColor: cellBg(pct(absMargin, "absMargin"), marginRgb) }}>
                    <span className="text-[12px] font-semibold tabular-nums"
                      style={{ color: data.margin > 0 ? PARTY_COLORS.Republican : data.margin < 0 ? PARTY_COLORS.Democrat : "#F59E0B" }}>
                      {marginLabel(data.margin)}
                    </span>
                  </td>

                  {/* Income */}
                  <td className="px-3 py-2.5 text-right"
                    style={{ backgroundColor: cellBg(pct(data.income, "income"), "245,158,11") }}>
                    <span className="text-slate-300 text-[12px] tabular-nums">
                      ${(data.income * 1000).toLocaleString()}
                    </span>
                  </td>

                  {/* Poverty */}
                  <td className="px-3 py-2.5 text-right"
                    style={{ backgroundColor: cellBg(pct(data.povertyPct, "poverty"), "248,113,113") }}>
                    <span className="text-slate-300 text-[12px] tabular-nums">
                      {data.povertyPct != null ? `${data.povertyPct.toFixed(1)}%` : "—"}
                    </span>
                  </td>

                  {/* College */}
                  <td className="px-3 py-2.5 text-right"
                    style={{ backgroundColor: cellBg(pct(data.collegePct, "college"), "129,140,248") }}>
                    <span className="text-slate-300 text-[12px] tabular-nums">
                      {data.collegePct != null ? `${data.collegePct.toFixed(1)}%` : "—"}
                    </span>
                  </td>

                  {/* Urban */}
                  <td className="px-3 py-2.5 text-right"
                    style={{ backgroundColor: cellBg(pct(data.urbanPct, "urban"), "99,102,241") }}>
                    <span className="text-slate-300 text-[12px] tabular-nums">
                      {data.urbanPct != null ? `${data.urbanPct.toFixed(1)}%` : "—"}
                    </span>
                  </td>

                  {/* Age */}
                  <td className="px-3 py-2.5 text-right"
                    style={{ backgroundColor: cellBg(pct(age, "age"), "100,116,139") }}>
                    <span className="text-slate-300 text-[12px] tabular-nums">
                      {age != null ? age : "—"}
                    </span>
                  </td>

                  {/* Tenure */}
                  <td className="px-3 py-2.5 text-right"
                    style={{ backgroundColor: cellBg(pct(tenure, "tenure"), "139,92,246") }}>
                    <span className="text-slate-400 text-[12px] tabular-nums">
                      {tenure < 1 ? "< 1 yr" : `${tenure} yr`}
                    </span>
                  </td>

                  {/* Election History sparkline */}
                  {showHistory && (() => {
                    const hist = historyData?.[districtId];
                    return (
                      <td className="px-3 py-2.5">
                        {hist && hist.length >= 2 ? (
                          <ElectionSparkline history={hist} current={data.margin} partyColor={partyColor} width={120} height={36} />
                        ) : (
                          <span className="text-slate-700 text-[10px]">—</span>
                        )}
                      </td>
                    );
                  })()}
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

      {/* District panel overlay */}
      {selectedId && (() => {
        const entry = ALL.find(r => r.districtId === selectedId);
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
