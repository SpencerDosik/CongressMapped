"use client";

import { useEffect, useState } from "react";
import { DistrictStaticData } from "@/lib/types";
import { PARTY_COLORS } from "@/lib/colors";
import { STATE_NAMES, AT_LARGE_STATES } from "@/lib/stateFips";

interface Props {
  districtId: string;
  repName: string;
  data: DistrictStaticData;
  onClose: () => void;
}

// ── Types for fetched data ────────────────────────────────────────────────────

interface LegislatorMeta {
  bioguide: string | null;
  fecIds: string[];
  phone: string | null;
  url: string | null;
  office: string | null;
  contactForm: string | null;
  twitter: string | null;
}

interface CommitteeEntry {
  code: string;
  name: string;
  type: string;
  rank: number | null;
  title: string | null;
  parent: string | null;
}

interface FecData {
  noData?: boolean;
  name?: string;
  raised?: number;
  spent?: number;
  cashOnHand?: number;
  topIndustries?: { name: string; total: number }[];
  allCandidates?: { name: string; party: string; raised: number }[];
  error?: string;
}

interface Demographics {
  noData?: boolean;
  population?: number;
  medianAge?: number;
  medianIncome?: number;
  pctWhite?: number;
  pctBlack?: number;
  pctHispanic?: number;
  pctCollegeEducated?: number;
  pctPoverty?: number;
  error?: string;
}

interface Bill {
  number: string | null;
  title: string | null;
  type: string | null;
  congress: string | null;
  latestAction: string | null;
  latestActionDate: string | null;
  url: string | null;
}

interface CongressData {
  noKey?: boolean;
  sponsored?: Bill[];
  cosponsored?: Bill[];
  error?: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function ordinalSuffix(n: number) {
  const v = n % 100;
  if (v >= 11 && v <= 13) return "th";
  return ["th", "st", "nd", "rd"][n % 10] ?? "th";
}

function fmt$(n: number) {
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `$${(n / 1_000).toFixed(0)}K`;
  return `$${n.toFixed(0)}`;
}

function fmtPct(n: number | undefined | null) {
  return n != null ? `${n.toFixed(1)}%` : "—";
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div
      className="rounded-xl p-5"
      style={{ backgroundColor: "rgba(15,23,42,0.8)", border: "1px solid rgba(30,41,59,0.8)" }}
    >
      <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-4">{title}</p>
      {children}
    </div>
  );
}

function StatRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60 last:border-0">
      <span className="text-[12px] text-slate-500">{label}</span>
      <span className="text-[12px] font-semibold" style={valueColor ? { color: valueColor } : { color: "#e2e8f0" }}>
        {value}
      </span>
    </div>
  );
}

function PlaceholderRow({ label }: { label: string }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60 last:border-0">
      <span className="text-[12px] text-slate-500">{label}</span>
      <span className="text-[12px] text-slate-700">—</span>
    </div>
  );
}

