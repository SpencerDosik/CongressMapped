"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { usePathname } from "next/navigation";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from "react-simple-maps";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Annotation } = require("react-simple-maps") as { Annotation: React.ComponentType<{ subject: [number, number]; dx: number; dy: number; connectorProps: object; children: React.ReactNode }> };
import { geoCentroid, geoAlbersUsa } from "d3-geo";
import React from "react";

import FilterTabs from "./FilterTabs";
import DistrictPanel from "./DistrictPanel";
import MapLegend from "./MapLegend";
import RepProfile from "./RepProfile";

import { FilterMode } from "@/lib/types";
import { getDistrictColor, PARTY_COLORS } from "@/lib/colors";
import { getDistrictData, getRepName, getAllDistricts } from "@/lib/districtData";
import { toDistrictId, STATE_NAMES, AT_LARGE_STATES } from "@/lib/stateFips";

// ── Constants ─────────────────────────────────────────────────────────────────
const DISTRICTS_URL = "/districts.json";
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 25;
// Mirror the projection used by ComposableMap (projectionConfig.scale=900, viewBox 800×500)
const MAP_PROJ = geoAlbersUsa().scale(900).translate([400, 250]);
const SVG_W = 800;
const SVG_H = 500;
const R_CAUCUS = 218; // 217 R + Kevin Kiley (I, caucuses R)
const D_SEATS = 214; // +1: Analilia Mejia won NJ-11 special election Apr 16, 2026
const V_SEATS = 3;   // CA-01, CA-14, TX-23
const TOTAL_SEATS = 435;
const MAJORITY = 218;


// Geographic center [lon, lat] and appropriate zoom level per state
const STATE_VIEW: Record<string, { center: [number, number]; zoom: number }> = {
  AL: { center: [-86.84, 32.75], zoom: 5 }, AK: { center: [-153.4, 64.2], zoom: 3 },
  AZ: { center: [-111.5, 34.2], zoom: 4 },  AR: { center: [-92.4, 34.9], zoom: 5 },
  CA: { center: [-119.7, 37.2], zoom: 3 },  CO: { center: [-105.5, 39.0], zoom: 4 },
  CT: { center: [-72.7, 41.6], zoom: 11 },  DE: { center: [-75.5, 39.0], zoom: 14 },
  FL: { center: [-81.5, 27.8], zoom: 4 },   GA: { center: [-83.4, 32.7], zoom: 5 },
  HI: { center: [-157.5, 20.3], zoom: 7 },  ID: { center: [-114.5, 44.2], zoom: 4 },
  IL: { center: [-89.2, 40.4], zoom: 5 },   IN: { center: [-86.1, 40.3], zoom: 6 },
  IA: { center: [-93.1, 42.0], zoom: 5 },   KS: { center: [-98.4, 38.5], zoom: 5 },
  KY: { center: [-84.9, 37.8], zoom: 5 },   LA: { center: [-92.0, 31.2], zoom: 5 },
  ME: { center: [-69.4, 44.7], zoom: 6 },   MD: { center: [-76.6, 39.1], zoom: 9 },
  MA: { center: [-71.8, 42.3], zoom: 9 },   MI: { center: [-84.5, 43.3], zoom: 5 },
  MN: { center: [-94.7, 46.7], zoom: 4 },   MS: { center: [-89.7, 32.7], zoom: 5 },
  MO: { center: [-92.5, 38.6], zoom: 5 },   MT: { center: [-110.5, 47.0], zoom: 4 },
  NE: { center: [-99.9, 41.5], zoom: 5 },   NV: { center: [-117.1, 38.8], zoom: 4 },
  NH: { center: [-71.6, 43.7], zoom: 8 },   NJ: { center: [-74.5, 40.1], zoom: 9 },
  NM: { center: [-106.1, 34.5], zoom: 4 },  NY: { center: [-75.5, 42.7], zoom: 5 },
  NC: { center: [-79.4, 35.6], zoom: 5 },   ND: { center: [-100.5, 47.5], zoom: 5 },
  OH: { center: [-82.8, 40.4], zoom: 5 },   OK: { center: [-97.5, 35.5], zoom: 5 },
  OR: { center: [-120.6, 43.9], zoom: 4 },  PA: { center: [-77.2, 40.6], zoom: 5 },
  RI: { center: [-71.5, 41.7], zoom: 15 },  SC: { center: [-80.9, 33.9], zoom: 6 },
  SD: { center: [-100.3, 44.4], zoom: 5 },  TN: { center: [-86.3, 35.9], zoom: 5 },
  TX: { center: [-99.3, 31.5], zoom: 3 },   UT: { center: [-111.1, 39.3], zoom: 5 },
  VT: { center: [-72.7, 44.1], zoom: 9 },   VA: { center: [-78.2, 37.5], zoom: 5 },
  WA: { center: [-120.5, 47.4], zoom: 5 },  WV: { center: [-80.6, 38.6], zoom: 6 },
  WI: { center: [-89.7, 44.3], zoom: 5 },   WY: { center: [-107.6, 43.0], zoom: 5 },
};

