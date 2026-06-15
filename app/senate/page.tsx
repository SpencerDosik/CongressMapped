"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ComposableMap,
  Geographies,
  Geography,
  ZoomableGroup,
} from "react-simple-maps";
import { geoAlbersUsa } from "d3-geo";
import { FIPS_TO_STATE, STATE_NAMES } from "@/lib/stateFips";
import { PARTY_COLORS } from "@/lib/colors";

const STATES_URL = "/us-states.json";
const ZOOM_MIN = 0.5;
const ZOOM_MAX = 20;
const MAP_PROJ = geoAlbersUsa().scale(900).translate([400, 250]);
const SVG_W = 800;
const SVG_H = 500;

type Party = "Republican" | "Democrat" | "Independent";

interface Senator {
  name: string;
  party: Party;
}

interface SenateData {
  [stateAbbr: string]: [Senator, Senator];
}

const PARTY_CHIP_COLORS: Record<string, string> = {
  Republican: PARTY_COLORS.Republican,
  Democrat: PARTY_COLORS.Democrat,
  Independent: PARTY_COLORS.Independent,
};

function senateSeatBar(senators: [Senator, Senator]) {
  const counts = { Republican: 0, Democrat: 0, Independent: 0 };
  senators.forEach((s) => {
    if (s.party in counts) counts[s.party as keyof typeof counts]++;
  });
  return counts;
}

function getStateFill(senators: [Senator, Senator] | undefined): string {
  if (!senators) return "#1e293b";
  // Independents (King ME, Sanders VT) caucus with Democrats — treat as D for map color
  const r = senators.filter((s) => s.party === "Republican").length;
  const d = senators.filter((s) => s.party === "Democrat" || s.party === "Independent").length;
  if (r === 2) return "#b91c1c"; // solid R
  if (d === 2) return "#1d4ed8"; // solid D
  if (r === 1 && d === 1) return "#7e22ce"; // split R/D
  return "#1e293b";
}

