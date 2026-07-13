"use client";

import type { GoldSummary } from "@/lib/flipEngine";
import { formatAge, formatSilver } from "@/lib/labels";

const GOLD_RECOMMENDATION_LABEL: Record<GoldSummary["recommendation"], string> = {
  buy: "Buen momento para comprar oro",
  sell: "Buen momento para vender oro",
  hold: "Precio del oro normal",
};

const GOLD_RECOMMENDATION_COLOR: Record<GoldSummary["recommendation"], string> = {
  buy: "text-moss",
  sell: "text-berry",
  hold: "text-ink-soft",
};

function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
  label: string;
}) {
  return (
    <label className="flex cursor-pointer items-center gap-2.5 select-none">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
          checked ? "bg-terracotta" : "bg-wood-line"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-parchment shadow-sm transition-transform ${
            checked ? "translate-x-5.5" : "translate-x-0.5"
          }`}
        />
      </button>
      <span className="text-sm text-cream-soft">{label}</span>
    </label>
  );
}

export function TopBar({
  premium,
  onPremiumChange,
  gold,
  cacheAgeMs,
  loading,
  onRefresh,
}: {
  premium: boolean;
  onPremiumChange: (value: boolean) => void;
  gold: GoldSummary | null;
  cacheAgeMs: number;
  loading: boolean;
  onRefresh: () => void;
}) {
  return (
    <header className="border-b border-wood-line/60 px-5 py-4 sm:px-8">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-semibold tracking-tight text-cream">
            Libro Mayor de <span className="text-terracotta-bright">Albion</span>
          </h1>
          <p className="text-sm text-cream-soft">
            Americas (West) · los mejores flips, calculados en vivo
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {gold && (
            <div className="flex items-center gap-2 rounded-full bg-parchment px-4 py-2 shadow-sm">
              <span className="text-xs font-medium text-ink-soft">Oro</span>
              <span className="font-mono text-sm font-medium text-ink">
                {formatSilver(gold.currentPrice)}
              </span>
              <span
                className={`font-mono text-xs ${gold.changePct24h >= 0 ? "text-moss" : "text-berry"}`}
              >
                {gold.changePct24h >= 0 ? "▲" : "▼"} {Math.abs(gold.changePct24h).toFixed(1)}%
              </span>
              <span className={`hidden text-xs sm:inline ${GOLD_RECOMMENDATION_COLOR[gold.recommendation]}`}>
                · {GOLD_RECOMMENDATION_LABEL[gold.recommendation]}
              </span>
            </div>
          )}

          <Toggle
            checked={premium}
            onChange={onPremiumChange}
            label="Tengo Premium (4%)"
          />

          <div className="flex items-center gap-2 text-sm text-cream-soft">
            <span>{loading ? "Actualizando…" : formatAge(cacheAgeMs)}</span>
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="rounded-full bg-terracotta px-4 py-1.5 font-medium text-parchment shadow-sm transition-colors hover:bg-terracotta-deep disabled:opacity-50"
            >
              Actualizar
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
