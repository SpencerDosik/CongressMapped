"use client";
import dynamic from "next/dynamic";

// HouseMap uses browser APIs (SVG, mouse events) — load client-only
const HouseMap = dynamic(() => import("@/components/HouseMap"), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-screen bg-slate-900">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-400 text-sm">Loading district data…</p>
      </div>
    </div>
  ),
});

export default function HousePage() {
  return <HouseMap />;
}
