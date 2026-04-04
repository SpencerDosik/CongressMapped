import { NextResponse } from "next/server";

// Census TIGER REST — 118th Congress districts (same boundaries for 119th)
// Filters out territories (FIPS ≥ 57) and simplifies geometry for performance
const TIGER_URL =
  "https://tigerweb.geo.census.gov/arcgis/rest/services/TIGERweb/Legislative_gov/MapServer/0/query" +
  "?where=STATEFP+NOT+IN+('60','66','69','72','78')" +
  "&outFields=GEOID,STATEFP,CD118FP" +
  "&returnGeometry=true" +
  "&f=geojson" +
  "&outSR=4326" +
  "&maxAllowableOffset=0.05";

// Module-level cache (resets on cold start / redeploy — intentional)
let cached: { data: unknown; ts: number } | null = null;
const TTL = 24 * 60 * 60 * 1000; // 24 h

export async function GET() {
  if (cached && Date.now() - cached.ts < TTL) {
    return NextResponse.json(cached.data, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    });
  }

  try {
    const res = await fetch(TIGER_URL, {
      signal: AbortSignal.timeout(30_000),
    });

    if (!res.ok) throw new Error(`TIGER ${res.status}`);

    const data = await res.json();
    cached = { data, ts: Date.now() };

    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    });
  } catch (err) {
    console.error("[/api/districts]", err);
    return NextResponse.json(
      { type: "FeatureCollection", features: [] },
      { status: 500 }
    );
  }
}
