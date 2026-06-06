import { NextRequest, NextResponse } from "next/server";
import { cacheGet, cacheSet } from "@/lib/apiCache";

const FEC_BASE = "https://api.open.fec.gov/v1";
const API_KEY = process.env.FEC_API_KEY ?? "DEMO_KEY";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ districtId: string }> }
) {
  const { districtId } = await params;
  const cached = cacheGet<object>(`fec:${districtId}`);
  if (cached) return NextResponse.json(cached);
  const [state, rawNum] = districtId.split("-");
  if (!state || !rawNum) {
    return NextResponse.json({ error: "Invalid district ID" }, { status: 400 });
  }
  const district = parseInt(rawNum, 10);

  try {
    // Find House candidates for this state/district in the 2024 cycle
    const candidateUrl = new URL(`${FEC_BASE}/candidates/`);
    candidateUrl.searchParams.set("state", state);
    candidateUrl.searchParams.set("district", String(district).padStart(2, "0"));
    candidateUrl.searchParams.set("office", "H");
    candidateUrl.searchParams.set("election_year", "2024");
    candidateUrl.searchParams.set("per_page", "5");
    candidateUrl.searchParams.set("api_key", API_KEY);

    const candRes = await fetch(candidateUrl.toString(), {
      next: { revalidate: 86400 }, // cache 24h
    });
    if (!candRes.ok) throw new Error(`FEC candidates HTTP ${candRes.status}`);
    const candData = await candRes.json();

    const candidates: { candidate_id: string; name: string; party: string }[] =
      candData.results ?? [];
    if (candidates.length === 0) {
      return NextResponse.json({ noData: true });
    }

    // Prefer winner: sort by name match against our rep data isn't available here,
    // so fetch totals for all candidates and return the one with most receipts
    const totalsResults = await Promise.all(
      candidates.map(async (c) => {
        const totalsUrl = new URL(`${FEC_BASE}/candidate/${c.candidate_id}/totals/`);
        totalsUrl.searchParams.set("cycle", "2024");
        totalsUrl.searchParams.set("api_key", API_KEY);
        const res = await fetch(totalsUrl.toString(), { next: { revalidate: 86400 } });
        if (!res.ok) return null;
        const data = await res.json();
        const t = data.results?.[0];
        if (!t) return null;
        return {
          name: c.name,
          party: c.party,
          raised: t.receipts ?? 0,
          spent: t.disbursements ?? 0,
          cashOnHand: t.last_cash_on_hand_end_period ?? 0,
          candidateId: c.candidate_id,
        };
      })
    );

    const valid = totalsResults.filter(Boolean).sort((a, b) => b!.raised - a!.raised);
    if (valid.length === 0) return NextResponse.json({ noData: true });

    // Also fetch top industries for the winner
    const winner = valid[0]!;
    let topIndustries: { name: string; total: number }[] = [];
    try {
      const indUrl = new URL(`${FEC_BASE}/schedules/schedule_a/by_industry/`);
      indUrl.searchParams.set("candidate_id", winner.candidateId);
      indUrl.searchParams.set("cycle", "2024");
      indUrl.searchParams.set("per_page", "5");
      indUrl.searchParams.set("api_key", API_KEY);
      const indRes = await fetch(indUrl.toString(), { next: { revalidate: 86400 } });
      if (indRes.ok) {
        const indData = await indRes.json();
        topIndustries = (indData.results ?? []).map((r: { industry_name: string; total: number }) => ({
          name: r.industry_name,
          total: r.total,
        }));
      }
    } catch {
      // industries are optional — skip on error
    }

    const result = {
      name: winner.name,
      party: winner.party,
      raised: winner.raised,
      spent: winner.spent,
      cashOnHand: winner.cashOnHand,
      topIndustries,
      allCandidates: valid.map((c) => ({
        name: c!.name,
        party: c!.party,
        raised: c!.raised,
      })),
    };
    cacheSet(`fec:${districtId}`, result);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[FEC route]", err);
    return NextResponse.json({ error: "FEC API unavailable" }, { status: 502 });
  }
}
