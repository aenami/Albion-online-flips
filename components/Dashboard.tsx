"use client";

import { useEffect, useState } from "react";
import { TopBar } from "./TopBar";
import { FiltersPanel } from "./FiltersPanel";
import { FlipTable } from "./FlipTable";
import { Ticket } from "./Ticket";
import type { FlipOpportunity, FlipType, GoldSummary, RiskLevel } from "@/lib/flipEngine";
import type { SortBy, SortDir } from "@/lib/filters";
import { FLIP_TYPE_HINTS, FLIP_TYPE_LABELS } from "@/lib/labels";
import { usePersistentBoolean } from "@/lib/usePersistentBoolean";

export interface FilterState {
  tiers: number[];
  qualities: number[];
  categories: string[];
  buyCities: string[];
  sellCities: string[];
  enchantLevels: number[];
  caerleonOnly: boolean;
  minProfit: string;
  minRoi: string;
  maxInvestment: string;
  minLiquidity: string;
  maxAgeHours: string;
  risk: RiskLevel[];
  search: string;
}

const DEFAULT_FILTERS: FilterState = {
  tiers: [],
  qualities: [],
  categories: [],
  buyCities: [],
  sellCities: [],
  enchantLevels: [],
  caerleonOnly: false,
  minProfit: "",
  minRoi: "",
  maxInvestment: "",
  minLiquidity: "3",
  maxAgeHours: "6",
  risk: [],
  search: "",
};

const FLIP_TABS: FlipType[] = [
  "black-market-direct",
  "enchant-black-market",
  "same-city",
  "cross-city",
];

const PREMIUM_STORAGE_KEY = "albion-ledger:premium";

