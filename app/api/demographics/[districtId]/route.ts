import { NextRequest, NextResponse } from "next/server";
import { STATE_TO_FIPS } from "@/lib/stateFips";

const CENSUS_BASE = "https://api.census.gov/data/2022/acs/acs5";

// ACS variable codes
const VARS = [
  "B01001_001E", // total population
  "B01002_001E", // median age
  "B02001_002E", // white alone
  "B02001_003E", // Black or African American alone
  "B03001_003E", // Hispanic or Latino
  "B15003_022E", // bachelor's degree (25+)
  "B15003_001E", // total 25+ (denominator for education)
  "B17001_002E", // below poverty line
  "B17001_001E", // total poverty universe (denominator)
  "B19013_001E", // median household income
].join(",");

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ districtId: string }> }
) {
  const { districtId } = await params;
  const [stateAbbr, rawNum] = districtId.split("-");
  if (!stateAbbr || !rawNum) {
    return NextResponse.json({ error: "Invalid district ID" }, { status: 400 });
  }

  const fips = STATE_TO_FIPS[stateAbbr];
  if (!fips) {
    return NextResponse.json({ error: "Unknown state" }, { status: 400 });
  }

  // At-large districts use code "00" → Census uses "00" as well
  const districtNum = rawNum.padStart(2, "0");

  const url = new URL(CENSUS_BASE);
  url.searchParams.set("get", VARS);
  url.searchParams.set("for", `congressional district:${districtNum}`);
  url.searchParams.set("in", `state:${fips}`);

  try {
    const res = await fetch(url.toString(), {
      next: { revalidate: 604800 }, // cache 1 week
    });
    if (!res.ok) throw new Error(`Census HTTP ${res.status}`);

    const raw: string[][] = await res.json();
    if (raw.length < 2) return NextResponse.json({ noData: true });

    const headers = raw[0];
    const values = raw[1];
    const get = (code: string) => {
      const idx = headers.indexOf(code);
      return idx >= 0 ? parseInt(values[idx], 10) : null;
    };

    const totalPop = get("B01001_001E");
    const medianAge = get("B01002_001E");
    const white = get("B02001_002E");
    const black = get("B02001_003E");
    const hispanic = get("B03001_003E");
    const bachelors = get("B15003_022E");
    const edu25Plus = get("B15003_001E");
    const poverty = get("B17001_002E");
    const povertyTotal = get("B17001_001E");
    const medianIncome = get("B19013_001E");

    const pct = (num: number | null, den: number | null) =>
      num != null && den != null && den > 0
        ? Math.round((num / den) * 1000) / 10
        : null;

    return NextResponse.json({
      population: totalPop,
      medianAge: medianAge != null ? medianAge / 10 : null, // Census stores as tenths
      medianIncome,
      pctWhite: pct(white, totalPop),
      pctBlack: pct(black, totalPop),
      pctHispanic: pct(hispanic, totalPop),
      pctCollegeEducated: pct(bachelors, edu25Plus),
      pctPoverty: pct(poverty, povertyTotal),
    });
  } catch (err) {
    console.error("[demographics route]", err);
    return NextResponse.json({ error: "Census API unavailable" }, { status: 502 });
  }
}
