"use client";

import { useEffect } from "react";
import { DistrictStaticData } from "@/lib/types";
import { PARTY_COLORS } from "@/lib/colors";
import { STATE_NAMES, AT_LARGE_STATES } from "@/lib/stateFips";

interface Props {
  districtId: string;
  repName: string;
  data: DistrictStaticData;
  onClose: () => void;
}

function ordinalSuffix(n: number) {
  const v = n % 100;
  if (v >= 11 && v <= 13) return "th";
  return ["th", "st", "nd", "rd"][n % 10] ?? "th";
}

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

function PlaceholderRow({ label }: { label: string }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60 last:border-0">
      <span className="text-[12px] text-slate-500">{label}</span>
      <span className="text-[12px] text-slate-700">—</span>
    </div>
  );
}

function StatRow({ label, value, valueColor }: { label: string; value: string; valueColor?: string }) {
  return (
    <div className="flex justify-between items-center py-1.5 border-b border-slate-800/60 last:border-0">
      <span className="text-[12px] text-slate-500">{label}</span>
      <span
        className="text-[12px] font-semibold"
        style={valueColor ? { color: valueColor } : { color: "#e2e8f0" }}
      >
        {value}
      </span>
    </div>
  );
}

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

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col animate-slide-in"
      style={{ backgroundColor: "#0a0e14" }}
    >
      {/* Party accent line */}
      <div className="h-0.5 shrink-0" style={{ backgroundColor: partyColor }} />

      {/* Top bar */}
      <div
        className="flex items-center justify-between px-6 py-3 shrink-0"
        style={{ backgroundColor: "#0d1117", borderBottom: "1px solid rgba(30,41,59,0.8)" }}
      >
        <button
          onClick={onClose}
          className="flex items-center gap-2 text-slate-400 hover:text-white transition-colors text-sm"
        >
          <span>←</span>
          <span>Back to Map</span>
        </button>
        <div className="text-center">
          <p className="text-white font-semibold text-sm">{repName}</p>
          <p className="text-slate-500 text-[11px]">{stateName} · {districtLabel}</p>
        </div>
        <div className="w-24" /> {/* spacer to center title */}
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
                {data.caucus && (
                  <span className="text-xs text-slate-500">Caucuses with {data.caucus}s</span>
                )}
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
                  <div
                    className="h-full flex items-center justify-end pr-1.5 text-[10px] text-white/80 font-semibold"
                    style={{ width: `${rPct}%`, backgroundColor: PARTY_COLORS.Republican }}
                  >
                    {rPct > 15 ? `${rPct.toFixed(1)}%` : ""}
                  </div>
                  <div
                    className="h-full flex items-center justify-start pl-1.5 text-[10px] text-white/80 font-semibold"
                    style={{ width: `${dPct}%`, backgroundColor: PARTY_COLORS.Democrat }}
                  >
                    {dPct > 15 ? `${dPct.toFixed(1)}%` : ""}
                  </div>
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

          {/* Biography — placeholder */}
          <SectionCard title="Biography">
            <PlaceholderRow label="Age" />
            <PlaceholderRow label="Born" />
            <PlaceholderRow label="Education" />
            <PlaceholderRow label="Career background" />
            <PlaceholderRow label="Religion" />
          </SectionCard>

          {/* Legislative Record — placeholder */}
          <SectionCard title="Legislative Record">
            <PlaceholderRow label="Bills sponsored (119th)" />
            <PlaceholderRow label="Bills passed" />
            <PlaceholderRow label="Co-sponsorships" />
            <PlaceholderRow label="Missed votes (%)" />
            <PlaceholderRow label="Party unity score" />
          </SectionCard>

          {/* Committee Assignments — placeholder */}
          <SectionCard title="Committee Assignments">
            <p className="text-[12px] text-slate-700 italic">No data available yet</p>
          </SectionCard>

          {/* District Demographics — placeholder */}
          <SectionCard title="District Demographics">
            <PlaceholderRow label="Population" />
            <PlaceholderRow label="Median age" />
            <PlaceholderRow label="White (%)" />
            <PlaceholderRow label="Black (%)" />
            <PlaceholderRow label="Hispanic (%)" />
            <PlaceholderRow label="College-educated (%)" />
            <PlaceholderRow label="Poverty rate (%)" />
          </SectionCard>

          {/* Campaign Finance — placeholder */}
          <SectionCard title="Campaign Finance">
            <PlaceholderRow label="Total raised (2024 cycle)" />
            <PlaceholderRow label="Total spent" />
            <PlaceholderRow label="Cash on hand" />
            <PlaceholderRow label="Top donor industry" />
          </SectionCard>

          {/* Links — placeholder */}
          <SectionCard title="External Links">
            <p className="text-[12px] text-slate-700 italic">No links available yet</p>
          </SectionCard>

          <p className="text-[10px] text-slate-700 text-center pb-4">
            119th Congress · Data as of April 2026
          </p>
        </div>
      </div>
    </div>
  );
}
