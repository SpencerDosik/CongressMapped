"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { getAllDistricts } from "@/lib/districtData";
import { PARTY_COLORS } from "@/lib/colors";
import { STATE_NAMES, AT_LARGE_STATES } from "@/lib/stateFips";
import { Party } from "@/lib/types";

const DISTRICT_MAP = new Map(getAllDistricts().map(d => [d.districtId, d]));

type CommitteeMember = {
  districtId: string;
  repName: string;
  party: Party;
  title: string | null;
  rank: number;
  margin: number;
};

type CommitteeIndex = Record<string, CommitteeMember[]>;
type SubcommitteeIndex = Record<string, Record<string, CommitteeMember[]>>; // parent → subName → members

function shortName(fullName: string): string {
  return fullName
    .replace(/^House (Permanent Select |Select |Committee on the |Committee on )/i, "")
    .replace(/^House /i, "")
    .replace(/Committee on /, "")
    .replace(/Subcommittee to .+/, "Jan. 6 Subcommittee")
    .replace("Strategic Competition Between the United States and the Chinese Communist Party", "China Competition");
}

function districtDisplay(districtId: string): string {
  const [state, num] = districtId.split("-");
  if (AT_LARGE_STATES.has(state)) return `${state} AL`;
  return `${state}-${parseInt(num ?? "0", 10)}`;
}

function titleBadge(title: string | null) {
  if (!title) return null;
  const normalized = title.replace("woman", "").replace("man", "").replace("Chairman", "Chair");
  const color =
    normalized === "Chair" ? "#f59e0b" :
    normalized === "Ranking Member" ? "#818cf8" :
    normalized.includes("Vice Chair") ? "#6ee7b7" :
    null;
  if (!color) return null;
  return (
    <span
      className="text-[9px] font-bold px-1.5 py-0.5 rounded-full shrink-0"
      style={{ backgroundColor: `${color}18`, color, border: `1px solid ${color}33` }}
    >
      {normalized}
    </span>
  );
}

