import { promises as fs } from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  fetchPrices,
  fetchHistory,
  fetchGold,
  type PriceRow,
  type GoldRow,
} from "./albionApi";
import { catalog, expandItemIds } from "./catalog";

// Candidate locations for the on-disk snapshot, tried in order. On a long-lived
// server the project-local dir is ideal: the write succeeds, survives restarts,
// and is shared by every request. On a read-only serverless filesystem (Vercel)
// that first write throws EROFS, so we fall back to the OS temp dir; if even
// that fails we keep running on the in-memory cache alone. Persistence is an
// optimization, never a correctness requirement — a write failure must never
// break a response.
const CACHE_DIRS = [
  path.join(process.cwd(), ".cache"),
  path.join(os.tmpdir(), "albion-market-cache"),
];
const CACHE_FILE_NAME = "market-cache.json";

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

// Authoritative within a warm process: the fast path for repeat requests, and
// the ONLY working cache when the filesystem is read-only (serverless).
let memoryCache: MarketCache | null = null;

// Serializes concurrent refresh attempts within this process so parallel
// requests hitting a cold cache don't each trigger their own full refetch.
let inFlightRefresh: Promise<MarketCache> | null = null;

async function readCacheFromDisk(): Promise<MarketCache | null> {
  for (const dir of CACHE_DIRS) {
    try {
      const raw = await fs.readFile(path.join(dir, CACHE_FILE_NAME), "utf-8");
      return { ...EMPTY_CACHE, ...JSON.parse(raw) };
    } catch {
      // Missing or unreadable here — try the next location.
    }
  }
  return null;
}

// Best-effort persistence. Tries each candidate dir and stops at the first that
// accepts the write; if none do (fully read-only FS) it resolves quietly. Never
// throws: the in-memory cache already holds this snapshot.
async function persistToDisk(cache: MarketCache): Promise<void> {
  const serialized = JSON.stringify(cache);
  for (const dir of CACHE_DIRS) {
    try {
      await fs.mkdir(dir, { recursive: true });
      const file = path.join(dir, CACHE_FILE_NAME);
      const tmpFile = `${file}.${process.pid}.tmp`;
      await fs.writeFile(tmpFile, serialized);
      await fs.rename(tmpFile, file);
      return;
    } catch {
      // Read-only or otherwise unwritable — try the next location.
    }
  }
}

async function loadCache(): Promise<MarketCache> {
  if (memoryCache) return memoryCache;
  memoryCache = (await readCacheFromDisk()) ?? EMPTY_CACHE;
  return memoryCache;
}

function isStale(cache: MarketCache): boolean {
  const now = Date.now();
  return (
    now - cache.prices.fetchedAt > PRICES_TTL_MS ||
    now - cache.liquidity.fetchedAt > HISTORY_TTL_MS ||
    now - cache.gold.fetchedAt > GOLD_TTL_MS
  );
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

  // Publish to the in-memory cache synchronously so callers see it immediately,
  // then persist to disk in the background without blocking the response (or
  // breaking it if the disk is read-only).
  memoryCache = next;
  void persistToDisk(next).catch(() => {});
  return next;
}

/**
 * Returns the freshest available market snapshot. If the cache is stale, blocks
 * this request to refresh it. If the refresh fails but a previous (even stale)
 * snapshot exists, that stale data is served so the dashboard degrades instead
 * of erroring; the error only surfaces on a genuinely empty cache.
 */
export async function getMarketSnapshot(): Promise<MarketCache> {
  const current = await loadCache();
  if (!isStale(current)) return current;

  if (!inFlightRefresh) {
    inFlightRefresh = refresh(current).finally(() => {
      inFlightRefresh = null;
    });
  }

  try {
    return await inFlightRefresh;
  } catch (err) {
    if (current.prices.rows.length > 0) return current;
    throw err;
  }
}

export function cacheAgeMs(cache: MarketCache): number {
  if (!cache.prices.fetchedAt) return Infinity;
  return Date.now() - cache.prices.fetchedAt;
}
