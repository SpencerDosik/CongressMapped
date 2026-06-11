"use client";

import { useEffect, useState } from "react";
import { DistrictStaticData } from "@/lib/types";
import { PARTY_COLORS } from "@/lib/colors";
import { STATE_NAMES, AT_LARGE_STATES } from "@/lib/stateFips";
import { getAllDistricts } from "@/lib/districtData";

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
}

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

  useEffect(() => {
    fetch("/legislator-meta.json")
      .then((r) => r.json())
      .then((all) => setMeta(all[districtId] ?? null))
      .catch(() => setMeta(null));
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
                  <span className="text-[11px] text-slate-600">Age {age}</span>
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

        {/* Footer */}
        <div className="px-4 py-3 border-t border-slate-700/30">
          <p className="text-[10px] text-slate-700 leading-relaxed">
            119th Congress · Data as of April 2026
          </p>
        </div>
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
