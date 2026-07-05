"use client";

import type { FlipType, RiskLevel } from "@/lib/flipEngine";
import {
  ALL_CATEGORIES,
  BLACK_MARKET_CATEGORIES,
  ENCHANT_LEVELS,
  NON_BLACK_MARKET_CITIES,
  QUALITIES,
  TIERS,
} from "@/lib/constants";
import { categoryLabel, QUALITY_LABELS, RISK_LABELS, enchantLabel } from "@/lib/labels";
import type { FilterState } from "./Dashboard";

function ChipGroup<T extends string | number>({
  options,
  labels,
  selected,
  onToggle,
}: {
  options: readonly T[];
  labels?: (value: T) => string;
  selected: T[];
  onToggle: (value: T) => void;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            onClick={() => onToggle(opt)}
            className={`rounded-sm border px-2 py-1 text-xs transition-colors ${
              active
                ? "border-ember bg-ember/20 text-ember-bright"
                : "border-ink-line text-parchment-dim hover:border-parchment-dim"
            }`}
          >
            {labels ? labels(opt) : opt}
          </button>
        );
      })}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border-b border-ink-line py-3">
      <h3 className="mb-2 font-display text-xs font-semibold uppercase tracking-wide text-parchment-dim">
        {title}
      </h3>
      {children}
    </div>
  );
}

function toggleValue<T>(list: T[], value: T): T[] {
  return list.includes(value) ? list.filter((v) => v !== value) : [...list, value];
}

export function FiltersPanel({
  activeTab,
  filters,
  onChange,
  onReset,
}: {
  activeTab: FlipType;
  filters: FilterState;
  onChange: (patch: Partial<FilterState>) => void;
  onReset: () => void;
}) {
  const isBlackMarketTab =
    activeTab === "black-market-direct" || activeTab === "enchant-black-market";
  const isCrossCity = activeTab === "cross-city";
  const categoryOptions = isBlackMarketTab ? BLACK_MARKET_CATEGORIES : ALL_CATEGORIES;

  return (
    <aside className="w-full shrink-0 rounded-sm border border-ink-line bg-ink-raised/60 p-3 lg:w-64">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="font-display text-sm font-semibold text-parchment">Filtros</h2>
        <button
          type="button"
          onClick={onReset}
          className="text-xs text-parchment-dim underline decoration-dotted hover:text-ember-bright"
        >
          Limpiar
        </button>
      </div>

      <Section title="Búsqueda">
        <input
          type="text"
          value={filters.search}
          onChange={(e) => onChange({ search: e.target.value })}
          placeholder="Nombre del ítem..."
          className="w-full rounded-sm border border-ink-line bg-ink px-2 py-1.5 text-sm text-parchment placeholder:text-parchment-dim/60 focus:border-ember focus:outline-none"
        />
      </Section>

      <Section title="Tier">
        <ChipGroup
          options={TIERS}
          labels={(t) => `T${t}`}
          selected={filters.tiers}
          onToggle={(t) => onChange({ tiers: toggleValue(filters.tiers, t) })}
        />
      </Section>

      <Section title="Calidad">
        <ChipGroup
          options={QUALITIES}
          labels={(q) => QUALITY_LABELS[q].slice(0, 3)}
          selected={filters.qualities}
          onToggle={(q) => onChange({ qualities: toggleValue(filters.qualities, q) })}
        />
      </Section>

      <Section title="Nivel de encantamiento">
        <ChipGroup
          options={ENCHANT_LEVELS}
          labels={enchantLabel}
          selected={filters.enchantLevels}
          onToggle={(l) =>
            onChange({ enchantLevels: toggleValue(filters.enchantLevels, l) })
          }
        />
      </Section>

      <Section title="Categoría">
        <ChipGroup
          options={categoryOptions}
          labels={categoryLabel}
          selected={filters.categories}
          onToggle={(c) => onChange({ categories: toggleValue(filters.categories, c) })}
        />
      </Section>

      <Section title={isCrossCity ? "Ciudad de compra" : "Ciudad de origen"}>
        <ChipGroup
          options={NON_BLACK_MARKET_CITIES}
          selected={filters.buyCities}
          onToggle={(c) => onChange({ buyCities: toggleValue(filters.buyCities, c) })}
        />
      </Section>

      {isCrossCity && (
        <Section title="Ciudad de venta">
          <ChipGroup
            options={NON_BLACK_MARKET_CITIES}
            selected={filters.sellCities}
            onToggle={(c) => onChange({ sellCities: toggleValue(filters.sellCities, c) })}
          />
        </Section>
      )}

      {isBlackMarketTab && (
        <Section title="Viaje">
          <label className="flex items-center gap-2 text-sm text-parchment">
            <input
              type="checkbox"
              checked={filters.caerleonOnly}
              onChange={(e) => onChange({ caerleonOnly: e.target.checked })}
              className="accent-ember"
            />
            Solo Caerleon (sin cruzar zona negra)
          </label>
        </Section>
      )}

      <Section title="Ganancia mínima (plata)">
        <input
          type="number"
          value={filters.minProfit}
          onChange={(e) => onChange({ minProfit: e.target.value })}
          placeholder="0"
          className="w-full rounded-sm border border-ink-line bg-ink px-2 py-1.5 font-mono text-sm text-parchment focus:border-ember focus:outline-none"
        />
      </Section>

      <Section title="ROI mínimo (%)">
        <input
          type="number"
          value={filters.minRoi}
          onChange={(e) => onChange({ minRoi: e.target.value })}
          placeholder="0"
          className="w-full rounded-sm border border-ink-line bg-ink px-2 py-1.5 font-mono text-sm text-parchment focus:border-ember focus:outline-none"
        />
      </Section>

      <Section title="Capital máximo disponible">
        <input
          type="number"
          value={filters.maxInvestment}
          onChange={(e) => onChange({ maxInvestment: e.target.value })}
          placeholder="Sin límite"
          className="w-full rounded-sm border border-ink-line bg-ink px-2 py-1.5 font-mono text-sm text-parchment placeholder:text-parchment-dim/60 focus:border-ember focus:outline-none"
        />
      </Section>

      <Section title="Liquidez mínima (unid/día)">
        <input
          type="number"
          value={filters.minLiquidity}
          onChange={(e) => onChange({ minLiquidity: e.target.value })}
          placeholder="0"
          className="w-full rounded-sm border border-ink-line bg-ink px-2 py-1.5 font-mono text-sm text-parchment focus:border-ember focus:outline-none"
        />
        <p className="mt-1 text-[11px] text-parchment-dim">
          Evita ítems sin demanda real que inflan la ganancia en el papel.
        </p>
      </Section>

      <Section title="Antigüedad máxima del dato">
        <select
          value={filters.maxAgeHours}
          onChange={(e) => onChange({ maxAgeHours: e.target.value })}
          className="w-full rounded-sm border border-ink-line bg-ink px-2 py-1.5 text-sm text-parchment focus:border-ember focus:outline-none"
        >
          <option value="1">Última hora</option>
          <option value="2">Últimas 2 horas</option>
          <option value="6">Últimas 6 horas</option>
          <option value="12">Últimas 12 horas</option>
          <option value="24">Último día</option>
          <option value="">Sin límite</option>
        </select>
      </Section>

      <Section title="Riesgo">
        <ChipGroup
          options={["low", "medium", "high"] as RiskLevel[]}
          labels={(r) => RISK_LABELS[r]}
          selected={filters.risk}
          onToggle={(r) => onChange({ risk: toggleValue(filters.risk, r) })}
        />
      </Section>
    </aside>
  );
}
