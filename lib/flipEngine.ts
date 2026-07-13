import {
  LOCATIONS,
  ROYAL_CITIES,
  type Location,
  type PriceRow,
  type GoldRow,
} from "./albionApi";
import {
  catalog,
  enchantRecipes,
  isBlackMarketEligible,
  enchantedId,
  getCatalogItem,
} from "./catalog";
import {
  costOfBuyOrder,
  costOfInstantBuy,
  netFromBlackMarketSale,
  netFromInstantSell,
  netFromSellOrder,
  type FeeSettings,
} from "./fees";
import type { LiquidityRow } from "./priceCache";

export type FlipType =
  | "same-city"
  | "cross-city"
  | "black-market-direct"
  | "enchant-black-market";

export type RiskLevel = "low" | "medium" | "high";
export type TravelKind = "none" | "royal-to-royal" | "royal-to-caerleon";
export type ExecutionMode = "instant" | "order";

export interface FlipOpportunity {
  id: string;
  type: FlipType;
  itemId: string;
  itemName: string;
  tier: number;
  enchantLevel: number;
  quality: number;
  category: string;
  subcategory: string;
  buyCity: Location;
  sellCity: Location;
  investment: number;
  profit: number;
  roi: number;
  liquidity: number;
  dataAgeMs: number;
  risk: RiskLevel;
  travel: TravelKind;
  mode: ExecutionMode;
  meta?: Record<string, unknown>;
}

const NON_BLACK_MARKET_CITIES: Location[] = LOCATIONS.filter(
  (l) => l !== "Black Market"
);
const SOURCE_CITIES: Location[] = ["Caerleon", ...ROYAL_CITIES];
const DEFAULT_MAX_AGE_MS = 24 * 60 * 60 * 1000;

type PriceIndex = Map<string, Map<string, Map<number, PriceRow>>>;
type LiquidityIndex = Map<string, Map<string, Map<number, number>>>;

export function buildPriceIndex(rows: PriceRow[]): PriceIndex {
  const index: PriceIndex = new Map();
  for (const row of rows) {
    let byCity = index.get(row.item_id);
    if (!byCity) {
      byCity = new Map();
      index.set(row.item_id, byCity);
    }
    let byQuality = byCity.get(row.city);
    if (!byQuality) {
      byQuality = new Map();
      byCity.set(row.city, byQuality);
    }
    byQuality.set(row.quality, row);
  }
  return index;
}

export function buildLiquidityIndex(rows: LiquidityRow[]): LiquidityIndex {
  const index: LiquidityIndex = new Map();
  for (const row of rows) {
    let byCity = index.get(row.item_id);
    if (!byCity) {
      byCity = new Map();
      index.set(row.item_id, byCity);
    }
    let byQuality = byCity.get(row.city);
    if (!byQuality) {
      byQuality = new Map();
      byCity.set(row.city, byQuality);
    }
    byQuality.set(row.quality, row.avgDailyVolume);
  }
  return index;
}

function getRow(
  index: PriceIndex,
  itemId: string,
  city: string,
  quality: number
): PriceRow | undefined {
  return index.get(itemId)?.get(city)?.get(quality);
}

function getLiquidity(
  index: LiquidityIndex,
  itemId: string,
  city: string,
  quality: number
): number {
  return index.get(itemId)?.get(city)?.get(quality) ?? 0;
}

// The API returns naive timestamps ("2026-07-05T04:20:00") that are actually
// UTC but carry no "Z"/offset suffix, so Date.parse would otherwise
// misinterpret them in the server's local timezone.
function ageMs(dateStr: string): number {
  const parsed = Date.parse(dateStr.endsWith("Z") ? dateStr : `${dateStr}Z`);
  if (Number.isNaN(parsed)) return Infinity;
  return Date.now() - parsed;
}

function hasValidSellSide(row: PriceRow | undefined): row is PriceRow {
  return !!row && row.sell_price_min > 0;
}

interface MaterialPriceInfo {
  price: number;
  dataAgeMs: number;
}

