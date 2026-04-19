"use client";

import { useMemo } from "react";
import { getRankedByCompetitiveness, getDistrictData } from "@/lib/districtData";
import { STATE_NAMES, AT_LARGE_STATES } from "@/lib/stateFips";
import { PARTY_COLORS } from "@/lib/colors";

interface Props {
  onSelectDistrict: (id: string) => void;
  selectedId: string | null;
}

function ordinalSuffix(n: number) {
  const v = n % 100;
  if (v >= 11 && v <= 13) return "th";
  return ["th", "st", "nd", "rd"][n % 10] ?? "th";
}

function CompetitivenessBar({ score }: { score: number }) {
  const color =
    score >= 85 ? "#F59E0B" :
    score >= 70 ? "#F97316" :
    score >= 55 ? "#6366F1" :
    "#475569";

  return (
    <div className="flex items-center gap-1.5 mt-0.5">
      <div className="flex-1 h-1 rounded-full bg-slate-800 overflow-hidden">
        <div
          className="h-full rounded-full transition-all"
          style={{ width: `${score}%`, backgroundColor: color }}
        />
      </div>
      <span className="text-[10px] font-mono tabular-nums shrink-0" style={{ color }}>
        {score.toFixed(0)}
      </span>
    </div>
  );
}

export default function BattlegroundSidebar({ onSelectDistrict, selectedId }: Props) {
  const ranked = useMemo(() => getRankedByCompetitiveness().slice(0, 50), []);

  return (
    <div
      className="w-72 xl:w-80 flex flex-col shrink-0 border-l border-slate-700/40 overflow-hidden"
      style={{ backgroundColor: "#0d1117" }}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-slate-700/40 shrink-0">
        <p className="text-white font-semibold text-sm leading-tight">Battleground Districts</p>
        <p className="text-slate-500 text-[11px] mt-0.5">Top 50 most competitive races</p>
      </div>

      {/* Legend row */}
      <div className="px-4 py-2 border-b border-slate-700/30 flex items-center justify-between shrink-0">
        <span className="text-[10px] text-slate-600 uppercase tracking-widest">District</span>
        <span className="text-[10px] text-slate-600 uppercase tracking-widest">Score</span>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {ranked.map(({ id, score }, i) => {
          const data = getDistrictData(id);
          if (!data) return null;

          const [stateCode, rawNum] = id.split("-");
          const districtNum = parseInt(rawNum ?? "0", 10);
          const stateName = STATE_NAMES[stateCode] ?? stateCode;
          const isAtLarge = districtNum === 0 || AT_LARGE_STATES.has(stateCode);
          const districtLabel = isAtLarge
            ? "At-Large"
            : `${districtNum}${ordinalSuffix(districtNum)}`;

          const partyColor = PARTY_COLORS[data.party] ?? PARTY_COLORS.Unknown;
          const isSelected = id === selectedId;

          const ratingLabel =
            score >= 85 ? "Toss-Up" :
            score >= 70 ? "Competitive" :
            score >= 55 ? `Lean ${data.margin > 0 ? "R" : "D"}` :
            `Likely ${data.margin > 0 ? "R" : "D"}`;

          return (
            <button
              key={id}
              onClick={() => onSelectDistrict(id)}
              className="w-full px-4 py-2.5 text-left transition-colors border-b border-slate-800/50 hover:bg-slate-800/40"
              style={isSelected ? { backgroundColor: "rgba(99,102,241,0.12)" } : undefined}
            >
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-slate-600 w-5 tabular-nums shrink-0">{i + 1}</span>
                <div
                  className="w-2 h-2 rounded-full shrink-0"
                  style={{ backgroundColor: partyColor }}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-1">
                    <p className="text-white text-xs font-medium truncate">{stateName} {districtLabel}</p>
                    <span className="text-[10px] text-slate-500 shrink-0">{id}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] text-slate-500 truncate">{data.repName}</span>
                    <span
                      className="text-[9px] font-semibold shrink-0"
                      style={{
                        color: score >= 85 ? "#F59E0B" : score >= 70 ? "#F97316" : "#94a3b8",
                      }}
                    >
                      {ratingLabel}
                    </span>
                  </div>
                  <CompetitivenessBar score={score} />
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-slate-700/30 shrink-0">
        <p className="text-[10px] text-slate-700">
          Score = 100 − (|PVI| × 0.6 + |margin| × 0.4)
        </p>
      </div>
    </div>
  );
}
