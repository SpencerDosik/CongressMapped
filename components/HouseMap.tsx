"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from "react-simple-maps";
// eslint-disable-next-line @typescript-eslint/no-require-imports
const { Annotation } = require("react-simple-maps") as { Annotation: React.ComponentType<{ subject: [number, number]; dx: number; dy: number; connectorProps: object; children: React.ReactNode }> };
import { geoCentroid } from "d3-geo";
import React from "react";

import FilterTabs from "./FilterTabs";
import DistrictPanel from "./DistrictPanel";
import MapLegend from "./MapLegend";
import RepProfile from "./RepProfile";

import { FilterMode } from "@/lib/types";
import { getDistrictColor, PARTY_COLORS } from "@/lib/colors";
import { getDistrictData, getRepName } from "@/lib/districtData";
import { toDistrictId, STATE_NAMES, AT_LARGE_STATES, FIPS_TO_STATE, STATE_TO_FIPS } from "@/lib/stateFips";

// ── Constants ─────────────────────────────────────────────────────────────────
const DISTRICTS_URL = "/districts.json";
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 25;
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
  onIsolate,
}: {
  onSelect: (id: string) => void;
  onIsolate: (abbr: string) => void;
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

    // State isolation candidates: exact abbreviation or name prefix
    const isolateCandidates = Object.entries(STATE_NAMES)
      .filter(([abbr, name]) =>
        abbr.toLowerCase() === q || name.toLowerCase().startsWith(q)
      )
      .map(([abbr, name]) => ({ abbr, name }))
      .slice(0, 4);
    setStateMatches(isolateCandidates);

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
    setOpen(isolateCandidates.length > 0 || matches.length > 0);
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

          {/* State isolation buttons */}
          {stateMatches.map(({ abbr, name }) => (
            <button
              key={abbr}
              onClick={() => { onIsolate(abbr); clear(); }}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-indigo-900/40 transition-colors text-left border-b border-slate-800/60"
              style={{ borderBottom: "1px solid rgba(30,41,59,0.8)" }}
            >
              <svg className="w-3 h-3 text-indigo-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.069A1 1 0 0121 8.87v6.26a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span className="text-indigo-300 text-xs font-medium">Isolate {name}</span>
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
function Tooltip({ districtId, x, y }: { districtId: string; x: number; y: number }) {
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
  const marginLabel = data.margin === 0 ? "Toss-up" : `${data.margin > 0 ? "R" : "D"} +${marginAbs}%`;

  const tipW = 210;
  const left = x + tipW + 20 > window.innerWidth ? x - tipW - 8 : x + 14;
  const top = y - 8;

  return (
    <div className="fixed pointer-events-none z-50" style={{ left, top, transform: "translateY(-100%)" }}>
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
            <span className="text-slate-600">2024 Margin</span>
            <span className="font-semibold" style={{ color: data.margin >= 0 ? PARTY_COLORS.Republican : PARTY_COLORS.Democrat }}>
              {marginLabel}
            </span>
          </div>
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

// ── Main Component ────────────────────────────────────────────────────────────
export default function HouseMap() {
  const [filterMode, setFilterMode] = useState<FilterMode>("party");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState<[number, number]>([-98, 38]);
  const [mapReady, setMapReady] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [isolatedState, setIsolatedState] = useState<string | null>(null);
  const [fullscreen, setFullscreen] = useState(false);
  const [showDistrictLabels, setShowDistrictLabels] = useState(true);
  const [showStateLabels, setShowStateLabels] = useState(false);
  const [districtStats, setDistrictStats] = useState<Record<string, { age?: number; education?: number; poverty?: number }>>({});

  // Load district stats for age/education/poverty filters
  useEffect(() => {
    fetch("/district-stats.json")
      .then((r) => r.json())
      .then(setDistrictStats)
      .catch(() => {});
  }, []);

  // Sync selectedId → URL
  useEffect(() => {
    const url = selectedId ? `?d=${selectedId}` : window.location.pathname;
    history.replaceState({}, "", url);
  }, [selectedId]);

  // On mount: read ?d=XX-NN from URL and open that district
  useEffect(() => {
    const param = new URLSearchParams(window.location.search).get("d");
    if (param && getDistrictData(param)) setSelectedId(param);
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
    const rows: string[] = ["District,Representative,Party,Margin (%),Median Income ($K),Computed PVI,Term Start,Years Served"];
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
        rows.push(`${id},${repName},${data.party},${data.margin},${data.income},${pviStr},${data.termStart},${years}`);
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
          {/* Label toggles */}
          <div className="hidden md:flex items-center gap-1">
            <button
              onClick={() => setShowDistrictLabels((v) => !v)}
              title="Toggle district number labels"
              className="px-2 py-1 rounded text-[10px] font-medium transition-all"
              style={{
                backgroundColor: showDistrictLabels ? "rgba(99,102,241,0.2)" : "rgba(15,23,42,0.7)",
                border: showDistrictLabels ? "1px solid rgba(99,102,241,0.4)" : "1px solid rgba(30,41,59,0.9)",
                color: showDistrictLabels ? "#a5b4fc" : "#64748b",
              }}
            >
              #
            </button>
            <button
              onClick={() => setShowStateLabels((v) => !v)}
              title="Toggle state name labels"
              className="px-2 py-1 rounded text-[10px] font-medium transition-all"
              style={{
                backgroundColor: showStateLabels ? "rgba(99,102,241,0.2)" : "rgba(15,23,42,0.7)",
                border: showStateLabels ? "1px solid rgba(99,102,241,0.4)" : "1px solid rgba(30,41,59,0.9)",
                color: showStateLabels ? "#a5b4fc" : "#64748b",
              }}
            >
              ST
            </button>
          </div>
          <SearchBar
            onSelect={(id) => setSelectedId(id)}
            onIsolate={(abbr) => {
              setIsolatedState(abbr);
              const view = STATE_VIEW[abbr];
              if (view) { setZoom(view.zoom); setCenter(view.center); }
              setSelectedId(null);
              setShowProfile(false);
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
      <FilterTabs filterMode={filterMode} onModeChange={setFilterMode} />

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">

        {/* Map area */}
        <div className="flex-1 relative min-w-0" style={{ backgroundColor: "#0a0e14" }}>
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
                    if (isolatedState && props.STATEFP !== STATE_TO_FIPS[isolatedState]) return null;

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

                    const dStats = districtStats[id];
                    const fill = getDistrictColor(
                      filterMode,
                      data.party,
                      data.margin,
                      data.income,
                      data.pvi,
                      Math.max(0, 2026 - data.termStart),
                      dStats?.age,
                      dStats?.education,
                      dStats?.poverty,
                    );

                    const stroke = isSelected
                      ? "#FFFFFF"
                      : isHovered
                      ? "#94a3b8"
                      : "#0a0e14";
                    const strokeWidth = isSelected
                      ? 2 / zoom
                      : isHovered
                      ? 1 / zoom
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

          {/* District number labels (shown at zoom ≥ 4) */}
          {showDistrictLabels && zoom >= 4 && (
            <ComposableMap
              projection="geoAlbersUsa"
              projectionConfig={{ scale: 900 }}
              width={800}
              height={500}
              style={{ width: "100%", height: "100%", display: "block", position: "absolute", inset: 0, pointerEvents: "none" }}
            >
              <ZoomableGroup zoom={zoom} center={center} minZoom={ZOOM_MIN} maxZoom={ZOOM_MAX}>
                <Geographies geography={DISTRICTS_URL}>
                  {({ geographies }) =>
                    geographies.map((geo) => {
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const props = (geo as any).properties ?? {};
                      const id = toDistrictId(props.STATEFP, props.CD119FP ?? props.CD118FP);
                      if (!id) return null;
                      if (isolatedState && props.STATEFP !== STATE_TO_FIPS[isolatedState]) return null;
                      const [stateCode, rawNum] = id.split("-");
                      const districtNum = parseInt(rawNum ?? "0", 10);
                      if (!districtNum) return null;
                      const atLarge = AT_LARGE_STATES.has(stateCode);
                      const label = atLarge ? "AL" : String(districtNum);
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      const centroid = geoCentroid(geo as any);
                      if (!centroid || !isFinite(centroid[0]) || !isFinite(centroid[1])) return null;
                      const fontSize = Math.max(1.5, Math.min(4, 8 / zoom));
                      return (
                        <Annotation
                          // eslint-disable-next-line @typescript-eslint/no-explicit-any
                          key={(geo as any).rsmKey + "-label"}
                          subject={centroid}
                          dx={0}
                          dy={0}
                          connectorProps={{}}
                        >
                          <text
                            textAnchor="middle"
                            dominantBaseline="central"
                            style={{ fontSize, fill: "rgba(255,255,255,0.55)", fontWeight: 600, pointerEvents: "none", userSelect: "none", fontFamily: "system-ui, sans-serif" }}
                          >
                            {label}
                          </text>
                        </Annotation>
                      );
                    })
                  }
                </Geographies>
              </ZoomableGroup>
            </ComposableMap>
          )}

          {/* State name labels (shown at zoom < 4 when enabled) */}
          {showStateLabels && zoom < 4 && (
            <ComposableMap
              projection="geoAlbersUsa"
              projectionConfig={{ scale: 900 }}
              width={800}
              height={500}
              style={{ width: "100%", height: "100%", display: "block", position: "absolute", inset: 0, pointerEvents: "none" }}
            >
              <ZoomableGroup zoom={zoom} center={center} minZoom={ZOOM_MIN} maxZoom={ZOOM_MAX}>
                {Object.entries(STATE_ABBR_CENTROIDS).map(([abbr, centroid]) => {
                  if (isolatedState && abbr !== isolatedState) return null;
                  const fontSize = Math.max(2.5, Math.min(6, 5 / zoom));
                  return (
                    <Annotation key={abbr} subject={centroid as [number, number]} dx={0} dy={0} connectorProps={{}}>
                      <text
                        textAnchor="middle"
                        dominantBaseline="central"
                        style={{ fontSize, fill: "rgba(255,255,255,0.45)", fontWeight: 700, pointerEvents: "none", userSelect: "none", fontFamily: "system-ui, sans-serif", letterSpacing: "0.05em" }}
                      >
                        {abbr}
                      </text>
                    </Annotation>
                  );
                })}
              </ZoomableGroup>
            </ComposableMap>
          )}

          {/* Zoom controls */}
          <ZoomControls
            zoom={zoom}
            onIn={handleZoomIn}
            onOut={handleZoomOut}
            onReset={handleReset}
          />

          {/* Legend */}
          <MapLegend mode={filterMode} />

          {/* Isolation exit button */}
          {isolatedState && (
            <button
              onClick={() => { setIsolatedState(null); setZoom(1); setCenter([-98, 38]); }}
              className="absolute top-4 left-4 flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-all z-20"
              style={{
                backgroundColor: "rgba(13,17,23,0.92)",
                border: "1px solid rgba(99,102,241,0.5)",
                color: "#a5b4fc",
                backdropFilter: "blur(8px)",
              }}
            >
              ← All States
            </button>
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
        <Tooltip districtId={hoveredId} x={mousePos.x} y={mousePos.y} />
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
