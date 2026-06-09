import { NextRequest, NextResponse } from "next/server";
import { cacheGet, cacheSet } from "@/lib/apiCache";

const GUARDIAN_BASE = "https://content.guardianapis.com";
const API_KEY = process.env.GUARDIAN_API_KEY;

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ districtId: string }> }
) {
  const { districtId } = await params;
  const rep = req.nextUrl.searchParams.get("rep") ?? "";
  const cacheKey = `guardian:${districtId}`;

  const cached = cacheGet<object>(cacheKey);
  if (cached) return NextResponse.json(cached);

  if (!API_KEY) {
    return NextResponse.json({ noKey: true }, { status: 200 });
  }

  try {
    const query = rep ? `"${rep}" Congress` : `US Congress`;
    const url = new URL(`${GUARDIAN_BASE}/search`);
    url.searchParams.set("q", query);
    url.searchParams.set("api-key", API_KEY);
    url.searchParams.set("order-by", "newest");
    url.searchParams.set("page-size", "5");
    url.searchParams.set("show-fields", "trailText,thumbnail");
    url.searchParams.set("section", "us-news");

    const res = await fetch(url.toString(), { next: { revalidate: 1800 } });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        return NextResponse.json({ noKey: true }, { status: 200 });
      }
      throw new Error(`Guardian API HTTP ${res.status}`);
    }

    const data = await res.json();
    const articles = ((data.response?.results ?? []) as Record<string, unknown>[]).map((r) => ({
      id: r.id as string,
      webTitle: r.webTitle as string,
      webUrl: r.webUrl as string,
      webPublicationDate: r.webPublicationDate as string,
      fields: r.fields as { trailText?: string; thumbnail?: string } | undefined,
    }));

    const result = { articles };
    cacheSet(cacheKey, result);
    return NextResponse.json(result);
  } catch (err) {
    console.error("[guardian route]", err);
    return NextResponse.json({ error: "Guardian API unavailable" }, { status: 502 });
  }
}