export default function CommitteesPage() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [committeeIndex, setCommitteeIndex] = useState<CommitteeIndex | null>(null);
  const [subcommitteeIndex, setSubcommitteeIndex] = useState<SubcommitteeIndex | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [selectedSub, setSelectedSub] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetch("/committee-data.json")
      .then(r => r.json())
      .then((raw: Record<string, Array<{ code: string; name: string; type: string; rank: number; title: string | null; parent: string | null }>>) => {
        const index: CommitteeIndex = {};
        const subIndex: SubcommitteeIndex = {};

        for (const [districtId, items] of Object.entries(raw)) {
          const district = DISTRICT_MAP.get(districtId);
          if (!district) continue;
          const member: Omit<CommitteeMember, "title" | "rank"> = {
            districtId,
            repName: district.data.repName,
            party: district.data.party as Party,
            margin: district.data.margin,
          };

          for (const item of items) {
            if (item.type !== "house") continue;
            const entry: CommitteeMember = { ...member, title: item.title, rank: item.rank };

            if (item.parent === null) {
              // Parent committee
              if (!index[item.name]) index[item.name] = [];
              index[item.name].push(entry);
            } else {
              // Subcommittee — store under parent
              if (!subIndex[item.parent]) subIndex[item.parent] = {};
              if (!subIndex[item.parent][item.name]) subIndex[item.parent][item.name] = [];
              subIndex[item.parent][item.name].push(entry);
            }
          }
        }

        for (const members of Object.values(index)) members.sort((a, b) => a.rank - b.rank);
        for (const subs of Object.values(subIndex)) {
          for (const members of Object.values(subs)) members.sort((a, b) => a.rank - b.rank);
        }

        setCommitteeIndex(index);
        setSubcommitteeIndex(subIndex);
        // If URL has ?c=..., select matching committee, else first alphabetically
        const urlCommittee = searchParams.get("c");
        const keys = Object.keys(index).sort();
        const matched = urlCommittee
          ? keys.find(k => k.toLowerCase().includes(urlCommittee.toLowerCase()) || shortName(k).toLowerCase().includes(urlCommittee.toLowerCase()))
          : null;
        setSelected(matched ?? keys[0] ?? null);
      })
      .catch(() => {});
  }, []);

  const committees = useMemo(() => {
    if (!committeeIndex) return [];
    return Object.keys(committeeIndex).sort();
  }, [committeeIndex]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return committees.filter(c => shortName(c).toLowerCase().includes(q) || c.toLowerCase().includes(q));
  }, [committees, search]);

  const selectedMembers = useMemo(() => {
    if (!committeeIndex || !selected) return [];
    if (selectedSub && subcommitteeIndex?.[selected]?.[selectedSub]) {
      return subcommitteeIndex[selected][selectedSub];
    }
    return committeeIndex[selected] ?? [];
  }, [committeeIndex, subcommitteeIndex, selected, selectedSub]);

  const subcommittees = useMemo(() => {
    if (!subcommitteeIndex || !selected) return [];
    return Object.keys(subcommitteeIndex[selected] ?? {}).sort();
  }, [subcommitteeIndex, selected]);

  const rCount = selectedMembers.filter(m => m.party === "Republican").length;
  const dCount = selectedMembers.filter(m => m.party === "Democrat" || m.party === "Independent").length;

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "#0a0e14", color: "#e2e8f0" }}>

      {/* Header */}
      <header
        className="flex items-center justify-between px-6 py-3 shrink-0 z-10"
        style={{ backgroundColor: "#0d1117", borderBottom: "1px solid rgba(30,41,59,0.8)" }}
      >
        <div className="flex items-center gap-3">
          <Link href="/" className="text-slate-400 hover:text-white transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </Link>
          <div className="flex items-center gap-0.5">
            {(["/house", "/rankings", "/compare", "/graph", "/competitive"] as const).map((href) => {
              const label = { "/house": "Map", "/rankings": "Rankings", "/compare": "Compare", "/graph": "Graph", "/competitive": "Races" }[href];
              const active = pathname === href;
              return (
                <a key={href} href={href}
                  className="px-2 py-1 rounded text-[10px] font-medium transition-colors"
                  style={{ color: active ? "#a5b4fc" : "#64748b", backgroundColor: active ? "rgba(99,102,241,0.12)" : "transparent" }}>
                  {label}
                </a>
              );
            })}
          </div>
        </div>
        <p className="text-slate-600 text-[11px]">{committees.length} committees</p>
      </header>

      <div className="flex flex-1 min-h-0">

        {/* Sidebar */}
        <div
          className="w-64 flex flex-col shrink-0 border-r"
          style={{ borderColor: "rgba(30,41,59,0.8)", backgroundColor: "#0d1117" }}
        >
          <div className="px-3 py-3 border-b" style={{ borderColor: "rgba(30,41,59,0.6)" }}>
            <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2">Committees</p>
            <input
              type="text"
              placeholder="Search..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full px-2.5 py-1.5 rounded-lg text-[12px] bg-slate-800/60 border border-slate-700/40 text-slate-200 placeholder-slate-600 outline-none focus:border-indigo-500/50"
            />
          </div>
          <div className="flex-1 overflow-y-auto py-1">
            {!committeeIndex && (
              <p className="text-slate-700 text-[11px] px-3 py-2">Loading...</p>
            )}
            {filtered.map(name => {
              const members = committeeIndex?.[name] ?? [];
              const r = members.filter(m => m.party === "Republican").length;
              const d = members.filter(m => m.party === "Democrat" || m.party === "Independent").length;
              const isActive = selected === name;
              return (
                <button
                  key={name}
                  onClick={() => { setSelected(name); setSelectedSub(null); }}
                  className="w-full text-left px-3 py-2.5 transition-colors"
                  style={{
                    backgroundColor: isActive ? "rgba(99,102,241,0.1)" : "transparent",
                    borderLeft: isActive ? "2px solid rgba(99,102,241,0.6)" : "2px solid transparent",
                  }}
                >
                  <p className="text-[12px] font-medium leading-snug" style={{ color: isActive ? "#e2e8f0" : "#64748b" }}>
                    {shortName(name)}
                  </p>
                  <p className="text-[10px] mt-0.5" style={{ color: isActive ? "#94a3b8" : "#475569" }}>
                    <span style={{ color: "#f87171" }}>{r}R</span>
                    <span className="mx-1 opacity-40">·</span>
                    <span style={{ color: "#60a5fa" }}>{d}D</span>
                    <span className="ml-1 opacity-40">({members.length})</span>
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main panel */}
        <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {selected && committeeIndex && (
            <>
              {/* Committee header */}
              <div className="px-6 py-4 border-b" style={{ borderColor: "rgba(30,41,59,0.6)", backgroundColor: "#0d1117" }}>
                <h1 className="text-lg font-bold text-white leading-tight">{selected}</h1>
                <div className="flex items-center gap-3 mt-1.5">
                  <span className="text-[12px]">
                    <span style={{ color: PARTY_COLORS.Republican }} className="font-semibold">{rCount}R</span>
                    <span className="text-slate-700 mx-1.5">·</span>
                    <span style={{ color: PARTY_COLORS.Democrat }} className="font-semibold">{dCount}D</span>
                    <span className="text-slate-700 mx-1.5">·</span>
                    <span className="text-slate-600">{selectedMembers.length} total</span>
                  </span>
                  {rCount > dCount && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: `${PARTY_COLORS.Republican}18`, color: PARTY_COLORS.Republican, border: `1px solid ${PARTY_COLORS.Republican}30` }}>
                      R majority +{rCount - dCount}
                    </span>
                  )}
                  {dCount > rCount && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
                      style={{ backgroundColor: `${PARTY_COLORS.Democrat}18`, color: PARTY_COLORS.Democrat, border: `1px solid ${PARTY_COLORS.Democrat}30` }}>
                      D majority +{dCount - rCount}
                    </span>
                  )}
                </div>

                {/* Subcommittee tabs */}
                {subcommittees.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    <button
                      onClick={() => setSelectedSub(null)}
                      className="px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all"
                      style={selectedSub === null ? {
                        backgroundColor: "rgba(99,102,241,0.18)",
                        color: "#a5b4fc",
                        border: "1px solid rgba(99,102,241,0.4)",
                      } : {
                        backgroundColor: "transparent",
                        color: "#475569",
                        border: "1px solid rgba(30,41,59,0.8)",
                      }}
                    >
                      Full Committee
                    </button>
                    {subcommittees.map(sub => {
                      const subMembers = subcommitteeIndex?.[selected!]?.[sub] ?? [];
                      return (
                        <button
                          key={sub}
                          onClick={() => setSelectedSub(sub)}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-medium transition-all"
                          style={selectedSub === sub ? {
                            backgroundColor: "rgba(99,102,241,0.18)",
                            color: "#a5b4fc",
                            border: "1px solid rgba(99,102,241,0.4)",
                          } : {
                            backgroundColor: "transparent",
                            color: "#475569",
                            border: "1px solid rgba(30,41,59,0.8)",
                          }}
                        >
                          {sub}
                          <span className="ml-1 opacity-50 text-[10px]">({subMembers.length})</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Members list */}
              <div className="flex-1 overflow-y-auto px-6 py-4">
                <div className="space-y-1">
                  {selectedMembers.map((member) => {
                    const partyColor = PARTY_COLORS[member.party] ?? "#64748b";
                    const [state] = member.districtId.split("-");
                    const stateName = STATE_NAMES[state] ?? state;
                    const absMargin = Math.abs(member.margin);
                    return (
                      <a
                        key={member.districtId}
                        href={`/house?d=${member.districtId}`}
                        className="flex items-center gap-3 px-4 py-2.5 rounded-xl transition-colors group"
                        style={{ backgroundColor: "rgba(13,17,23,0.6)", border: "1px solid rgba(30,41,59,0.5)" }}
                        onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "rgba(30,41,59,0.6)"; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.backgroundColor = "rgba(13,17,23,0.6)"; }}
                      >
                        {/* Rank number */}
                        <span className="text-slate-700 text-[11px] tabular-nums w-6 text-right shrink-0">{member.rank}</span>

                        {/* Party bar */}
                        <div className="w-1 h-8 rounded-full shrink-0" style={{ backgroundColor: partyColor }} />

                        {/* Name + district */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-white font-semibold text-[13px]">{member.repName}</span>
                            {titleBadge(member.title)}
                          </div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[11px] font-bold tabular-nums" style={{ color: partyColor }}>
                              {districtDisplay(member.districtId)}
                            </span>
                            <span className="text-slate-700 text-[10px]">·</span>
                            <span className="text-slate-600 text-[11px]">{stateName}</span>
                          </div>
                        </div>

                        {/* Margin */}
                        <div className="shrink-0 text-right">
                          <p className="text-[11px] font-semibold tabular-nums"
                            style={{ color: member.margin > 0 ? PARTY_COLORS.Republican : PARTY_COLORS.Democrat }}>
                            {member.margin > 0 ? "R" : "D"} +{absMargin}%
                          </p>
                          <p className="text-[9px] text-slate-700">2024</p>
                        </div>

                        <div className="text-slate-700 group-hover:text-slate-400 transition-colors text-sm shrink-0">→</div>
                      </a>
                    );
                  })}
                </div>
              </div>
            </>
          )}
          {!committeeIndex && (
            <div className="flex-1 flex items-center justify-center">
              <p className="text-slate-600 text-sm">Loading committees...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
