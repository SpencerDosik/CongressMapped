"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from "react-simple-maps";

import FilterBar from "./FilterBar";
import DistrictPanel from "./DistrictPanel";
import MapLegend from "./MapLegend";

import { FilterMode } from "@/lib/types";
import { getDistrictColor, PARTY_COLORS } from "@/lib/colors";
import { getMockDistrictData, getMockRepName } from "@/lib/mockData";
import { toDistrictId, formatDistrict, STATE_NAMES, AT_LARGE_STATES } from "@/lib/stateFips";

const DISTRICTS_URL = "/api/districts";

const ZOOM_MIN = 0.5;
const ZOOM_MAX = 25;

// ── Tooltip ──────────────────────────────────────────────────────────────────
function Tooltip({
  districtId,
  x,
  y,
}: {
  districtId: string;
  x: number;
  y: number;
}) {
  const data = getMockDistrictData(districtId);
  const repName = getMockRepName(districtId);
  const [stateCode, rawNum] = districtId.split("-");
  const districtNum = parseInt(rawNum ?? "0", 10);
  const stateName = STATE_NAMES[stateCode] ?? stateCode;
  const isAtLarge = districtNum === 0 || AT_LARGE_STATES.has(stateCode);
  const districtLabel = isAtLarge
    ? "At-Large"
    : `${districtNum === 1 ? "1st" : districtNum === 2 ? "2nd" : districtNum === 3 ? "3rd" : `${districtNum}th`} District`;

  const partyColor = PARTY_COLORS[data.party] ?? "#64748B";
  const marginLabel =
    data.margin === 0
      ? "Toss-up"
      : `${data.margin > 0 ? "R" : "D"} +${Math.abs(data.margin)}%`;

  // Keep tooltip inside viewport
  const tipW = 200;
  const left = x + tipW + 20 > window.innerWidth ? x - tipW - 8 : x + 12;
  const top = y - 8;

  return (
    <div
      className="fixed pointer-events-none z-50"
      style={{ left, top, transform: "translateY(-100%)" }}
    >
      <div className="bg-slate-900 border border-slate-700/80 rounded-xl shadow-2xl shadow-black/50 overflow-hidden"
           style={{ width: tipW }}>
        {/* Party bar */}
        <div className="h-0.5" style={{ backgroundColor: partyColor }} />
        <div className="px-3 py-2.5">
          <div className="flex items-center gap-1.5 mb-1">
            <div
              className="w-2 h-2 rounded-full shrink-0"
              style={{ backgroundColor: partyColor }}
            />
            <p className="text-white text-xs font-semibold truncate">{repName}</p>
          </div>
          <p className="text-slate-400 text-[11px]">
            {stateName} · {districtLabel}
          </p>
          <div className="mt-1.5 pt-1.5 border-t border-slate-700/50 flex justify-between text-[11px]">
            <span className="text-slate-500">Margin</span>
            <span
              className="font-semibold"
              style={{ color: data.margin >= 0 ? PARTY_COLORS.Republican : PARTY_COLORS.Democrat }}
            >
              {marginLabel}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Zoom controls ─────────────────────────────────────────────────────────────
function ZoomControls({
  zoom,
  onIn,
  onOut,
  onReset,
}: {
  zoom: number;
  onIn: () => void;
  onOut: () => void;
  onReset: () => void;
}) {
  const btnClass =
    "w-8 h-8 flex items-center justify-center bg-slate-800 border border-slate-700/70 text-slate-300 hover:text-white hover:bg-slate-700 transition-colors rounded text-sm font-medium select-none";

  return (
    <div className="absolute bottom-6 right-5 flex flex-col gap-1">
      <button onClick={onIn} className={btnClass} title="Zoom in" disabled={zoom >= ZOOM_MAX}>
        +
      </button>
      <button onClick={onOut} className={btnClass} title="Zoom out" disabled={zoom <= ZOOM_MIN}>
        −
      </button>
      <div className="h-px bg-slate-700 mx-1" />
      <button onClick={onReset} className={btnClass} title="Reset view">
        ⊙
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────
export default function HouseMap() {
  const [filterMode, setFilterMode] = useState<FilterMode>("party");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState<[number, number]>([0, 0]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mapReady, setMapReady] = useState(false);

  // Track mouse globally for tooltip
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
  const handleReset = () => {
    setZoom(1);
    setCenter([0, 0]);
  };

  // Detect first load (parseGeographies fires during render — use a ref)
  const loadedRef = useRef(false);
  const parseGeographies = useCallback(
    (geos: Record<string, unknown>[]) => {
      if (geos.length > 0 && !loadedRef.current) {
        loadedRef.current = true;
        setTimeout(() => setMapReady(true), 0);
      }
      return geos;
    },
    []
  );

  const selectedData = selectedId ? getMockDistrictData(selectedId) : null;
  const selectedRepName = selectedId ? getMockRepName(selectedId) : null;

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden bg-slate-900">
      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="flex items-center justify-between px-5 py-3 bg-slate-900 border-b border-slate-700/50 z-40 shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-2xl select-none">🏛</span>
          <div>
            <h1 className="text-white font-bold text-base leading-tight tracking-tight">
              House Visualizer
            </h1>
            <p className="text-slate-500 text-[11px] mt-px">
              119th Congress · 435 Districts
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 bg-red-600/10 text-red-400 border border-red-500/30 px-3 py-1 rounded-full text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-red-500" />
            220 Republicans
          </span>
          <span className="inline-flex items-center gap-1.5 bg-blue-600/10 text-blue-400 border border-blue-500/30 px-3 py-1 rounded-full text-xs font-semibold">
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            215 Democrats
          </span>

          <div className="h-4 w-px bg-slate-700 mx-1" />

          <span className="text-slate-600 text-[11px]">
            Scroll/pinch to zoom · Drag to pan · Click to explore
          </span>
        </div>
      </header>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <div className="flex flex-1 min-h-0 overflow-hidden">
        {/* Sidebar */}
        <FilterBar
          filterMode={filterMode}
          onModeChange={setFilterMode}
          open={sidebarOpen}
          onToggle={() => setSidebarOpen((p) => !p)}
        />

        {/* Map area */}
        <div className="flex-1 relative min-w-0 bg-slate-900">
          {/* Loading overlay */}
          {!mapReady && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
              <div className="w-8 h-8 border-2 border-slate-600 border-t-blue-500 rounded-full animate-spin mb-3" />
              <p className="text-slate-500 text-sm">Loading district boundaries…</p>
              <p className="text-slate-700 text-xs mt-1">Fetching from Census TIGER</p>
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
              <Geographies
                geography={DISTRICTS_URL}
                parseGeographies={parseGeographies}
              >
                {({ geographies }) =>
                  geographies.map((geo) => {
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const props = (geo as any).properties ?? {};
                    const id = toDistrictId(props.STATEFP, props.CD118FP);
                    if (!id) return null;

                    const data = getMockDistrictData(id);
                    const isSelected = id === selectedId;
                    const isHovered = id === hoveredId;

                    const fill = getDistrictColor(
                      filterMode,
                      data.party,
                      data.margin,
                      data.income,
                      data.pvi,
                      Math.max(0, 2025 - data.termStart)
                    );

                    // Stroke: selected = white, hovered = bright, default = dark
                    const stroke = isSelected
                      ? "#FFFFFF"
                      : isHovered
                      ? "#CBD5E1"
                      : "#0F172A";
                    const strokeWidth = isSelected
                      ? 2 / zoom
                      : isHovered
                      ? 1.2 / zoom
                      : 0.4 / zoom;

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
                        onClick={() =>
                          setSelectedId((prev) => (prev === id ? null : id))
                        }
                        style={{
                          default: { outline: "none", transition: "fill 0.25s ease" },
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

          {/* Zoom level indicator */}
          <div className="absolute bottom-6 right-16 text-slate-700 text-[11px] select-none pointer-events-none">
            {zoom < 1.05 ? "Overview" : zoom < 3 ? "Regional" : zoom < 8 ? "State" : "Local"}
          </div>
        </div>

        {/* District Panel (slide in from right) */}
        {selectedId && selectedData && selectedRepName && (
          <DistrictPanel
            districtId={selectedId}
            repName={selectedRepName}
            data={selectedData}
            onClose={() => setSelectedId(null)}
          />
        )}
      </div>

      {/* ── Tooltip ────────────────────────────────────────────────────── */}
      {hoveredId && !selectedId && (
        <Tooltip districtId={hoveredId} x={mousePos.x} y={mousePos.y} />
      )}
    </div>
  );
}