export function Dashboard() {
  const [premium, setPremium] = usePersistentBoolean(PREMIUM_STORAGE_KEY, false);
  const [activeTab, setActiveTab] = useState<FlipType>("black-market-direct");
  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [sortBy, setSortBy] = useState<SortBy>("profit");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [flips, setFlips] = useState<FlipOpportunity[]>([]);
  const [total, setTotal] = useState(0);
  const [cacheAgeMs, setCacheAgeMs] = useState(0);
  const [gold, setGold] = useState<GoldSummary | null>(null);
  const [selected, setSelected] = useState<FlipOpportunity | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  // Rendering every fetched row at once means every row's icon fetches from
  // render.albiononline.com simultaneously, which the image optimizer can't
  // keep up with - reveal rows a page at a time instead.
  const [visibleCount, setVisibleCount] = useState(30);
  // Tracks which query string the current `flips` state corresponds to, so
  // "loading" is derived instead of being a separately-set piece of state.
  const [resolvedQuery, setResolvedQuery] = useState<string | null>(null);

  const query = new URLSearchParams({
    type: activeTab,
    premium: String(premium),
    sortBy,
    sortDir,
    limit: "100",
    ...(filters.tiers.length && { tiers: filters.tiers.join(",") }),
    ...(filters.qualities.length && { qualities: filters.qualities.join(",") }),
    ...(filters.categories.length && { categories: filters.categories.join(",") }),
    ...(filters.buyCities.length && { buyCities: filters.buyCities.join(",") }),
    ...(filters.sellCities.length && { sellCities: filters.sellCities.join(",") }),
    ...(filters.enchantLevels.length && {
      enchantLevels: filters.enchantLevels.join(","),
    }),
    ...(filters.caerleonOnly && { caerleonOnly: "true" }),
    ...(filters.minProfit && { minProfit: filters.minProfit }),
    ...(filters.minRoi && { minRoi: filters.minRoi }),
    ...(filters.maxInvestment && { maxInvestment: filters.maxInvestment }),
    ...(filters.minLiquidity && { minLiquidity: filters.minLiquidity }),
    ...(filters.maxAgeHours && { maxAgeHours: filters.maxAgeHours }),
    ...(filters.risk.length && { risk: filters.risk.join(",") }),
    ...(filters.search && { search: filters.search }),
  }).toString();

  const loading = resolvedQuery !== `${query}#${refreshTick}`;

  useEffect(() => {
    let cancelled = false;
    const requestKey = `${query}#${refreshTick}`;
    fetch(`/api/flips?${query}`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setFlips(data.flips);
        setTotal(data.total);
        setCacheAgeMs(data.cacheAgeMs);
        setSelected(null);
        setVisibleCount(30);
        setResolvedQuery(requestKey);
      })
      .catch(() => {
        if (!cancelled) setResolvedQuery(requestKey);
      });
    return () => {
      cancelled = true;
    };
  }, [query, refreshTick]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/gold")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled) setGold(data.gold);
      });
    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  const handleFilterChange = (patch: Partial<FilterState>) =>
    setFilters((f) => ({ ...f, ...patch }));

  const handleReset = () => setFilters(DEFAULT_FILTERS);

  const handleSortChange = (col: SortBy) => {
    if (col === sortBy) setSortDir((d) => (d === "desc" ? "asc" : "desc"));
    else {
      setSortBy(col);
      setSortDir("desc");
    }
  };

  const featured = flips[0];
  const restFlips = featured ? flips.slice(1) : flips;
  const visibleFlips = restFlips.slice(0, visibleCount);
  const hasMore = visibleCount < restFlips.length;

  return (
    <div className="flex min-h-screen flex-col">
      <TopBar
        premium={premium}
        onPremiumChange={setPremium}
        gold={gold}
        cacheAgeMs={cacheAgeMs}
        loading={loading}
        onRefresh={() => setRefreshTick((t) => t + 1)}
      />

      <main className="mx-auto w-full max-w-[1400px] flex-1 px-4 py-4">
        <nav className="mb-2 flex flex-wrap gap-2">
          {FLIP_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`rounded-sm border px-3 py-1.5 font-display text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "border-ember bg-ember/15 text-ember-bright"
                  : "border-ink-line text-parchment-dim hover:border-parchment-dim hover:text-parchment"
              }`}
            >
              {FLIP_TYPE_LABELS[tab]}
            </button>
          ))}
        </nav>
        <p className="mb-4 text-sm text-parchment-dim">{FLIP_TYPE_HINTS[activeTab]}</p>

        <div className="flex flex-col gap-4 lg:flex-row">
          <FiltersPanel
            activeTab={activeTab}
            filters={filters}
            onChange={handleFilterChange}
            onReset={handleReset}
          />

          <div className="min-w-0 flex-1">
            <p className="mb-3 text-xs text-parchment-dim">
              {total.toLocaleString("es-ES")} oportunidades encontradas
            </p>

            {featured && (
              <div className="mb-5 max-w-sm">
                <p className="mb-1 font-display text-xs font-semibold uppercase tracking-wide text-ember-bright">
                  Mejor flip ahora mismo
                </p>
                <Ticket flip={featured} />
              </div>
            )}

            <FlipTable
              flips={visibleFlips}
              sortBy={sortBy}
              sortDir={sortDir}
              onSortChange={handleSortChange}
              onSelect={setSelected}
              selectedId={selected?.id}
            />

            {hasMore && (
              <button
                type="button"
                onClick={() => setVisibleCount((c) => c + 30)}
                className="mt-3 w-full rounded-sm border border-ink-line py-2 text-sm text-parchment-dim hover:border-ember-bright hover:text-ember-bright"
              >
                Cargar más resultados ({restFlips.length - visibleCount} restantes)
              </button>
            )}
          </div>
        </div>
      </main>

      {selected && (
        <div
          className="fixed inset-0 z-50 flex justify-end bg-black/60"
          onClick={() => setSelected(null)}
        >
          <div
            className="h-full w-full max-w-sm overflow-y-auto bg-ink p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="mb-3 text-sm text-parchment-dim hover:text-ember-bright"
            >
              Cerrar ✕
            </button>
            <Ticket flip={selected} />
          </div>
        </div>
      )}
    </div>
  );
}