// Approximate lon/lat centroids per state for label placement
const STATE_ABBR_CENTROIDS: Record<string, [number, number]> = {
  AL:[-86.8,32.8],AK:[-153,64.2],AZ:[-111.5,34.3],AR:[-92.4,34.9],CA:[-119.7,37.2],
  CO:[-105.5,39.0],CT:[-72.7,41.6],DE:[-75.5,39.0],FL:[-81.6,27.8],GA:[-83.4,32.7],
  HI:[-157.5,20.3],ID:[-114.5,44.2],IL:[-89.2,40.4],IN:[-86.1,40.3],IA:[-93.1,42.0],
  KS:[-98.4,38.5],KY:[-84.9,37.8],LA:[-92.0,31.2],ME:[-69.4,44.7],MD:[-76.6,39.1],
  MA:[-71.8,42.3],MI:[-84.5,43.3],MN:[-94.7,46.7],MS:[-89.7,32.7],MO:[-92.5,38.6],
  MT:[-110.5,47.0],NE:[-99.9,41.5],NV:[-117.1,38.8],NH:[-71.6,43.7],NJ:[-74.5,40.1],
  NM:[-106.1,34.5],NY:[-75.5,42.7],NC:[-79.4,35.6],ND:[-100.5,47.5],OH:[-82.8,40.4],
  OK:[-97.5,35.5],OR:[-120.6,43.9],PA:[-77.2,40.6],RI:[-71.5,41.7],SC:[-80.9,33.9],
  SD:[-100.3,44.4],TN:[-86.3,35.9],TX:[-99.3,31.5],UT:[-111.1,39.3],VT:[-72.7,44.1],
  VA:[-78.2,37.5],WA:[-120.5,47.4],WV:[-80.6,38.6],WI:[-89.7,44.3],WY:[-107.6,43.0],
};

// ── Seat Composition Bar ──────────────────────────────────────────────────────
function SeatBar() {
  const rPct = (R_CAUCUS / TOTAL_SEATS) * 100;
  const dPct = (D_SEATS / TOTAL_SEATS) * 100;
  const majorityPct = (MAJORITY / TOTAL_SEATS) * 100;

  return (
    <div className="flex flex-col items-center gap-1 select-none">
      <div className="flex items-center gap-3">
        <div className="text-right">
          <span className="text-red-400 font-bold text-sm tabular-nums">{R_CAUCUS}</span>
          <span className="text-slate-600 text-[10px] ml-1">R</span>
        </div>

        <div className="relative w-52 h-3 rounded-full overflow-visible bg-slate-800">
          <div
            className="absolute left-0 top-0 h-full rounded-l-full"
            style={{ width: `${rPct}%`, backgroundColor: "#DC2626" }}
          />
          <div
            className="absolute right-0 top-0 h-full rounded-r-full"
            style={{ width: `${dPct}%`, backgroundColor: "#2563EB" }}
          />
          <div
            className="absolute top-1/2 -translate-y-1/2 w-0.5 h-5 bg-slate-400/80 rounded-full z-10"
            style={{ left: `${majorityPct}%` }}
          >
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[9px] text-slate-500 whitespace-nowrap">
              218
            </div>
          </div>
        </div>

        <div className="text-left">
          <span className="text-slate-600 text-[10px] mr-1">D</span>
          <span className="text-blue-400 font-bold text-sm tabular-nums">{D_SEATS}</span>
        </div>
      </div>
      <p className="text-[10px] text-slate-700">
        incl. 1 independent · {V_SEATS} vacant seats
      </p>
    </div>
  );
}

