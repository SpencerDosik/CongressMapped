"use client";

import { useEffect, useState } from "react";
import { DistrictStaticData } from "@/lib/types";
import { PARTY_COLORS } from "@/lib/colors";
import { STATE_NAMES, AT_LARGE_STATES } from "@/lib/stateFips";
import { getAllDistricts } from "@/lib/districtData";

// ── Election history cache (module-level singleton) ───────────────────────────
type HistoryPoint = { year: number; margin: number };
let _historyData: Record<string, HistoryPoint[]> | null = null;
let _historyPromise: Promise<Record<string, HistoryPoint[]> | null> | null = null;

function loadHistory(): Promise<Record<string, HistoryPoint[]> | null> {
  if (_historyData !== null) return Promise.resolve(_historyData);
  if (!_historyPromise) {
    _historyPromise = fetch("/election-history.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { _historyData = d; return d; })
      .catch(() => { _historyData = null; return null; });
  }
  return _historyPromise;
}

// ── Committee cache ───────────────────────────────────────────────────────────
type CommitteeEntry = { name: string; type: string; title: string | null; parent: string | null };
let _committeeData: Record<string, CommitteeEntry[]> | null = null;
let _committeePromise: Promise<Record<string, CommitteeEntry[]> | null> | null = null;

function loadCommittees(): Promise<Record<string, CommitteeEntry[]> | null> {
  if (_committeeData !== null) return Promise.resolve(_committeeData);
  if (!_committeePromise) {
    _committeePromise = fetch("/committee-data.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { _committeeData = d; return d; })
      .catch(() => { _committeeData = null; return null; });
  }
  return _committeePromise;
}

// ── Demographics cache ────────────────────────────────────────────────────────
type DemographicBreakdown = { white: number; hispanic: number; black: number; asian: number; multiracial: number; other: number };
let _demoData: Record<string, DemographicBreakdown> | null = null;
let _demoPromise: Promise<Record<string, DemographicBreakdown> | null> | null = null;

function loadDemographics(): Promise<Record<string, DemographicBreakdown> | null> {
  if (_demoData !== null) return Promise.resolve(_demoData);
  if (!_demoPromise) {
    _demoPromise = fetch("/district-demographics.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { _demoData = d; return d; })
      .catch(() => { _demoData = null; return null; });
  }
  return _demoPromise;
}

// ── Legislative stats cache (ProPublica) ─────────────────────────────────────
type LegStats = { missedVotesPct?: number; partyUnityPct?: number; billsSponsored?: number; billsCosponsored?: number; totalVotes?: number; seniority?: string };
let _legStatsData: Record<string, LegStats> | null = null;
let _legStatsPromise: Promise<Record<string, LegStats> | null> | null = null;

function loadLegStats(): Promise<Record<string, LegStats> | null> {
  if (_legStatsData !== null) return Promise.resolve(_legStatsData);
  if (!_legStatsPromise) {
    _legStatsPromise = fetch("/propublica-data.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { _legStatsData = d; return d; })
      .catch(() => { _legStatsData = null; return null; });
  }
  return _legStatsPromise;
}

// ── FEC fundraising cache ─────────────────────────────────────────────────────
type FundraisingData = { raised: number; spent: number; cashOnHand: number; debts: number };
let _fecData: Record<string, FundraisingData> | null = null;
let _fecPromise: Promise<Record<string, FundraisingData> | null> | null = null;

function loadFEC(): Promise<Record<string, FundraisingData> | null> {
  if (_fecData !== null) return Promise.resolve(_fecData);
  if (!_fecPromise) {
    _fecPromise = fetch("/fec-data.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => { _fecData = d; return d; })
      .catch(() => { _fecData = null; return null; });
  }
  return _fecPromise;
}

interface Props {
  districtId: string;
  repName: string;
  data: DistrictStaticData;
  onClose: () => void;
  onShowProfile: () => void;
}

interface LegMeta {
  bioguide: string | null;
  birthday: string | null;
  twitter: string | null;
  facebook: string | null;
  phone: string | null;
  url: string | null;
  office: string | null;
  gender: string | null;
}

const REDISTRICTING_YEARS = [2002, 2012, 2022];

function ordinalSuffix(n: number) {
  const v = n % 100;
  if (v >= 11 && v <= 13) return "th";
  return ["th", "st", "nd", "rd"][n % 10] ?? "th";
}

function bioguidePhotoUrl(bioguide: string) {
  return `https://bioguide.congress.gov/bioguide/photo/${bioguide[0].toUpperCase()}/${bioguide}.jpg`;
}

function ageFromBirthday(birthday: string): number {
  const born = new Date(birthday);
  const today = new Date();
  let age = today.getFullYear() - born.getFullYear();
  const m = today.getMonth() - born.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < born.getDate())) age--;
  return age;
}

function daysUntil(dateStr: string): number {
  const target = new Date(dateStr + "T00:00:00");
  const now = new Date();
  return Math.ceil((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}

function fmtDollars(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (Math.abs(n) >= 1_000) return `$${Math.round(n / 1_000)}k`;
  return `$${n}`;
}

export default function DistrictPanel({ districtId, repName, data, onClose, onShowProfile }: Props) {
  const [stateCode, rawNum] = districtId.split("-");
  const districtNum = parseInt(rawNum ?? "0", 10);
  const stateName = STATE_NAMES[stateCode] ?? stateCode;
  const isAtLarge = districtNum === 0 || AT_LARGE_STATES.has(stateCode);
  const districtLabel = isAtLarge
    ? "At-Large District"
    : `${districtNum}${ordinalSuffix(districtNum)} Congressional District`;

  const isVacant = data.party === "Vacant";
  const partyColor = PARTY_COLORS[data.party] ?? PARTY_COLORS.Unknown;
  const partyShort =
    data.party === "Republican" ? "R" :
    data.party === "Democrat" ? "D" :
    data.party === "Independent" ? "I" :
    data.party === "Vacant" ? "V" : "?";

  const rPct = Math.max(0, Math.min(100, 50 + data.margin / 2));
  const dPct = 100 - rPct;
  const marginAbs = Math.abs(data.margin);
  const competitiveness =
    marginAbs < 5 ? "Toss-Up" :
    marginAbs < 10 ? "Competitive" :
    marginAbs < 20 ? `Lean ${data.margin > 0 ? "R" : "D"}` :
    marginAbs < 35 ? `Likely ${data.margin > 0 ? "R" : "D"}` :
    `Safe ${data.margin > 0 ? "R" : "D"}`;
  const competitivenessColor =
    marginAbs < 5 ? "#F59E0B" :
    marginAbs < 10 ? "#F97316" :
    data.margin > 0 ? PARTY_COLORS.Republican : PARTY_COLORS.Democrat;

  const yearsServing = Math.max(0, 2026 - data.termStart);
  const pviLabel = data.pvi === 0 ? "EVEN" : data.pvi > 0 ? `R+${data.pvi}` : `D+${Math.abs(data.pvi)}`;

  const [meta, setMeta] = useState<LegMeta | null>(null);
  const [photoError, setPhotoError] = useState(false);
  const [copied, setCopied] = useState(false);
  const [history, setHistory] = useState<HistoryPoint[] | null>(null);
  const [demographics, setDemographics] = useState<DemographicBreakdown | null>(null);
  const [committees, setCommittees] = useState<CommitteeEntry[] | null>(null);
  const [legStats, setLegStats] = useState<LegStats | null>(null);
  const [fundraising, setFundraising] = useState<FundraisingData | null>(null);
  const [showSources, setShowSources] = useState(false);

  useEffect(() => {
    fetch("/legislator-meta.json")
      .then((r) => r.json())
      .then((all) => setMeta(all[districtId] ?? null))
      .catch(() => setMeta(null));
  }, [districtId]);

  useEffect(() => {
    loadHistory().then((all) => {
      setHistory(all ? (all[districtId] ?? null) : null);
    });
  }, [districtId]);

  useEffect(() => {
    loadDemographics().then((all) => {
      setDemographics(all ? (all[districtId] ?? null) : null);
    });
  }, [districtId]);

  useEffect(() => {
    loadCommittees().then((all) => {
      setCommittees(all ? (all[districtId] ?? null) : null);
    });
  }, [districtId]);

  useEffect(() => {
    loadLegStats().then((all) => {
      setLegStats(all ? (all[districtId] ?? null) : null);
    });
  }, [districtId]);

  useEffect(() => {
    loadFEC().then((all) => {
      setFundraising(all ? (all[districtId] ?? null) : null);
    });
  }, [districtId]);

  // Mobile swipe-down to close
  useEffect(() => {
    let startY = 0;
    const panel = document.getElementById("district-panel");
    if (!panel) return;
    const onStart = (e: TouchEvent) => { startY = e.touches[0].clientY; };
    const onEnd = (e: TouchEvent) => {
      if (e.changedTouches[0].clientY - startY > 80) onClose();
    };
    panel.addEventListener("touchstart", onStart, { passive: true });
    panel.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      panel.removeEventListener("touchstart", onStart);
      panel.removeEventListener("touchend", onEnd);
    };
  }, [onClose]);

  const handleCopyLink = () => {
    const url = `${window.location.origin}/house?d=${districtId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  // Next general election: Nov 3, 2026
  const NEXT_ELECTION = "2026-11-03";
  const daysToElection = daysUntil(NEXT_ELECTION);

  const bioguide = meta?.bioguide;
  const age = meta?.birthday ? ageFromBirthday(meta.birthday) : null;
  const showPhoto = bioguide && !photoError && !isVacant;

  return (
    <div
      id="district-panel"
      className="w-80 xl:w-96 flex flex-col bg-slate-900 border-l border-slate-700/40 animate-slide-in overflow-hidden shrink-0"
      style={{ boxShadow: "-8px 0 32px rgba(0,0,0,0.4)" }}
    >
      {/* Party accent line */}
      <div className="h-0.5 shrink-0" style={{ backgroundColor: partyColor }} />

      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700/40 shrink-0 bg-slate-900/80">
        <div className="min-w-0">
          <p className="text-white font-semibold text-sm leading-tight truncate">{stateName}</p>
          <p className="text-slate-500 text-[11px]">{districtLabel}</p>
        </div>
        <div className="flex items-center gap-1.5">
          {/* Congress.gov link */}
          {bioguide && !isVacant && (
            <a
              href={`https://bioguide.congress.gov/search/bio/${bioguide}`}
              target="_blank"
              rel="noopener noreferrer"
              title="View on Congress.gov"
              className="w-6 h-6 rounded-full flex items-center justify-center transition-colors text-slate-600 hover:text-slate-300 hover:bg-slate-700/60"
              aria-label="View on Congress.gov"
            >
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
          {/* View on Map link */}
          <a
            href={`/house?d=${districtId}`}
            title="View on map"
            className="w-6 h-6 rounded-full flex items-center justify-center transition-colors text-slate-600 hover:text-slate-300 hover:bg-slate-700/60"
            aria-label="View on map"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-1.447-.894L15 9m0 8V9m0 0L9 7" />
            </svg>
          </a>
          {/* Copy link button */}
          <button
            onClick={handleCopyLink}
            title="Copy shareable link"
            className="w-6 h-6 rounded-full flex items-center justify-center transition-colors text-slate-600 hover:text-slate-300 hover:bg-slate-700/60"
            aria-label="Copy link"
          >
            {copied ? (
              <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            ) : (
              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.828 10.172a4 4 0 00-5.656 0l-4 4a4 4 0 105.656 5.656l1.102-1.101m-.758-4.899a4 4 0 005.656 0l4-4a4 4 0 00-5.656-5.656l-1.1 1.1" />
              </svg>
            )}
          </button>
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-full flex items-center justify-center text-slate-600 hover:text-slate-300 hover:bg-slate-700/60 transition-colors text-xs shrink-0"
            aria-label="Close"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">

        {/* Rep card */}
        <div className="px-4 py-5">
          <div className="flex items-center gap-3.5">
            {/* Photo or party initial */}
            {showPhoto ? (
              <img
                src={bioguidePhotoUrl(bioguide!)}
                alt={repName}
                loading="lazy"
                onError={() => setPhotoError(true)}
                className="w-14 h-14 rounded-full object-cover shrink-0 object-top"
                style={{ border: `2px solid ${partyColor}35` }}
              />
            ) : (
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center text-2xl font-bold shrink-0 select-none"
                style={isVacant ? {
                  background: "rgba(55,65,81,0.3)",
                  border: "2px dashed #374151",
                  color: "#4B5563",
                } : {
                  background: `radial-gradient(circle at 35% 35%, ${partyColor}40, ${partyColor}15)`,
                  border: `2px solid ${partyColor}35`,
                  color: partyColor,
                }}
              >
                {partyShort}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-0.5">
                {isVacant ? "Seat Status" : "Representative"}
              </p>
              <h3 className={`font-bold text-sm leading-snug ${isVacant ? "text-slate-500 italic" : "text-white"}`}>
                {isVacant ? "Vacant" : repName}
              </h3>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span
                  className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                  style={{
                    backgroundColor: partyColor + "18",
                    color: partyColor,
                    border: `1px solid ${partyColor}35`,
                  }}
                >
                  {isVacant ? "Vacant" : data.party}
                </span>
                <span className="text-[11px] text-slate-600">{stateCode}-{rawNum}</span>
                {age !== null && !isVacant && (
                  <span className="text-[11px] text-slate-600">
                    Age {age}{meta?.gender === "F" ? " · Female" : meta?.gender === "M" ? " · Male" : ""}
                  </span>
                )}
              </div>
              {data.caucus && (
                <p className="text-[11px] text-slate-500 mt-1">Caucuses with {data.caucus}s</p>
              )}
              {isVacant && data.repElect && (
                <div className="mt-2 px-2 py-1.5 rounded-md" style={{ backgroundColor: "rgba(30,41,59,0.6)", border: "1px solid rgba(71,85,105,0.4)" }}>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest">Representative-elect</p>
                  <p className="text-[12px] text-slate-200 font-semibold mt-0.5">{data.repElect}</p>
                </div>
              )}
              {isVacant && data.electionStatus && (
                <div className="mt-2 px-2 py-1.5 rounded-md flex items-start gap-2" style={{ backgroundColor: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.25)" }}>
                  <span className="text-amber-500 text-[11px] shrink-0 mt-0.5">⚡</span>
                  <div>
                    <p className="text-[10px] text-amber-600 uppercase tracking-widest">Special Election</p>
                    <p className="text-[11px] text-amber-400 font-medium mt-0.5">{data.electionStatus}</p>
                    {data.electionDate && (
                      <p className="text-[10px] text-amber-600 mt-0.5">
                        {new Date(data.electionDate + "T00:00:00").toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="mx-4 border-t border-slate-700/40" />

        {/* 2024 Election */}
        <div className="px-4 py-4">
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-3">2024 Election</p>
          <div className="mb-3">
            <div className="flex h-5 rounded-md overflow-hidden bg-slate-800">
              <div
                className="h-full flex items-center justify-end pr-1.5 text-[10px] text-white/80 font-semibold transition-all duration-700"
                style={{ width: `${rPct}%`, backgroundColor: PARTY_COLORS.Republican, minWidth: rPct > 5 ? undefined : 0 }}
              >
                {rPct > 12 ? `${rPct.toFixed(1)}%` : ""}
              </div>
              <div
                className="h-full flex items-center justify-start pl-1.5 text-[10px] text-white/80 font-semibold transition-all duration-700"
                style={{ width: `${dPct}%`, backgroundColor: PARTY_COLORS.Democrat, minWidth: dPct > 5 ? undefined : 0 }}
              >
                {dPct > 12 ? `${dPct.toFixed(1)}%` : ""}
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <Row label="Margin" value={data.margin === 0 ? "Tie" : `${data.margin > 0 ? "R" : "D"} +${marginAbs.toFixed(1)}%`}
              valueColor={data.margin >= 0 ? PARTY_COLORS.Republican : PARTY_COLORS.Democrat} />
            <Row label="Race Rating" value={competitiveness} valueColor={competitivenessColor} />
          </div>
        </div>

        {/* Election History Sparkline */}
        {history && history.length >= 2 && !isVacant && (
          <>
            <div className="mx-4 border-t border-slate-700/40" />
            <div className="px-4 py-4">
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2">
                Election History <span className="font-normal text-slate-700 normal-case tracking-normal">2000–2024</span>
              </p>
              <ElectionSparkline
                history={history}
                current={data.margin}
                partyColor={partyColor}
              />
              <p className="text-[9px] text-slate-700 mt-1.5 leading-snug">
                Margins may reflect different district boundaries pre-2022 redistricting.
              </p>
            </div>
          </>
        )}

        <div className="mx-4 border-t border-slate-700/40" />

        {/* District Profile */}
        <div className="px-4 py-4">
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-3">District Profile</p>
          <div className="space-y-3">
            <CompareBar
              label="Median Income"
              value={data.income}
              avg={NAT_AVG_INCOME}
              format={(v) => `$${Math.round(v * 1000).toLocaleString()}`}
              color="#f59e0b"
            />
            {NAT_AVG_POVERTY != null && data.povertyPct != null && (
              <CompareBar
                label="Poverty Rate"
                value={data.povertyPct}
                avg={NAT_AVG_POVERTY}
                format={(v) => `${v.toFixed(1)}%`}
                color="#f87171"
              />
            )}
            {NAT_AVG_COLLEGE != null && data.collegePct != null && (
              <CompareBar
                label="College Grad %"
                value={data.collegePct}
                avg={NAT_AVG_COLLEGE}
                format={(v) => `${v.toFixed(1)}%`}
                color="#818cf8"
              />
            )}
            {data.urbanPct != null && (
              <Row label="Urban %" value={`${data.urbanPct.toFixed(1)}%`} />
            )}
            <Row label="Computed PVI" value={pviLabel}
              valueColor={data.pvi > 0 ? PARTY_COLORS.Republican : data.pvi < 0 ? PARTY_COLORS.Democrat : undefined} />
          </div>
        </div>

        {/* Racial Breakdown */}
        {demographics && (
          <>
            <div className="mx-4 border-t border-slate-700/40" />
            <div className="px-4 py-4">
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-3">Racial Breakdown</p>
              <RacialBreakdown demo={demographics} />
            </div>
          </>
        )}

        {/* Full profile button */}
        {!isVacant && (
          <div className="px-4 pb-3">
            <button
              onClick={onShowProfile}
              className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all duration-150 group"
              style={{ backgroundColor: "rgba(30,41,59,0.5)", border: "1px solid rgba(71,85,105,0.4)", color: "#94a3b8" }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(51,65,85,0.6)"; (e.currentTarget as HTMLButtonElement).style.color = "#e2e8f0"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(30,41,59,0.5)"; (e.currentTarget as HTMLButtonElement).style.color = "#94a3b8"; }}
            >
              <span>View Full Profile</span>
              <span className="text-slate-600 group-hover:text-slate-300 transition-colors">→</span>
            </button>
          </div>
        )}

        {!isVacant && <div className="mx-4 border-t border-slate-700/40" />}

        {/* Tenure + Next election */}
        {!isVacant && (
          <div className="px-4 py-4">
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-3">Tenure</p>
            <div className="space-y-2">
              <Row label="First Elected" value={String(data.termStart)} />
              <Row label="Time Served"
                value={yearsServing < 1 ? "< 1 year" : `${yearsServing} year${yearsServing !== 1 ? "s" : ""}`} />
              <Row
                label="Next Election"
                value={daysToElection > 0 ? `Nov 3, 2026 · ${daysToElection}d` : "Nov 3, 2026"}
                valueColor="#94a3b8"
              />
            </div>
          </div>
        )}

        {/* Committee assignments */}
        {!isVacant && committees && committees.filter(c => c.parent === null).length > 0 && (
          <>
            <div className="mx-4 border-t border-slate-700/40" />
            <div className="px-4 py-4">
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-3">Committees</p>
              <div className="space-y-1.5">
                {committees
                  .filter(c => c.parent === null)
                  .map((c) => {
                    const titleColor =
                      c.title?.includes("Chair") && !c.title?.includes("Ranking") ? "#f59e0b" :
                      c.title?.includes("Ranking") ? "#818cf8" :
                      null;
                    const shortName = c.name
                      .replace(/^House (Permanent Select |Select |Committee on the |Committee on )/i, "")
                      .replace(/^House /i, "")
                      .replace(/Committee on /, "");
                    return (
                      <div key={c.name} className="flex items-center justify-between gap-2">
                        <a
                          href={`/committees?c=${encodeURIComponent(shortName)}`}
                          className="text-[11px] leading-snug hover:text-indigo-300 transition-colors"
                          style={{ color: "#94a3b8" }}
                        >
                          {shortName}
                        </a>
                        {c.title && (
                          <span
                            className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
                            style={titleColor ? {
                              backgroundColor: `${titleColor}18`,
                              color: titleColor,
                              border: `1px solid ${titleColor}33`,
                            } : {
                              color: "#475569",
                            }}
                          >
                            {c.title.replace("man", "").replace("woman", "")}
                          </span>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          </>
        )}

        {/* Legislative Activity */}
        {!isVacant && legStats && (
          <>
            <div className="mx-4 border-t border-slate-700/40" />
            <div className="px-4 py-4">
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-3">Legislative Activity</p>
              <div className="space-y-2">
                {legStats.partyUnityPct != null && (
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-slate-500">Party Unity</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${legStats.partyUnityPct}%`, backgroundColor: partyColor }} />
                      </div>
                      <span className="text-[12px] font-semibold tabular-nums" style={{ color: partyColor }}>{legStats.partyUnityPct.toFixed(1)}%</span>
                    </div>
                  </div>
                )}
                {legStats.missedVotesPct != null && (
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-slate-500">Missed Votes</span>
                    <div className="flex items-center gap-2">
                      <div className="w-20 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${Math.min(legStats.missedVotesPct, 100)}%`, backgroundColor: legStats.missedVotesPct > 10 ? "#f87171" : "#64748b" }} />
                      </div>
                      <span className="text-[12px] font-semibold tabular-nums" style={{ color: legStats.missedVotesPct > 10 ? "#f87171" : "#94a3b8" }}>{legStats.missedVotesPct.toFixed(1)}%</span>
                    </div>
                  </div>
                )}
                {legStats.billsSponsored != null && (
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-slate-500">Bills Sponsored</span>
                    <span className="text-[12px] font-semibold text-slate-300 tabular-nums">{legStats.billsSponsored}</span>
                  </div>
                )}
                {legStats.billsCosponsored != null && (
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-slate-500">Bills Cosponsored</span>
                    <span className="text-[12px] font-semibold text-slate-300 tabular-nums">{legStats.billsCosponsored}</span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Fundraising */}
        {!isVacant && fundraising && (
          <>
            <div className="mx-4 border-t border-slate-700/40" />
            <div className="px-4 py-4">
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-3">2024 Fundraising</p>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-slate-500">Raised</span>
                  <span className="text-[12px] font-semibold text-emerald-400 tabular-nums">{fmtDollars(fundraising.raised)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-slate-500">Spent</span>
                  <span className="text-[12px] font-semibold text-slate-300 tabular-nums">{fmtDollars(fundraising.spent)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-slate-500">Cash on Hand</span>
                  <span className="text-[12px] font-semibold text-slate-300 tabular-nums">{fmtDollars(fundraising.cashOnHand)}</span>
                </div>
                {fundraising.debts > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-slate-500">Debts</span>
                    <span className="text-[12px] font-semibold text-red-400 tabular-nums">{fmtDollars(fundraising.debts)}</span>
                  </div>
                )}
                {/* Spend rate bar */}
                {fundraising.raised > 0 && (
                  <div className="pt-1">
                    <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${Math.min(100, (fundraising.spent / fundraising.raised) * 100).toFixed(1)}%`, backgroundColor: "#34d399" }}
                      />
                    </div>
                    <p className="text-[10px] text-slate-700 mt-1">{((fundraising.spent / fundraising.raised) * 100).toFixed(0)}% of raised spent</p>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Contact & Links */}
        {!isVacant && (meta?.phone || meta?.url || meta?.twitter || meta?.office) && (
          <>
            <div className="mx-4 border-t border-slate-700/40" />
            <div className="px-4 py-4">
              <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-3">Contact</p>
              <div className="space-y-2">
                {meta?.phone && (
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-slate-500">Phone</span>
                    <a
                      href={`tel:${meta.phone}`}
                      className="text-[12px] font-medium text-indigo-400 hover:text-indigo-300 transition-colors tabular-nums"
                    >
                      {meta.phone}
                    </a>
                  </div>
                )}
                {meta?.url && (
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-slate-500">Website</span>
                    <a
                      href={meta.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[12px] font-medium text-indigo-400 hover:text-indigo-300 transition-colors truncate max-w-[180px]"
                    >
                      {meta.url.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                    </a>
                  </div>
                )}
                {meta?.twitter && (
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-slate-500">Twitter/X</span>
                    <a
                      href={`https://twitter.com/${meta.twitter}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[12px] font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      @{meta.twitter}
                    </a>
                  </div>
                )}
                {meta?.office && (
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[12px] text-slate-500 shrink-0">Office</span>
                    <span className="text-[11px] text-slate-400 text-right leading-tight">{meta.office}</span>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* Data Sources */}
        <div className="border-t border-slate-700/30">
          <button
            onClick={() => setShowSources((s) => !s)}
            className="w-full flex items-center justify-between px-4 py-2.5 text-left transition-colors hover:bg-slate-800/30"
          >
            <span className="text-[10px] font-bold text-slate-700 uppercase tracking-widest">Data Sources</span>
            <span className="text-slate-700 text-[10px]">{showSources ? "▲" : "▼"}</span>
          </button>
          {showSources && (
            <div className="px-4 pb-3 space-y-1">
              {[
                ["Election results", "MIT Election Data Science Lab (MEDSL)"],
                ["Legislator info", "unitedstates/congress-legislators"],
                ["Photos", "Library of Congress Bioguide"],
                ["Income, Poverty, College", "Census ACS 5-Year 2023"],
                ["Urban %", "2020 Decennial Census"],
                ["Racial breakdown", "Census ACS 5-Year 2023"],
                ["Election history", "MIT MEDSL 1976–2022"],
                ["Committee assignments", "unitedstates/congress-legislators"],
                ...(legStats ? [["Legislative activity", "ProPublica Congress API"]] : []),
                ...(fundraising ? [["Fundraising", "FEC Open Data"]] : []),
              ].map(([label, source]) => (
                <div key={label} className="flex justify-between gap-2">
                  <span className="text-[10px] text-slate-600">{label}</span>
                  <span className="text-[10px] text-slate-700 text-right">{source}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-slate-700/30">
          <p className="text-[10px] text-slate-700 leading-relaxed">
            119th Congress · Data as of April 2026
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Election Sparkline ────────────────────────────────────────────────────────

function ElectionSparkline({
  history,
  current,
  partyColor,
}: {
  history: HistoryPoint[];
  current: number;
  partyColor: string;
}) {
  // Combine historical data with current 2024, deduplicate by year
  const combined = [...history.filter((p) => p.year !== 2024), { year: 2024, margin: current }].sort(
    (a, b) => a.year - b.year
  );
  if (combined.length < 2) return null;

  const W = 200;
  const H = 52;
  const PAD = { top: 6, bottom: 14, left: 6, right: 6 };

  const years = combined.map((p) => p.year);
  const margins = combined.map((p) => p.margin);
  const minYear = Math.min(...years);
  const maxYear = Math.max(...years);
  const rawMin = Math.min(...margins);
  const rawMax = Math.max(...margins);
  const dataRange = rawMax - rawMin;
  const domainMin = Math.min(rawMin - dataRange * 0.1, -5);
  const domainMax = Math.max(rawMax + dataRange * 0.1, 5);
  const domainRange = domainMax - domainMin;

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const yearRange = maxYear - minYear || 1;

  const px = (year: number) => PAD.left + ((year - minYear) / yearRange) * plotW;
  const py = (margin: number) => PAD.top + (1 - (margin - domainMin) / domainRange) * plotH;

  const zeroY = py(0);
  const polyline = combined.map((p) => `${px(p.year).toFixed(1)},${py(p.margin).toFixed(1)}`).join(" ");
  const lastPt = combined[combined.length - 1];

  // Year labels: first and last only
  const firstYear = combined[0].year;
  const lastYear = combined[combined.length - 1].year;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      className="w-full"
      style={{ height: H }}
    >
      {/* Redistricting year markers */}
      {REDISTRICTING_YEARS.filter((y) => y > minYear && y < maxYear).map((y) => (
        <line
          key={`rd-${y}`}
          x1={px(y)}
          x2={px(y)}
          y1={PAD.top}
          y2={PAD.top + plotH}
          stroke="rgba(100,116,139,0.22)"
          strokeWidth={0.8}
          strokeDasharray="2 2"
        />
      ))}
      {/* Zero line */}
      {zeroY >= PAD.top && zeroY <= PAD.top + plotH && (
        <line
          x1={PAD.left}
          x2={W - PAD.right}
          y1={zeroY}
          y2={zeroY}
          stroke="rgba(100,116,139,0.25)"
          strokeWidth={0.6}
          strokeDasharray="2 3"
        />
      )}
      {/* Area fill */}
      <polyline
        points={`${px(firstYear).toFixed(1)},${py(0).toFixed(1)} ${polyline} ${px(lastYear).toFixed(1)},${py(0).toFixed(1)}`}
        fill={`${partyColor}18`}
        stroke="none"
      />
      {/* Line */}
      <polyline
        points={polyline}
        fill="none"
        stroke={partyColor}
        strokeWidth={1.4}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Last year dot */}
      <circle cx={px(lastPt.year)} cy={py(lastPt.margin)} r={2.5} fill={partyColor} />
      {/* Year labels */}
      <text x={PAD.left} y={H - 2} fontSize={7.5} fill="#475569" textAnchor="start">
        {firstYear}
      </text>
      <text x={W - PAD.right} y={H - 2} fontSize={7.5} fill="#475569" textAnchor="end">
        {lastYear}
      </text>
    </svg>
  );
}

const RACE_SEGMENTS: { key: keyof DemographicBreakdown; label: string; color: string }[] = [
  { key: "white",      label: "White",        color: "#94a3b8" },
  { key: "hispanic",   label: "Hispanic",     color: "#f59e0b" },
  { key: "black",      label: "Black",        color: "#34d399" },
  { key: "asian",      label: "Asian",        color: "#818cf8" },
  { key: "multiracial",label: "Multi",        color: "#c084fc" },
  { key: "other",      label: "Other",        color: "#64748b" },
];

function RacialBreakdown({ demo }: { demo: DemographicBreakdown }) {
  const total = Object.values(demo).reduce((s, v) => s + v, 0) || 100;
  const segments = RACE_SEGMENTS.map(seg => ({ ...seg, pct: demo[seg.key] ?? 0 })).filter(s => s.pct > 0);
  return (
    <div className="space-y-2.5">
      {/* Stacked bar */}
      <div className="flex h-3 rounded-full overflow-hidden bg-slate-800">
        {segments.map(seg => (
          <div
            key={seg.key}
            style={{ width: `${(seg.pct / total) * 100}%`, backgroundColor: seg.color, opacity: 0.85 }}
            title={`${seg.label}: ${seg.pct.toFixed(1)}%`}
          />
        ))}
      </div>
      {/* Legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1.5">
        {segments.map(seg => (
          <div key={seg.key} className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: seg.color, opacity: 0.85 }} />
            <span className="text-[10px] text-slate-500">{seg.label}</span>
            <span className="text-[10px] font-medium text-slate-400">{seg.pct.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Row({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-[12px] text-slate-500">{label}</span>
      <span className="text-[12px] font-semibold text-right" style={valueColor ? { color: valueColor } : { color: "#e2e8f0" }}>
        {value}
      </span>
    </div>
  );
}

// Pre-compute national averages from all 435 districts
const _all = getAllDistricts();
const NAT_AVG_INCOME = Math.round(_all.reduce((s, d) => s + d.data.income, 0) / _all.length);
const _withPoverty = _all.filter(d => d.data.povertyPct != null);
const NAT_AVG_POVERTY = _withPoverty.length
  ? _withPoverty.reduce((s, d) => s + (d.data.povertyPct ?? 0), 0) / _withPoverty.length
  : null;
const _withCollege = _all.filter(d => d.data.collegePct != null);
const NAT_AVG_COLLEGE = _withCollege.length
  ? _withCollege.reduce((s, d) => s + (d.data.collegePct ?? 0), 0) / _withCollege.length
  : null;

function CompareBar({
  label,
  value,
  avg,
  format,
  color,
}: {
  label: string;
  value: number;
  avg: number;
  format: (v: number) => string;
  color: string;
}) {
  const pct = Math.min(100, Math.max(0, (value / (avg * 2)) * 100));
  const avgPct = 50;
  const diff = ((value - avg) / avg) * 100;
  const diffLabel = diff >= 0 ? `+${diff.toFixed(0)}%` : `${diff.toFixed(0)}%`;
  const diffColor = diff >= 0 ? "#34d399" : "#f87171";

  return (
    <div className="space-y-1">
      <div className="flex justify-between items-baseline">
        <span className="text-[11px] text-slate-500">{label}</span>
        <span className="flex items-center gap-1.5">
          <span className="text-[12px] font-semibold text-slate-200">{format(value)}</span>
          <span className="text-[10px] font-medium" style={{ color: diffColor }}>{diffLabel} nat&apos;l</span>
        </span>
      </div>
      <div className="relative h-1.5 rounded-full bg-slate-800">
        <div className="absolute h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.7 }} />
        <div className="absolute top-1/2 -translate-y-1/2 w-0.5 h-3 rounded-full" style={{ left: `${avgPct}%`, backgroundColor: "rgba(100,116,139,0.6)" }} />
      </div>
    </div>
  );
}
