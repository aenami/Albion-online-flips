import { NextResponse } from "next/server";
import { getMarketSnapshot } from "@/lib/priceCache";
import { computeGoldSummary } from "@/lib/flipEngine";

// See app/api/flips/route.ts: live data + writable cache, Node runtime only,
// request-time execution.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET() {
  const snapshot = await getMarketSnapshot();
  const gold = computeGoldSummary(snapshot.gold.rows);
  return NextResponse.json({ gold });
}
