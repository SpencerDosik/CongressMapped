"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { PARTY_COLORS } from "@/lib/colors";

const NJ_SENATE_URL = "/nj-state-senate.geojson";
const NJ_ASSEMBLY_URL = "/nj-state-assembly.geojson";

type Party = "Republican" | "Democrat" | "Independent";

interface Member {
  name: string;
  party: Party;
}

interface NJLegData {
  session: string;
  senate: Record<string, Member>;
  assembly: Record<string, Member[]>;
}

type Chamber = "senate" | "assembly";

const PARTY_C: Record<string, string> = {
  Republican: PARTY_COLORS.Republican,
  Democrat: PARTY_COLORS.Democrat,
  Independent: PARTY_COLORS.Independent,
};


function districtFill(distNum: number, data: NJLegData | null, chamber: Chamber, hovered: number | null, selected: number | null): string {
  const isHov = distNum === hovered;
  const isSel = distNum === selected;

  if (!data) return isHov ? "#374151" : "#1e293b";

  let party: string | undefined;
  if (chamber === "senate") {
    party = data.senate[String(distNum)]?.party;
  } else {
    const members = data.assembly[String(distNum)] ?? [];
    // Color by majority party in assembly district
    const r = members.filter((m) => m.party === "Republican").length;
    const d = members.filter((m) => m.party === "Democrat").length;
    if (r > d) party = "Republican";
    else if (d > r) party = "Democrat";
    else party = members[0]?.party;
  }

  const base = PARTY_C[party ?? ""] ?? "#334155";
  if (isSel) return base;
  if (isHov) return base;
  return base;
}

interface SelectedDistrict {
  num: number;
  senator?: Member;
  assemblyMembers?: Member[];
}

