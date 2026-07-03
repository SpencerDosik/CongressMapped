"use client";

import { useMemo, useState } from "react";
import { scaleLinear } from "d3-scale";
import { PARTY_COLORS } from "@/lib/colors";

// ── Public types ──────────────────────────────────────────────────────────────

export interface AxisConfig {
  key: string;
  label: string;
  /** Partisan axis: negative values lean D, positive lean R (center line at 0). */
  partisan?: boolean;
  /** Tooltip value formatting. */
  format: (v: number) => string;
  /** Axis tick label formatting. */
  tickFormat: (v: number) => string;
}

export interface MemberPoint {
  districtId: string;
  name: string;
  party: "Republican" | "Democrat" | "Independent";
  stateName: string;
  districtLabel: string;
  bioguide: string | null;
  xValue: number;
  yValue: number;
  faded: boolean;
}

interface Props {
  members: MemberPoint[];
  xAxis: AxisConfig;
  yAxis: AxisConfig;
  onMemberClick?: (districtId: string) => void;
  scaleToVisible?: boolean;
  showTrendLine?: boolean;
}

// ── Layout constants ──────────────────────────────────────────────────────────

const VB_W = 1000;
const VB_H = 620;
const M = { top: 26, right: 38, bottom: 54, left: 78 };

const GRID_STROKE = "rgba(51,65,85,0.25)";
const AXIS_STROKE = "rgba(51,65,85,0.5)";
const D_TICK = "#3B82F6";
const R_TICK = "#EF4444";
const DOT_R = 8;
const HOVER_R = 11;
const DOT_TRANSITION = "transform 700ms cubic-bezier(0.4, 0, 0.2, 1), opacity 300ms ease";

// ── Helpers ───────────────────────────────────────────────────────────────────

function photoUrl(bioguide: string): string {
  return `https://bioguide.congress.gov/bioguide/photo/${bioguide[0].toUpperCase()}/${bioguide}.jpg`;
}

const SUFFIX_RE = /^(jr\.?|sr\.?|ii|iii|iv|v)$/i;

