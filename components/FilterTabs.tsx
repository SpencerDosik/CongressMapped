"use client";

import { FilterMode } from "@/lib/types";
import { filterModeLabel } from "@/lib/colors";

interface Props {
  filterMode: FilterMode;
  onModeChange: (mode: FilterMode) => void;
}

const MODES: { mode: FilterMode; desc: string; preview: React.ReactNode }[] = [
  {
    mode: "party",
    desc: "Party affiliation",
    preview: (
      <span className="flex gap-0.5">
        <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />
        <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
      </span>
    ),
  },
  {
    mode: "margin",
    desc: "2024 result",
    preview: (
      <span
        className="w-8 h-2 rounded-sm inline-block"
        style={{ background: "linear-gradient(to right, #DC2626, #f8f8f8, #2563EB)" }}
      />
    ),
  },
  {
    mode: "income",
    desc: "Median income",
    preview: (
      <span
        className="w-8 h-2 rounded-sm inline-block"
        style={{ background: "linear-gradient(to right, #fefce8, #4ade80, #166534)" }}
      />
    ),
  },
  {
    mode: "tenure",
    desc: "Years in office",
    preview: (
      <span
        className="w-8 h-2 rounded-sm inline-block"
        style={{ background: "linear-gradient(to right, #eff6ff, #93c5fd, #1e3a8a)" }}
      />
    ),
  },
  {
    mode: "pvi",
    desc: "Partisan lean",
    preview: (
      <span
        className="w-8 h-2 rounded-sm inline-block"
        style={{ background: "linear-gradient(to right, #DC2626, #f8f8f8, #2563EB)" }}
      />
    ),
  },
];

export default function FilterTabs({ filterMode, onModeChange }: Props) {
  return (
    <div className="flex items-center shrink-0 bg-slate-850 border-b border-slate-700/50 px-3 gap-0.5 overflow-x-auto" style={{ backgroundColor: "#0d1117" }}>
      {MODES.map(({ mode, desc, preview }) => {
        const active = filterMode === mode;
        return (
          <button
            key={mode}
            onClick={() => onModeChange(mode)}
            title={desc}
            className={`
              relative flex items-center gap-2 px-4 py-2.5 text-xs font-medium whitespace-nowrap
              transition-all duration-150 shrink-0 group
              ${active
                ? "text-white"
                : "text-slate-500 hover:text-slate-300"
              }
            `}
          >
            {preview}
            <span>{filterModeLabel(mode)}</span>
            {/* Active indicator */}
            {active && (
              <span className="absolute bottom-0 left-2 right-2 h-0.5 bg-indigo-400 rounded-t-full" />
            )}
          </button>
        );
      })}
    </div>
  );
}
