import { promises as fs } from "node:fs";
import path from "node:path";
import {
  fetchPrices,
  fetchHistory,
  fetchGold,
  type PriceRow,
  type GoldRow,
} from "./albionApi";
import { catalog, expandItemIds } from "./catalog";

const CACHE_DIR = path.join(process.cwd(), ".cache");
const CACHE_FILE = path.join(CACHE_DIR, "market-cache.json");

const PRICES_TTL_MS = 10 * 60 * 1000;
const HISTORY_TTL_MS = 60 * 60 * 1000;
const GOLD_TTL_MS = 15 * 60 * 1000;

export interface LiquidityRow {
  item_id: string;
  city: string;
  quality: number;
  avgDailyVolume: number;
}

interface MarketCache {
  prices: { fetchedAt: number; rows: PriceRow[] };
  liquidity: { fetchedAt: number; rows: LiquidityRow[] };
  gold: { fetchedAt: number; rows: GoldRow[] };
}

const EMPTY_CACHE: MarketCache = {
  prices: { fetchedAt: 0, rows: [] },
  liquidity: { fetchedAt: 0, rows: [] },
  gold: { fetchedAt: 0, rows: [] },
};

// Serializes concurrent refresh attempts within this process so parallel
// requests hitting a cold cache don't each trigger their own full refetch.
let inFlightRefresh: Promise<MarketCache> | null = null;

async function readCacheFile(): Promise<MarketCache> {
  try {
    const raw = await fs.readFile(CACHE_FILE, "utf-8");
    return { ...EMPTY_CACHE, ...JSON.parse(raw) };
  } catch {
    return EMPTY_CACHE;
  }
}

async function writeCacheFile(cache: MarketCache): Promise<void> {
  await fs.mkdir(CACHE_DIR, { recursive: true });
  const tmpFile = `${CACHE_FILE}.${process.pid}.tmp`;
  await fs.writeFile(tmpFile, JSON.stringify(cache));
  await fs.rename(tmpFile, CACHE_FILE);
}

function summarizeLiquidity(
  historyRows: Awaited<ReturnType<typeof fetchHistory>>
): LiquidityRow[] {
  return historyRows.map((row) => {
    const totalVolume = row.data.reduce((sum, point) => sum + point.item_count, 0);
    const avgDailyVolume = row.data.length > 0 ? totalVolume / row.data.length : 0;
    return {
      item_id: row.item_id,
      city: row.location,
      quality: row.quality,
      avgDailyVolume,
    };
  });
}

async function refresh(current: MarketCache): Promise<MarketCache> {
  const now = Date.now();
  const itemIds = expandItemIds(catalog);

  const needsPrices = now - current.prices.fetchedAt > PRICES_TTL_MS;
  const needsHistory = now - current.liquidity.fetchedAt > HISTORY_TTL_MS;
  const needsGold = now - current.gold.fetchedAt > GOLD_TTL_MS;

  const [prices, historyRows, gold] = await Promise.all([
    needsPrices ? fetchPrices(itemIds) : Promise.resolve(current.prices.rows),
    needsHistory ? fetchHistory(itemIds) : Promise.resolve(null),
    needsGold ? fetchGold(60) : Promise.resolve(current.gold.rows),
  ]);

  const next: MarketCache = {
    prices: needsPrices ? { fetchedAt: now, rows: prices } : current.prices,
    liquidity: needsHistory
      ? { fetchedAt: now, rows: summarizeLiquidity(historyRows!) }
      : current.liquidity,
    gold: needsGold ? { fetchedAt: now, rows: gold } : current.gold,
  };

  await writeCacheFile(next);
  return next;
}

/**
 * Returns the freshest available market snapshot. If the on-disk cache is
 * stale, blocks this request to refresh it (stale-while-revalidate would
 * otherwise mean the *next* request pays the latency instead of this one,
 * which is fine too - see `getMarketSnapshotEventuallyFresh` below).
 */
export async function getMarketSnapshot(): Promise<MarketCache> {
  const current = await readCacheFile();
  const now = Date.now();
  const isStale =
    now - current.prices.fetchedAt > PRICES_TTL_MS ||
    now - current.liquidity.fetchedAt > HISTORY_TTL_MS ||
    now - current.gold.fetchedAt > GOLD_TTL_MS;

  if (!isStale) return current;

  if (!inFlightRefresh) {
    inFlightRefresh = refresh(current).finally(() => {
      inFlightRefresh = null;
    });
  }
  return inFlightRefresh;
}

export function cacheAgeMs(cache: MarketCache): number {
  if (!cache.prices.fetchedAt) return Infinity;
  return Date.now() - cache.prices.fetchedAt;
}