// Enchanting a single piece of gear needs dozens of runes/souls/relics at
// once, so the single cheapest listed sell order (which the API surfaces as
// sell_price_min) rarely has enough depth to cover the whole purchase - the
// real average cost ends up higher. As a proxy for "what you'd actually pay
// in bulk" without order-book depth data, we take the median sell price
// across every source city instead of the citywide minimum: a realistic
// middle ground between the cheapest and priciest cities right now.
function medianMaterialPrice(
  priceIndex: PriceIndex,
  resource: string
): MaterialPriceInfo | null {
  const observations: { price: number; ageMs: number }[] = [];
  for (const city of SOURCE_CITIES) {
    for (let quality = 1; quality <= 5; quality++) {
      const row = getRow(priceIndex, resource, city, quality);
      if (!row || !hasValidSellSide(row)) continue;
      observations.push({
        price: row.sell_price_min,
        ageMs: ageMs(row.sell_price_min_date),
      });
    }
  }
  if (observations.length === 0) return null;

  observations.sort((a, b) => a.price - b.price);
  const mid = Math.floor(observations.length / 2);
  if (observations.length % 2 === 0) {
    const lo = observations[mid - 1];
    const hi = observations[mid];
    return { price: (lo.price + hi.price) / 2, dataAgeMs: Math.max(lo.ageMs, hi.ageMs) };
  }
  return { price: observations[mid].price, dataAgeMs: observations[mid].ageMs };
}

function hasValidBuySide(row: PriceRow | undefined): row is PriceRow {
  return !!row && row.buy_price_max > 0;
}

function travelFor(sourceCity: string, destCity: string): TravelKind {
  if (sourceCity === destCity) return "none";
  if (destCity === "Black Market") {
    return sourceCity === "Caerleon" ? "none" : "royal-to-caerleon";
  }
  return "royal-to-royal";
}

function riskFor(travel: TravelKind): RiskLevel {
  if (travel === "none") return "low";
  if (travel === "royal-to-royal") return "medium";
  return "high";
}

function makeId(...parts: (string | number)[]): string {
  return parts.join(":");
}

