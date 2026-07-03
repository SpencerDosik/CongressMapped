"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { getAllDistricts, DistrictFullData } from "@/lib/districtData";
import { PARTY_COLORS } from "@/lib/colors";
import { STATE_NAMES, AT_LARGE_STATES } from "@/lib/stateFips";
import IdeologyChart, { AxisConfig, MemberPoint } from "@/components/IdeologyChart";
import DistrictPanel from "@/components/DistrictPanel";
import RepProfile from "@/components/RepProfile";
import { getDistrictData, getRepName } from "@/lib/districtData";

// ── Axis definitions ──────────────────────────────────────────────────────────

type AxisKey =
  | "pvi"
  | "margin"
  | "income"
  | "tenure"
  | "age"
  | "poverty"
  | "college"
  | "urban"
  | "sponsored"
  | "cosponsored"
  | "becameLaw";

interface AxisDef extends AxisConfig {
  key: AxisKey;
}

const pviFormat = (v: number) =>
  Math.round(v) === 0 ? "EVEN" : `${v > 0 ? "R" : "D"}+${Math.abs(Math.round(v))}`;

const AXES: Record<AxisKey, AxisDef> = {
  pvi: {
    key: "pvi",
    label: "PVI (estimated)",
    partisan: true,
    format: pviFormat,
    tickFormat: pviFormat,
  },
  margin: {
    key: "margin",
    label: "2024 Margin",
    partisan: true,
    format: (v) => (Math.round(v) === 0 ? "Tie" : `${v > 0 ? "R" : "D"} +${Math.abs(Math.round(v))}%`),
    tickFormat: pviFormat,
  },
  income: {
    key: "income",
    label: "Median Income",
    format: (v) => `$${Math.round(v)}k`,
    tickFormat: (v) => `$${Math.round(v)}k`,
  },
  tenure: {
    key: "tenure",
    label: "Tenure",
    format: (v) => (v < 1 ? "< 1 yr" : `${Math.round(v)} yrs`),
    tickFormat: (v) => `${Math.round(v)}`,
  },
  age: {
    key: "age",
    label: "Age",
    format: (v) => `${Math.round(v)} yrs`,
    tickFormat: (v) => `${Math.round(v)}`,
  },
  poverty: {
    key: "poverty",
    label: "Poverty Rate",
    format: (v) => `${v.toFixed(1)}%`,
    tickFormat: (v) => `${v.toFixed(1)}%`,
  },
  college: {
    key: "college",
    label: "College Grad %",
    format: (v) => `${v.toFixed(1)}%`,
    tickFormat: (v) => `${v.toFixed(1)}%`,
  },
  urban: {
    key: "urban",
    label: "Urban %",
    format: (v) => `${v.toFixed(1)}%`,
    tickFormat: (v) => `${v.toFixed(1)}%`,
  },
  sponsored: {
    key: "sponsored",
    label: "Bills Sponsored",
    format: (v) => Math.round(v).toLocaleString(),
    tickFormat: (v) => Math.round(v).toLocaleString(),
  },
  cosponsored: {
    key: "cosponsored",
    label: "Bills Cosponsored",
    format: (v) => Math.round(v).toLocaleString(),
    tickFormat: (v) => Math.round(v).toLocaleString(),
  },
  becameLaw: {
    key: "becameLaw",
    label: "Became Law",
    format: (v) => Math.round(v).toLocaleString(),
    tickFormat: (v) => Math.round(v).toLocaleString(),
  },
};

interface AxisGroup {
  label: string;
  keys: AxisKey[];
  requiresBills?: boolean;
}

const AXIS_GROUPS: AxisGroup[] = [
  { label: "Political", keys: ["pvi", "margin"] },
  { label: "Economic", keys: ["income"] },
  { label: "Representative", keys: ["tenure", "age"] },
  { label: "Demographics", keys: ["poverty", "college", "urban"] },
  { label: "Legislative", keys: ["sponsored", "cosponsored", "becameLaw"], requiresBills: true },
];

