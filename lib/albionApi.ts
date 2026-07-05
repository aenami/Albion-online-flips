// Thin batched client for the Albion Online Data Project public API
// (https://www.albion-online-data.com/). Handles URL-length and rate-limit
// safe batching; does no caching itself (see lib/priceCache.ts for that).

export const SERVER_BASE_URL = "https://west.albion-online-data.com";

// The 8 markets the API tracks. "Black Market" is a distinct location, not a
// travel destination inside a royal city, even though it physically sits in
// Caerleon.
export const LOCATIONS = [
  "Caerleon",
  "Bridgewatch",
  "Fort Sterling",
  "Lymhurst",
  "Martlock",
  "Thetford",
  "Brecilien",
  "Black Market",
] as const;

export type Location = (typeof LOCATIONS)[number];

export const ROYAL_CITIES: Location[] = [
  "Bridgewatch",
  "Fort Sterling",
  "Lymhurst",
  "Martlock",
  "Thetford",
];

export const QUALITIES = [1, 2, 3, 4, 5] as const;

export interface PriceRow {
  item_id: string;
  city: string;
  quality: number;
  sell_price_min: number;
  sell_price_min_date: string;
  sell_price_max: number;
  sell_price_max_date: string;
  buy_price_min: number;
  buy_price_min_date: string;
  buy_price_max: number;
  buy_price_max_date: string;
}

export interface HistoryPoint {
  item_count: number;
  avg_price: number;
  timestamp: string;
}

export interface HistoryRow {
  location: string;
  item_id: string;
  quality: number;
  data: HistoryPoint[];
}

export interface GoldRow {
  price: number;
  timestamp: string;
}

const MAX_URL_LENGTH = 4000; // stay under the API's 4096 char limit with margin
const BATCH_CONCURRENCY = 8;

function chunkIdsByUrlLength(
  itemIds: string[],
  fixedOverheadLength: number
): string[][] {
  const batches: string[][] = [];
  let current: string[] = [];
  let currentLength = fixedOverheadLength;

  for (const id of itemIds) {
    const addedLength = id.length + 1; // +1 for comma separator
    if (current.length > 0 && currentLength + addedLength > MAX_URL_LENGTH) {
      batches.push(current);
      current = [];
      currentLength = fixedOverheadLength;
    }
    current.push(id);
    currentLength += addedLength;
  }
  if (current.length > 0) batches.push(current);
  return batches;
}

async function runBatched<T>(
  jobs: (() => Promise<T[]>)[],
  concurrency = BATCH_CONCURRENCY
): Promise<T[]> {
  const results: T[] = [];
  let cursor = 0;

  async function worker() {
    while (cursor < jobs.length) {
      const jobIndex = cursor++;
      const rows = await jobs[jobIndex]();
      results.push(...rows);
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrency, jobs.length) },
    () => worker()
  );
  await Promise.all(workers);
  return results;
}

async function fetchJsonWithRetry(url: string, attempts = 3): Promise<unknown> {
  let lastError: unknown;
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (!res.ok) {
        throw new Error(`Albion API request failed: ${res.status} ${url}`);
      }
      return await res.json();
    } catch (err) {
      lastError = err;
      if (attempt < attempts) {
        await new Promise((r) => setTimeout(r, 300 * attempt));
      }
    }
  }
  throw lastError;
}

export async function fetchPrices(itemIds: string[]): Promise<PriceRow[]> {
  if (itemIds.length === 0) return [];

  const locationsParam = LOCATIONS.join(",");
  const qualitiesParam = QUALITIES.join(",");
  const overhead =
    `${SERVER_BASE_URL}/api/v2/stats/prices/`.length +
    `.json?locations=${locationsParam}&qualities=${qualitiesParam}`.length;

  const batches = chunkIdsByUrlLength(itemIds, overhead);
  const jobs = batches.map((batch) => async () => {
    const url = `${SERVER_BASE_URL}/api/v2/stats/prices/${batch.join(
      ","
    )}.json?locations=${locationsParam}&qualities=${qualitiesParam}`;
    return (await fetchJsonWithRetry(url)) as PriceRow[];
  });

  return runBatched(jobs);
}

export async function fetchHistory(
  itemIds: string[],
  { timeScale = 24, pastDays = 7 }: { timeScale?: number; pastDays?: number } = {}
): Promise<HistoryRow[]> {
  if (itemIds.length === 0) return [];

  const end = new Date();
  const start = new Date(end.getTime() - pastDays * 24 * 60 * 60 * 1000);
  const fmt = (d: Date) => `${d.getMonth() + 1}-${d.getDate()}-${d.getFullYear()}`;

  const locationsParam = LOCATIONS.join(",");
  const qs = `date=${fmt(start)}&end_date=${fmt(end)}&locations=${locationsParam}&time-scale=${timeScale}`;
  const overhead =
    `${SERVER_BASE_URL}/api/v2/stats/history/`.length + `.json?${qs}`.length;

  const batches = chunkIdsByUrlLength(itemIds, overhead);
  const jobs = batches.map((batch) => async () => {
    const url = `${SERVER_BASE_URL}/api/v2/stats/history/${batch.join(
      ","
    )}.json?${qs}`;
    return (await fetchJsonWithRetry(url)) as HistoryRow[];
  });

  return runBatched(jobs);
}

export async function fetchGold(count = 30): Promise<GoldRow[]> {
  const url = `${SERVER_BASE_URL}/api/v2/stats/gold.json?count=${count}`;
  return (await fetchJsonWithRetry(url)) as GoldRow[];
}
