"use client";

import { FilterMode } from "@/lib/types";
import { filterModeLabel } from "@/lib/colors";

interface Props {
  filterMode: FilterMode;
  onModeChange: (mode: FilterMode) => void;
  open: boolean;
  onToggle: () => void;
}

interface FilterOption {
  mode: FilterMode;
  icon: string;
  desc: string;
  preview: React.ReactNode;
}

function GradStop({ color }: { color: string }) {
  return <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: color }} />;
}

function GradBar({ stops }: { stops: string[] }) {
  return (
    <div
      className="w-10 h-2.5 rounded-sm shrink-0"
      style={{ background: `linear-gradient(to right, ${stops.join(", ")})` }}
    />
  );
}

const FILTER_OPTIONS: FilterOption[] = [
  {
    mode: "party",
    icon: "⬤",
    desc: "Party affiliation",
    preview: (
      <div className="flex gap-1 shrink-0">
        <div className="w-3 h-3 rounded-full bg-red-600" />
        <div className="w-3 h-3 rounded-full bg-blue-600" />
      </div>
    ),
  },
  {
    mode: "margin",
    icon: "◐",
    desc: "2024 election result",
    preview: <GradBar stops={["#DC2626", "#f8f8f8", "#2563EB"]} />,
  },
  {
    mode: "income",
    icon: "◆",
    desc: "Median household income",
    preview: <GradBar stops={["#fefce8", "#86efac", "#166534"]} />,
  },
  {
    mode: "tenure",
    icon: "⌛",
    desc: "Years in current seat",
    preview: <GradBar stops={["#dbeafe", "#93c5fd", "#1e3a8a"]} />,
  },
  {
    mode: "pvi",
    icon: "◈",
    desc: "Partisan lean (Cook PVI)",
    preview: <GradBar stops={["#DC2626", "#f8f8f8", "#2563EB"]} />,
  },
];

export default function FilterBar({ filterMode, onModeChange, open, onToggle }: Props) {
  return (
    <div
      className="flex flex-col bg-slate-800 border-r border-slate-700/50 shrink-0 overflow-hidden transition-all duration-300 ease-in-out"
      style={{ width: open ? 232 : 44 }}
    >
      {/* Toggle */}
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-center h-10 text-slate-400 hover:text-white hover:bg-slate-700/60 transition-colors border-b border-slate-700/50 shrink-0 text-sm"
        title={open ? "Collapse filters" : "Expand filters"}
      >
        {open ? "◀" : "▶"}
      </button>

      {/* Expanded */}
      {open && (
        <div className="flex flex-col overflow-y-auto">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-4 pt-4 pb-2">
            View By
          </p>

          <div className="flex flex-col gap-0.5 px-2 pb-3">
            {FILTER_OPTIONS.map(({ mode, icon, desc, preview }) => {
              const active = filterMode === mode;
              return (
                <button
                  key={mode}
                  onClick={() => onModeChange(mode)}
                  className={`w-full text-left px-3 py-2.5 rounded-lg transition-all duration-150 group ${
                    active
                      ? "bg-slate-600/70 ring-1 ring-slate-500/60"
                      : "hover:bg-slate-700/50"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm font-medium truncate leading-tight ${
                          active ? "text-white" : "text-slate-300 group-hover:text-white"
                        }`}
                      >
                        {filterModeLabel(mode)}
                      </p>
                      <p className="text-[11px] text-slate-500 truncate mt-0.5">{desc}</p>
                    </div>
                    {preview}
                  </div>
                </button>
              );
            })}
          </div>

          {/* Footer */}
          <div className="mt-auto px-4 py-4 border-t border-slate-700/40">
            <p className="text-[10px] text-slate-600 leading-relaxed">
              Hover to inspect · Click to explore
            </p>
          </div>
        </div>
      )}

      {/* Collapsed — icon-only */}
      {!open && (
        <div className="flex flex-col items-center gap-1 pt-2">
          {FILTER_OPTIONS.map(({ mode, icon }) => (
            <button
              key={mode}
              onClick={() => onModeChange(mode)}
              className={`w-8 h-8 rounded flex items-center justify-center text-xs transition-all ${
                filterMode === mode
                  ? "bg-slate-600 text-white"
                  : "text-slate-500 hover:text-slate-300 hover:bg-slate-700"
              }`}
              title={filterModeLabel(mode)}
            >
              {icon}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
