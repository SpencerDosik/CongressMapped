"use client";

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
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return s[(v - 20) % 10] ?? s[v] ?? s[0];
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="px-5 py-4 border-b border-slate-700/50 last:border-0">
      <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
        {title}
      </h4>
      {children}
    </div>
  );
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="flex justify-between items-center py-0.5">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="text-sm font-semibold" style={accent ? { color: accent } : undefined}>
        {value ?? <span className="text-slate-600">—</span>}
      </span>
    </div>
  );
}

export default function DistrictPanel({ districtId, repName, data, onClose }: Props) {
  const [stateCode, rawNum] = districtId.split("-");
  const districtNum = parseInt(rawNum ?? "0", 10);
  const stateName = STATE_NAMES[stateCode] ?? stateCode;
  const isAtLarge = districtNum === 0 || AT_LARGE_STATES.has(stateCode);

  const districtLabel = isAtLarge
    ? "At-Large"
    : `${districtNum}${ordinalSuffix(districtNum)} District`;

  const partyColor = PARTY_COLORS[data.party] ?? PARTY_COLORS.Unknown;
  const initials = repName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Vote-share math
  const rPct = Math.max(0, Math.min(100, 50 + data.margin / 2));
  const dPct = 100 - rPct;
  const winnerPct = data.margin >= 0 ? rPct : dPct;
  const winnerLabel = data.margin >= 0 ? "Republican" : "Democrat";
  const marginLabel = data.margin === 0 ? "0% — Tie" : `${data.margin > 0 ? "+" : ""}${data.margin}%`;

  const competitiveness =
    Math.abs(data.margin) < 5
      ? "Toss-Up"
      : Math.abs(data.margin) < 10
      ? "Competitive"
      : Math.abs(data.margin) < 20
      ? `Lean ${winnerLabel.slice(0, 1)}`
      : Math.abs(data.margin) < 35
      ? `Likely ${winnerLabel.slice(0, 1)}`
      : `Safe ${winnerLabel.slice(0, 1)}`;

  const yearsServing = Math.max(0, 2025 - data.termStart);
  const approxTerms = Math.ceil(yearsServing / 2);

  const pviLabel =
    data.pvi === 0 ? "EVEN" : data.pvi > 0 ? `R+${data.pvi}` : `D+${Math.abs(data.pvi)}`;

  return (
    <div className="w-80 xl:w-96 flex flex-col bg-slate-800 border-l border-slate-700/50 animate-slide-in overflow-hidden shrink-0 shadow-2xl">
      {/* Party color accent */}
      <div className="h-1 shrink-0" style={{ backgroundColor: partyColor }} />

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-700/50 shrink-0">
        <div>
          <h2 className="text-white font-bold text-sm leading-tight">{stateName}</h2>
          <p className="text-slate-400 text-xs mt-0.5">{districtLabel}</p>
        </div>
        <button
          onClick={onClose}
          className="w-7 h-7 rounded-full flex items-center justify-center text-slate-500 hover:text-white hover:bg-slate-700 transition-colors text-sm leading-none"
          aria-label="Close panel"
        >
          ✕
        </button>
      </div>

      {/* Scrollable body */}
      <div className="flex-1 overflow-y-auto">
        {/* Rep info */}
        <div className="px-5 py-5 border-b border-slate-700/50">
          <div className="flex items-center gap-4">
            {/* Avatar */}
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold shrink-0"
              style={{
                backgroundColor: partyColor + "22",
                border: `2px solid ${partyColor}55`,
                color: partyColor,
              }}
            >
              {initials}
            </div>

            <div className="min-w-0">
              <p className="text-[11px] text-slate-500 uppercase tracking-wide">Representative</p>
              <h3 className="text-white font-bold text-base leading-tight mt-0.5 truncate">
                {repName}
              </h3>
              <div className="mt-1.5">
                <span
                  className="text-xs font-semibold px-2.5 py-0.5 rounded-full"
                  style={{
                    backgroundColor: partyColor + "20",
                    color: partyColor,
                    border: `1px solid ${partyColor}40`,
                  }}
                >
                  {data.party === "Republican"
                    ? "R — Republican"
                    : data.party === "Democrat"
                    ? "D — Democrat"
                    : "I — Independent"}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* 2024 Election */}
        <Section title="2024 Election">
          <div className="space-y-3">
            {/* Vote bar */}
            <div>
              <div className="flex h-4 rounded overflow-hidden bg-slate-700/60">
                <div
                  className="h-full transition-all duration-500"
                  style={{
                    width: `${rPct}%`,
                    backgroundColor: PARTY_COLORS.Republican,
                    minWidth: rPct > 0 ? 3 : 0,
                  }}
                />
                <div
                  className="h-full transition-all duration-500"
                  style={{
                    width: `${dPct}%`,
                    backgroundColor: PARTY_COLORS.Democrat,
                    minWidth: dPct > 0 ? 3 : 0,
                  }}
                />
              </div>
              <div className="flex justify-between mt-1.5 text-xs">
                <span className="text-red-400">R {rPct.toFixed(1)}%</span>
                <span className="text-blue-400">D {dPct.toFixed(1)}%</span>
              </div>
            </div>

            <Stat
              label="Margin of Victory"
              value={marginLabel}
              accent={data.margin >= 0 ? PARTY_COLORS.Republican : PARTY_COLORS.Democrat}
            />
            <Stat label="Race Classification" value={competitiveness} />
          </div>
        </Section>

        {/* Demographics */}
        <Section title="Demographics">
          <div className="space-y-1">
            <Stat
              label="Median Household Income"
              value={`$${(data.income * 1000).toLocaleString()}`}
            />
            <Stat
              label="Cook PVI"
              value={pviLabel}
              accent={
                data.pvi > 0
                  ? PARTY_COLORS.Republican
                  : data.pvi < 0
                  ? PARTY_COLORS.Democrat
                  : undefined
              }
            />
          </div>
        </Section>

        {/* Tenure */}
        <Section title="Tenure">
          <div className="space-y-1">
            <Stat label="First Elected" value={String(data.termStart)} />
            <Stat
              label="Years Serving"
              value={yearsServing === 0 ? "< 1 year" : `${yearsServing} yrs`}
            />
            <Stat label="Approx. Terms" value={`~${approxTerms}`} />
          </div>

          {/* Tenure bar */}
          <div className="mt-3">
            <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{
                  width: `${Math.min(100, (yearsServing / 30) * 100)}%`,
                  backgroundColor: partyColor,
                  minWidth: yearsServing > 0 ? 4 : 0,
                }}
              />
            </div>
            <div className="flex justify-between mt-1 text-[10px] text-slate-600">
              <span>0 yrs</span>
              <span>30 yrs</span>
            </div>
          </div>
        </Section>

        {/* Data note */}
        <div className="px-5 py-4">
          <div className="rounded-lg bg-slate-700/30 border border-slate-600/30 p-3">
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Data reflects 119th Congress (April 2026). Election margins from 2024 general results. Income figures are district-level estimates.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