function SenatePanel({
  stateAbbr,
  senators,
  onClose,
}: {
  stateAbbr: string;
  senators: [Senator, Senator];
  onClose: () => void;
}) {
  const stateName = STATE_NAMES[stateAbbr] ?? stateAbbr;
  const rCount = senators.filter((s) => s.party === "Republican").length;
  const dCount = senators.filter((s) => s.party === "Democrat").length;

  return (
    <div
      className="absolute top-0 right-0 h-full w-72 flex flex-col z-20 overflow-hidden"
      style={{
        backgroundColor: "rgba(13,17,23,0.97)",
        borderLeft: "1px solid rgba(51,65,85,0.6)",
        boxShadow: "-8px 0 32px rgba(0,0,0,0.5)",
      }}
    >
      <div className="h-0.5 shrink-0" style={{ background: rCount === 2 ? PARTY_COLORS.Republican : dCount === 2 ? PARTY_COLORS.Democrat : "linear-gradient(to right, #b91c1c, #1d4ed8)" }} />
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/40 shrink-0">
        <div>
          <p className="text-white font-bold text-sm">{stateName}</p>
          <p className="text-slate-500 text-[11px] mt-0.5">
            {rCount > 0 && <span className="text-red-400">{rCount}R</span>}
            {rCount > 0 && dCount > 0 && <span className="text-slate-600 mx-1">·</span>}
            {dCount > 0 && <span className="text-blue-400">{dCount}D</span>}
          </p>
        </div>
        <button
          onClick={onClose}
          className="w-6 h-6 rounded-full flex items-center justify-center text-slate-600 hover:text-slate-300 hover:bg-slate-700/60 transition-colors text-xs"
        >
          ✕
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {senators.map((senator, idx) => {
          const partyColor = PARTY_CHIP_COLORS[senator.party] ?? "#64748b";
          const partyShort = senator.party === "Republican" ? "R" : senator.party === "Democrat" ? "D" : "I";
          return (
            <div
              key={idx}
              className="rounded-xl p-4"
              style={{ backgroundColor: "rgba(30,41,59,0.5)", border: "1px solid rgba(51,65,85,0.4)" }}
            >
              <div className="flex items-start gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                  style={{ background: `${partyColor}20`, border: `2px solid ${partyColor}40`, color: partyColor }}
                >
                  {partyShort}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-white font-semibold text-sm leading-snug">{senator.name}</p>
                  <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                    <span
                      className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: `${partyColor}18`, color: partyColor, border: `1px solid ${partyColor}30` }}
                    >
                      {senator.party}
                    </span>
                    <span className="text-[11px] text-slate-600">U.S. Senate</span>
                  </div>
                  {senator.party === "Independent" && (
                    <p className="text-[11px] text-slate-500 mt-1">Caucuses with Democrats</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="px-4 py-3 border-t border-slate-700/30 shrink-0">
        <p className="text-[10px] text-slate-700">119th Congress · Data as of June 2026</p>
      </div>
    </div>
  );
}

function SeatTotals({ data }: { data: SenateData }) {
  let rTotal = 0, dTotal = 0, iTotal = 0;
  Object.values(data).forEach(([s1, s2]) => {
    if (s1.party === "Republican") rTotal++;
    if (s1.party === "Democrat") dTotal++;
    if (s1.party === "Independent") iTotal++;
    if (s2.party === "Republican") rTotal++;
    if (s2.party === "Democrat") dTotal++;
    if (s2.party === "Independent") iTotal++;
  });
  const total = rTotal + dTotal + iTotal;
  const majority = 51;
  const majorityPct = (majority / total) * 100;

  return (
    <div className="flex flex-col items-center gap-1 select-none">
      <div className="flex items-center gap-3">
        <div className="text-right">
          <span className="text-red-400 font-bold text-sm tabular-nums">{rTotal}</span>
          <span className="text-slate-600 text-[10px] ml-1">R</span>
        </div>
        <div className="relative w-52 h-3 rounded-full overflow-visible bg-slate-800">
          <div className="absolute left-0 top-0 h-full rounded-l-full" style={{ width: `${(rTotal / total) * 100}%`, backgroundColor: "#DC2626" }} />
          <div className="absolute right-0 top-0 h-full rounded-r-full" style={{ width: `${(dTotal / total) * 100}%`, backgroundColor: "#2563EB" }} />
          <div className="absolute top-1/2 -translate-y-1/2 w-0.5 h-5 bg-slate-400/80 rounded-full z-10" style={{ left: `${majorityPct}%` }} title="51 seats needed for majority">
            <div className="absolute -top-4 left-1/2 -translate-x-1/2 text-[9px] text-slate-500 whitespace-nowrap">51</div>
          </div>
        </div>
        <div className="text-left">
          <span className="text-slate-600 text-[10px] mr-1">D</span>
          <span className="text-blue-400 font-bold text-sm tabular-nums">{dTotal}</span>
        </div>
      </div>
      {iTotal > 0 && <p className="text-[10px] text-slate-700">incl. {iTotal} independent{iTotal !== 1 ? "s" : ""} caucusing D</p>}
    </div>
  );
}

export default function SenatePage() {
  const pathname = usePathname();
  const [senateData, setSenateData] = useState<SenateData | null>(null);
  const [selectedState, setSelectedState] = useState<string | null>(null);
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [center, setCenter] = useState<[number, number]>([-98, 38]);
  const [mapReady, setMapReady] = useState(false);
  const loadedRef = { current: false };

  useEffect(() => {
    fetch("/senate-data.json").then((r) => r.json()).then(setSenateData).catch(() => {});
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", h);
    return () => window.removeEventListener("mousemove", h);
  }, []);

  const handleMoveEnd = useCallback(({ zoom: z, coordinates }: { zoom: number; coordinates: [number, number] }) => {
    setZoom(z);
    setCenter(coordinates);
  }, []);

  const parseGeographies = useCallback((geos: Record<string, unknown>[]) => {
    if (geos.length > 0 && !loadedRef.current) {
      loadedRef.current = true;
      setTimeout(() => setMapReady(true), 0);
    }
    return geos;
  }, []);

  const selectedSenators = selectedState && senateData ? senateData[selectedState] ?? null : null;

  const hoveredSenators = hoveredState && senateData ? senateData[hoveredState] ?? null : null;

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden" style={{ backgroundColor: "#0a0e14" }}>
      <header
        className="flex items-center justify-between px-5 py-2.5 shrink-0 z-40"
        style={{ backgroundColor: "#0d1117", borderBottom: "1px solid rgba(30,41,59,0.8)" }}
      >
        <Link href="/" className="flex items-center shrink-0">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0" style={{ background: "linear-gradient(135deg, #1e3a5f, #1e40af)" }}>🏛</div>
        </Link>

        {senateData && <SeatTotals data={senateData} />}

        <div className="flex items-center gap-0.5 shrink-0">
          {([
            { href: "/house", label: "House" },
            { href: "/senate", label: "Senate" },
            { href: "/state-leg", label: "State Leg." },
            { href: "/rankings", label: "Rankings" },
            { href: "/graph", label: "Graph" },
          ] as const).map(({ href, label }) => {
            const active = pathname === href;
            return (
              <a key={href} href={href} className="px-2 py-1 rounded text-[10px] font-medium transition-colors whitespace-nowrap"
                style={{ color: active ? "#a5b4fc" : "#64748b", backgroundColor: active ? "rgba(99,102,241,0.12)" : "transparent" }}>
                {label}
              </a>
            );
          })}
        </div>
      </header>

      <div className="flex-1 relative min-h-0">
        {!mapReady && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
            <div className="w-10 h-10 rounded-full border-2 animate-spin mb-4" style={{ borderColor: "rgba(99,102,241,0.2)", borderTopColor: "#818cf8" }} />
            <p className="text-slate-500 text-sm">Loading map…</p>
          </div>
        )}

        <ComposableMap projection="geoAlbersUsa" projectionConfig={{ scale: 900 }} width={800} height={500}
          style={{ width: "100%", height: "100%", display: "block" }}>
          <ZoomableGroup zoom={zoom} center={center} onMoveEnd={handleMoveEnd} minZoom={ZOOM_MIN} maxZoom={ZOOM_MAX}>
            <Geographies geography={STATES_URL} parseGeographies={parseGeographies}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const props = (geo as any).properties ?? {};
                  const fips = props.STATEFP ?? String((geo as any).id ?? props.id ?? "").padStart(2, "0");
                  const abbr = FIPS_TO_STATE[fips] ?? null;
                  if (!abbr) return null;

                  const senators = senateData?.[abbr] ?? null;
                  const fill = getStateFill(senators ?? undefined);
                  const isSelected = abbr === selectedState;
                  const isHovered = abbr === hoveredState;

                  return (
                    <Geography
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      key={(geo as any).rsmKey ?? abbr}
                      geography={geo}
                      fill={fill}
                      stroke={isSelected ? "#ffffff" : isHovered ? "#94a3b8" : "#334155"}
                      strokeWidth={isSelected ? 2 / zoom : isHovered ? 1 / zoom : 0.5 / zoom}
                      onMouseEnter={() => setHoveredState(abbr)}
                      onMouseLeave={() => setHoveredState(null)}
                      onClick={() => setSelectedState((prev) => (prev === abbr ? null : abbr))}
                      style={{
                        default: { outline: "none" },
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

        {/* Hover tooltip */}
        {hoveredState && !selectedState && hoveredSenators && (
          <div
            className="fixed pointer-events-none z-50 rounded-xl overflow-hidden shadow-2xl shadow-black/60"
            style={{
              left: mousePos.x + 14,
              top: mousePos.y - 80,
              width: 200,
              backgroundColor: "#0d1117",
              border: "1px solid rgba(51,65,85,0.7)",
            }}
          >
            <div className="px-3 py-2.5">
              <p className="text-white text-xs font-bold mb-2">{STATE_NAMES[hoveredState]}</p>
              {hoveredSenators.map((s, i) => {
                const c = PARTY_CHIP_COLORS[s.party] ?? "#64748b";
                return (
                  <div key={i} className="flex items-center gap-1.5 mb-1 last:mb-0">
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: c }} />
                    <p className="text-slate-300 text-[11px] truncate">{s.name}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Senator panel */}
        {selectedState && selectedSenators && (
          <SenatePanel
            stateAbbr={selectedState}
            senators={selectedSenators}
            onClose={() => setSelectedState(null)}
          />
        )}

        {/* Legend */}
        <div
          className="absolute bottom-5 left-4 rounded-xl px-3 py-2.5 text-[11px]"
          style={{ backgroundColor: "rgba(13,17,23,0.9)", border: "1px solid rgba(51,65,85,0.5)" }}
        >
          <p className="text-slate-600 text-[10px] font-bold uppercase tracking-widest mb-2">Senate composition</p>
          {[
            { label: "Both Republican", color: "#b91c1c" },
            { label: "Split", color: "#7e22ce" },
            { label: "Both Democrat / Ind.", color: "#1d4ed8" },
          ].map(({ label, color }) => (
            <div key={label} className="flex items-center gap-2 mb-1 last:mb-0">
              <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: color }} />
              <span className="text-slate-400">{label}</span>
            </div>
          ))}
        </div>

        {/* Zoom controls */}
        <div className="absolute bottom-5 right-4 flex flex-col gap-1">
          {[{label: "+", action: () => setZoom(z => Math.min(z * 1.6, ZOOM_MAX))},
            {label: "−", action: () => setZoom(z => Math.max(z / 1.6, ZOOM_MIN))},
          ].map(({ label, action }) => (
            <button
              key={label}
              onClick={action}
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white transition-all text-sm font-medium"
              style={{ backgroundColor: "rgba(13,17,23,0.9)", border: "1px solid rgba(51,65,85,0.6)" }}
            >
              {label}
            </button>
          ))}
          <button
            onClick={() => { setZoom(1); setCenter([-98, 38]); }}
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-white transition-all"
            style={{ backgroundColor: "rgba(13,17,23,0.9)", border: "1px solid rgba(51,65,85,0.6)" }}
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8V4m0 0h4M4 4l5 5m11-1V4m0 0h-4m4 0l-5 5M4 16v4m0 0h4m-4 0l5-5m11 5l-5-5m5 5v-4m0 4h-4" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}
