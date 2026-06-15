"use client";

import { FilterMode } from "@/lib/types";
import { getLegendItems, filterModeLabel, PARTY_COLORS } from "@/lib/colors";

interface Props {
  mode: FilterMode;
}

export default function MapLegend({ mode }: Props) {
  const items = getLegendItems(mode);

  return (
    <div className="absolute bottom-5 left-4 pointer-events-none select-none">
      <div
        className="rounded-xl px-3.5 py-3 shadow-xl shadow-black/40"
        style={{
          backgroundColor: "rgba(13,17,23,0.92)",
          border: "1px solid rgba(30,41,59,0.8)",
          backdropFilter: "blur(8px)",
        }}
      >
        <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mb-2.5">
          {filterModeLabel(mode)}
        </p>

        {mode === "committee" ? (
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center gap-2">
              <div className="flex gap-0.5 shrink-0">
                <div className="w-1.5 h-2.5 rounded-l-full" style={{ backgroundColor: PARTY_COLORS.Republican }} />
                <div className="w-1.5 h-2.5 rounded-r-full" style={{ backgroundColor: PARTY_COLORS.Democrat }} />
              </div>
              <span className="text-[11px] text-slate-400">On committee</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-2.5 rounded-sm shrink-0" style={{ backgroundColor: "#0c1520", border: "1px solid #1e2d3d" }} />
              <span className="text-[11px] text-slate-400">Other districts</span>
            </div>
          </div>
        ) : mode === "party" ? (
          <div className="flex flex-col gap-1.5">
            {items.map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className="text-[11px] text-slate-400">{item.label}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="w-44">
            <div
              className="h-2.5 w-full rounded"
              style={{
                background: `linear-gradient(to right, ${items.map((i) => i.color).join(", ")})`,
              }}
            />
            <div className="flex justify-between mt-1.5">
              <span className="text-[10px] text-slate-600">{items[0]?.label}</span>
              {items.length > 2 && (
                <span className="text-[10px] text-slate-600">
                  {items[Math.floor(items.length / 2)]?.label}
                </span>
              )}
              <span className="text-[10px] text-slate-600">{items[items.length - 1]?.label}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