function LoadingRows({ count }: { count: number }) {
  return (
    <>
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex justify-between items-center py-1.5 border-b border-slate-800/60 last:border-0">
          <div className="h-3 w-24 rounded bg-slate-800 animate-pulse" />
          <div className="h-3 w-16 rounded bg-slate-800 animate-pulse" />
        </div>
      ))}
    </>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function RepProfile({ districtId, repName, data, onClose }: Props) {
  const [stateCode, rawNum] = districtId.split("-");
  const districtNum = parseInt(rawNum ?? "0", 10);
  const stateName = STATE_NAMES[stateCode] ?? stateCode;
  const isAtLarge = districtNum === 0 || AT_LARGE_STATES.has(stateCode);
  const districtLabel = isAtLarge
    ? "At-Large District"
    : `${districtNum}${ordinalSuffix(districtNum)} Congressional District`;

  const partyColor = PARTY_COLORS[data.party] ?? PARTY_COLORS.Unknown;
  const partyShort =
    data.party === "Republican" ? "R" :
    data.party === "Democrat" ? "D" :
    data.party === "Independent" ? "I" : "?";

  const yearsServing = Math.max(0, 2026 - data.termStart);
  const marginAbs = Math.abs(data.margin);
  const pviLabel = data.pvi === 0 ? "EVEN" : data.pvi > 0 ? `R+${data.pvi}` : `D+${Math.abs(data.pvi)}`;
  const competitiveness =
    marginAbs < 5 ? "Toss-Up" :
    marginAbs < 10 ? "Competitive" :
    marginAbs < 20 ? `Lean ${data.margin > 0 ? "R" : "D"}` :
    marginAbs < 35 ? `Likely ${data.margin > 0 ? "R" : "D"}` :
    `Safe ${data.margin > 0 ? "R" : "D"}`;

  const rPct = Math.max(0, Math.min(100, 50 + data.margin / 2));
  const dPct = 100 - rPct;

  // ── Fetched state ──────────────────────────────────────────────────────────
  const [meta, setMeta] = useState<LegislatorMeta | null>(null);
  const [committees, setCommittees] = useState<CommitteeEntry[] | null>(null);
  const [fec, setFec] = useState<FecData | null>(null);
  const [demographics, setDemographics] = useState<Demographics | null>(null);
  const [congress, setCongress] = useState<CongressData | null>(null);

  // Load static JSON (contact + committees)
  useEffect(() => {
    fetch("/legislator-meta.json")
      .then((r) => r.json())
      .then((all) => setMeta(all[districtId] ?? null))
      .catch(() => setMeta(null));

    fetch("/committee-data.json")
      .then((r) => r.json())
      .then((all) => setCommittees(all[districtId] ?? []))
      .catch(() => setCommittees([]));
  }, [districtId]);

  // Load FEC data
  useEffect(() => {
    fetch(`/api/fec/${districtId}`)
      .then((r) => r.json())
      .then(setFec)
      .catch(() => setFec({ error: "unavailable" }));
  }, [districtId]);

  // Load Census demographics
  useEffect(() => {
    fetch(`/api/demographics/${districtId}`)
      .then((r) => r.json())
      .then(setDemographics)
      .catch(() => setDemographics({ error: "unavailable" }));
  }, [districtId]);

  // Load Congress.gov legislative data (requires bioguide, wait for meta)
  useEffect(() => {
    if (!meta?.bioguide) return;
    fetch(`/api/congress/${meta.bioguide}`)
      .then((r) => r.json())
      .then(setCongress)
      .catch(() => setCongress({ error: "unavailable" }));
  }, [meta]);

  // Escape key handler
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex flex-col animate-slide-in" style={{ backgroundColor: "#0a0e14" }}>
      {/* Party accent line */}
      <div className="h-0.5 shrink-0" style={{ backgroundColor: partyColor }} />

      {/* Top bar */}
      <div
        className="flex items-center justify-between px-6 py-3 shrink-0"
        style={{ backgroundColor: "#0d1117", borderBottom: "1px solid rgba(30,41,59,0.8)" }}
      >
        <button onClick={onClose} className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm">
          <span>←</span>
          <span>Back to Map</span>
        </button>
        <div className="text-center">
          <p className="text-white font-semibold text-sm">{repName}</p>
          <p className="text-slate-500 text-[11px]">{stateName} · {districtLabel}</p>
        </div>
        <div className="w-24" />
      </div>

      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-6 py-8 space-y-5">

          {/* Hero */}
          <div className="flex items-center gap-5 mb-2">
            <div
              className="w-20 h-20 rounded-full flex items-center justify-center text-3xl font-bold shrink-0"
              style={{
                background: `radial-gradient(circle at 35% 35%, ${partyColor}50, ${partyColor}20)`,
                border: `2px solid ${partyColor}40`,
                color: partyColor,
              }}
            >
              {partyShort}
            </div>
            <div>
              <h1 className="text-white text-2xl font-bold leading-tight">{repName}</h1>
              <p className="text-slate-400 text-sm mt-0.5">{stateName} · {districtLabel}</p>
              <div className="flex items-center gap-2 mt-2">
                <span
                  className="text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: partyColor + "20", color: partyColor, border: `1px solid ${partyColor}40` }}
                >
                  {data.party}
                </span>
                {data.caucus && <span className="text-xs text-slate-500">Caucuses with {data.caucus}s</span>}
                <span className="text-xs text-slate-600">{districtId}</span>
              </div>
            </div>
          </div>

          {/* Two-column overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* 2024 Election */}
            <SectionCard title="2024 Election">
              <div className="mb-4">
                <div className="flex h-4 rounded-md overflow-hidden bg-slate-800 mb-2">
                  <div className="h-full" style={{ width: `${rPct}%`, backgroundColor: PARTY_COLORS.Republican }} />
                  <div className="h-full" style={{ width: `${dPct}%`, backgroundColor: PARTY_COLORS.Democrat }} />
                </div>
              </div>
              <StatRow
                label="Margin"
                value={data.margin === 0 ? "Tie" : `${data.margin > 0 ? "R" : "D"} +${marginAbs}%`}
                valueColor={data.margin >= 0 ? PARTY_COLORS.Republican : PARTY_COLORS.Democrat}
              />
              <StatRow label="Race Rating" value={competitiveness} />
              <StatRow
                label="Cook PVI"
                value={pviLabel}
                valueColor={data.pvi > 0 ? PARTY_COLORS.Republican : data.pvi < 0 ? PARTY_COLORS.Democrat : undefined}
              />
            </SectionCard>

            {/* District & Tenure */}
            <SectionCard title="District & Tenure">
              <StatRow label="Median Income" value={`$${(data.income * 1000).toLocaleString()}`} />
              <StatRow label="First Elected" value={String(data.termStart)} />
              <StatRow
                label="Time Served"
                value={yearsServing < 1 ? "< 1 year" : `${yearsServing} year${yearsServing !== 1 ? "s" : ""}`}
              />
            </SectionCard>
          </div>

          {/* Contact & Offices */}
          <SectionCard title="Contact & Offices">
            {meta === null ? (
              <LoadingRows count={3} />
            ) : (
              <>
                {meta?.phone && <StatRow label="Washington D.C. Office" value={meta.phone} />}
                {meta?.office && <StatRow label="Office Address" value={meta.office} />}
                {meta?.url && (
                  <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60 last:border-0">
                    <span className="text-[12px] text-slate-500">Official Website</span>
                    <a
                      href={meta.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[12px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      {new URL(meta.url).hostname} →
                    </a>
                  </div>
                )}
                {meta?.contactForm && (
                  <div className="flex justify-between items-center py-1.5 last:border-0">
                    <span className="text-[12px] text-slate-500">Contact Form</span>
                    <a
                      href={meta.contactForm}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[12px] font-semibold text-indigo-400 hover:text-indigo-300 transition-colors"
                    >
                      Open form →
                    </a>
                  </div>
                )}
                {!meta?.phone && !meta?.url && (
                  <p className="text-[12px] text-slate-700 italic">No contact data available</p>
                )}
              </>
            )}
          </SectionCard>

          {/* Committee Assignments */}
          <SectionCard title="Committee Assignments">
            {committees === null ? (
              <LoadingRows count={3} />
            ) : committees.length === 0 ? (
              <p className="text-[12px] text-slate-700 italic">No committee data available</p>
            ) : (
              <div className="space-y-0">
                {committees.map((c, i) => (
                  <div
                    key={i}
                    className="flex items-start justify-between py-1.5 border-b border-slate-800/60 last:border-0 gap-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] text-slate-300 font-medium leading-snug">
                        {c.parent ? `└ ${c.name}` : c.name}
                      </p>
                      {c.parent && (
                        <p className="text-[10px] text-slate-600 mt-0.5">{c.parent}</p>
                      )}
                    </div>
                    {c.title && (
                      <span className="text-[10px] text-slate-500 shrink-0 mt-0.5">{c.title}</span>
                    )}
                  </div>
                ))}
              </div>
            )}
          </SectionCard>

          {/* District Demographics */}
          <SectionCard title="District Demographics">
            {demographics === null ? (
              <LoadingRows count={7} />
            ) : demographics.error || demographics.noData ? (
              <>
                <PlaceholderRow label="Population" />
                <PlaceholderRow label="Median age" />
                <PlaceholderRow label="Median income" />
                <PlaceholderRow label="White (%)" />
                <PlaceholderRow label="Black (%)" />
                <PlaceholderRow label="Hispanic (%)" />
                <PlaceholderRow label="College-educated (%)" />
                <PlaceholderRow label="Poverty rate (%)" />
                <p className="text-[10px] text-slate-700 mt-2">Source: Census ACS 2022</p>
              </>
            ) : (
              <>
                {demographics.population != null && (
                  <StatRow label="Population" value={demographics.population.toLocaleString()} />
                )}
                {demographics.medianAge != null && (
                  <StatRow label="Median Age" value={`${demographics.medianAge.toFixed(1)} yrs`} />
                )}
                {demographics.medianIncome != null && (
                  <StatRow label="Median Income" value={`$${demographics.medianIncome.toLocaleString()}`} />
                )}
                <StatRow label="White" value={fmtPct(demographics.pctWhite)} />
                <StatRow label="Black" value={fmtPct(demographics.pctBlack)} />
                <StatRow label="Hispanic" value={fmtPct(demographics.pctHispanic)} />
                <StatRow label="College-educated" value={fmtPct(demographics.pctCollegeEducated)} />
                <StatRow label="Poverty rate" value={fmtPct(demographics.pctPoverty)} />
                <p className="text-[10px] text-slate-700 mt-2">Source: Census ACS 5-Year (2022)</p>
              </>
            )}
          </SectionCard>

          {/* Campaign Finance */}
          <SectionCard title="Campaign Finance (2024 Cycle)">
            {fec === null ? (
              <LoadingRows count={4} />
            ) : fec.error || fec.noData ? (
              <>
                <PlaceholderRow label="Total raised" />
                <PlaceholderRow label="Total spent" />
                <PlaceholderRow label="Cash on hand" />
                <PlaceholderRow label="Top donor industry" />
                <p className="text-[10px] text-slate-700 mt-2">Source: FEC Open Data</p>
              </>
            ) : (
              <>
                {fec.raised != null && <StatRow label="Total Raised" value={fmt$(fec.raised)} />}
                {fec.spent != null && <StatRow label="Total Spent" value={fmt$(fec.spent)} />}
                {fec.cashOnHand != null && <StatRow label="Cash on Hand" value={fmt$(fec.cashOnHand)} />}
                {fec.topIndustries && fec.topIndustries.length > 0 && (
                  <>
                    <p className="text-[10px] text-slate-600 uppercase tracking-widest mt-3 mb-2">Top Donor Industries</p>
                    {fec.topIndustries.slice(0, 5).map((ind, i) => (
                      <div key={i} className="flex justify-between items-center py-1.5 border-b border-slate-800/60 last:border-0">
                        <span className="text-[12px] text-slate-500 truncate mr-2">{ind.name || "Unknown"}</span>
                        <span className="text-[12px] font-semibold text-slate-300 shrink-0">{fmt$(ind.total)}</span>
                      </div>
                    ))}
                  </>
                )}
                <p className="text-[10px] text-slate-700 mt-2">Source: FEC Open Data</p>
              </>
            )}
          </SectionCard>

          {/* Legislative Record */}
          <SectionCard title="Legislative Record (119th Congress)">
            {congress === null ? (
              <LoadingRows count={4} />
            ) : congress.noKey ? (
              <p className="text-[12px] text-slate-600 italic">
                Set <code className="text-slate-500 bg-slate-800 px-1 rounded">CONGRESS_GOV_API_KEY</code> in your environment to enable legislative data.
              </p>
            ) : congress.error ? (
              <>
                <PlaceholderRow label="Bills sponsored" />
                <PlaceholderRow label="Bills co-sponsored" />
                <PlaceholderRow label="Party unity score" />
              </>
            ) : (
              <>
                {congress.sponsored && congress.sponsored.length > 0 && (
                  <>
                    <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-2">
                      Sponsored Bills ({congress.sponsored.length} shown)
                    </p>
                    {congress.sponsored.map((bill, i) => (
                      <div key={i} className="py-1.5 border-b border-slate-800/60 last:border-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-[11px] font-semibold text-slate-400 shrink-0">
                            {bill.type} {bill.number}
                          </span>
                          {bill.latestActionDate && (
                            <span className="text-[10px] text-slate-700 shrink-0">
                              {bill.latestActionDate}
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-300 mt-0.5 leading-snug line-clamp-2">
                          {bill.title}
                        </p>
                        {bill.latestAction && (
                          <p className="text-[10px] text-slate-600 mt-0.5 line-clamp-1">
                            {bill.latestAction}
                          </p>
                        )}
                      </div>
                    ))}
                  </>
                )}
                {congress.cosponsored && congress.cosponsored.length > 0 && (
                  <>
                    <p className="text-[10px] text-slate-600 uppercase tracking-widest mt-3 mb-2">
                      Co-sponsored ({congress.cosponsored.length} shown)
                    </p>
                    {congress.cosponsored.map((bill, i) => (
                      <div key={i} className="py-1.5 border-b border-slate-800/60 last:border-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="text-[11px] font-semibold text-slate-400 shrink-0">
                            {bill.type} {bill.number}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-300 mt-0.5 leading-snug line-clamp-1">
                          {bill.title}
                        </p>
                      </div>
                    ))}
                  </>
                )}
                {(!congress.sponsored || congress.sponsored.length === 0) &&
                  (!congress.cosponsored || congress.cosponsored.length === 0) && (
                  <p className="text-[12px] text-slate-700 italic">No legislation found</p>
                )}
                <p className="text-[10px] text-slate-700 mt-2">Source: Congress.gov API</p>
              </>
            )}
          </SectionCard>

          {/* Biography — still placeholder, data not yet available */}
          <SectionCard title="Biography">
            <PlaceholderRow label="Age" />
            <PlaceholderRow label="Born" />
            <PlaceholderRow label="Education" />
            <PlaceholderRow label="Career background" />
            <PlaceholderRow label="Religion" />
          </SectionCard>

          <p className="text-[10px] text-slate-700 text-center pb-4">
            119th Congress · Data as of April 2026
          </p>
        </div>
      </div>
    </div>
  );
}