// ── Search Bar ────────────────────────────────────────────────────────────────
function SearchBar({
  onSelect,
  onFocusState,
}: {
  onSelect: (id: string) => void;
  onFocusState: (abbr: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: string; name: string; state: string }[]>([]);
  const [stateMatches, setStateMatches] = useState<{ abbr: string; name: string }[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  useEffect(() => {
    const q = query.trim().toLowerCase();
    if (q.length < 2) {
      setResults([]);
      setStateMatches([]);
      setOpen(false);
      return;
    }

    // State focus candidates: exact abbreviation or name prefix
    const stateCandidates = Object.entries(STATE_NAMES)
      .filter(([abbr, name]) =>
        abbr.toLowerCase() === q || name.toLowerCase().startsWith(q)
      )
      .map(([abbr, name]) => ({ abbr, name }))
      .slice(0, 4);
    setStateMatches(stateCandidates);

    const stateAbbrs = Object.keys(STATE_NAMES) as string[];
    const matches: { id: string; name: string; state: string }[] = [];

    for (const state of stateAbbrs) {
      const numSeats = getStateSeats(state);
      const atLarge = AT_LARGE_STATES.has(state);
      const districts = atLarge ? [0] : Array.from({ length: numSeats }, (_, i) => i + 1);

      for (const d of districts) {
        const id = `${state}-${String(d).padStart(2, "0")}`;
        const data = getDistrictData(id);
        if (!data) continue;

        const repName = data.repName.toLowerCase();
        const stateName = (STATE_NAMES[state] ?? state).toLowerCase();
        if (repName.includes(q) || stateName.includes(q) || id.toLowerCase().includes(q)) {
          matches.push({ id, name: data.repName, state: STATE_NAMES[state] ?? state });
        }
        if (matches.length >= 8) break;
      }
      if (matches.length >= 8) break;
    }

    setResults(matches);
    setOpen(stateCandidates.length > 0 || matches.length > 0);
  }, [query]);

  const clear = () => { setQuery(""); setResults([]); setStateMatches([]); setOpen(false); };

  return (
    <div ref={ref} className="relative">
      <div className="flex items-center bg-slate-800/80 border border-slate-700/60 rounded-lg px-2.5 py-1.5 gap-2 w-48 focus-within:border-slate-500/80 transition-colors">
        <svg className="w-3 h-3 text-slate-500 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder="Find rep or district…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => (results.length > 0 || stateMatches.length > 0) && setOpen(true)}
          className="bg-transparent text-slate-300 text-xs placeholder-slate-600 outline-none w-full"
        />
        {query && (
          <button onClick={clear} className="text-slate-600 hover:text-slate-400 text-xs leading-none">✕</button>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full mt-1 right-0 w-64 bg-slate-900 border border-slate-700/60 rounded-xl shadow-2xl shadow-black/50 overflow-hidden z-50">

          {/* State results */}
          {stateMatches.map(({ abbr, name }) => (
            <button
              key={abbr}
              onClick={() => { onFocusState(abbr); clear(); }}
              className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-800 transition-colors text-left"
            >
              <svg className="w-3 h-3 text-indigo-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <div className="min-w-0 flex-1">
                <p className="text-white text-xs font-medium truncate">
                  {name} <span className="text-slate-500 font-normal">— zoom to state</span>
                </p>
              </div>
            </button>
          ))}

          {/* District results */}
          {results.map(({ id, name, state }) => {
            const d = getDistrictData(id);
            const party = d?.party ?? "Unknown";
            const color = PARTY_COLORS[party] ?? "#64748B";
            return (
              <button
                key={id}
                onClick={() => { onSelect(id); clear(); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-800 transition-colors text-left"
              >
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <div className="min-w-0 flex-1">
                  <p className="text-white text-xs font-medium truncate">{name}</p>
                  <p className="text-slate-500 text-[10px]">{state} · {id}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Helper: approximate number of House seats per state
function getStateSeats(state: string): number {
  const seats: Record<string, number> = {
    AL:7,AK:1,AZ:9,AR:4,CA:52,CO:8,CT:5,DE:1,FL:28,GA:14,
    HI:2,ID:2,IL:17,IN:9,IA:4,KS:4,KY:6,LA:6,ME:2,MD:8,
    MA:9,MI:13,MN:8,MS:4,MO:8,MT:2,NE:3,NV:4,NH:2,NJ:12,
    NM:3,NY:26,NC:14,ND:1,OH:15,OK:5,OR:6,PA:17,RI:2,SC:7,
    SD:1,TN:9,TX:38,UT:4,VT:1,VA:11,WA:10,WV:2,WI:8,WY:1,
  };
  return seats[state] ?? 1;
}

// ── Tooltip ──────────────────────────────────────────────────────────────────
function Tooltip({
  districtId, x, y, filterMode, repAge, committeeFilter, districtCommittees
}: {
  districtId: string;
  x: number;
  y: number;
  filterMode: FilterMode;
  repAge?: number;
  committeeFilter?: string | null;
  districtCommittees?: string[];
}) {
  const rawData = getDistrictData(districtId);
  const data = rawData ?? { party: "Unknown" as const, margin: 0, income: 65, pvi: 0, termStart: 2025, repName: "Vacant" };
  const [stateCode, rawNum] = districtId.split("-");
  const districtNum = parseInt(rawNum ?? "0", 10);
  const stateName = STATE_NAMES[stateCode] ?? stateCode;
  const isAtLarge = districtNum === 0 || AT_LARGE_STATES.has(stateCode);
  const districtLabel = isAtLarge
    ? "At-Large"
    : `${districtNum}${["th","st","nd","rd"][districtNum % 10 > 3 || (districtNum % 100 >= 11 && districtNum % 100 <= 13) ? 0 : districtNum % 10] ?? "th"} District`;

  const partyColor = PARTY_COLORS[data.party] ?? "#64748B";
  const marginAbs = Math.abs(data.margin);
  const marginLabel = data.margin === 0 ? "Toss-up" : `${data.margin > 0 ? "R" : "D"} +${marginAbs.toFixed(1)}%`;
  const tenure = Math.max(0, 2026 - data.termStart);

  let statLabel = "2024 Margin";
  let statValue = marginLabel;
  let statColor: string = data.margin >= 0 ? PARTY_COLORS.Republican : PARTY_COLORS.Democrat;
  if (filterMode === "income") {
    statLabel = "Median Income";
    statValue = `$${(data.income * 1000).toLocaleString()}`;
    statColor = "#f59e0b";
  } else if (filterMode === "tenure") {
    statLabel = "Tenure";
    statValue = tenure < 1 ? "< 1 yr" : `${tenure} yr`;
    statColor = "#818cf8";
  } else if (filterMode === "urban") {
    statLabel = "Urban";
    statValue = data.urbanPct != null ? `${data.urbanPct.toFixed(1)}%` : "—";
    statColor = "#6366f1";
  } else if (filterMode === "college") {
    statLabel = "College %";
    statValue = data.collegePct != null ? `${data.collegePct.toFixed(1)}%` : "—";
    statColor = "#a5b4fc";
  } else if (filterMode === "poverty") {
    statLabel = "Poverty %";
    statValue = data.povertyPct != null ? `${data.povertyPct.toFixed(1)}%` : "—";
    statColor = "#f87171";
  } else if (filterMode === "age") {
    statLabel = "Rep. Age";
    statValue = repAge != null ? `${repAge} yrs` : "—";
    statColor = "#06b6d4";
  } else if (filterMode === "committee") {
    const label = committeeFilter ?? "Committee";
    statLabel = label.length > 24 ? label.slice(0, 22) + "…" : label;
    if (!committeeFilter) {
      statValue = "—";
      statColor = "#64748b";
    } else if ((districtCommittees ?? []).includes(committeeFilter)) {
      statValue = "✓ Member";
      statColor = "#34d399";
    } else {
      statValue = "Not a member";
      statColor = "#64748b";
    }
  }

  const tipW = 210;
  const tipH = 100;
  const left = x + tipW + 20 > window.innerWidth ? x - tipW - 8 : x + 14;
  const top = y - tipH < 8 ? y + 14 : y - tipH;

  return (
    <div className="fixed pointer-events-none z-50" style={{ left, top }}>
      <div
        className="rounded-xl overflow-hidden shadow-2xl shadow-black/60"
        style={{
          width: tipW,
          backgroundColor: "#0d1117",
          border: "1px solid rgba(51,65,85,0.7)",
        }}
      >
        <div className="h-0.5" style={{ backgroundColor: partyColor }} />
        <div className="px-3 py-2.5">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: partyColor }} />
            <p className="text-white text-xs font-semibold truncate">{data.repName}</p>
          </div>
          <p className="text-slate-500 text-[11px] mb-2">{stateName} · {districtLabel}</p>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-600">{statLabel}</span>
            <span className="font-semibold" style={{ color: statColor }}>{statValue}</span>
          </div>
          {filterMode !== "party" && filterMode !== "margin" && (
            <div className="flex items-center justify-between text-[11px] mt-1">
              <span className="text-slate-700">Margin</span>
              <span style={{ color: data.margin >= 0 ? PARTY_COLORS.Republican : PARTY_COLORS.Democrat }}>{marginLabel}</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Zoom Controls ─────────────────────────────────────────────────────────────
function ZoomControls({ zoom, onIn, onOut, onReset }: {
  zoom: number;
  onIn: () => void;
  onOut: () => void;
  onReset: () => void;
}) {
  const btn = "w-8 h-8 flex items-center justify-center rounded-lg bg-slate-900/90 border border-slate-700/60 text-slate-400 hover:text-white hover:border-slate-500 transition-all text-sm font-medium select-none disabled:opacity-30";

  return (
    <div className="absolute bottom-5 right-4 flex flex-col items-end gap-1.5">
      <div className="flex flex-col gap-1">
        <button onClick={onIn} className={btn} title="Zoom in" disabled={zoom >= ZOOM_MAX}>+</button>
        <button onClick={onOut} className={btn} title="Zoom out" disabled={zoom <= ZOOM_MIN}>−</button>
        <button onClick={onReset} className={btn} title="Reset view">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
          </svg>
        </button>
      </div>
    </div>
  );
}

// ── State Panel ───────────────────────────────────────────────────────────────
const ALL_DISTRICTS = getAllDistricts();

function StatePanel({
  stateAbbr,
  onSelectDistrict,
  onClose,
}: {
  stateAbbr: string;
  onSelectDistrict: (id: string) => void;
  onClose: () => void;
}) {
  const stateName = STATE_NAMES[stateAbbr] ?? stateAbbr;
  const districts = ALL_DISTRICTS.filter((d) => d.districtId.startsWith(`${stateAbbr}-`));
  const rSeats = districts.filter((d) => d.data.party === "Republican" || d.data.caucus === "Republican").length;
  const dSeats = districts.filter((d) => d.data.party === "Democrat").length;
  const total = districts.length;
  const rPct = total > 0 ? (rSeats / total) * 100 : 0;
  const dPct = total > 0 ? (dSeats / total) * 100 : 0;

  return (
    <div
      className="absolute top-14 left-4 w-52 rounded-xl overflow-hidden z-20 flex flex-col"
      style={{
        backgroundColor: "rgba(13,17,23,0.95)",
        border: "1px solid rgba(51,65,85,0.6)",
        backdropFilter: "blur(12px)",
        maxHeight: "calc(100vh - 120px)",
        boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
      }}
    >
      {/* Header */}
      <div className="px-3 py-2.5 border-b border-slate-700/40 shrink-0 relative">
        <button
          onClick={onClose}
          title="Close"
          className="absolute top-2 right-2.5 text-slate-600 hover:text-slate-300 text-xs leading-none transition-colors"
        >
          ✕
        </button>
        <p className="text-white font-semibold text-[12px] leading-tight pr-5">{stateName}</p>
        <p className="text-slate-600 text-[10px] mt-0.5">{total} congressional district{total !== 1 ? "s" : ""}</p>
        {/* Seat bar */}
        <div className="flex h-2 rounded-full overflow-hidden mt-2 bg-slate-800">
          <div style={{ width: `${rPct}%`, backgroundColor: PARTY_COLORS.Republican }} />
          <div style={{ width: `${dPct}%`, backgroundColor: PARTY_COLORS.Democrat }} />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-red-400">{rSeats} R</span>
          <span className="text-[10px] text-blue-400">{dSeats} D</span>
        </div>
      </div>
      {/* District list */}
      <div className="overflow-y-auto flex-1">
        {districts.sort((a, b) => a.districtId.localeCompare(b.districtId)).map(({ districtId, data }) => {
          const color = PARTY_COLORS[data.party] ?? "#64748B";
          const [, num] = districtId.split("-");
          const label = AT_LARGE_STATES.has(stateAbbr) ? "AL" : String(parseInt(num ?? "0", 10));
          return (
            <button
              key={districtId}
              onClick={() => onSelectDistrict(districtId)}
              className="w-full flex items-center gap-2 px-3 py-2 text-left transition-colors border-b border-slate-800/40 last:border-0"
              style={{ fontSize: 11 }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(30,41,59,0.5)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}
            >
              <div className="w-1 h-4 rounded-full shrink-0" style={{ backgroundColor: color }} />
              <span className="text-slate-600 w-5 shrink-0 tabular-nums">{label}</span>
              <span className="text-slate-300 truncate text-[11px]">{data.repName.split(" ").slice(-1)[0]}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function computeAge(birthday: string): number {
  const born = new Date(birthday);
  const today = new Date();
  let age = today.getFullYear() - born.getFullYear();
  const m = today.getMonth() - born.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < born.getDate())) age--;
  return age;
}

type LegMeta = Record<string, { bioguide: string | null; birthday: string | null; twitter?: string | null }>;

const VALID_FILTER_MODES = new Set<string>(["party","margin","income","tenure","urban","college","poverty","age","committee"]);

// Pre-compute which filter modes have no data populated
const _allDistricts = getAllDistricts();
const NO_DATA_MODES: FilterMode[] = [];
if (!_allDistricts.some(d => d.data.urbanPct !== undefined))   NO_DATA_MODES.push("urban");
if (!_allDistricts.some(d => d.data.collegePct !== undefined)) NO_DATA_MODES.push("college");
if (!_allDistricts.some(d => d.data.povertyPct !== undefined)) NO_DATA_MODES.push("poverty");

// ── Main Component ────────────────────────────────────────────────────────────
export default function HouseMap() {
  const pathname = usePathname();
  const [filterMode, setFilterMode] = useState<FilterMode>("party");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState<[number, number]>([-98, 38]);
  const zoomRef = useRef(1);
  const centerRef = useRef<[number, number]>([-98, 38]);
  useEffect(() => { zoomRef.current = zoom; }, [zoom]);
  useEffect(() => { centerRef.current = center; }, [center]);
  const [mapReady, setMapReady] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [focusedState, setFocusedState] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [legMeta, setLegMeta] = useState<LegMeta>({});
  const [mapCommittees, setMapCommittees] = useState<Record<string, string[]>>({});
  const [committeeList, setCommitteeList] = useState<string[]>([]);
  const [selectedCommittee, setSelectedCommittee] = useState<string | null>(null);

  // Load legislator meta (for age filter)
  useEffect(() => {
    fetch("/legislator-meta.json").then(r => r.json()).then(setLegMeta).catch(() => {});
  }, []);

  // Load committee data (for committee filter)
  useEffect(() => {
    fetch("/committees.json")
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return;
        setMapCommittees(data.districts ?? {});
        setCommitteeList(data.committees ?? []);
      })
      .catch(() => {});
  }, []);

  // Sync selectedId + filterMode → URL
  useEffect(() => {
    const params = new URLSearchParams();
    if (selectedId) params.set("d", selectedId);
    if (filterMode !== "party") params.set("f", filterMode);
    const query = params.toString();
    history.replaceState({}, "", query ? `${window.location.pathname}?${query}` : window.location.pathname);
  }, [selectedId, filterMode]);

  // On mount: read ?d=XX-NN, ?s=XX, ?f=filterMode from URL
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const d = sp.get("d");
    if (d && getDistrictData(d)) {
      setSelectedId(d);
      // Auto-zoom to the district's state
      const stateCode = d.split("-")[0];
      const view = STATE_VIEW[stateCode];
      if (view) { setZoom(view.zoom); setCenter(view.center); }
    }
    const s = sp.get("s")?.toUpperCase();
    if (s && STATE_NAMES[s]) {
      setFocusedState(s);
      const view = STATE_VIEW[s];
      if (view) { setZoom(view.zoom); setCenter(view.center); }
    }
    const f = sp.get("f");
    if (f && VALID_FILTER_MODES.has(f)) setFilterMode(f as FilterMode);
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", h);
    return () => window.removeEventListener("mousemove", h);
  }, []);

  // Fullscreen via browser API
  useEffect(() => {
    const onChange = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
    } else {
      document.exitFullscreen().catch(() => {});
    }
  };

  const handleMoveEnd = useCallback(
    ({ zoom: z, coordinates }: { zoom: number; coordinates: [number, number] }) => {
      setZoom(z);
      setCenter(coordinates);
    },
    []
  );

  const handleZoomIn = () => setZoom((z) => Math.min(z * 1.6, ZOOM_MAX));
  const handleZoomOut = () => setZoom((z) => Math.max(z / 1.6, ZOOM_MIN));
  const handleReset = () => { setZoom(1); setCenter([-98, 38]); };

  const handleExportCSV = () => {
    const allStates = Object.keys(STATE_NAMES) as string[];
    const rows: string[] = [
      "District,Representative,Party,Margin (%),Median Income ($K),Computed PVI,Term Start,Years Served,Urban %,College %,Poverty %",
    ];
    for (const state of allStates) {
      const numSeats = getStateSeats(state);
      const atLarge = AT_LARGE_STATES.has(state);
      const districts = atLarge ? [0] : Array.from({ length: numSeats }, (_, i) => i + 1);
      for (const d of districts) {
        const id = `${state}-${String(d).padStart(2, "0")}`;
        const data = getDistrictData(id);
        if (!data) continue;
        const pviStr = data.pvi === 0 ? "EVEN" : data.pvi > 0 ? `R+${data.pvi}` : `D+${Math.abs(data.pvi)}`;
        const years = Math.max(0, 2026 - data.termStart);
        const repName = data.repName.includes(",") ? `"${data.repName}"` : data.repName;
        const urban = data.urbanPct ?? "";
        const college = data.collegePct ?? "";
        const poverty = data.povertyPct ?? "";
        rows.push(`${id},${repName},${data.party},${data.margin},${data.income},${pviStr},${data.termStart},${years},${urban},${college},${poverty}`);
      }
    }
    const blob = new Blob([rows.join("\n")], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "housemap-districts.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadedRef = useRef(false);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = mapContainerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      e.stopPropagation();

      const rect = el.getBoundingClientRect();
      // Convert cursor position from screen pixels → SVG coordinate space
      const svgX = (e.clientX - rect.left) * (SVG_W / rect.width);
      const svgY = (e.clientY - rect.top) * (SVG_H / rect.height);

      const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
      const prevZoom = zoomRef.current;
      const prevCenter = centerRef.current;
      const newZoom = Math.min(Math.max(prevZoom * factor, ZOOM_MIN), ZOOM_MAX);

      // Project current center to base SVG coords, compute cursor's geographic position,
      // then find the new center that keeps the cursor fixed after the zoom change.
      const cp = MAP_PROJ(prevCenter);
      if (cp) {
        const cursorProjX = (svgX - SVG_W / 2) / prevZoom + cp[0];
        const cursorProjY = (svgY - SVG_H / 2) / prevZoom + cp[1];
        const newCenterProj: [number, number] = [
          cursorProjX - (svgX - SVG_W / 2) / newZoom,
          cursorProjY - (svgY - SVG_H / 2) / newZoom,
        ];
        const newCenter = MAP_PROJ.invert?.(newCenterProj);
        if (newCenter) setCenter(newCenter as [number, number]);
      }
      setZoom(newZoom);

    };
    // capture:true fires before ZoomableGroup's own wheel listener, so stopPropagation
    // prevents the default zoom-to-center behaviour and we handle it ourselves.
    el.addEventListener("wheel", handler, { passive: false, capture: true });
    return () => el.removeEventListener("wheel", handler, { capture: true });
  }, []);
  const parseGeographies = useCallback((geos: Record<string, unknown>[]) => {
    if (geos.length > 0 && !loadedRef.current) {
      loadedRef.current = true;
      setTimeout(() => setMapReady(true), 0);
    }
    return geos;
  }, []);

  const selectedData = selectedId ? getDistrictData(selectedId) : null;
  const selectedRepName = selectedId ? getRepName(selectedId) : null;

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden" style={{ backgroundColor: "#0a0e14" }}>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header
        className="flex items-center justify-between px-5 py-2.5 shrink-0 z-40"
        style={{
          backgroundColor: "#0d1117",
          borderBottom: "1px solid rgba(30,41,59,0.8)",
        }}
      >
        {/* Logo */}
        <div className="flex items-center gap-3 shrink-0">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0"
            style={{ background: "linear-gradient(135deg, #1e3a5f, #1e40af)" }}
          >
            🏛
          </div>
          <div>
            <h1 className="text-white font-bold text-sm leading-tight tracking-tight">
              HouseMap
            </h1>
            <p className="text-slate-600 text-[10px]">119th Congress</p>
          </div>
        </div>

        {/* Seat bar (center) */}
        <SeatBar />

        {/* Right controls */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Nav links */}
          <div className="hidden md:flex items-center gap-0.5">
            {[
              { href: "/house", label: "Map" },
              { href: "/rankings", label: "Rankings" },
              { href: "/compare", label: "Compare" },
              { href: "/graph", label: "Graph" },
            ].map(({ href, label }) => {
              const active = pathname === href;
              return (
                <a
                  key={href}
                  href={href}
                  className="px-2 py-1 rounded text-[10px] font-medium transition-colors"
                  style={{ color: active ? "#a5b4fc" : "#64748b", backgroundColor: active ? "rgba(99,102,241,0.12)" : "transparent" }}
                  onMouseEnter={e => { if (!active) (e.currentTarget as HTMLAnchorElement).style.color = "#cbd5e1"; }}
                  onMouseLeave={e => { if (!active) (e.currentTarget as HTMLAnchorElement).style.color = "#64748b"; }}
                >
                  {label}
                </a>
              );
            })}
          </div>
          <SearchBar
            onSelect={(id) => setSelectedId(id)}
            onFocusState={(abbr) => {
              setFocusedState(abbr);
              const view = STATE_VIEW[abbr];
              if (view) { setZoom(view.zoom); setCenter(view.center); }
              setSelectedId(null);
              setShowProfile(false);
              history.replaceState({}, "", `?s=${abbr}`);
            }}
          />
          {/* Export CSV */}
          <button
            onClick={handleExportCSV}
            title="Export all district data as CSV"
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-300 transition-colors shrink-0"
            style={{ backgroundColor: "rgba(15,23,42,0.7)", border: "1px solid rgba(30,41,59,0.9)" }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>

          {/* Fullscreen button */}
          <button
            onClick={toggleFullscreen}
            title={fullscreen ? "Exit fullscreen" : "Fullscreen"}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-500 hover:text-slate-300 transition-colors shrink-0"
            style={{ backgroundColor: "rgba(15,23,42,0.7)", border: "1px solid rgba(30,41,59,0.9)" }}
          >
            {fullscreen ? (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9L4 4m0 0v5m0-5h5M15 9l5-5m0 0v5m0-5h-5M9 15l-5 5m0 0v-5m0 5h5M15 15l5 5m0 0v-5m0 5h-5" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
              </svg>
            )}
          </button>
        </div>
      </header>

      {/* ── Filter Tabs ─────────────────────────────────────────────────── */}
      <FilterTabs
        filterMode={filterMode}
        onModeChange={(m) => { setFilterMode(m); if (m !== "committee") setSelectedCommittee(null); }}
        noDataModes={NO_DATA_MODES}
      />

      {/* ── Committee secondary picker ──────────────────────────────────── */}
      {filterMode === "committee" && (
        <div
          className="flex items-center gap-3 px-4 py-2 shrink-0 flex-wrap"
          style={{ backgroundColor: "#0d1117", borderBottom: "1px solid rgba(30,41,59,0.8)" }}
        >
          <span className="text-[10px] font-bold text-slate-600 uppercase tracking-widest select-none">
            Committee
          </span>
          {committeeList.length > 0 ? (
            <>
              <select
                value={selectedCommittee ?? ""}
                onChange={(e) => setSelectedCommittee(e.target.value || null)}
                style={{
                  backgroundColor: selectedCommittee ? "rgba(99,102,241,0.18)" : "rgba(15,23,42,0.7)",
                  color: selectedCommittee ? "#a5b4fc" : "#64748b",
                  border: selectedCommittee ? "1px solid rgba(99,102,241,0.4)" : "1px solid rgba(30,41,59,0.9)",
                  borderRadius: "0.5rem",
                  padding: "4px 10px",
                  fontSize: "11px",
                  fontWeight: 500,
                  outline: "none",
                  cursor: "pointer",
                  maxWidth: "300px",
                }}
              >
                <option value="" style={{ backgroundColor: "#0d1117" }}>Select a committee…</option>
                {committeeList.map((c) => (
                  <option key={c} value={c} style={{ backgroundColor: "#0d1117" }}>{c}</option>
                ))}
              </select>
              {selectedCommittee && (
                <button
                  onClick={() => setSelectedCommittee(null)}
                  className="text-[11px] text-slate-600 hover:text-slate-400 transition-colors"
                >
                  Clear
                </button>
              )}
            </>
          ) : (
            <span className="text-[11px] text-amber-600/80">
              Run <code className="font-mono text-amber-500">scripts/fetch-committees.mjs</code> then{" "}
              <code className="font-mono text-amber-500">scripts/apply-committees.mjs</code> to enable
            </span>
          )}
        </div>
      )}

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Map area */}
        <div ref={mapContainerRef} className="flex-1 relative min-w-0" style={{ backgroundColor: "#0a0e14" }}>
          {/* Loading overlay */}
          {!mapReady && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
              <div
                className="w-10 h-10 rounded-full border-2 animate-spin mb-4"
                style={{
                  borderColor: "rgba(99,102,241,0.2)",
                  borderTopColor: "#818cf8",
                }}
              />
              <p className="text-slate-500 text-sm font-medium">Loading districts…</p>
              <p className="text-slate-700 text-xs mt-1">Loading district boundaries…</p>
            </div>
          )}

          <ComposableMap
            projection="geoAlbersUsa"
            projectionConfig={{ scale: 900 }}
            width={800}
            height={500}
            style={{ width: "100%", height: "100%", display: "block" }}
          >
            <ZoomableGroup
              zoom={zoom}
              center={center}
              onMoveEnd={handleMoveEnd}
              minZoom={ZOOM_MIN}
              maxZoom={ZOOM_MAX}
            >
              <Geographies geography={DISTRICTS_URL} parseGeographies={parseGeographies}>
                {({ geographies }) =>
                  geographies.map((geo) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const props = (geo as any).properties ?? {};
                    const id = toDistrictId(props.STATEFP, props.CD119FP ?? props.CD118FP);
                    if (!id) return null;

                    const data = getDistrictData(id) ?? {
                      party: "Unknown" as const,
                      margin: 0,
                      income: 65,
                      pvi: 0,
                      termStart: 2025,
                      repName: "Vacant",
                    };
                    const isSelected = id === selectedId;
                    const isHovered = id === hoveredId;
                    const isVacant = data.party === "Vacant";

                    const metaEntry = legMeta[id];
                    const repAge = metaEntry?.birthday ? computeAge(metaEntry.birthday) : undefined;

                    const fill = (() => {
                      if (filterMode === "committee") {
                        const base = PARTY_COLORS[data.party] ?? PARTY_COLORS.Unknown;
                        if (!selectedCommittee || Object.keys(mapCommittees).length === 0) {
                          return `${base}28`; // dim hint — select a committee
                        }
                        const onCommittee = (mapCommittees[id] ?? []).includes(selectedCommittee);
                        return onCommittee ? base : "#0c1520";
                      }
                      return getDistrictColor(
                        filterMode,
                        data.party,
                        data.margin,
                        data.income,
                        Math.max(0, 2026 - data.termStart),
                        data.urbanPct,
                        data.collegePct,
                        data.povertyPct,
                        repAge,
                      );
                    })();

                    const stroke = isSelected
                      ? "#FFFFFF"
                      : isHovered
                      ? "#94a3b8"
                      : isVacant
                      ? "#78350f"
                      : "#0a0e14";
                    const strokeWidth = isSelected
                      ? 2 / zoom
                      : isHovered
                      ? 1 / zoom
                      : isVacant
                      ? 0.8 / zoom
                      : 0.35 / zoom;

                    return (
                      <Geography
                        // eslint-disable-next-line @typescript-eslint/no-explicit-any
                        key={(geo as any).rsmKey ?? id}
                        geography={geo}
                        fill={fill}
                        stroke={stroke}
                        strokeWidth={strokeWidth}
                        onMouseEnter={() => setHoveredId(id)}
                        onMouseLeave={() => setHoveredId(null)}
                        onClick={() => setSelectedId((prev) => (prev === id ? null : id))}
                        style={{
                          default: { outline: "none", transition: "fill 0.3s ease" },
                          hover: { outline: "none", cursor: "pointer" },
                          pressed: { outline: "none" },
                        }}
                      />
                    );
                  })
                }
              </Geographies>
            </ZoomableGroup>
          </ComposableMap>

          {/* Zoom controls */}
          <ZoomControls
            zoom={zoom}
            onIn={handleZoomIn}
            onOut={handleZoomOut}
            onReset={handleReset}
          />

          {/* Legend */}
          <MapLegend mode={filterMode} />

          {/* State panel */}
          {focusedState && !selectedId && (
            <StatePanel
              stateAbbr={focusedState}
              onSelectDistrict={(id) => setSelectedId(id)}
              onClose={() => {
                setFocusedState(null);
                setZoom(1);
                setCenter([-98, 38]);
                history.replaceState({}, "", window.location.pathname);
              }}
            />
          )}
        </div>

        {/* District Panel */}
        {selectedId && selectedData && selectedRepName && (
          <DistrictPanel
            districtId={selectedId}
            repName={selectedRepName}
            data={selectedData}
            onClose={() => { setSelectedId(null); setShowProfile(false); }}
            onShowProfile={() => setShowProfile(true)}
          />
        )}
      </div>

      {/* Tooltip */}
      {hoveredId && !selectedId && (
        <Tooltip
          districtId={hoveredId}
          x={mousePos.x}
          y={mousePos.y}
          filterMode={filterMode}
          repAge={legMeta[hoveredId]?.birthday ? computeAge(legMeta[hoveredId].birthday!) : undefined}
          committeeFilter={selectedCommittee}
          districtCommittees={mapCommittees[hoveredId]}
        />
      )}

      {/* Full Profile Overlay */}
      {showProfile && selectedId && selectedData && selectedRepName && (
        <RepProfile
          districtId={selectedId}
          repName={selectedRepName}
          data={selectedData}
          onClose={() => setShowProfile(false)}
        />
      )}
    </div>
  );
}