// ---------------------------------------------------------------------------
// 1. Same-city flip: capture the resting-order spread within a single market.
// ---------------------------------------------------------------------------
export function computeSameCityFlips(
  priceIndex: PriceIndex,
  liquidityIndex: LiquidityIndex,
  fees: FeeSettings,
  maxAgeMs = DEFAULT_MAX_AGE_MS
): FlipOpportunity[] {
  const results: FlipOpportunity[] = [];

  for (const item of catalog) {
    for (let level = 0; level <= item.maxEnchant; level++) {
      const itemId = enchantedId(item.id, level);
      for (const city of NON_BLACK_MARKET_CITIES) {
        for (let quality = 1; quality <= 5; quality++) {
          const row = getRow(priceIndex, itemId, city, quality);
          if (!row || !hasValidSellSide(row) || !hasValidBuySide(row)) continue;
          if (row.buy_price_max >= row.sell_price_min) continue; // no spread

          const dataAge = Math.max(
            ageMs(row.sell_price_min_date),
            ageMs(row.buy_price_max_date)
          );
          if (dataAge > maxAgeMs) continue;

          const investment = costOfBuyOrder(row.buy_price_max);
          const revenue = netFromSellOrder(row.sell_price_min, fees);
          const profit = revenue - investment;
          if (profit <= 0) continue;

          results.push({
            id: makeId("same-city", itemId, city, quality),
            type: "same-city",
            itemId,
            itemName: item.name,
            tier: item.tier,
            enchantLevel: level,
            quality,
            category: item.category,
            subcategory: item.subcategory,
            buyCity: city,
            sellCity: city,
            investment,
            profit,
            roi: profit / investment,
            liquidity: getLiquidity(liquidityIndex, itemId, city, quality),
            dataAgeMs: dataAge,
            risk: "low",
            travel: "none",
            mode: "order",
          });
        }
      }
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// 2. Cross-city flip: buy in the cheapest market, sell in the richest one.
// ---------------------------------------------------------------------------
export function computeCrossCityFlips(
  priceIndex: PriceIndex,
  liquidityIndex: LiquidityIndex,
  fees: FeeSettings,
  maxAgeMs = DEFAULT_MAX_AGE_MS
): FlipOpportunity[] {
  const results: FlipOpportunity[] = [];

  for (const item of catalog) {
    for (let level = 0; level <= item.maxEnchant; level++) {
      const itemId = enchantedId(item.id, level);
      for (let quality = 1; quality <= 5; quality++) {
        const rowsByCity = new Map<Location, PriceRow>();
        for (const city of NON_BLACK_MARKET_CITIES) {
          const row = getRow(priceIndex, itemId, city, quality);
          if (row) rowsByCity.set(city, row);
        }
        if (rowsByCity.size < 2) continue;

        // Fast route: instant-buy cheapest sell listing, instant-sell into the
        // richest buy order elsewhere.
        let fastBuyCity: Location | null = null;
        let fastBuyRow: PriceRow | null = null;
        for (const [city, row] of rowsByCity) {
          if (!hasValidSellSide(row)) continue;
          if (!fastBuyRow || row.sell_price_min < fastBuyRow.sell_price_min) {
            fastBuyCity = city;
            fastBuyRow = row;
          }
        }
        let fastSellCity: Location | null = null;
        let fastSellRow: PriceRow | null = null;
        for (const [city, row] of rowsByCity) {
          if (city === fastBuyCity || !hasValidBuySide(row)) continue;
          if (!fastSellRow || row.buy_price_max > fastSellRow.buy_price_max) {
            fastSellCity = city;
            fastSellRow = row;
          }
        }

        // Patient route: place a buy order at the cheapest bid, a sell order
        // at the richest ask elsewhere.
        let patientBuyCity: Location | null = null;
        let patientBuyRow: PriceRow | null = null;
        for (const [city, row] of rowsByCity) {
          if (!hasValidBuySide(row)) continue;
          if (!patientBuyRow || row.buy_price_max < patientBuyRow.buy_price_max) {
            patientBuyCity = city;
            patientBuyRow = row;
          }
        }
        let patientSellCity: Location | null = null;
        let patientSellRow: PriceRow | null = null;
        for (const [city, row] of rowsByCity) {
          if (city === patientBuyCity || !hasValidSellSide(row)) continue;
          if (!patientSellRow || row.sell_price_min > patientSellRow.sell_price_min) {
            patientSellCity = city;
            patientSellRow = row;
          }
        }

        const candidates: {
          mode: ExecutionMode;
          buyCity: Location;
          sellCity: Location;
          investment: number;
          revenue: number;
          dataAge: number;
        }[] = [];

        if (fastBuyCity && fastSellCity && fastBuyRow && fastSellRow) {
          candidates.push({
            mode: "instant",
            buyCity: fastBuyCity,
            sellCity: fastSellCity,
            investment: costOfInstantBuy(fastBuyRow.sell_price_min),
            revenue: netFromInstantSell(fastSellRow.buy_price_max, fees),
            dataAge: Math.max(
              ageMs(fastBuyRow.sell_price_min_date),
              ageMs(fastSellRow.buy_price_max_date)
            ),
          });
        }
        if (patientBuyCity && patientSellCity && patientBuyRow && patientSellRow) {
          candidates.push({
            mode: "order",
            buyCity: patientBuyCity,
            sellCity: patientSellCity,
            investment: costOfBuyOrder(patientBuyRow.buy_price_max),
            revenue: netFromSellOrder(patientSellRow.sell_price_min, fees),
            dataAge: Math.max(
              ageMs(patientBuyRow.buy_price_max_date),
              ageMs(patientSellRow.sell_price_min_date)
            ),
          });
        }

        let best: (typeof candidates)[number] | null = null;
        for (const c of candidates) {
          const profit = c.revenue - c.investment;
          if (profit <= 0) continue;
          if (!best || profit > best.revenue - best.investment) best = c;
        }
        if (!best || best.dataAge > maxAgeMs) continue;

        const profit = best.revenue - best.investment;
        const liquidity = Math.min(
          getLiquidity(liquidityIndex, itemId, best.buyCity, quality) || Infinity,
          getLiquidity(liquidityIndex, itemId, best.sellCity, quality) || Infinity
        );

        results.push({
          id: makeId("cross-city", itemId, best.buyCity, best.sellCity, quality),
          type: "cross-city",
          itemId,
          itemName: item.name,
          tier: item.tier,
          enchantLevel: level,
          quality,
          category: item.category,
          subcategory: item.subcategory,
          buyCity: best.buyCity,
          sellCity: best.sellCity,
          investment: best.investment,
          profit,
          roi: profit / best.investment,
          liquidity: Number.isFinite(liquidity) ? liquidity : 0,
          dataAgeMs: best.dataAge,
          risk: "medium",
          travel: "royal-to-royal",
          mode: best.mode,
        });
      }
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// 3. Black Market direct flip: buy gear as-is, instant-sell tax-free to the
//    Black Market NPC buy order.
// ---------------------------------------------------------------------------
export function computeBlackMarketDirectFlips(
  priceIndex: PriceIndex,
  liquidityIndex: LiquidityIndex,
  maxAgeMs = DEFAULT_MAX_AGE_MS
): FlipOpportunity[] {
  const results: FlipOpportunity[] = [];

  for (const item of catalog) {
    if (!isBlackMarketEligible(item)) continue;

    for (let level = 0; level <= item.maxEnchant; level++) {
      const itemId = enchantedId(item.id, level);
      for (let quality = 1; quality <= 5; quality++) {
        const bmRow = getRow(priceIndex, itemId, "Black Market", quality);
        if (!bmRow || !hasValidBuySide(bmRow)) continue;

        // Emit one candidate per source city (not just the globally cheapest
        // one) so that e.g. a Caerleon-only route is still visible even when
        // a royal city happens to offer a lower price for the same item.
        for (const sourceCity of SOURCE_CITIES) {
          const sourceRow = getRow(priceIndex, itemId, sourceCity, quality);
          if (!sourceRow || !hasValidSellSide(sourceRow)) continue;

          const dataAge = Math.max(
            ageMs(sourceRow.sell_price_min_date),
            ageMs(bmRow.buy_price_max_date)
          );
          if (dataAge > maxAgeMs) continue;

          const investment = costOfInstantBuy(sourceRow.sell_price_min);
          const revenue = netFromBlackMarketSale(bmRow.buy_price_max);
          const profit = revenue - investment;
          if (profit <= 0) continue;

          const travel = travelFor(sourceCity, "Black Market");

          results.push({
            id: makeId("bm-direct", itemId, sourceCity, quality),
            type: "black-market-direct",
            itemId,
            itemName: item.name,
            tier: item.tier,
            enchantLevel: level,
            quality,
            category: item.category,
            subcategory: item.subcategory,
            buyCity: sourceCity,
            sellCity: "Black Market",
            investment,
            profit,
            roi: profit / investment,
            liquidity: getLiquidity(liquidityIndex, itemId, sourceCity, quality),
            dataAgeMs: dataAge,
            risk: riskFor(travel),
            travel,
            mode: "instant",
          });
        }
      }
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// 4. Enchant + Black Market flip: buy the base item + the runes/souls/relics
//    it needs, enchant it, then sell the result to the Black Market.
// ---------------------------------------------------------------------------
export function computeEnchantBlackMarketFlips(
  priceIndex: PriceIndex,
  liquidityIndex: LiquidityIndex,
  maxAgeMs = DEFAULT_MAX_AGE_MS
): FlipOpportunity[] {
  const results: FlipOpportunity[] = [];

  // A given resource (e.g. T5_RUNE) is shared by dozens of catalog items, so
  // memoize its cross-city median price instead of recomputing it per item.
  const materialPriceCache = new Map<string, MaterialPriceInfo | null>();
  const getMaterialPrice = (resource: string): MaterialPriceInfo | null => {
    if (!materialPriceCache.has(resource)) {
      materialPriceCache.set(resource, medianMaterialPrice(priceIndex, resource));
    }
    return materialPriceCache.get(resource) ?? null;
  };

  for (const item of catalog) {
    if (!isBlackMarketEligible(item)) continue;
    const recipe = enchantRecipes[item.id];
    if (!recipe) continue;

    for (const levelStr of Object.keys(recipe)) {
      const level = Number(levelStr);
      const { resource, count } = recipe[levelStr];
      const targetItemId = enchantedId(item.id, level);
      const materialInfo = getMaterialPrice(resource);
      if (!materialInfo) continue;
      const materialName = getCatalogItem(resource)?.name ?? resource;

      for (let quality = 1; quality <= 5; quality++) {
        const bmRow = getRow(priceIndex, targetItemId, "Black Market", quality);
        if (!bmRow || !hasValidBuySide(bmRow)) continue;

        // Emit one candidate per source city (not just the globally cheapest
        // one) so that e.g. a Caerleon-only route is still visible even when
        // a royal city happens to offer a lower total cost for the same item.
        for (const city of SOURCE_CITIES) {
          const baseRow = getRow(priceIndex, item.id, city, quality);
          if (!baseRow || !hasValidSellSide(baseRow)) continue;

          const materialTotalCost = count * costOfInstantBuy(materialInfo.price);
          const totalCost = costOfInstantBuy(baseRow.sell_price_min) + materialTotalCost;
          const dataAge = Math.max(
            ageMs(baseRow.sell_price_min_date),
            materialInfo.dataAgeMs,
            ageMs(bmRow.buy_price_max_date)
          );
          if (dataAge > maxAgeMs) continue;

          const revenue = netFromBlackMarketSale(bmRow.buy_price_max);
          const profit = revenue - totalCost;
          if (profit <= 0) continue;

          const travel = travelFor(city, "Black Market");

          results.push({
            id: makeId("enchant-bm", targetItemId, city, quality),
            type: "enchant-black-market",
            itemId: targetItemId,
            itemName: `${item.name} (${levelStr})`,
            tier: item.tier,
            enchantLevel: level,
            quality,
            category: item.category,
            subcategory: item.subcategory,
            buyCity: city,
            sellCity: "Black Market",
            investment: totalCost,
            profit,
            roi: profit / totalCost,
            liquidity: getLiquidity(liquidityIndex, targetItemId, city, quality),
            dataAgeMs: dataAge,
            risk: riskFor(travel),
            travel,
            mode: "instant",
            meta: {
              baseItemId: item.id,
              basePrice: baseRow.sell_price_min,
              material: resource,
              materialName,
              materialUnitPrice: materialInfo.price,
              materialCount: count,
              materialTotalCost,
            },
          });
        }
      }
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// 5. Gold flip summary (bonus widget, not an item flip).
// ---------------------------------------------------------------------------
export interface GoldSummary {
  currentPrice: number;
  avg7d: number;
  min30d: number;
  max30d: number;
  changePct24h: number;
  recommendation: "buy" | "sell" | "hold";
  history: GoldRow[];
}

export function computeGoldSummary(rows: GoldRow[]): GoldSummary | null {
  if (rows.length === 0) return null;
  const sorted = [...rows].sort(
    (a, b) => Date.parse(a.timestamp) - Date.parse(b.timestamp)
  );
  const currentPrice = sorted[sorted.length - 1].price;
  const last7 = sorted.slice(-7);
  const last30 = sorted.slice(-30);
  const avg7d = last7.reduce((sum, r) => sum + r.price, 0) / last7.length;
  const min30d = Math.min(...last30.map((r) => r.price));
  const max30d = Math.max(...last30.map((r) => r.price));
  const yesterday = sorted[Math.max(0, sorted.length - 2)].price;
  const changePct24h = ((currentPrice - yesterday) / yesterday) * 100;

  const range = max30d - min30d || 1;
  const positionInRange = (currentPrice - min30d) / range;
  const recommendation =
    positionInRange < 0.35 ? "buy" : positionInRange > 0.65 ? "sell" : "hold";

  return { currentPrice, avg7d, min30d, max30d, changePct24h, recommendation, history: sorted };
}

// ---------------------------------------------------------------------------
export interface AllFlips {
  sameCity: FlipOpportunity[];
  crossCity: FlipOpportunity[];
  blackMarketDirect: FlipOpportunity[];
  enchantBlackMarket: FlipOpportunity[];
  gold: GoldSummary | null;
}

export function computeAllFlips(
  prices: PriceRow[],
  liquidity: LiquidityRow[],
  goldRows: GoldRow[],
  fees: FeeSettings,
  maxAgeMs?: number
): AllFlips {
  const priceIndex = buildPriceIndex(prices);
  const liquidityIndex = buildLiquidityIndex(liquidity);

  return {
    sameCity: computeSameCityFlips(priceIndex, liquidityIndex, fees, maxAgeMs),
    crossCity: computeCrossCityFlips(priceIndex, liquidityIndex, fees, maxAgeMs),
    blackMarketDirect: computeBlackMarketDirectFlips(priceIndex, liquidityIndex, maxAgeMs),
    enchantBlackMarket: computeEnchantBlackMarketFlips(priceIndex, liquidityIndex, maxAgeMs),
    gold: computeGoldSummary(goldRows),
  };
}
