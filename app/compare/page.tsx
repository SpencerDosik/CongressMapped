"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import { getAllDistricts, getDistrictData, getRepName } from "@/lib/districtData";
import { PARTY_COLORS } from "@/lib/colors";
import { STATE_NAMES, AT_LARGE_STATES } from "@/lib/stateFips";
import { Party } from "@/lib/types";
import ElectionSparkline, { HistoryPoint } from "@/components/ElectionSparkline";

const ALL = getAllDistricts();

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

function districtTitle(districtId: string): string {
  const [state, num] = districtId.split("-");
  const stateName = STATE_NAMES[state] ?? state;
  if (AT_LARGE_STATES.has(state)) return `${stateName} At-Large`;
  return `${stateName} ${parseInt(num ?? "0", 10)}th`;
}

function ageFromBirthday(birthday: string): number {
  const born = new Date(birthday);
  const today = new Date();
  let age = today.getFullYear() - born.getFullYear();
  const m = today.getMonth() - born.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < born.getDate())) age--;
  return age;
}

// ── District Picker ───────────────────────────────────────────────────────────
function DistrictPicker({ value, onChange, exclude }: {
  value: string | null;
  onChange: (id: string) => void;
  exclude: string | null;
}) {
  const [q, setQ] = useState("");

  const matches = q.trim().length >= 2
    ? ALL.filter(({ districtId, data }) => {
        if (districtId === exclude) return false;
        const s = q.toLowerCase();
        return (
          districtId.toLowerCase().includes(s) ||
          data.repName.toLowerCase().includes(s) ||
          (STATE_NAMES[districtId.split("-")[0]] ?? "").toLowerCase().startsWith(s)
        );
      }).slice(0, 8)
    : [];

  return (
    <div className="relative">
      <div
        className="flex items-center gap-2 px-3 py-2 rounded-lg"
        style={{ backgroundColor: "rgba(15,23,42,0.8)", border: "1px solid rgba(51,65,85,0.6)" }}
      >
        <svg className="w-3.5 h-3.5 text-slate-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          placeholder={value ? `${value} (change…)` : "Search district or rep…"}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="bg-transparent text-slate-300 text-xs placeholder-slate-500 outline-none w-full"
        />
      </div>
      {matches.length > 0 && (
        <div
          className="absolute top-full mt-1 left-0 right-0 rounded-xl overflow-hidden z-20 shadow-2xl shadow-black/60"
          style={{ backgroundColor: "#0d1117", border: "1px solid rgba(51,65,85,0.7)" }}
        >
          {matches.map(({ districtId, data }) => {
            const color = PARTY_COLORS[data.party] ?? "#64748B";
            return (
              <button
                key={districtId}
                onClick={() => { onChange(districtId); setQ(""); }}
                className="w-full flex items-center gap-3 px-3 py-2.5 text-left transition-colors"
                style={{ borderBottom: "1px solid rgba(30,41,59,0.5)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(30,41,59,0.6)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}
              >
                <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <div className="min-w-0 flex-1">
                  <p className="text-white text-xs font-medium truncate">{data.repName}</p>
                  <p className="text-slate-500 text-[10px]">{districtTitle(districtId)} · {districtId}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Stat Row ──────────────────────────────────────────────────────────────────
function CompareRow({
  label,
  valA,
  valB,
  colorA,
  colorB,
  winner,
}: {
  label: string;
  valA: string;
  valB: string;
  colorA?: string;
  colorB?: string;
  winner?: "a" | "b" | "tie" | null;
}) {
  const highlightA = winner === "a" ? "rgba(99,102,241,0.12)" : "transparent";
  const highlightB = winner === "b" ? "rgba(99,102,241,0.12)" : "transparent";

  return (
    <div className="grid grid-cols-[1fr_auto_1fr] items-center py-2.5 border-b border-slate-800/60 last:border-0 gap-3">
      <div className="text-right rounded px-2 py-0.5" style={{ backgroundColor: highlightA }}>
        <span className="text-[13px] font-semibold" style={colorA ? { color: colorA } : { color: "#e2e8f0" }}>
          {valA}
          {winner === "a" && <span className="ml-1.5 text-indigo-400 text-[10px]">▲</span>}
        </span>
      </div>
      <div className="text-center text-[10px] font-bold text-slate-600 uppercase tracking-wider whitespace-nowrap">
        {label}
      </div>
      <div className="text-left rounded px-2 py-0.5" style={{ backgroundColor: highlightB }}>
        <span className="text-[13px] font-semibold" style={colorB ? { color: colorB } : { color: "#e2e8f0" }}>
          {winner === "b" && <span className="mr-1.5 text-indigo-400 text-[10px]">▲</span>}
          {valB}
        </span>
      </div>
    </div>
  );
}

// ── Column Header ─────────────────────────────────────────────────────────────
function ColHeader({ districtId, onClear }: { districtId: string | null; onClear: () => void }) {
  if (!districtId) {
    return (
      <div className="flex flex-col items-center py-4 text-slate-600 text-sm">
        <div className="w-12 h-12 rounded-full border-2 border-dashed border-slate-700 flex items-center justify-center mb-2 text-lg">+</div>
        <p className="text-[11px]">Select a district</p>
      </div>
    );
  }

  const data = getDistrictData(districtId);
  if (!data) return null;

  const partyColor = PARTY_COLORS[data.party] ?? "#64748B";

  return (
    <div className="flex flex-col items-center py-4 relative">
      <button
        onClick={onClear}
        className="absolute top-2 right-0 text-slate-700 hover:text-slate-400 text-xs transition-colors"
        title="Remove"
      >
        ✕
      </button>
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-bold mb-2"
        style={{
          background: `radial-gradient(circle at 35% 35%, ${partyColor}40, ${partyColor}15)`,
          border: `2px solid ${partyColor}35`,
          color: partyColor,
        }}
      >
        {PARTY_SHORT[data.party]}
      </div>
      <p className="text-white font-semibold text-sm text-center leading-snug">{data.repName}</p>
      <p className="text-slate-500 text-[11px] mt-0.5">{districtTitle(districtId)}</p>
      <p className="text-slate-700 text-[10px]">{districtId}</p>
      <Link
        href={`/house?d=${districtId}`}
        className="mt-2 text-indigo-400 hover:text-indigo-300 text-[10px] transition-colors"
      >
        Open on map →
      </Link>
    </div>
  );
}

// ── Main comparison section ───────────────────────────────────────────────────
function CompareContent({ idA, idB }: { idA: string | null; idB: string | null }) {
  const dA = idA ? getDistrictData(idA) : null;
  const dB = idB ? getDistrictData(idB) : null;

  const [ages, setAges] = useState<{ ageA: number | null; ageB: number | null }>({ ageA: null, ageB: null });
  const [historyA, setHistoryA] = useState<HistoryPoint[] | null>(null);
  const [historyB, setHistoryB] = useState<HistoryPoint[] | null>(null);

  useEffect(() => {
    fetch("/legislator-meta.json")
      .then((r) => r.json())
      .then((meta: Record<string, { birthday: string | null }>) => {
        const birthdayA = idA ? meta[idA]?.birthday : null;
        const birthdayB = idB ? meta[idB]?.birthday : null;
        setAges({
          ageA: birthdayA ? ageFromBirthday(birthdayA) : null,
          ageB: birthdayB ? ageFromBirthday(birthdayB) : null,
        });
      })
      .catch(() => {});
  }, [idA, idB]);

  useEffect(() => {
    fetch("/election-history.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((all: Record<string, HistoryPoint[]> | null) => {
        setHistoryA(all && idA ? (all[idA] ?? null) : null);
        setHistoryB(all && idB ? (all[idB] ?? null) : null);
      })
      .catch(() => {});
  }, [idA, idB]);

  const { ageA, ageB } = ages;

  if (!dA || !dB) return null;

  const tenureA = Math.max(0, 2026 - dA.termStart);
  const tenureB = Math.max(0, 2026 - dB.termStart);
  const marginAbsA = Math.abs(dA.margin);
  const marginAbsB = Math.abs(dB.margin);

  function competitiveness(margin: number): string {
    const abs = Math.abs(margin);
    if (abs < 5) return "Toss-Up";
    if (abs < 10) return "Competitive";
    if (abs < 20) return `Lean ${margin > 0 ? "R" : "D"}`;
    if (abs < 35) return `Likely ${margin > 0 ? "R" : "D"}`;
    return `Safe ${margin > 0 ? "R" : "D"}`;
  }

  return (
    <div className="px-6 py-4">
      <CompareRow
        label="Party"
        valA={dA.party}
        valB={dB.party}
        colorA={PARTY_COLORS[dA.party]}
        colorB={PARTY_COLORS[dB.party]}
      />
      <CompareRow
        label="2024 Margin"
        valA={marginLabel(dA.margin)}
        valB={marginLabel(dB.margin)}
        colorA={dA.margin >= 0 ? PARTY_COLORS.Republican : PARTY_COLORS.Democrat}
        colorB={dB.margin >= 0 ? PARTY_COLORS.Republican : PARTY_COLORS.Democrat}
        winner={marginAbsA > marginAbsB ? "a" : marginAbsB > marginAbsA ? "b" : "tie"}
      />
      <CompareRow
        label="Race Rating"
        valA={competitiveness(dA.margin)}
        valB={competitiveness(dB.margin)}
      />
      <CompareRow
        label="Computed PVI"
        valA={pviLabel(dA.pvi)}
        valB={pviLabel(dB.pvi)}
        colorA={dA.pvi > 0 ? PARTY_COLORS.Republican : dA.pvi < 0 ? PARTY_COLORS.Democrat : "#94a3b8"}
        colorB={dB.pvi > 0 ? PARTY_COLORS.Republican : dB.pvi < 0 ? PARTY_COLORS.Democrat : "#94a3b8"}
        winner={Math.abs(dA.pvi) > Math.abs(dB.pvi) ? "a" : Math.abs(dB.pvi) > Math.abs(dA.pvi) ? "b" : "tie"}
      />
      <CompareRow
        label="Median Income"
        valA={`$${(dA.income * 1000).toLocaleString()}`}
        valB={`$${(dB.income * 1000).toLocaleString()}`}
        winner={dA.income > dB.income ? "a" : dB.income > dA.income ? "b" : "tie"}
      />
      <CompareRow
        label="First Elected"
        valA={String(dA.termStart)}
        valB={String(dB.termStart)}
        winner={dA.termStart < dB.termStart ? "a" : dB.termStart < dA.termStart ? "b" : "tie"}
      />
      <CompareRow
        label="Tenure"
        valA={tenureA < 1 ? "< 1 yr" : `${tenureA} yr`}
        valB={tenureB < 1 ? "< 1 yr" : `${tenureB} yr`}
        winner={tenureA > tenureB ? "a" : tenureB > tenureA ? "b" : "tie"}
      />
      {(dA.urbanPct != null || dB.urbanPct != null) && (
        <CompareRow
          label="Urban %"
          valA={dA.urbanPct != null ? `${dA.urbanPct.toFixed(1)}%` : "—"}
          valB={dB.urbanPct != null ? `${dB.urbanPct.toFixed(1)}%` : "—"}
          winner={dA.urbanPct != null && dB.urbanPct != null
            ? dA.urbanPct > dB.urbanPct ? "a" : dB.urbanPct > dA.urbanPct ? "b" : "tie"
            : null}
        />
      )}
      {(dA.collegePct != null || dB.collegePct != null) && (
        <CompareRow
          label="College Grad %"
          valA={dA.collegePct != null ? `${dA.collegePct.toFixed(1)}%` : "—"}
          valB={dB.collegePct != null ? `${dB.collegePct.toFixed(1)}%` : "—"}
          winner={dA.collegePct != null && dB.collegePct != null
            ? dA.collegePct > dB.collegePct ? "a" : dB.collegePct > dA.collegePct ? "b" : "tie"
            : null}
        />
      )}
      {(dA.povertyPct != null || dB.povertyPct != null) && (
        <CompareRow
          label="Poverty Rate"
          valA={dA.povertyPct != null ? `${dA.povertyPct.toFixed(1)}%` : "—"}
          valB={dB.povertyPct != null ? `${dB.povertyPct.toFixed(1)}%` : "—"}
          winner={dA.povertyPct != null && dB.povertyPct != null
            ? dA.povertyPct < dB.povertyPct ? "a" : dB.povertyPct < dA.povertyPct ? "b" : "tie"
            : null}
        />
      )}
      {(ageA !== null || ageB !== null) && (
        <CompareRow
          label="Rep. Age"
          valA={ageA !== null ? String(ageA) : "—"}
          valB={ageB !== null ? String(ageB) : "—"}
        />
      )}

      {/* Election History Sparklines */}
      {(historyA || historyB) && (
        <div className="pt-4 pb-2">
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider text-center mb-3">
            Election History <span className="font-normal text-slate-700 normal-case tracking-normal">2000–2024</span>
          </p>
          <div className="grid grid-cols-2 gap-6">
            <div>
              {historyA ? (
                <ElectionSparkline
                  history={historyA}
                  current={dA.margin}
                  partyColor={PARTY_COLORS[dA.party] ?? "#64748b"}
                />
              ) : (
                <div className="h-[52px] flex items-center justify-center text-[10px] text-slate-700">No data</div>
              )}
            </div>
            <div>
              {historyB ? (
                <ElectionSparkline
                  history={historyB}
                  current={dB.margin}
                  partyColor={PARTY_COLORS[dB.party] ?? "#64748b"}
                />
              ) : (
                <div className="h-[52px] flex items-center justify-center text-[10px] text-slate-700">No data</div>
              )}
            </div>
          </div>
          <p className="text-[9px] text-slate-700 text-center mt-1.5">2020–2022 not shown. Pre-2022 boundaries may differ from current district.</p>
        </div>
      )}
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────
function ComparePageInner() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const [idA, setIdA] = useState<string | null>(params.get("a"));
  const [idB, setIdB] = useState<string | null>(params.get("b"));

  // Sync URL
  useEffect(() => {
    const url = new URL(window.location.href);
    if (idA) url.searchParams.set("a", idA); else url.searchParams.delete("a");
    if (idB) url.searchParams.set("b", idB); else url.searchParams.delete("b");
    router.replace(url.pathname + url.search, { scroll: false });
  }, [idA, idB, router]);

  const bothSelected = idA && idB;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#0a0e14", color: "#e2e8f0" }}>

      {/* Header */}
      <header
        className="flex items-center justify-between px-6 py-3 shrink-0"
        style={{ backgroundColor: "#0d1117", borderBottom: "1px solid rgba(30,41,59,0.8)" }}
      >
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div className="flex items-center gap-0.5">
            {(["/house", "/rankings", "/compare", "/graph", "/competitive", "/states", "/committees", "/freshmen"] as const).map((href) => {
              const label = { "/house": "Map", "/rankings": "Rankings", "/compare": "Compare", "/graph": "Graph", "/competitive": "Races", "/states": "States", "/committees": "Cmtes", "/freshmen": "Class" }[href];
              const active = pathname === href;
              return (
                <a key={href} href={href} className="px-2 py-1 rounded text-[10px] font-medium transition-colors"
                  style={{ color: active ? "#a5b4fc" : "#64748b", backgroundColor: active ? "rgba(99,102,241,0.12)" : "transparent" }}>
                  {label}
                </a>
              );
            })}
          </div>
        </div>
        {bothSelected && (
          <button
            onClick={() => {
              const url = `${window.location.origin}/compare?a=${idA}&b=${idB}`;
              navigator.clipboard.writeText(url).catch(() => {});
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] text-slate-400 hover:text-white transition-colors"
            style={{ backgroundColor: "rgba(15,23,42,0.8)", border: "1px solid rgba(51,65,85,0.5)" }}
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
            </svg>
            Copy link
          </button>
        )}
      </header>

      {/* Two-column layout */}
      <div className="flex-1 overflow-auto">
        <div className="max-w-4xl mx-auto px-6 py-6">

          {/* Pickers */}
          <div className="grid grid-cols-2 gap-6 mb-6">
            <div>
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2">District A</p>
              <DistrictPicker value={idA} onChange={setIdA} exclude={idB} />
              <ColHeader districtId={idA} onClear={() => setIdA(null)} />
            </div>
            <div>
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2">District B</p>
              <DistrictPicker value={idB} onChange={setIdB} exclude={idA} />
              <ColHeader districtId={idB} onClear={() => setIdB(null)} />
            </div>
          </div>

          {/* Comparison rows */}
          {bothSelected ? (
            <div
              className="rounded-xl overflow-hidden"
              style={{ backgroundColor: "#0d1117", border: "1px solid rgba(51,65,85,0.5)" }}
            >
              <div className="px-6 pt-4 pb-1 border-b border-slate-800/60">
                <p className="text-[10px] font-bold text-slate-600 uppercase tracking-wider">Side-by-side</p>
              </div>
              <CompareContent idA={idA} idB={idB} />
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-slate-600">
              <p className="text-sm">Select two districts above to compare them.</p>
              <p className="text-[11px] mt-1 text-slate-700">You can also link here with ?a=XX-NN&b=YY-MM</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ComparePage() {
  return (
    <Suspense>
      <ComparePageInner />
    </Suspense>
  );
}
