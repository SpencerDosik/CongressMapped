import { NextRequest, NextResponse } from "next/server";

const CONGRESS_BASE = "https://api.congress.gov/v3";
const API_KEY = process.env.CONGRESS_GOV_API_KEY;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
) {
  const { bioguideId } = await params;

  if (!API_KEY) {
    return NextResponse.json({ noKey: true }, { status: 200 });
  }

  const headers = { "X-Api-Key": API_KEY };

  try {
    // Sponsored legislation (most recent 10)
    const sponsoredUrl = new URL(
      `${CONGRESS_BASE}/member/${bioguideId}/sponsored-legislation`
    );
    sponsoredUrl.searchParams.set("format", "json");
    sponsoredUrl.searchParams.set("limit", "10");
    sponsoredUrl.searchParams.set("offset", "0");

    // Cosponsored legislation (most recent 5)
    const cosponsoredUrl = new URL(
      `${CONGRESS_BASE}/member/${bioguideId}/cosponsored-legislation`
    );
    cosponsoredUrl.searchParams.set("format", "json");
    cosponsoredUrl.searchParams.set("limit", "5");
    cosponsoredUrl.searchParams.set("offset", "0");

    const [sponsoredRes, cosponsoredRes] = await Promise.all([
      fetch(sponsoredUrl.toString(), { headers, next: { revalidate: 3600 } }),
      fetch(cosponsoredUrl.toString(), { headers, next: { revalidate: 3600 } }),
    ]);

    if (!sponsoredRes.ok && !cosponsoredRes.ok) {
      throw new Error(`Congress.gov HTTP ${sponsoredRes.status}`);
    }

    const [sponsoredData, cosponsoredData] = await Promise.all([
      sponsoredRes.ok ? sponsoredRes.json() : { sponsoredLegislation: [] },
      cosponsoredRes.ok ? cosponsoredRes.json() : { cosponsoredLegislation: [] },
    ]);

    const mapBill = (b: Record<string, unknown>) => ({
      number: b.number,
      title: b.title,
      type: b.type,
      congress: b.congress,
      latestAction: (b.latestAction as Record<string, unknown>)?.text ?? null,
      latestActionDate: (b.latestAction as Record<string, unknown>)?.actionDate ?? null,
      url: b.url ?? null,
    });

    return NextResponse.json({
      sponsored: (sponsoredData.sponsoredLegislation ?? []).map(mapBill),
      cosponsored: (cosponsoredData.cosponsoredLegislation ?? []).map(mapBill),
    });
  } catch (err) {
    console.error("[congress route]", err);
    return NextResponse.json({ error: "Congress.gov API unavailable" }, { status: 502 });
  }
}
