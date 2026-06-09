import { NextRequest, NextResponse } from "next/server";
import { cacheGet, cacheSet } from "@/lib/apiCache";

const CONGRESS_BASE = "https://api.congress.gov/v3";
const API_KEY = process.env.CONGRESS_GOV_API_KEY;

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ bioguideId: string }> }
) {
  const { bioguideId } = await params;
  const cached = cacheGet<object>(`congress:${bioguideId}`);
  if (cached) return NextResponse.json(cached);

  if (!API_KEY) {
    return NextResponse.json({ noKey: true }, { status: 200 });
  }

  // Pass key both as header and query param for maximum compatibility
  const headers = { "X-Api-Key": API_KEY };

  function buildUrl(path: string, extra: Record<string, string> = {}): string {
    const url = new URL(`${CONGRESS_BASE}/${path}`);
    url.searchParams.set("format", "json");
    url.searchParams.set("api_key", API_KEY!);
    for (const [k, v] of Object.entries(extra)) url.searchParams.set(k, v);
    return url.toString();
  }

  try {
    const [sponsoredRes, cosponsoredRes] = await Promise.all([
      fetch(buildUrl(`member/${bioguideId}/sponsored-legislation`, { limit: "20" }), {
        headers,
        next: { revalidate: 3600 },
      }),
      fetch(buildUrl(`member/${bioguideId}/cosponsored-legislation`, { limit: "50" }), {
        headers,
        next: { revalidate: 3600 },
      }),
    ]);

    if (!sponsoredRes.ok && !cosponsoredRes.ok) {
      const status = sponsoredRes.status;
      if (status === 401 || status === 403) {
        return NextResponse.json({ noKey: true }, { status: 200 });
      }
      throw new Error(`Congress.gov HTTP ${status}`);
    }

    const [sponsoredData, cosponsoredData] = await Promise.all([
      sponsoredRes.ok ? sponsoredRes.json() : { sponsoredLegislation: [], pagination: {} },
      cosponsoredRes.ok ? cosponsoredRes.json() : { cosponsoredLegislation: [] },
    ]);

    const mapBill = (b: Record<string, unknown>) => ({
      number: (b.number as string | null) ?? null,
      title: (b.title as string | null) ?? null,
      type: (b.type as string | null) ?? null,
      congress: b.congress != null ? String(b.congress) : null,
      latestAction: ((b.latestAction as Record<string, unknown>)?.text as string | null) ?? null,
      latestActionDate: ((b.latestAction as Record<string, unknown>)?.actionDate as string | null) ?? null,
      url: (b.url as string | null) ?? null,
    });

    const sponsored = ((sponsoredData.sponsoredLegislation ?? []) as Record<string, unknown>[]).map(mapBill);

    const becameLaw = sponsored.filter((b) =>
      b.latestAction?.toLowerCase().includes("became public law") ||
      b.latestAction?.toLowerCase().includes("signed by the president")
    ).length;

    const sponsorCounts: Record<string, { name: string; party: string; count: number }> = {};
    for (const bill of cosponsoredData.cosponsoredLegislation ?? []) {
      const sponsors = (bill as Record<string, unknown>).sponsors as Array<Record<string, unknown>> | undefined;
      if (!sponsors) continue;
      for (const s of sponsors) {
        const id = s.bioguideId as string;
        const name = (s.fullName ?? s.name) as string;
        const party = (s.party as string) ?? "Unknown";
        if (!id || id === bioguideId) continue;
        if (!sponsorCounts[id]) sponsorCounts[id] = { name, party, count: 0 };
        sponsorCounts[id].count++;
      }
    }
    const cosponsorNetwork = Object.values(sponsorCounts)
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);

    const result = {
      sponsored: sponsored.slice(0, 10),
      cosponsored: ((cosponsoredData.cosponsoredLegislation ?? []) as Record<string, unknown>[])
        .slice(0, 5)
        .map(mapBill),
      becameLaw,
      totalSponsored: sponsoredData.pagination?.count ?? sponsored.length,
      totalCosponsored:
        cosponsoredData.pagination?.count ??
        (cosponsoredData.cosponsoredLegislation ?? []).length,
      cosponsorNetwork,
    };
    cacheSet(`congress:${bioguideId}`, result);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[congress route]", err);
    return NextResponse.json({ error: "Congress.gov API unavailable" }, { status: 502 });
  }
}
