"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import {
  ComposableMap,
  Geographies,
  Geography,
} from "react-simple-maps";
import { FIPS_TO_STATE, STATE_NAMES } from "@/lib/stateFips";

const STATES_URL = "/us-states.json";

// States with implemented legislature views
const IMPLEMENTED_STATES = new Set(["NJ"]);

export default function StateLegPage() {
  const router = useRouter();
  const pathname = usePathname();
  const [hoveredState, setHoveredState] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [mapReady, setMapReady] = useState(false);
  const loadedRef = { current: false };

  useEffect(() => {
    const h = (e: MouseEvent) => setMousePos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", h);
    return () => window.removeEventListener("mousemove", h);
  }, []);

  const parseGeographies = useCallback((geos: Record<string, unknown>[]) => {
    if (geos.length > 0 && !loadedRef.current) {
      loadedRef.current = true;
      setTimeout(() => setMapReady(true), 0);
    }
    return geos;
  }, []);

  const handleStateClick = (abbr: string) => {
    if (IMPLEMENTED_STATES.has(abbr)) {
      router.push(`/state-leg/${abbr.toLowerCase()}`);
    }
  };

  return (
    <div className="flex flex-col w-screen h-screen overflow-hidden" style={{ backgroundColor: "#0a0e14" }}>
      <header
        className="flex items-center justify-between px-5 py-2.5 shrink-0 z-40"
        style={{ backgroundColor: "#0d1117", borderBottom: "1px solid rgba(30,41,59,0.8)" }}
      >
        <Link href="/" className="flex items-center shrink-0">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center text-base shrink-0" style={{ background: "linear-gradient(135deg, #1e3a5f, #1e40af)" }}>🏛</div>
        </Link>

        <div className="flex items-center gap-0.5 shrink-0">
          {([
            { href: "/house", label: "House" },
            { href: "/senate", label: "Senate" },
            { href: "/state-leg", label: "State" },
            { href: "/rankings", label: "Rankings" },
            { href: "/compare", label: "Compare" },
            { href: "/graph", label: "Graph" },
            { href: "/competitive", label: "Races" },
            { href: "/committees", label: "Cmtes" },
            { href: "/freshmen", label: "Class" },
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
          <Geographies geography={STATES_URL} parseGeographies={parseGeographies}>
            {({ geographies }) =>
              geographies.map((geo) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const props = (geo as any).properties ?? {};
                const fips = props.STATEFP ?? String((geo as any).id ?? props.id ?? "").padStart(2, "0");
                const abbr = FIPS_TO_STATE[fips] ?? null;
                if (!abbr) return null;

                const implemented = IMPLEMENTED_STATES.has(abbr);
                const isHovered = abbr === hoveredState;

                return (
                  <Geography
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    key={(geo as any).rsmKey ?? abbr}
                    geography={geo}
                    fill={isHovered && implemented ? "#3730a3" : implemented ? "#312e81" : isHovered ? "#2d3f58" : "#1e293b"}
                    stroke={implemented ? "#6366f1" : "#475569"}
                    strokeWidth={implemented ? 0.8 : 0.5}
                    onMouseEnter={() => setHoveredState(abbr)}
                    onMouseLeave={() => setHoveredState(null)}
                    onClick={() => handleStateClick(abbr)}
                    style={{
                      default: { outline: "none" },
                      hover: { outline: "none", cursor: implemented ? "pointer" : "default" },
                      pressed: { outline: "none" },
                    }}
                  />
                );
              })
            }
          </Geographies>
        </ComposableMap>

        {/* Hover tooltip */}
        {hoveredState && (
          <div
            className="fixed pointer-events-none z-50 rounded-xl overflow-hidden shadow-2xl shadow-black/60"
            style={{
              left: mousePos.x + 14,
              top: mousePos.y - 50,
              backgroundColor: "#0d1117",
              border: "1px solid rgba(51,65,85,0.7)",
            }}
          >
            <div className="px-3 py-2.5">
              <p className="text-white text-xs font-bold">{STATE_NAMES[hoveredState]}</p>
              <p className="text-[11px] mt-0.5" style={{ color: IMPLEMENTED_STATES.has(hoveredState) ? "#a5b4fc" : "#475569" }}>
                {IMPLEMENTED_STATES.has(hoveredState) ? "Click to view legislature →" : "Coming soon"}
              </p>
            </div>
          </div>
        )}

        {/* Info overlay */}
        <div
          className="absolute bottom-5 left-4 rounded-xl px-3 py-2.5"
          style={{ backgroundColor: "rgba(13,17,23,0.9)", border: "1px solid rgba(51,65,85,0.5)" }}
        >
          <p className="text-slate-600 text-[10px] font-bold uppercase tracking-widest mb-2">State Coverage</p>
          <div className="flex items-center gap-2 mb-1">
            <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: "#3730a3" }} />
            <span className="text-slate-400 text-[11px]">Available — click to explore</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: "#1e293b" }} />
            <span className="text-slate-500 text-[11px]">Coming soon</span>
          </div>
        </div>
      </div>
    </div>
  );
}
