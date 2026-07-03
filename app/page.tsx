import Link from "next/link";
import { redirect } from "next/navigation";
import { getAllDistricts } from "@/lib/districtData";
import { PARTY_COLORS } from "@/lib/colors";

// ── Inline icons (w-5 h-5, indigo accent) ────────────────────────────────────
function MapIcon() {
  return (
    <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
    </svg>
  );
}

function ScatterIcon() {
  return (
    <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v16h16" />
      <circle cx="9" cy="14" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="13" cy="9" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="17" cy="13" r="1.4" fill="currentColor" stroke="none" />
      <circle cx="11" cy="6" r="1.4" fill="currentColor" stroke="none" />
    </svg>
  );
}

function TableIcon() {
  return (
    <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 10h18M3 14h18M3 6h18M3 18h18" />
    </svg>
  );
}

function ColumnsIcon() {
  return (
    <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 4v16m6-16v16M5 4h14a1 1 0 011 1v14a1 1 0 01-1 1H5a1 1 0 01-1-1V5a1 1 0 011-1z" />
    </svg>
  );
}

function LandmarkIcon() {
  return (
    <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 21h18M5 21V10m4 11V10m6 11V10m4 11V10M3 7l9-4 9 4v3H3V7z" />
    </svg>
  );
}

function BuildingIcon() {
  return (
    <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m4-12h1m-1 4h1m-6-4h1m-1 4h1m-1 8v-4a1 1 0 011-1h2a1 1 0 011 1v4m-5 0h5" />
    </svg>
  );
}

function TargetIcon() {
  return (
    <svg className="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="10" />
      <circle cx="12" cy="12" r="6" />
      <circle cx="12" cy="12" r="2" />
    </svg>
  );
}

function FlagIcon() {
  return (
    <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 3v18M3 5l9 4-9 4" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h13l-4 4 4 4H3" />
    </svg>
  );
}

function UsersIcon() {
  return (
    <svg className="w-5 h-5 text-indigo-400" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

// ── Card components ───────────────────────────────────────────────────────────
const CARD_CLASSES =
  "rounded-xl p-5 bg-slate-900/80 border border-slate-800/80 flex items-start gap-4";

function ModeCard({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className={`${CARD_CLASSES} group hover:border-indigo-500/40 hover:bg-slate-800/60 transition-colors`}
    >
      <div className="shrink-0 mt-0.5">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-white font-semibold text-sm flex items-center justify-between gap-2">
          {title}
          <span className="text-indigo-400/70 group-hover:text-indigo-300 transition-colors">→</span>
        </p>
        <p className="text-[12px] text-slate-500 leading-snug mt-1">{description}</p>
      </div>
    </Link>
  );
}

function DisabledCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className={`${CARD_CLASSES} opacity-50 cursor-default`}>
      <div className="shrink-0 mt-0.5">{icon}</div>
      <div className="min-w-0 flex-1">
        <p className="text-white font-semibold text-sm flex items-center justify-between gap-2">
          {title}
          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-500 font-medium shrink-0">
            Coming soon
          </span>
        </p>
        <p className="text-[12px] text-slate-500 leading-snug mt-1">{description}</p>
      </div>
    </div>
  );
}

// ── Landing page ──────────────────────────────────────────────────────────────
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  // Legacy share links: the map used to live at "/" — forward ?d= / ?s= to /house
  const sp = await searchParams;
  const d = typeof sp.d === "string" ? sp.d : undefined;
  const s = typeof sp.s === "string" ? sp.s : undefined;
  if (d) redirect(`/house?d=${encodeURIComponent(d)}`);
  if (s) redirect(`/house?s=${encodeURIComponent(s)}`);

  const allDistricts = getAllDistricts();
  const rCount = allDistricts.filter(d => d.data.party === "Republican").length;
  const dCount = allDistricts.filter(d => d.data.party === "Democrat").length;
  const iCount = allDistricts.filter(d => d.data.party === "Independent").length;
  const vCount = allDistricts.filter(d => d.data.party === "Vacant").length;
  const total = allDistricts.length;

  return (
    <main
      className="min-h-screen w-full flex flex-col items-center justify-center px-6 py-12"
      style={{ backgroundColor: "#0a0e14" }}
    >
      <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-3">
        119th Congress
      </p>
      <h1 className="text-3xl md:text-4xl font-bold text-white tracking-tight text-center">
        Congress Visualized
      </h1>
      <p className="text-slate-500 text-sm mt-3 text-center">
        Interactive maps and analytics for the United States Congress
      </p>

      {/* House composition bar */}
      <div className="mt-6 flex flex-col items-center gap-2">
        <div className="flex h-2 rounded-full overflow-hidden w-64">
          <div style={{ width: `${(rCount / total) * 100}%`, backgroundColor: PARTY_COLORS.Republican }} />
          {iCount > 0 && <div style={{ width: `${(iCount / total) * 100}%`, backgroundColor: PARTY_COLORS.Independent }} />}
          {vCount > 0 && <div style={{ width: `${(vCount / total) * 100}%`, backgroundColor: "#374151" }} />}
          <div style={{ width: `${(dCount / total) * 100}%`, backgroundColor: PARTY_COLORS.Democrat }} />
        </div>
        <div className="flex items-center gap-3 text-[11px]">
          <span style={{ color: PARTY_COLORS.Republican }} className="font-semibold">{rCount}R</span>
          {iCount > 0 && <span style={{ color: PARTY_COLORS.Independent }} className="font-semibold">{iCount}I</span>}
          {vCount > 0 && <span className="text-slate-600">{vCount} vacant</span>}
          <span style={{ color: PARTY_COLORS.Democrat }} className="font-semibold">{dCount}D</span>
          <span className="text-slate-700">· majority 218</span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-4 max-w-3xl w-full mt-10">
        <ModeCard
          href="/house"
          icon={<MapIcon />}
          title="House Map"
          description="All 435 districts on an interactive map."
        />
        <ModeCard
          href="/graph"
          icon={<ScatterIcon />}
          title="Graph"
          description="Every representative on a customizable scatter plot. Filter by state or committee."
        />
        <ModeCard
          href="/rankings"
          icon={<TableIcon />}
          title="Rankings"
          description="Sort all 435 districts by any metric."
        />
        <ModeCard
          href="/compare"
          icon={<ColumnsIcon />}
          title="Compare"
          description="Two districts side by side."
        />
        <ModeCard
          href="/senate"
          icon={<LandmarkIcon />}
          title="U.S. Senate"
          description="All 100 senators mapped by state."
        />
        <ModeCard
          href="/state-leg"
          icon={<BuildingIcon />}
          title="State Legislatures"
          description="State-level chambers and districts."
        />
        <ModeCard
          href="/competitive"
          icon={<TargetIcon />}
          title="Competitive Races"
          description="2026 battleground districts sorted by how close the 2024 race was."
        />
        <ModeCard
          href="/states"
          icon={<FlagIcon />}
          title="State Delegations"
          description="Each state's House delegation — seat counts, partisan lean, and median income."
        />
        <ModeCard
          href="/committees"
          icon={<UsersIcon />}
          title="Committees"
          description="All 23 House committees and their members, with party breakdown and leadership roles."
        />
        <ModeCard
          href="/freshmen"
          icon={<TableIcon />}
          title="Freshman Class of 2025"
          description="All 67 members elected for the first time in 2024, sorted by how competitive their seat is."
        />
      </div>

      <p className="text-[10px] text-slate-700 mt-10">
        119th Congress · Data as of April 2026
      </p>
    </main>
  );
}
