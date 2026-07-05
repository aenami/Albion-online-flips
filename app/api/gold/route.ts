import { NextResponse } from "next/server";
import { getMarketSnapshot } from "@/lib/priceCache";
import { computeGoldSummary } from "@/lib/flipEngine";

export async function GET() {
  const snapshot = await getMarketSnapshot();
  const gold = computeGoldSummary(snapshot.gold.rows);
  return NextResponse.json({ gold });
}