export default function NJLegPage() {
  const [legData, setLegData] = useState<NJLegData | null>(null);
  const [chamber, setChamber] = useState<Chamber>("senate");
  const [hoveredDist, setHoveredDist] = useState<number | null>(null);
  const [selectedDist, setSelectedDist] = useState<SelectedDistrict | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [senateReady, setSenateReady] = useState(false);
  const senateLoadedRef = { current: false };

  useEffect(() => {
    fetch("/nj-leg-data.json").then((r) => r.json()).then(setLegData).catch(() => {});
  }, []);

  useEffect(() => {
    const h = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", h);
    return () => window.removeEventListener("mousemove", h);
  }, []);

  const parseSenateGeos = useCallback((geos: Record<string, unknown>[]) => {
    if (geos.length > 0 && !senateLoadedRef.current) {
      senateLoadedRef.current = true;
      setTimeout(() => setSenateReady(true), 0);
    }
    return geos;
  }, []);

  function getDistrictNum(props: Record<string, unknown>): number | null {
    const raw = props.SLDU ?? props.SLDL ?? props.DISTRICT ?? props.NAME;
    if (!raw) return null;
    const n = parseInt(String(raw), 10);
    return isNaN(n) ? null : n;
  }

  const handleDistrictClick = (num: number) => {
    if (!legData) return;
    const senator = legData.senate[String(num)];
    const assemblyMembers = legData.assembly[String(num)] ?? [];
    setSelectedDist({ num, senator, assemblyMembers });
  };

  const rSenate = legData ? Object.values(legData.senate).filter((s) => s.party === "Republican").length : 0;
  const dSenate = legData ? Object.values(legData.senate).filter((s) => s.party === "Democrat").length : 0;
  const rAssembly = legData ? Object.values(legData.assembly).flat().filter((m) => m.party === "Republican").length : 0;
  const dAssembly = legData ? Object.values(legData.assembly).flat().filter((m) => m.party === "Democrat").length : 0;

  const geoUrl = chamber === "senate" ? NJ_SENATE_URL : NJ_ASSEMBLY_URL;

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden" style={{ backgroundColor: "#0a0e14" }}>
      {/* Header */}
      <header
        className="flex items-center justify-between px-5 py-2.5 shrink-0 z-40"
        style={{ backgroundColor: "#0d1117", borderBottom: "1px solid rgba(30,41,59,0.8)" }}
      >
        <div className="flex items-center gap-3 shrink-0">
          <Link
            href="/state-leg"
            className="flex items-center gap-1.5 text-slate-500 hover:text-slate-300 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div className="w-px h-4 bg-slate-700/60" />
          <div>
            <h1 className="text-white font-bold text-sm leading-tight tracking-tight">New Jersey Legislature</h1>
            <p className="text-slate-600 text-[10px]">222nd Legislature · 2024–2027</p>
          </div>
        </div>

        {/* Chamber toggle */}
        <div className="flex items-center gap-1 p-1 rounded-lg shrink-0" style={{ backgroundColor: "rgba(15,23,42,0.8)", border: "1px solid rgba(30,41,59,0.9)" }}>
          {([
            { value: "senate" as Chamber, label: "State Senate" },
            { value: "assembly" as Chamber, label: "General Assembly" },
          ]).map(({ value, label }) => (
            <button
              key={value}
              onClick={() => { setChamber(value); setSelectedDist(null); }}
              className="px-3 py-1 rounded-md text-[11px] font-medium transition-all"
              style={chamber === value
                ? { backgroundColor: "rgba(99,102,241,0.25)", color: "#a5b4fc", border: "1px solid rgba(99,102,241,0.4)" }
                : { backgroundColor: "transparent", color: "#64748b", border: "1px solid transparent" }
              }
            >
              {label}
            </button>
          ))}
        </div>

        {/* Composition */}
        {legData && (
          <div className="flex items-center gap-3 shrink-0">
            <div className="text-right">
              <p className="text-[10px] text-slate-600 uppercase tracking-widest">
                {chamber === "senate" ? "Senate" : "Assembly"}
              </p>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-red-400 font-bold text-sm tabular-nums">
                  {chamber === "senate" ? rSenate : rAssembly}R
                </span>
                <div className="relative w-24 h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div className="absolute left-0 top-0 h-full rounded-l-full" style={{ backgroundColor: "#DC2626", width: `${chamber === "senate" ? (rSenate / 40) * 100 : (rAssembly / 80) * 100}%` }} />
                  <div className="absolute right-0 top-0 h-full rounded-r-full" style={{ backgroundColor: "#2563EB", width: `${chamber === "senate" ? (dSenate / 40) * 100 : (dAssembly / 80) * 100}%` }} />
                </div>
                <span className="text-blue-400 font-bold text-sm tabular-nums">
                  {chamber === "senate" ? dSenate : dAssembly}D
                </span>
              </div>
            </div>

            <div className="flex items-center gap-0.5">
              {([
                { href: "/house", label: "House" },
                { href: "/senate", label: "Senate" },
                { href: "/state-leg", label: "State Leg." },
              ] as const).map(({ href, label }) => (
                <a key={href} href={href} className="px-2 py-1 rounded text-[10px] font-medium transition-colors whitespace-nowrap"
                  style={{ color: "#64748b" }}>
                  {label}
                </a>
              ))}
            </div>
          </div>
        )}
      </header>

      {/* Map + panel */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        <div className="flex-1 relative min-w-0" style={{ backgroundColor: "#0a0e14" }}>
          {!senateReady && (
            <div className="absolute inset-0 flex flex-col items-center justify-center z-10 pointer-events-none">
              <div className="w-10 h-10 rounded-full border-2 animate-spin mb-4" style={{ borderColor: "rgba(99,102,241,0.2)", borderTopColor: "#818cf8" }} />
              <p className="text-slate-500 text-sm">Loading districts…</p>
            </div>
          )}

          <ComposableMap projection="geoMercator" projectionConfig={{ center: [-74.5, 40.1], scale: 11000 }} width={800} height={500}
            style={{ width: "100%", height: "100%", display: "block" }}>
            <Geographies geography={geoUrl} parseGeographies={parseSenateGeos}>
              {({ geographies }) =>
                geographies.map((geo) => {
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  const props = (geo as any).properties ?? {};
                  const num = getDistrictNum(props);
                  if (num === null) return null;

                  const fill = districtFill(num, legData, chamber, hoveredDist, selectedDist?.num ?? null);
                  const isSelected = num === (selectedDist?.num ?? null);

                  return (
                    <Geography
                      // eslint-disable-next-line @typescript-eslint/no-explicit-any
                      key={(geo as any).rsmKey ?? num}
                      geography={geo}
                      fill={fill}
                      stroke={isSelected ? "#ffffff" : "#0f172a"}
                      strokeWidth={isSelected ? 1.5 : 0.3}
                      onMouseEnter={() => setHoveredDist(num)}
                      onMouseLeave={() => setHoveredDist(null)}
                      onClick={() => handleDistrictClick(num)}
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
          </ComposableMap>

          {/* Hover tooltip */}
          {hoveredDist && !selectedDist && legData && (
            <div
              className="fixed pointer-events-none z-50 rounded-xl overflow-hidden shadow-2xl shadow-black/60"
              style={{
                left: mousePos.x + 14,
                top: mousePos.y - 70,
                width: 200,
                backgroundColor: "#0d1117",
                border: "1px solid rgba(51,65,85,0.7)",
              }}
            >
              <div className="px-3 py-2.5">
                <p className="text-white text-xs font-bold mb-1.5">District {hoveredDist}</p>
                {chamber === "senate" && legData.senate[String(hoveredDist)] && (() => {
                  const s = legData.senate[String(hoveredDist)];
                  const c = PARTY_C[s.party] ?? "#64748b";
                  return (
                    <div className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: c }} />
                      <p className="text-slate-300 text-[11px] truncate">{s.name}</p>
                    </div>
                  );
                })()}
                {chamber === "assembly" && (legData.assembly[String(hoveredDist)] ?? []).map((m, i) => {
                  const c = PARTY_C[m.party] ?? "#64748b";
                  return (
                    <div key={i} className="flex items-center gap-1.5 mb-0.5 last:mb-0">
                      <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: c }} />
                      <p className="text-slate-300 text-[11px] truncate">{m.name}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Legend */}
          <div className="absolute bottom-5 left-4 rounded-xl px-3 py-2.5"
            style={{ backgroundColor: "rgba(13,17,23,0.9)", border: "1px solid rgba(51,65,85,0.5)" }}>
            {[
              { label: "Republican", color: PARTY_COLORS.Republican },
              { label: "Democrat", color: PARTY_COLORS.Democrat },
            ].map(({ label, color }) => (
              <div key={label} className="flex items-center gap-2 mb-1 last:mb-0">
                <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: color }} />
                <span className="text-slate-400 text-[11px]">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* District panel */}
        {selectedDist && legData && (
          <div
            className="w-72 flex flex-col shrink-0 overflow-hidden"
            style={{
              backgroundColor: "rgba(13,17,23,0.97)",
              borderLeft: "1px solid rgba(51,65,85,0.6)",
              boxShadow: "-8px 0 32px rgba(0,0,0,0.5)",
            }}
          >
            {/* Accent line */}
            {(() => {
              const sen = legData.senate[String(selectedDist.num)];
              const color = PARTY_C[sen?.party ?? ""] ?? "#334155";
              return <div className="h-0.5 shrink-0" style={{ backgroundColor: color }} />;
            })()}

            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/40 shrink-0">
              <div>
                <p className="text-white font-bold text-sm">District {selectedDist.num}</p>
                <p className="text-slate-500 text-[11px] mt-0.5">New Jersey</p>
              </div>
              <button onClick={() => setSelectedDist(null)}
                className="w-6 h-6 rounded-full flex items-center justify-center text-slate-600 hover:text-slate-300 hover:bg-slate-700/60 transition-colors text-xs">
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {/* State Senator */}
              <div>
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2">State Senator</p>
                {legData.senate[String(selectedDist.num)] ? (() => {
                  const s = legData.senate[String(selectedDist.num)];
                  const c = PARTY_C[s.party] ?? "#64748b";
                  return (
                    <div className="rounded-xl p-3.5" style={{ backgroundColor: "rgba(30,41,59,0.5)", border: "1px solid rgba(51,65,85,0.4)" }}>
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                          style={{ background: `${c}20`, border: `2px solid ${c}40`, color: c }}>
                          {s.party === "Republican" ? "R" : "D"}
                        </div>
                        <div>
                          <p className="text-white font-semibold text-[13px] leading-tight">{s.name}</p>
                          <span className="text-[11px] font-medium px-2 py-0.5 rounded-full mt-1 inline-block"
                            style={{ backgroundColor: `${c}18`, color: c, border: `1px solid ${c}30` }}>
                            {s.party}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })() : <p className="text-slate-600 text-sm">No data</p>}
              </div>

              {/* Assembly Members */}
              <div>
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2">Assembly Members</p>
                <div className="space-y-2">
                  {(legData.assembly[String(selectedDist.num)] ?? []).map((m, i) => {
                    const c = PARTY_C[m.party] ?? "#64748b";
                    return (
                      <div key={i} className="rounded-xl p-3.5" style={{ backgroundColor: "rgba(30,41,59,0.5)", border: "1px solid rgba(51,65,85,0.4)" }}>
                        <div className="flex items-center gap-2.5">
                          <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                            style={{ background: `${c}20`, border: `2px solid ${c}40`, color: c }}>
                            {m.party === "Republican" ? "R" : "D"}
                          </div>
                          <div>
                            <p className="text-white font-semibold text-[13px] leading-tight">{m.name}</p>
                            <span className="text-[11px] font-medium px-2 py-0.5 rounded-full mt-1 inline-block"
                              style={{ backgroundColor: `${c}18`, color: c, border: `1px solid ${c}30` }}>
                              {m.party}
                            </span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            <div className="px-4 py-3 border-t border-slate-700/30 shrink-0">
              <p className="text-[10px] text-slate-700">222nd NJ Legislature · Data as of June 2026</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
