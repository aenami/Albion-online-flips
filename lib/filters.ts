import type { FlipOpportunity, RiskLevel } from "./flipEngine";

export interface FlipFilters {
  tiers?: number[];
  qualities?: number[];
  categories?: string[];
  buyCities?: string[];
  sellCities?: string[];
  enchantLevels?: number[];
  caerleonOnly?: boolean;
  minProfit?: number;
  minRoi?: number; // fraction, e.g. 0.1 = 10%
  maxInvestment?: number;
  minLiquidity?: number;
  maxAgeMs?: number;
  risk?: RiskLevel[];
  search?: string;
}

export type SortBy = "profit" | "roi" | "investment" | "liquidity" | "recent";
export type SortDir = "asc" | "desc";

const COMBINING_DIACRITICS_START = 0x0300;
const COMBINING_DIACRITICS_END = 0x036f;

function stripDiacritics(text: string): string {
  let result = "";
  for (const char of text) {
    const code = char.codePointAt(0) ?? 0;
    if (code < COMBINING_DIACRITICS_START || code > COMBINING_DIACRITICS_END) {
      result += char;
    }
  }
  return result;
}

function normalize(text: string): string {
  return stripDiacritics(text.normalize("NFD")).toLowerCase();
}

export function applyFilters(
  flips: FlipOpportunity[],
  filters: FlipFilters
): FlipOpportunity[] {
  const search = filters.search ? normalize(filters.search) : undefined;

  return flips.filter((flip) => {
    if (filters.tiers?.length && !filters.tiers.includes(flip.tier)) return false;
    if (filters.qualities?.length && !filters.qualities.includes(flip.quality))
      return false;
    if (filters.categories?.length && !filters.categories.includes(flip.category))
      return false;
    if (filters.buyCities?.length && !filters.buyCities.includes(flip.buyCity))
      return false;
    if (filters.sellCities?.length && !filters.sellCities.includes(flip.sellCity))
      return false;
    if (
      filters.enchantLevels?.length &&
      !filters.enchantLevels.includes(flip.enchantLevel)
    )
      return false;
    if (filters.caerleonOnly && flip.travel !== "none") return false;
    if (filters.minProfit != null && flip.profit < filters.minProfit) return false;
    if (filters.minRoi != null && flip.roi < filters.minRoi) return false;
    if (filters.maxInvestment != null && flip.investment > filters.maxInvestment)
      return false;
    if (filters.minLiquidity != null && flip.liquidity < filters.minLiquidity)
      return false;
    if (filters.maxAgeMs != null && flip.dataAgeMs > filters.maxAgeMs) return false;
    if (filters.risk?.length && !filters.risk.includes(flip.risk)) return false;
    if (search && !normalize(flip.itemName).includes(search)) return false;
    return true;
  });
}

export function sortFlips(
  flips: FlipOpportunity[],
  sortBy: SortBy = "profit",
  sortDir: SortDir = "desc"
): FlipOpportunity[] {
  const factor = sortDir === "asc" ? 1 : -1;
  const key: Record<SortBy, (f: FlipOpportunity) => number> = {
    profit: (f) => f.profit,
    roi: (f) => f.roi,
    investment: (f) => f.investment,
    liquidity: (f) => f.liquidity,
    recent: (f) => -f.dataAgeMs,
  };
  const getValue = key[sortBy];
  return [...flips].sort((a, b) => (getValue(a) - getValue(b)) * factor);
}

function parseListParam(value: string | null): string[] | undefined {
  if (!value) return undefined;
  return value
    .split(",")
    .map((v) => v.trim())
    .filter(Boolean);
}

function parseNumberListParam(value: string | null): number[] | undefined {
  const list = parseListParam(value);
  return list?.map(Number).filter((n) => !Number.isNaN(n));
}

export function filtersFromSearchParams(params: URLSearchParams): FlipFilters {
  const minRoiPct = params.get("minRoi");
  const maxAgeHours = params.get("maxAgeHours");

  return {
    tiers: parseNumberListParam(params.get("tiers")),
    qualities: parseNumberListParam(params.get("qualities")),
    categories: parseListParam(params.get("categories")),
    buyCities: parseListParam(params.get("buyCities")),
    sellCities: parseListParam(params.get("sellCities")),
    enchantLevels: parseNumberListParam(params.get("enchantLevels")),
    caerleonOnly: params.get("caerleonOnly") === "true",
    minProfit: params.get("minProfit") ? Number(params.get("minProfit")) : undefined,
    minRoi: minRoiPct ? Number(minRoiPct) / 100 : undefined,
    maxInvestment: params.get("maxInvestment")
      ? Number(params.get("maxInvestment"))
      : undefined,
    minLiquidity: params.get("minLiquidity")
      ? Number(params.get("minLiquidity"))
      : undefined,
    maxAgeMs: maxAgeHours ? Number(maxAgeHours) * 60 * 60 * 1000 : undefined,
    risk: parseListParam(params.get("risk")) as RiskLevel[] | undefined,
    search: params.get("search") ?? undefined,
  };
}