// ── Data ──────────────────────────────────────────────────────────────────────

type MemberParty = "Republican" | "Democrat" | "Independent";

interface LegislatorMeta {
  bioguide: string | null;
  birthday: string | null;
}

interface BillCounts {
  sponsored: number;
  cosponsored: number;
  becameLaw: number;
}

const MEMBERS: { districtId: string; data: DistrictFullData }[] = getAllDistricts().filter(
  (d): boolean =>
    d.data.party === "Republican" || d.data.party === "Democrat" || d.data.party === "Independent"
);

function districtLabel(districtId: string): string {
  const [state, raw] = districtId.split("-");
  const num = parseInt(raw ?? "0", 10);
  if (num === 0 || AT_LARGE_STATES.has(state)) return "At-Large";
  const suffix =
    num % 10 === 1 && num % 100 !== 11
      ? "st"
      : num % 10 === 2 && num % 100 !== 12
      ? "nd"
      : num % 10 === 3 && num % 100 !== 13
      ? "rd"
      : "th";
  return `${num}${suffix} District`;
}

function axisValue(
  key: AxisKey,
  districtId: string,
  data: DistrictFullData,
  meta: Record<string, LegislatorMeta> | null,
  bills: Record<string, BillCounts> | null
): number | undefined {
  switch (key) {
    case "pvi":
      return data.pvi;
    case "margin":
      return data.margin;
    case "income":
      return data.income;
    case "tenure":
      return Math.max(0, 2026 - data.termStart);
    case "age": {
      const bday = meta?.[districtId]?.birthday;
      if (!bday) return undefined;
      const b = new Date(bday);
      if (isNaN(b.getTime())) return undefined;
      const now = new Date();
      let age = now.getFullYear() - b.getFullYear();
      if (
        now.getMonth() < b.getMonth() ||
        (now.getMonth() === b.getMonth() && now.getDate() < b.getDate())
      ) {
        age -= 1;
      }
      return age;
    }
    case "poverty":
      return data.povertyPct ?? undefined;
    case "college":
      return data.collegePct ?? undefined;
    case "urban":
      return data.urbanPct ?? undefined;
    case "sponsored":
    case "cosponsored":
    case "becameLaw": {
      const bioguide = meta?.[districtId]?.bioguide;
      if (!bioguide) return undefined;
      const counts = bills?.[bioguide];
      if (!counts) return undefined;
      const v = counts[key];
      return typeof v === "number" ? v : undefined;
    }
  }
}

// ── Axis picker (grouped dropdown) ────────────────────────────────────────────

const ACTIVE_STYLE = {
  backgroundColor: "rgba(99,102,241,0.25)",
  color: "#a5b4fc",
  border: "1px solid rgba(99,102,241,0.4)",
};

