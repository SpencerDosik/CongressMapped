"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from "react-simple-maps";

import FilterTabs from "./FilterTabs";
import DistrictPanel from "./DistrictPanel";
import MapLegend from "./MapLegend";

import { FilterMode } from "@/lib/types";
import { getDistrictColor, PARTY_COLORS } from "@/lib/colors";
import { getDistrictData, getRepName } from "@/lib/districtData";
import { toDistrictId, STATE_NAMES, AT_LARGE_STATES } from "@/lib/stateFips";

// ── Constants ─────────────────────────────────────────────────────────────────
const DISTRICTS_URL = "/districts.json";
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 25;
const R_SEATS = 220;
const D_SEATS = 215;
const TOTAL_SEATS = 435;
const MAJORITY = 218;

// ── Seat Composition Bar ──────────────────────────────────────────────────────
function SeatBar() {
  const rPct = (R_SEATS / TOTAL_SEATS) * 100;
  const dPct = (D_SEATS / TOTAL_SEATS) * 100;
  const majorityPct = (MAJORITY / TOTAL_SEATS) * 100;

  return (
    <div className="flex flex-col items-center gap-1 select-none">
      <div className="flex items-center gap-3">
        {/* R count */}
        <div className="text-right">
          <span className="text-red-400 font-bold text-sm tabular-nums">{R_SEATS}</span>
          <span className="text-slate-600 text-[10px] ml-1">R</span>
        </div>

        {/* Bar */}
        <div className="relative w-52 h-3 rounded-full overflow-visible bg-slate-800">
          <div
            className="absolute left-0 top-0 h-full rounded-l-full"
            style={{ width: `${rPct}%`, backgroundColor: "#DC2626" }}
          />
          <div
            className="absolute right-0 top-0 h-full rounded-r-full"
            style={{ width: `${dPct}%`, backgroundColor: "#2563EB" }}
          />
          {/* Majority threshold line */}
          <div
            className="absolute top-1/2 -translate-y-1/2 w-0.5 h-5 bg-slate-400/80 rounded-full z-10"
            style={{ left: `${majorityPct}%` }}
          >
            <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 text-[9px] text-slate-500 whitespace-nowrap">
              218
            </div>
          </div>
        </div>

        {/* D count */}
        <div className="text-left">
          <span className="text-slate-600 text-[10px] mr-1">D</span>
          <span className="text-blue-400 font-bold text-sm tabular-nums">{D_SEATS}</span>
        </div>
      </div>
    </div>
  );
}

// ── Search Bar ────────────────────────────────────────────────────────────────
function SearchBar({
  onSelect,
}: {
  onSelect: (id: string) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: string; name: string; state: string }[]>([]);
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
      setOpen(false);
      return;
    }

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
    setOpen(matches.length > 0);
  }, [query]);

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
          onFocus={() => results.length > 0 && setOpen(true)}
          className="bg-transparent text-slate-300 text-xs placeholder-slate-600 outline-none w-full"
        />
        {query && (
          <button
            onClick={() => { setQuery(""); setResults([]); setOpen(false); }}
            className="text-slate-600 hover:text-slate-400 text-xs leading-none"
          >
            ✕
          </button>
        )}
      </div>

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full mt-1 right-0 w-64 bg-slate-900 border border-slate-700/60 rounded-xl shadow-2xl shadow-black/50 overflow-hidden z-50">
          {results.map(({ id, name, state }) => {
            const d = getDistrictData(id);
            const party = d?.party ?? "Unknown";
            const color = PARTY_COLORS[party] ?? "#64748B";
            return (
              <button
                key={id}
                onClick={() => {
                  onSelect(id);
                  setQuery("");
                  setResults([]);
                  setOpen(false);
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-800 transition-colors text-left"
              >
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: color }}
                />
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
  const zoomLevel = zoom < 1.05 ? "Overview" : zoom < 3 ? "Regional" : zoom < 8 ? "State" : "District";

  return (
    <div className="absolute bottom-5 right-4 flex flex-col items-end gap-1.5">
      <span className="text-slate-700 text-[10px] select-none">{zoomLevel}</span>
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
  const [center, setCenter] = useState<[number, number]>([0, 0]);
  const [mapReady, setMapReady] = useState(false);

  useEffect(() => {
    const h = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", h);
    return () => window.removeEventListener("mousemove", h);
  }, []);

  const handleMoveEnd = useCallback(
    ({ zoom: z, coordinates }: { zoom: number; coordinates: [number, number] }) => {
      setZoom(z);
      setCenter(coordinates);
    },
    []
  );

  const handleZoomIn = () => setZoom((z) => Math.min(z * 1.6, ZOOM_MAX));
  const handleZoomOut = () => setZoom((z) => Math.max(z / 1.6, ZOOM_MIN));
  const handleReset = () => { setZoom(1); setCenter([0, 0]); };

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
              House Visualizer
            </h1>
            <p className="text-slate-600 text-[10px]">119th Congress</p>
          </div>
        </div>

        {/* Seat bar (center) */}
        <SeatBar />

        {/* Search + hint */}
        <div className="flex items-center gap-4 shrink-0">
          <SearchBar onSelect={(id) => setSelectedId(id)} />
          <span className="text-slate-700 text-[10px] hidden lg:block">
            Click · Hover · Scroll
          </span>
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
                    const id = toDistrictId(props.STATEFP, props.CD118FP);
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

                    const fill = getDistrictColor(
                      filterMode,
                      data.party,
                      data.margin,
                      data.income,
                      data.pvi,
                      Math.max(0, 2026 - data.termStart)
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

          {/* Zoom controls */}
          <ZoomControls
            zoom={zoom}
            onIn={handleZoomIn}
            onOut={handleZoomOut}
            onReset={handleReset}
          />

          {/* Legend */}
          <MapLegend mode={filterMode} />
        </div>

        {/* District Panel */}
        {selectedId && selectedData && selectedRepName && (
          <DistrictPanel
            districtId={selectedId}
            repName={selectedRepName}
            data={selectedData}
            onClose={() => setSelectedId(null)}
          />
        )}
      </div>

      {/* Tooltip */}
      {hoveredId && !selectedId && (
        <Tooltip districtId={hoveredId} x={mousePos.x} y={mousePos.y} />
      )}
    </div>
  );
}
