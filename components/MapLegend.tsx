"use client";

import { FilterMode } from "@/lib/types";
import { getLegendItems, filterModeLabel } from "@/lib/colors";

interface Props {
  mode: FilterMode;
}

export default function MapLegend({ mode }: Props) {
  const items = getLegendItems(mode);

  return (
    <div className="absolute bottom-5 left-5 pointer-events-none select-none">
      <div className="bg-slate-900/90 backdrop-blur-sm border border-slate-700/60 rounded-xl px-3.5 py-3 shadow-xl shadow-black/30">
        <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-2">
          {filterModeLabel(mode)}
        </p>

        {mode === "party" ? (
          /* Dot legend */
          <div className="flex flex-col gap-1.5">
            {items.map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <div
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-xs text-slate-300">{item.label}</span>
              </div>
            ))}
          </div>
        ) : (
          /* Gradient bar */
          <div className="w-44">
            <div
              className="h-3 w-full rounded"
              style={{
                background: `linear-gradient(to right, ${items.map((i) => i.color).join(", ")})`,
              }}
            />
            <div className="flex justify-between mt-1.5">
              <span className="text-[10px] text-slate-500">{items[0]?.label}</span>
              {items.length > 2 && (
                <span className="text-[10px] text-slate-500">
                  {items[Math.floor(items.length / 2)]?.label}
                </span>
              )}
              <span className="text-[10px] text-slate-500">{items[items.length - 1]?.label}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
