"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { TopBar } from "./TopBar";
import { FiltersPanel } from "./FiltersPanel";
import { FlipTable } from "./FlipTable";
import { Ticket } from "./Ticket";
import type { FlipOpportunity, FlipType, GoldSummary, RiskLevel } from "@/lib/flipEngine";
import type { SortBy, SortDir } from "@/lib/filters";
import { FLIP_TYPE_HINTS, FLIP_TYPE_LABELS } from "@/lib/labels";
import { usePersistentBoolean } from "@/lib/usePersistentBoolean";
import { usePersistentJson } from "@/lib/usePersistentJson";

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
const TAB_STORAGE_KEY = "albion-ledger:tab";
const FILTERS_STORAGE_KEY = "albion-ledger:filters";

export function Dashboard() {
  const [premium, setPremium] = usePersistentBoolean(PREMIUM_STORAGE_KEY, false);
  // Tab and filters persist across refreshes/returns so an expert doesn't
  // rebuild their view every session.
  const [activeTab, setActiveTab] = usePersistentJson<FlipType>(
    TAB_STORAGE_KEY,
    "black-market-direct"
  );
  const [storedFilters, setFilters] = usePersistentJson<FilterState>(
    FILTERS_STORAGE_KEY,
    DEFAULT_FILTERS
  );
  // Merge over defaults so a stored value from an older shape can't leave a
  // field undefined; memoized to keep a stable reference between renders.
  const filters = useMemo(
    () => ({ ...DEFAULT_FILTERS, ...storedFilters }),
    [storedFilters]
  );

  const [sortBy, setSortBy] = useState<SortBy>("profit");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [flips, setFlips] = useState<FlipOpportunity[]>([]);
  const [total, setTotal] = useState(0);
  const [cacheAgeMs, setCacheAgeMs] = useState(0);
  const [gold, setGold] = useState<GoldSummary | null>(null);
  const [selected, setSelected] = useState<FlipOpportunity | null>(null);
  const [refreshTick, setRefreshTick] = useState(0);
  const [flipsError, setFlipsError] = useState(false);
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

  // Debounce the query so typing in the search / number filters coalesces into
  // one request instead of firing on every keystroke.
  const [debouncedQuery, setDebouncedQuery] = useState(query);
  useEffect(() => {
    const t = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  const loading = resolvedQuery !== `${debouncedQuery}#${refreshTick}`;

  useEffect(() => {
    let cancelled = false;
    const requestKey = `${debouncedQuery}#${refreshTick}`;
    fetch(`/api/flips?${debouncedQuery}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (cancelled) return;
        setFlips(data.flips);
        setTotal(data.total);
        setCacheAgeMs(data.cacheAgeMs);
        setSelected(null);
        setVisibleCount(30);
        setFlipsError(false);
        setResolvedQuery(requestKey);
      })
      .catch(() => {
        if (cancelled) return;
        setFlipsError(true);
        setResolvedQuery(requestKey);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedQuery, refreshTick]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/gold")
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((data) => {
        if (!cancelled) setGold(data.gold);
      })
      // Gold is a bonus widget; if it fails, keep it out of the bar rather
      // than surfacing an error over the whole page.
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [refreshTick]);

  // "/" jumps to the item search, the way it does in most data tools.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const el = document.activeElement;
      const typing =
        el instanceof HTMLElement &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.tagName === "SELECT" ||
          el.isContentEditable);
      if (typing) return;
      const search = document.getElementById("filter-search") as HTMLInputElement | null;
      if (search) {
        e.preventDefault();
        search.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Drive the native <dialog> from `selected` so we get Esc-to-close, a focus
  // trap, and focus return to the triggering row for free.
  const dialogRef = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dlg = dialogRef.current;
    if (!dlg) return;
    if (selected && !dlg.open) dlg.showModal();
    else if (!selected && dlg.open) dlg.close();
  }, [selected]);

  const handleFilterChange = (patch: Partial<FilterState>) =>
    setFilters({ ...filters, ...patch });

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

      <main className="mx-auto w-full max-w-[1400px] flex-1 px-5 py-6 sm:px-8">
        <nav className="mb-3 flex flex-wrap gap-2" aria-label="Tipo de flip">
          {FLIP_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              aria-pressed={activeTab === tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-full px-4 py-2 font-display text-sm font-medium transition-colors ${
                activeTab === tab
                  ? "bg-terracotta text-parchment shadow-sm"
                  : "bg-wood-soft text-cream-soft hover:bg-wood-line/60 hover:text-cream"
              }`}
            >
              {FLIP_TYPE_LABELS[tab]}
            </button>
          ))}
        </nav>
        <p className="mb-6 text-sm text-cream-soft">{FLIP_TYPE_HINTS[activeTab]}</p>

        <div className="flex flex-col gap-5 lg:flex-row">
          <FiltersPanel
            activeTab={activeTab}
            filters={filters}
            onChange={handleFilterChange}
            onReset={handleReset}
          />

          <div className="min-w-0 flex-1">
            {flipsError ? (
              <div
                role="alert"
                className="rounded-3xl bg-parchment p-8 text-center shadow-md shadow-black/10"
              >
                <p className="font-display text-lg font-semibold text-ink">
                  No pudimos cargar los flips
                </p>
                <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-soft">
                  Puede ser la API de Albion Online Data Project o tu conexión. Tus
                  datos no se han perdido; vuelve a intentarlo.
                </p>
                <button
                  type="button"
                  onClick={() => setRefreshTick((t) => t + 1)}
                  className="mt-4 rounded-full bg-terracotta px-5 py-2 text-sm font-medium text-parchment shadow-sm transition-colors hover:bg-terracotta-deep"
                >
                  Reintentar
                </button>
              </div>
            ) : (
              <>
                <p
                  aria-live="polite"
                  className="mb-3 flex items-center gap-2 text-sm text-cream-soft"
                >
                  {total.toLocaleString("es-ES")} oportunidades encontradas
                  {loading && (
                    <span
                      aria-hidden
                      className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-cream-soft border-t-transparent"
                    />
                  )}
                </p>

                {featured && (
                  <div
                    className={`mb-6 max-w-sm transition-opacity ${loading ? "opacity-60" : ""}`}
                  >
                    <p className="mb-2 font-display text-sm font-semibold text-terracotta">
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
                  loading={loading}
                />

                {hasMore && (
                  <button
                    type="button"
                    onClick={() => setVisibleCount((c) => c + 30)}
                    className="mt-3 w-full rounded-2xl bg-wood-soft py-3 text-sm text-cream-soft transition-colors hover:bg-wood-line/60 hover:text-cream"
                  >
                    Cargar más resultados ({restFlips.length - visibleCount} restantes)
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </main>

      <dialog
        ref={dialogRef}
        onClose={() => setSelected(null)}
        aria-label="Detalle del flip"
        className="m-0 h-dvh max-h-none w-screen max-w-none bg-transparent p-0 backdrop:bg-wood/70 backdrop:backdrop-blur-sm"
      >
        <div
          className="flex h-full w-full justify-end"
          onClick={(e) => {
            if (e.target === e.currentTarget) setSelected(null);
          }}
        >
          <div className="h-full w-full max-w-sm overflow-y-auto bg-wood p-5">
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="mb-4 flex h-8 w-8 items-center justify-center rounded-full bg-wood-soft text-cream-soft transition-colors hover:bg-terracotta hover:text-parchment"
              aria-label="Cerrar"
            >
              ✕
            </button>
            {selected && <Ticket flip={selected} />}
          </div>
        </div>
      </dialog>
    </div>
  );
}