function initials(name: string): string {
  const parts = name
    .replace(/["“”()]/g, "")
    .split(/\s+/)
    .map((p) => p.replace(/,$/, ""))
    .filter((p) => p.length > 0 && !SUFFIX_RE.test(p));
  if (parts.length === 0) return "?";
  const first = parts[0][0] ?? "";
  const last = parts.length > 1 ? parts[parts.length - 1][0] ?? "" : "";
  return (first + last).toUpperCase();
}

function paddedDomain(values: number[]): [number, number] {
  let min = Infinity;
  let max = -Infinity;
  for (const v of values) {
    if (v < min) min = v;
    if (v > max) max = v;
  }
  if (!isFinite(min) || !isFinite(max)) return [0, 1];
  if (min === max) {
    const pad = Math.abs(min) * 0.08 || 1;
    return [min - pad, max + pad];
  }
  const pad = (max - min) * 0.08; // ~8% padding around the data extent
  return [min - pad, max + pad];
}

function tickColor(axis: AxisConfig, v: number): string {
  if (!axis.partisan) return "#475569";
  if (v > 0) return R_TICK;
  if (v < 0) return D_TICK;
  return "#64748b";
}

// ── Dot (shared between base layer and hover overlay) ────────────────────────

function MemberDot({
  member,
  r,
  showPhoto,
  clipId,
  onPhotoError,
}: {
  member: MemberPoint;
  r: number;
  showPhoto: boolean;
  clipId: string;
  onPhotoError?: () => void;
}) {
  const color = PARTY_COLORS[member.party];
  return (
    <>
      {showPhoto && member.bioguide ? (
        <>
          <circle r={r} fill="#0d1117" />
          <image
            href={photoUrl(member.bioguide)}
            x={-r}
            y={-r}
            width={r * 2}
            height={r * 2}
            preserveAspectRatio="xMidYMid slice"
            clipPath={`url(#${clipId})`}
            onError={onPhotoError}
          />
        </>
      ) : (
        <>
          <circle r={r} fill={`${color}40`} />
          <text
            textAnchor="middle"
            dominantBaseline="central"
            fontSize={Math.round(r * 0.85)}
            fontWeight={700}
            fill={color}
            style={{ userSelect: "none" }}
          >
            {initials(member.name)}
          </text>
        </>
      )}
      <circle r={r} fill="none" stroke={color} strokeWidth={1.5} />
    </>
  );
}

// ── Tooltip (HTML overlay) ────────────────────────────────────────────────────

function ChartTooltip({
  member,
  x,
  y,
  xAxis,
  yAxis,
}: {
  member: MemberPoint;
  x: number;
  y: number;
  xAxis: AxisConfig;
  yAxis: AxisConfig;
}) {
  const partyColor = PARTY_COLORS[member.party];
  const tipW = 230;
  const winW = typeof window !== "undefined" ? window.innerWidth : 1600;
  const left = x + tipW + 24 > winW ? x - tipW - 10 : x + 14;
  const flipBelow = y < 170;
  const top = flipBelow ? y + 18 : y - 10;

  return (
    <div
      className="fixed pointer-events-none z-50"
      style={{ left, top, transform: flipBelow ? "none" : "translateY(-100%)" }}
    >
      <div
        className="rounded-xl overflow-hidden shadow-2xl shadow-black/60"
        style={{ width: tipW, backgroundColor: "#0d1117", border: "1px solid rgba(51,65,85,0.7)" }}
      >
        <div className="h-0.5" style={{ backgroundColor: partyColor }} />
        <div className="px-3 py-2.5">
          <div className="flex items-center gap-2 mb-1">
            <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: partyColor }} />
            <p className="text-white text-xs font-semibold truncate">{member.name}</p>
          </div>
          <p className="text-slate-500 text-[11px] mb-0.5">
            {member.stateName} · {member.districtLabel}
          </p>
          <p className="text-[11px] mb-2 font-medium" style={{ color: partyColor }}>
            {member.party}
          </p>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-slate-600">{xAxis.label}</span>
            <span className="font-semibold text-slate-200 tabular-nums">{xAxis.format(member.xValue)}</span>
          </div>
          <div className="flex items-center justify-between text-[11px] mt-1">
            <span className="text-slate-600">{yAxis.label}</span>
            <span className="font-semibold text-slate-200 tabular-nums">{yAxis.format(member.yValue)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Chart ─────────────────────────────────────────────────────────────────────

export default function IdeologyChart({ members, xAxis, yAxis, onMemberClick, scaleToVisible = false, showTrendLine = false }: Props) {
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [failedPhotos, setFailedPhotos] = useState<Set<string>>(() => new Set());

  const domainSrc = useMemo(() => {
    if (!scaleToVisible) return members;
    const visible = members.filter((m) => !m.faded);
    return visible.length > 0 ? visible : members;
  }, [members, scaleToVisible]);

  const xScale = useMemo(
    () => scaleLinear().domain(paddedDomain(domainSrc.map((m) => m.xValue))).range([M.left, VB_W - M.right]),
    [domainSrc]
  );
  const yScale = useMemo(
    () => scaleLinear().domain(paddedDomain(domainSrc.map((m) => m.yValue))).range([VB_H - M.bottom, M.top]),
    [domainSrc]
  );

  const xTicks = useMemo(() => xScale.ticks(6), [xScale]);
  const yTicks = useMemo(() => yScale.ticks(6), [yScale]);

  const trendLine = useMemo(() => {
    if (!showTrendLine || domainSrc.length < 3) return null;
    const n = domainSrc.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (const m of domainSrc) {
      sumX += m.xValue; sumY += m.yValue;
      sumXY += m.xValue * m.yValue; sumX2 += m.xValue * m.xValue;
    }
    const denom = n * sumX2 - sumX * sumX;
    if (Math.abs(denom) < 1e-10) return null;
    const slope = (n * sumXY - sumX * sumY) / denom;
    const intercept = (sumY - slope * sumX) / n;

    // Compute R² = 1 - SS_res / SS_tot
    const yMean = sumY / n;
    let ssTot = 0, ssRes = 0;
    for (const m of domainSrc) {
      ssTot += (m.yValue - yMean) ** 2;
      ssRes += (m.yValue - (slope * m.xValue + intercept)) ** 2;
    }
    const r2 = ssTot < 1e-10 ? 0 : 1 - ssRes / ssTot;

    return { slope, intercept, r2 };
  }, [showTrendLine, domainSrc]);

  const [xMin, xMax] = xScale.domain();
  const [yMin, yMax] = yScale.domain();
  const showXCenter = !!xAxis.partisan && xMin < 0 && xMax > 0;
  const showYCenter = !!yAxis.partisan && yMin < 0 && yMax > 0;

  const hovered = hoveredId ? members.find((m) => m.districtId === hoveredId) ?? null : null;

  function markPhotoFailed(bioguide: string) {
    setFailedPhotos((prev) => {
      if (prev.has(bioguide)) return prev;
      const next = new Set(prev);
      next.add(bioguide);
      return next;
    });
  }

  function hasPhoto(m: MemberPoint): boolean {
    return !!m.bioguide && !failedPhotos.has(m.bioguide);
  }

  return (
    <div className="relative w-full h-full">
      <svg viewBox={`0 0 ${VB_W} ${VB_H}`} preserveAspectRatio="xMidYMid meet" className="w-full h-full">
        <defs>
          <clipPath id="ideo-clip-dot">
            <circle r={DOT_R} />
          </clipPath>
          <clipPath id="ideo-clip-hover">
            <circle r={HOVER_R} />
          </clipPath>
        </defs>

        {/* Gridlines */}
        {xTicks.map((t) => (
          <line key={`gx-${t}`} x1={xScale(t)} x2={xScale(t)} y1={M.top} y2={VB_H - M.bottom} stroke={GRID_STROKE} strokeWidth={1} />
        ))}
        {yTicks.map((t) => (
          <line key={`gy-${t}`} x1={M.left} x2={VB_W - M.right} y1={yScale(t)} y2={yScale(t)} stroke={GRID_STROKE} strokeWidth={1} />
        ))}

        {/* Center lines at 0 for partisan axes (D left/below, R right/above) */}
        {showXCenter && (
          <line x1={xScale(0)} x2={xScale(0)} y1={M.top} y2={VB_H - M.bottom} stroke="rgba(148,163,184,0.4)" strokeWidth={1} strokeDasharray="4 4" />
        )}
        {showYCenter && (
          <line x1={M.left} x2={VB_W - M.right} y1={yScale(0)} y2={yScale(0)} stroke="rgba(148,163,184,0.4)" strokeWidth={1} strokeDasharray="4 4" />
        )}

        {/* Trend line + R² label */}
        {trendLine && (() => {
          const [xDomMin, xDomMax] = xScale.domain();
          const [yDomMin, yDomMax] = yScale.domain();
          const { slope, intercept, r2 } = trendLine;
          const clampY = (y: number) => Math.max(yDomMin, Math.min(yDomMax, y));
          return (
            <>
              <line
                x1={xScale(xDomMin)} y1={yScale(clampY(slope * xDomMin + intercept))}
                x2={xScale(xDomMax)} y2={yScale(clampY(slope * xDomMax + intercept))}
                stroke="rgba(251,191,36,0.65)"
                strokeWidth={1.8}
                strokeDasharray="6 4"
                strokeLinecap="round"
              />
              <text
                x={VB_W - M.right - 4}
                y={M.top + 4}
                fontSize={10}
                fill="rgba(251,191,36,0.7)"
                textAnchor="end"
                dominantBaseline="hanging"
              >
                R² = {r2.toFixed(3)}
              </text>
            </>
          );
        })()}

        {/* Axis baselines */}
        <line x1={M.left} x2={VB_W - M.right} y1={VB_H - M.bottom} y2={VB_H - M.bottom} stroke={AXIS_STROKE} strokeWidth={1} />
        <line x1={M.left} x2={M.left} y1={M.top} y2={VB_H - M.bottom} stroke={AXIS_STROKE} strokeWidth={1} />

        {/* Tick labels */}
        {xTicks.map((t) => (
          <text
            key={`tx-${t}`}
            x={xScale(t)}
            y={VB_H - M.bottom + 18}
            textAnchor="middle"
            fontSize={11}
            fill={tickColor(xAxis, t)}
            className="tabular-nums"
          >
            {xAxis.tickFormat(t)}
          </text>
        ))}
        {yTicks.map((t) => (
          <text
            key={`ty-${t}`}
            x={M.left - 10}
            y={yScale(t)}
            textAnchor="end"
            dominantBaseline="central"
            fontSize={11}
            fill={tickColor(yAxis, t)}
            className="tabular-nums"
          >
            {yAxis.tickFormat(t)}
          </text>
        ))}

        {/* Axis titles */}
        <text
          x={(M.left + VB_W - M.right) / 2}
          y={VB_H - 14}
          textAnchor="middle"
          fontSize={10}
          fontWeight={700}
          fill="#475569"
          letterSpacing="0.18em"
        >
          {xAxis.label.toUpperCase()}
        </text>
        <text
          x={24}
          y={(M.top + VB_H - M.bottom) / 2}
          textAnchor="middle"
          fontSize={10}
          fontWeight={700}
          fill="#475569"
          letterSpacing="0.18em"
          transform={`rotate(-90, 24, ${(M.top + VB_H - M.bottom) / 2})`}
        >
          {yAxis.label.toUpperCase()}
        </text>

        {/* Members — stable order + stable keys so axis changes animate via CSS transform */}
        {members.map((m) => (
          <g
            key={m.districtId}
            style={{
              transform: `translate(${xScale(m.xValue)}px, ${yScale(m.yValue)}px)`,
              transition: DOT_TRANSITION,
              opacity: m.faded ? 0.08 : 1,
              cursor: "pointer",
              pointerEvents: m.faded ? "none" : "auto",
            }}
            onMouseEnter={() => setHoveredId(m.districtId)}
            onMouseMove={(e) => setMousePos({ x: e.clientX, y: e.clientY })}
            onMouseLeave={() => setHoveredId((id) => (id === m.districtId ? null : id))}
            onClick={() => onMemberClick?.(m.districtId)}
          >
            <MemberDot
              member={m}
              r={DOT_R}
              showPhoto={hasPhoto(m)}
              clipId="ideo-clip-dot"
              onPhotoError={m.bioguide ? () => markPhotoFailed(m.bioguide!) : undefined}
            />
          </g>
        ))}

        {/* Hover overlay — enlarged copy drawn on top, original keeps its place (and animation) */}
        {hovered && (
          <g
            style={{
              transform: `translate(${xScale(hovered.xValue)}px, ${yScale(hovered.yValue)}px)`,
              transition: DOT_TRANSITION,
              pointerEvents: "none",
            }}
          >
            <MemberDot member={hovered} r={HOVER_R} showPhoto={hasPhoto(hovered)} clipId="ideo-clip-hover" />
          </g>
        )}
      </svg>

      {hovered && <ChartTooltip member={hovered} x={mousePos.x} y={mousePos.y} xAxis={xAxis} yAxis={yAxis} />}
    </div>
  );
}
