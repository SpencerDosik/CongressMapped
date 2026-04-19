"use client";

import { DistrictStaticData } from "@/lib/types";
import { PARTY_COLORS } from "@/lib/colors";
import { STATE_NAMES, AT_LARGE_STATES } from "@/lib/stateFips";

interface Props {
  districtId: string;
  repName: string;
  data: DistrictStaticData;
  onClose: () => void;
  onShowProfile: () => void;
}

function ordinalSuffix(n: number) {
  const v = n % 100;
  if (v >= 11 && v <= 13) return "th";
  return ["th", "st", "nd", "rd"][n % 10] ?? "th";
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


  // Vote bar
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

  return (
    <div
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
        <button
          onClick={onClose}
          className="w-6 h-6 rounded-full flex items-center justify-center text-slate-600 hover:text-slate-300 hover:bg-slate-700/60 transition-colors text-xs shrink-0"
          aria-label="Close"
        >
          ✕
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">

        {/* Rep card */}
        <div className="px-4 py-5">
          <div className="flex items-center gap-3.5">
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
            <div className="min-w-0 flex-1">
              <p className="text-[10px] text-slate-600 uppercase tracking-widest mb-0.5">
                {isVacant ? "Seat Status" : "Representative"}
              </p>
              <h3 className={`font-bold text-sm leading-snug ${isVacant ? "text-slate-500 italic" : "text-white"}`}>
                {isVacant ? "Vacant" : repName}
              </h3>
              <div className="flex items-center gap-2 mt-1.5">
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
              </div>
              {data.caucus && (
                <p className="text-[11px] text-slate-500 mt-1">
                  Caucuses with {data.caucus}s
                </p>
              )}
              {isVacant && data.repElect && (
                <div className="mt-2 px-2 py-1.5 rounded-md" style={{ backgroundColor: "rgba(30,41,59,0.6)", border: "1px solid rgba(71,85,105,0.4)" }}>
                  <p className="text-[10px] text-slate-500 uppercase tracking-widest">Representative-elect</p>
                  <p className="text-[12px] text-slate-200 font-semibold mt-0.5">{data.repElect}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Divider */}
        <div className="mx-4 border-t border-slate-700/40" />

        {/* 2024 Election */}
        <div className="px-4 py-4">
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-3">2024 Election</p>

          {/* Vote share bar */}
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
            <div className="flex justify-between mt-1 text-[10px] text-slate-500">
              <span>R  {rPct.toFixed(1)}%</span>
              <span>D  {dPct.toFixed(1)}%</span>
            </div>
          </div>

          <div className="space-y-2">
            <Row
              label="Margin"
              value={data.margin === 0 ? "Tie" : `${data.margin > 0 ? "R" : "D"} +${marginAbs}%`}
              valueColor={data.margin >= 0 ? PARTY_COLORS.Republican : PARTY_COLORS.Democrat}
            />
            <Row
              label="Race Rating"
              value={competitiveness}
              valueColor={competitivenessColor}
            />
          </div>
        </div>

        <div className="mx-4 border-t border-slate-700/40" />

        {/* District Info */}
        <div className="px-4 py-4">
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-3">District Profile</p>
          <div className="space-y-2">
            <Row
              label="Median Income"
              value={`$${(data.income * 1000).toLocaleString()}`}
            />
            <Row
              label="Cook PVI"
              value={pviLabel}
              valueColor={data.pvi > 0 ? PARTY_COLORS.Republican : data.pvi < 0 ? PARTY_COLORS.Democrat : undefined}
            />
          </div>
        </div>

        {/* Full profile button */}
        {!isVacant && (
          <div className="px-4 pb-3">
            <button
              onClick={onShowProfile}
              className="w-full flex items-center justify-between px-4 py-3 rounded-lg text-sm font-medium transition-all duration-150 group"
              style={{
                backgroundColor: "rgba(30,41,59,0.5)",
                border: "1px solid rgba(71,85,105,0.4)",
                color: "#94a3b8",
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(51,65,85,0.6)"; (e.currentTarget as HTMLButtonElement).style.color = "#e2e8f0"; }}
              onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(30,41,59,0.5)"; (e.currentTarget as HTMLButtonElement).style.color = "#94a3b8"; }}
            >
              <span>View Full Profile</span>
              <span className="text-slate-600 group-hover:text-slate-300 transition-colors">→</span>
            </button>
          </div>
        )}

        {!isVacant && <div className="mx-4 border-t border-slate-700/40" />}

        {/* Tenure */}
        {!isVacant && <div className="px-4 py-4">
          <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-3">Tenure</p>
          <div className="space-y-2">
            <Row label="First Elected" value={String(data.termStart)} />
            <Row
              label="Time Served"
              value={yearsServing < 1 ? "< 1 year" : `${yearsServing} year${yearsServing !== 1 ? "s" : ""}`}
            />
          </div>
        </div>}

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

function Row({
  label,
  value,
  valueColor,
}: {
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-[12px] text-slate-500">{label}</span>
      <span
        className="text-[12px] font-semibold text-right"
        style={valueColor ? { color: valueColor } : { color: "#e2e8f0" }}
      >
        {value}
      </span>
    </div>
  );
}
