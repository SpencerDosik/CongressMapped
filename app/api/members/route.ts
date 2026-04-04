import { NextResponse } from "next/server";

// GovTrack public API — no key required
const GOVTRACK_URL =
  "https://www.govtrack.us/api/v2/role" +
  "?current=true&role_type=representative&limit=500";

let cached: { data: unknown; ts: number } | null = null;
const TTL = 60 * 60 * 1000; // 1 h

export async function GET() {
  if (cached && Date.now() - cached.ts < TTL) {
    return NextResponse.json(cached.data, {
      headers: { "Cache-Control": "public, s-maxage=1800" },
    });
  }

  try {
    const res = await fetch(GOVTRACK_URL, {
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) throw new Error(`GovTrack ${res.status}`);

    const data = await res.json();
    cached = { data, ts: Date.now() };

    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=1800" },
    });
  } catch (err) {
    console.error("[/api/members]", err);
    return NextResponse.json({ objects: [] }, { status: 500 });
  }
}
