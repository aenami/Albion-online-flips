import { NextRequest, NextResponse } from "next/server";
import { getMarketSnapshot, cacheAgeMs } from "@/lib/priceCache";
import { computeAllFlips, type AllFlips, type FlipOpportunity, type FlipType } from "@/lib/flipEngine";
import { applyFilters, filtersFromSearchParams, sortFlips, type SortBy, type SortDir } from "@/lib/filters";

// Reads live market data and refreshes an on-disk/in-memory cache, so it must
// run on the Node runtime and never be prerendered at build time. The cold-path
// refresh fans out ~100 upstream calls, so give it a generous execution budget.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

const FLIP_TYPE_KEYS: Record<FlipType, Exclude<keyof AllFlips, "gold">> = {
  "same-city": "sameCity",
  "cross-city": "crossCity",
  "black-market-direct": "blackMarketDirect",
  "enchant-black-market": "enchantBlackMarket",
};

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const hasPremium = params.get("premium") === "true";
  const requestedTypes = (params.get("type")?.split(",").filter(Boolean) as
    | FlipType[]
    | undefined) ?? ["same-city", "cross-city", "black-market-direct", "enchant-black-market"];

  const snapshot = await getMarketSnapshot();
  const all = computeAllFlips(
    snapshot.prices.rows,
    snapshot.liquidity.rows,
    snapshot.gold.rows,
    { hasPremium }
  );

  let flips: FlipOpportunity[] = requestedTypes.flatMap(
    (type) => all[FLIP_TYPE_KEYS[type]] ?? []
  );

  const filters = filtersFromSearchParams(params);
  flips = applyFilters(flips, filters);

  const sortBy = (params.get("sortBy") as SortBy) || "profit";
  const sortDir = (params.get("sortDir") as SortDir) || "desc";
  flips = sortFlips(flips, sortBy, sortDir);

  const total = flips.length;
  const offset = Number(params.get("offset") ?? 0);
  const limit = Number(params.get("limit") ?? 200);
  flips = flips.slice(offset, offset + limit);

  return NextResponse.json({
    flips,
    total,
    cacheAgeMs: cacheAgeMs(snapshot),
    pricesFetchedAt: snapshot.prices.fetchedAt,
    liquidityFetchedAt: snapshot.liquidity.fetchedAt,
  });
}
