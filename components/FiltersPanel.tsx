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
  groupLabel,
}: {
  options: readonly T[];
  labels?: (value: T) => string;
  selected: T[];
  onToggle: (value: T) => void;
  groupLabel: string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5" role="group" aria-label={groupLabel}>
      {options.map((opt) => {
        const active = selected.includes(opt);
        return (
          <button
            key={opt}
            type="button"
            aria-pressed={active}
            onClick={() => onToggle(opt)}
            className={`rounded-full px-3 py-1 text-sm transition-colors ${
              active
                ? "bg-terracotta text-parchment"
                : "bg-parchment-soft text-ink-soft hover:bg-parchment-line/70 hover:text-ink"
            }`}
          >
            {labels ? labels(opt) : opt}
          </button>
        );
      })}
    </div>
  );
}

/** A labeled single control (input/select), with the label properly bound. */
function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-ink">
        {label}
      </label>
      {children}
      {hint && (
        <p id={`${htmlFor}-hint`} className="mt-1.5 text-xs text-ink-soft">
          {hint}
        </p>
      )}
    </div>
  );
}

/** A labeled group of controls (chip toggles), announced as a named group. */
function FieldGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="mb-1.5 block text-sm font-medium text-ink">{label}</span>
      {children}
    </div>
  );
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl bg-parchment-soft/60 p-4">
      <h3 className="mb-3 font-display text-[15px] font-semibold text-ink">{title}</h3>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

const inputClass =
  "w-full rounded-xl border border-parchment-line bg-parchment px-3 py-2 text-sm text-ink placeholder:text-ink-soft focus:border-terracotta";

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
    <aside className="w-full shrink-0 space-y-4 rounded-3xl bg-parchment p-5 shadow-md shadow-black/10 lg:w-72">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-semibold text-ink">Filtros</h2>
        <button
          type="button"
          onClick={onReset}
          className="rounded text-sm text-terracotta hover:text-terracotta-deep"
        >
          Limpiar todo
        </button>
      </div>

      <input
        id="filter-search"
        type="text"
        aria-label="Buscar un ítem"
        value={filters.search}
        onChange={(e) => onChange({ search: e.target.value })}
        placeholder="Buscar un ítem..."
        className={inputClass}
      />

      <Group title="Qué buscar">
        <FieldGroup label="Tier">
          <ChipGroup
            groupLabel="Tier"
            options={TIERS}
            labels={(t) => `T${t}`}
            selected={filters.tiers}
            onToggle={(t) => onChange({ tiers: toggleValue(filters.tiers, t) })}
          />
        </FieldGroup>

        <FieldGroup label="Calidad">
          <ChipGroup
            groupLabel="Calidad"
            options={QUALITIES}
            labels={(q) => QUALITY_LABELS[q].slice(0, 3)}
            selected={filters.qualities}
            onToggle={(q) => onChange({ qualities: toggleValue(filters.qualities, q) })}
          />
        </FieldGroup>

        <FieldGroup label="Nivel de encantamiento">
          <ChipGroup
            groupLabel="Nivel de encantamiento"
            options={ENCHANT_LEVELS}
            labels={enchantLabel}
            selected={filters.enchantLevels}
            onToggle={(l) =>
              onChange({ enchantLevels: toggleValue(filters.enchantLevels, l) })
            }
          />
        </FieldGroup>

        <FieldGroup label="Categoría">
          <ChipGroup
            groupLabel="Categoría"
            options={categoryOptions}
            labels={categoryLabel}
            selected={filters.categories}
            onToggle={(c) => onChange({ categories: toggleValue(filters.categories, c) })}
          />
        </FieldGroup>
      </Group>

      <Group title="Dónde">
        <FieldGroup label={isCrossCity ? "Ciudad de compra" : "Ciudad de origen"}>
          <ChipGroup
            groupLabel={isCrossCity ? "Ciudad de compra" : "Ciudad de origen"}
            options={NON_BLACK_MARKET_CITIES}
            selected={filters.buyCities}
            onToggle={(c) => onChange({ buyCities: toggleValue(filters.buyCities, c) })}
          />
        </FieldGroup>

        {isCrossCity && (
          <FieldGroup label="Ciudad de venta">
            <ChipGroup
              groupLabel="Ciudad de venta"
              options={NON_BLACK_MARKET_CITIES}
              selected={filters.sellCities}
              onToggle={(c) => onChange({ sellCities: toggleValue(filters.sellCities, c) })}
            />
          </FieldGroup>
        )}

        {isBlackMarketTab && (
          <label className="flex items-center gap-2.5 text-sm text-ink">
            <input
              type="checkbox"
              checked={filters.caerleonOnly}
              onChange={(e) => onChange({ caerleonOnly: e.target.checked })}
              className="h-4 w-4 accent-terracotta"
            />
            Solo Caerleon, sin cruzar zona negra
          </label>
        )}
      </Group>

      <Group title="Rentabilidad">
        <Field label="Ganancia mínima (plata)" htmlFor="f-minProfit">
          <input
            id="f-minProfit"
            type="number"
            inputMode="numeric"
            value={filters.minProfit}
            onChange={(e) => onChange({ minProfit: e.target.value })}
            placeholder="0"
            className={`${inputClass} font-mono`}
          />
        </Field>

        <Field label="ROI mínimo (%)" htmlFor="f-minRoi">
          <input
            id="f-minRoi"
            type="number"
            inputMode="decimal"
            value={filters.minRoi}
            onChange={(e) => onChange({ minRoi: e.target.value })}
            placeholder="0"
            className={`${inputClass} font-mono`}
          />
        </Field>

        <Field label="Capital máximo disponible" htmlFor="f-maxInvestment">
          <input
            id="f-maxInvestment"
            type="number"
            inputMode="numeric"
            value={filters.maxInvestment}
            onChange={(e) => onChange({ maxInvestment: e.target.value })}
            placeholder="Sin límite"
            className={`${inputClass} font-mono`}
          />
        </Field>

        <Field
          label="Liquidez mínima (unid/día)"
          hint="Evita ítems sin demanda real que inflan la ganancia en el papel."
          htmlFor="f-minLiquidity"
        >
          <input
            id="f-minLiquidity"
            type="number"
            inputMode="numeric"
            aria-describedby="f-minLiquidity-hint"
            value={filters.minLiquidity}
            onChange={(e) => onChange({ minLiquidity: e.target.value })}
            placeholder="0"
            className={`${inputClass} font-mono`}
          />
        </Field>
      </Group>

      <Group title="Frescura y riesgo">
        <Field label="Antigüedad máxima del dato" htmlFor="f-maxAge">
          <select
            id="f-maxAge"
            value={filters.maxAgeHours}
            onChange={(e) => onChange({ maxAgeHours: e.target.value })}
            className={inputClass}
          >
            <option value="1">Última hora</option>
            <option value="2">Últimas 2 horas</option>
            <option value="6">Últimas 6 horas</option>
            <option value="12">Últimas 12 horas</option>
            <option value="24">Último día</option>
            <option value="">Sin límite</option>
          </select>
        </Field>

        <FieldGroup label="Riesgo">
          <ChipGroup
            groupLabel="Riesgo"
            options={["low", "medium", "high"] as RiskLevel[]}
            labels={(r) => RISK_LABELS[r]}
            selected={filters.risk}
            onToggle={(r) => onChange({ risk: toggleValue(filters.risk, r) })}
          />
        </FieldGroup>
      </Group>
    </aside>
  );
}
