"use client";

export type HistoryPoint = { year: number; margin: number };

const REDISTRICTING_YEARS = [2002, 2012, 2022];

export default function ElectionSparkline({
  history,
  current,
  partyColor,
  width = 200,
  height = 52,
}: {
  history: HistoryPoint[];
  current: number;
  partyColor: string;
  width?: number;
  height?: number;
}) {
  const combined = [...history.filter((p) => p.year !== 2024), { year: 2024, margin: current }].sort(
    (a, b) => a.year - b.year
  );
  if (combined.length < 2) return null;

  const W = width;
  const H = height;
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
  const firstYear = combined[0].year;
  const lastYear = combined[combined.length - 1].year;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="w-full" style={{ height: H }}>
      {/* Redistricting markers */}
      {REDISTRICTING_YEARS.filter((y) => y > minYear && y < maxYear).map((y) => (
        <line key={`rd-${y}`} x1={px(y)} x2={px(y)} y1={PAD.top} y2={PAD.top + plotH}
          stroke="rgba(100,116,139,0.22)" strokeWidth={0.8} strokeDasharray="2 2" />
      ))}
      {/* Zero line */}
      {zeroY >= PAD.top && zeroY <= PAD.top + plotH && (
        <line x1={PAD.left} x2={W - PAD.right} y1={zeroY} y2={zeroY}
          stroke="rgba(100,116,139,0.25)" strokeWidth={0.6} strokeDasharray="2 3" />
      )}
      {/* Area fill */}
      <polyline
        points={`${px(firstYear).toFixed(1)},${py(0).toFixed(1)} ${polyline} ${px(lastYear).toFixed(1)},${py(0).toFixed(1)}`}
        fill={`${partyColor}18`} stroke="none" />
      {/* Line */}
      <polyline points={polyline} fill="none" stroke={partyColor} strokeWidth={1.4}
        strokeLinejoin="round" strokeLinecap="round" />
      {/* Last year dot */}
      <circle cx={px(lastPt.year)} cy={py(lastPt.margin)} r={2.5} fill={partyColor} />
      {/* Year labels */}
      <text x={PAD.left} y={H - 2} fontSize={7.5} fill="#475569" textAnchor="start">{firstYear}</text>
      <text x={W - PAD.right} y={H - 2} fontSize={7.5} fill="#475569" textAnchor="end">{lastYear}</text>
    </svg>
  );
}