function AxisPicker({
  label,
  value,
  onChange,
  billsAvailable,
}: {
  label: string;
  value: AxisKey;
  onChange: (k: AxisKey) => void;
  billsAvailable: boolean;
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={containerRef} className="relative shrink-0 flex items-center gap-1.5">
      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest select-none">
        {label}
      </span>
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-[11px] font-medium transition-all duration-150 whitespace-nowrap"
        style={
          open
            ? ACTIVE_STYLE
            : {
                backgroundColor: "rgba(15,23,42,0.7)",
                border: "1px solid rgba(30,41,59,0.9)",
                color: "#94a3b8",
              }
        }
      >
        <span>{AXES[value].label}</span>
        <svg
          className="w-3 h-3 transition-transform duration-150"
          style={{ transform: open ? "rotate(180deg)" : "rotate(0deg)" }}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute top-full right-0 mt-1 rounded-xl overflow-hidden z-50 shadow-2xl shadow-black/60"
          style={{ backgroundColor: "#0d1117", border: "1px solid rgba(51,65,85,0.7)", minWidth: "240px" }}
        >
          {AXIS_GROUPS.map((group) => {
            const disabled = !!group.requiresBills && !billsAvailable;
            return (
              <div key={group.label} className="border-b border-slate-800/60 last:border-0">
                <p className="px-4 pt-2.5 pb-1 text-[10px] font-bold text-slate-600 uppercase tracking-widest select-none">
                  {group.label}
                </p>
                {group.keys.map((k) => {
                  const active = value === k;
                  return (
                    <button
                      key={k}
                      disabled={disabled}
                      title={disabled ? "Requires bill data — run scripts/generate-bill-counts.mjs" : undefined}
                      onClick={() => {
                        onChange(k);
                        setOpen(false);
                      }}
                      className="w-full flex flex-col items-start px-4 py-2 text-left transition-colors"
                      style={{
                        backgroundColor: active ? "rgba(99,102,241,0.12)" : "transparent",
                        cursor: disabled ? "not-allowed" : "pointer",
                      }}
                      onMouseEnter={(e) => {
                        if (!active && !disabled)
                          (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                            "rgba(51,65,85,0.4)";
                      }}
                      onMouseLeave={(e) => {
                        if (!active && !disabled)
                          (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent";
                      }}
                    >
                      <span
                        className="text-[12px] font-semibold"
                        style={{ color: disabled ? "#475569" : active ? "#a5b4fc" : "#cbd5e1" }}
                      >
                        {AXES[k].label}
                        {active && <span className="ml-2 text-[10px] text-indigo-400">✓</span>}
                      </span>
                      {disabled && (
                        <span className="text-[10px] text-slate-700 mt-0.5 leading-snug">
                          Requires bill data — run scripts/generate-bill-counts.mjs
                        </span>
                      )}
                    </button>
                  );
                })}
                <div className="pb-1.5" />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Committee data types ──────────────────────────────────────────────────────

interface CommitteeEntry {
  code: string;
  name: string;
  type: string;
  parent: string | null;
}

// Short display names for committees
function shortCommName(name: string): string {
  return name
    .replace("House Committee on the ", "")
    .replace("House Committee on ", "")
    .replace(" and ", " & ");
}

// ── Compact filter dropdown ────────────────────────────────────────────────────

function FilterDropdown({
  label,
  value,
  options,
  onChange,
  onClear,
}: {
  label: string;
  value: string | null;
  options: { value: string; label: string }[];
  onChange: (v: string) => void;
  onClear: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const filtered = options.filter((o) =>
    o.label.toLowerCase().includes(search.toLowerCase())
  );

  const hasValue = value !== null;
  const displayLabel = value ? (options.find((o) => o.value === value)?.label ?? value) : label;

  return (
    <div ref={ref} className="relative shrink-0 flex items-center gap-1.5">
      <button
        onClick={() => setOpen((o) => !o)}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all duration-150 whitespace-nowrap max-w-[160px]"
        style={hasValue || open
          ? { backgroundColor: "rgba(99,102,241,0.25)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.4)" }
          : { backgroundColor: "rgba(15,23,42,0.7)", border: "1px solid rgba(30,41,59,0.9)", color: "#64748b" }
        }
      >
        <span className="truncate">{displayLabel}</span>
        {hasValue ? (
          <span
            className="text-indigo-300 hover:text-white ml-1 shrink-0"
            onClick={(e) => { e.stopPropagation(); onClear(); setSearch(""); }}
          >
            ✕
          </span>
        ) : (
          <svg className="w-3 h-3 shrink-0 transition-transform" style={{ transform: open ? "rotate(180deg)" : "" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        )}
      </button>

      {open && (
        <div
          className="absolute top-full right-0 mt-1 rounded-xl overflow-hidden z-50 shadow-2xl shadow-black/60 flex flex-col"
          style={{ backgroundColor: "#0d1117", border: "1px solid rgba(51,65,85,0.7)", minWidth: "220px", maxHeight: "320px" }}
        >
          <div className="p-2 border-b border-slate-800/60 shrink-0">
            <input
              autoFocus
              type="text"
              placeholder="Search…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full px-2 py-1 rounded-md text-[11px] text-slate-300 placeholder-slate-600 outline-none"
              style={{ backgroundColor: "rgba(15,23,42,0.8)", border: "1px solid rgba(51,65,85,0.5)" }}
            />
          </div>
          <div className="overflow-y-auto flex-1">
            {filtered.length === 0 ? (
              <p className="px-4 py-3 text-[11px] text-slate-600">No matches</p>
            ) : (
              filtered.map((opt) => {
                const active = value === opt.value;
                return (
                  <button
                    key={opt.value}
                    onClick={() => { onChange(opt.value); setOpen(false); setSearch(""); }}
                    className="w-full flex items-center justify-between px-3 py-2.5 text-left text-[12px] transition-colors"
                    style={{ backgroundColor: active ? "rgba(99,102,241,0.12)" : "transparent", color: active ? "#a5b4fc" : "#cbd5e1" }}
                    onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(51,65,85,0.4)"; }}
                    onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}
                  >
                    <span className="truncate">{opt.label}</span>
                    {active && <span className="text-indigo-400 text-[10px] shrink-0 ml-2">✓</span>}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const PARTY_CHIPS: { label: string; value: "All" | MemberParty }[] = [
  { label: "All", value: "All" },
  { label: "R", value: "Republican" },
  { label: "D", value: "Democrat" },
  { label: "I", value: "Independent" },
];

const ALL_STATES = Object.entries(STATE_NAMES)
  .map(([abbr, name]) => ({ value: abbr, label: name }))
  .sort((a, b) => a.label.localeCompare(b.label));

export default function IdeologyPage() {
  const pathname = usePathname();
  const [xKey, setXKey] = useState<AxisKey>("pvi");
  const [yKey, setYKey] = useState<AxisKey>("tenure");
  const [partyFilter, setPartyFilter] = useState<"All" | MemberParty>("All");
  const [stateFilter, setStateFilter] = useState<string | null>(null);
  const [committeeFilter, setCommitteeFilter] = useState<string | null>(null);
  const [meta, setMeta] = useState<Record<string, LegislatorMeta> | null>(null);
  const [bills, setBills] = useState<Record<string, BillCounts> | null>(null);
  const [committeeData, setCommitteeData] = useState<Record<string, CommitteeEntry[]> | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showProfile, setShowProfile] = useState(false);
  const [showTrendLine, setShowTrendLine] = useState(false);
  const userChangedY = useRef(false);

  useEffect(() => {
    let cancelled = false;

    fetch("/legislator-meta.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => { if (!cancelled && json) setMeta(json); })
      .catch(() => {});

    fetch("/bill-counts.json")
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((json) => {
        if (cancelled || !json) return;
        setBills(json as Record<string, BillCounts>);
        if (!userChangedY.current) setYKey("sponsored");
      })
      .catch(() => {});

    fetch("/committee-data.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => { if (!cancelled && json) setCommitteeData(json); })
      .catch(() => {});

    return () => { cancelled = true; };
  }, []);

  const billsAvailable = bills !== null;

  // Build sorted list of unique full committees
  const committeeOptions = useMemo(() => {
    if (!committeeData) return [];
    const seen = new Set<string>();
    const opts: { value: string; label: string }[] = [];
    Object.values(committeeData).forEach((comms) => {
      comms.forEach((c) => {
        if (c.type === "house" && !c.parent && !seen.has(c.name)) {
          seen.add(c.name);
          opts.push({ value: c.name, label: shortCommName(c.name) });
        }
      });
    });
    return opts.sort((a, b) => a.label.localeCompare(b.label));
  }, [committeeData]);

  // Set of district IDs on the selected committee
  const committeeDistrictIds = useMemo(() => {
    if (!committeeFilter || !committeeData) return null;
    const ids = new Set<string>();
    Object.entries(committeeData).forEach(([id, comms]) => {
      if (comms.some((c) => c.name === committeeFilter || c.parent === committeeFilter)) {
        ids.add(id);
      }
    });
    return ids;
  }, [committeeFilter, committeeData]);

  const { points, hiddenCount, visibleCount } = useMemo(() => {
    const pts: MemberPoint[] = [];
    let hidden = 0;
    for (const { districtId, data } of MEMBERS) {
      const xv = axisValue(xKey, districtId, data, meta, bills);
      const yv = axisValue(yKey, districtId, data, meta, bills);
      if (xv === undefined || yv === undefined) {
        hidden++;
        continue;
      }
      const party = data.party as MemberParty;
      const [state] = districtId.split("-");

      const partyFaded = partyFilter !== "All" && party !== partyFilter;
      const stateFaded = stateFilter !== null && state !== stateFilter;
      const committeeFaded = committeeDistrictIds !== null && !committeeDistrictIds.has(districtId);
      const faded = partyFaded || stateFaded || committeeFaded;

      pts.push({
        districtId,
        name: data.repName,
        party,
        stateName: STATE_NAMES[state] ?? state,
        districtLabel: districtLabel(districtId),
        bioguide: meta?.[districtId]?.bioguide ?? null,
        xValue: xv,
        yValue: yv,
        faded,
      });
    }
    const visibleCount = pts.filter((p) => !p.faded).length;
    return { points: pts, hiddenCount: hidden, visibleCount };
  }, [xKey, yKey, partyFilter, stateFilter, committeeDistrictIds, meta, bills]);

  const activeFilters = [partyFilter !== "All", stateFilter !== null, committeeFilter !== null].filter(Boolean).length;
  const hasActiveFilter = activeFilters > 0;

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ backgroundColor: "#0a0e14", color: "#e2e8f0" }}>
      {/* Header bar */}
      <header
        className="flex items-center justify-between gap-3 px-4 py-2 shrink-0 z-20"
        style={{ backgroundColor: "#0d1117", borderBottom: "1px solid rgba(30,41,59,0.8)" }}
      >
        <div className="flex items-center gap-2 shrink-0">
          <Link href="/" className="flex items-center text-slate-400 hover:text-white transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div className="flex items-center gap-0.5">
            {(["/house", "/senate", "/rankings", "/compare", "/graph", "/competitive"] as const).map((href) => {
              const label: Record<string, string> = { "/house": "Map", "/senate": "Senate", "/rankings": "Rankings", "/compare": "Compare", "/graph": "Graph", "/competitive": "Races" };
              const active = pathname === href;
              return (
                <a key={href} href={href} className="px-2 py-1 rounded text-[10px] font-medium transition-colors whitespace-nowrap"
                  style={{ color: active ? "#a5b4fc" : "#64748b", backgroundColor: active ? "rgba(99,102,241,0.12)" : "transparent" }}>
                  {label[href]}
                </a>
              );
            })}
          </div>
        </div>

        {/* Axis pickers */}
        <div className="flex items-center gap-3 flex-wrap">
          <AxisPicker label="X" value={xKey} onChange={setXKey} billsAvailable={billsAvailable} />
          <AxisPicker label="Y" value={yKey} onChange={(k) => { userChangedY.current = true; setYKey(k); }} billsAvailable={billsAvailable} />

          <div className="w-px h-5 bg-slate-700/60 shrink-0" />

          {/* Party chips */}
          <div className="flex items-center gap-1">
            {PARTY_CHIPS.map(({ label, value }) => {
              const active = partyFilter === value;
              const color = value === "All" ? undefined : PARTY_COLORS[value];
              return (
                <button key={value} onClick={() => setPartyFilter(value)}
                  className="px-2 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap"
                  style={active
                    ? { backgroundColor: color ? `${color}25` : "rgba(99,102,241,0.25)", color: color ?? "#a5b4fc", border: `1px solid ${color ? `${color}50` : "rgba(99,102,241,0.4)"}` }
                    : { backgroundColor: "transparent", color: "#475569", border: "1px solid rgba(30,41,59,0.9)" }
                  }>
                  {label}
                </button>
              );
            })}
          </div>

          <div className="w-px h-5 bg-slate-700/60 shrink-0" />

          {/* State filter */}
          <FilterDropdown
            label="State"
            value={stateFilter}
            options={ALL_STATES}
            onChange={setStateFilter}
            onClear={() => setStateFilter(null)}
          />

          {/* Committee filter */}
          <FilterDropdown
            label="Committee"
            value={committeeFilter}
            options={committeeOptions}
            onChange={setCommitteeFilter}
            onClear={() => setCommitteeFilter(null)}
          />

          {/* Clear all active filters */}
          {activeFilters > 0 && (
            <button
              onClick={() => { setPartyFilter("All"); setStateFilter(null); setCommitteeFilter(null); }}
              className="px-2 py-1 rounded-lg text-[10px] font-medium transition-all whitespace-nowrap"
              style={{ backgroundColor: "rgba(239,68,68,0.12)", color: "#f87171", border: "1px solid rgba(239,68,68,0.25)" }}
            >
              Clear {activeFilters}
            </button>
          )}

          <div className="w-px h-4 bg-slate-700/60 shrink-0" />

          {/* Trend line toggle */}
          <button
            onClick={() => setShowTrendLine((t) => !t)}
            className="px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all whitespace-nowrap"
            style={showTrendLine ? {
              backgroundColor: "rgba(251,191,36,0.18)",
              color: "#fbbf24",
              border: "1px solid rgba(251,191,36,0.4)",
            } : {
              backgroundColor: "transparent",
              color: "#475569",
              border: "1px solid rgba(30,41,59,0.9)",
            }}
          >
            Trend Line
          </button>
        </div>

        <span className="text-slate-600 text-[11px] whitespace-nowrap shrink-0">
          {visibleCount} / {MEMBERS.length}
        </span>
      </header>

      {/* Chart + panel */}
      <div className="flex-1 min-h-0 relative flex">
        <div className="flex-1 min-w-0 relative">
          {points.length > 0 ? (
            <IdeologyChart
              members={points}
              xAxis={AXES[xKey]}
              yAxis={AXES[yKey]}
              onMemberClick={(id) => { setSelectedId(id); setShowProfile(false); }}
              scaleToVisible={hasActiveFilter}
              showTrendLine={showTrendLine}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-slate-600 text-sm">
              No members have data for the selected axes.
            </div>
          )}
        </div>

        {/* District panel */}
        {selectedId && (() => {
          const data = getDistrictData(selectedId);
          const repName = getRepName(selectedId);
          if (!data || !repName) return null;
          return (
            <div className="shrink-0">
              <DistrictPanel
                districtId={selectedId}
                repName={repName}
                data={data}
                onClose={() => { setSelectedId(null); setShowProfile(false); }}
                onShowProfile={() => setShowProfile(true)}
              />
            </div>
          );
        })()}
      </div>

      {/* Full profile overlay */}
      {showProfile && selectedId && (() => {
        const data = getDistrictData(selectedId);
        const repName = getRepName(selectedId);
        if (!data || !repName) return null;
        return (
          <RepProfile
            districtId={selectedId}
            repName={repName}
            data={data}
            onClose={() => setShowProfile(false)}
          />
        );
      })()}

      {/* Footnote */}
      <footer
        className="flex items-center justify-between gap-4 px-6 py-2 shrink-0"
        style={{ backgroundColor: "#0d1117", borderTop: "1px solid rgba(30,41,59,0.8)" }}
      >
        <p className="text-slate-600 text-[10px] truncate">
          Sources: PVI (estimated) &amp; margins from 2024 results · Income: Census ACS · Portraits: Library of Congress bioguide
        </p>
        {hiddenCount > 0 && (
          <p className="text-slate-500 text-[10px] whitespace-nowrap">
            {hiddenCount} member{hiddenCount === 1 ? "" : "s"} without data hidden
          </p>
        )}
      </footer>
    </div>
  );
}
