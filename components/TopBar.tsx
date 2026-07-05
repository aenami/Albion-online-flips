"use client";

import type { GoldSummary } from "@/lib/flipEngine";
import { formatAge, formatSilver } from "@/lib/labels";

const GOLD_RECOMMENDATION_LABEL: Record<GoldSummary["recommendation"], string> = {
  buy: "Buen momento para comprar oro",
  sell: "Buen momento para vender oro",
  hold: "Precio del oro en rango normal",
};

const GOLD_RECOMMENDATION_COLOR: Record<GoldSummary["recommendation"], string> = {
  buy: "text-verdigris",
  sell: "text-blood",
  hold: "text-parchment-dim",
};

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
    <header className="border-b border-ink-line bg-ink-raised/80 px-4 py-3 backdrop-blur">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-xl font-semibold tracking-tight text-parchment">
            Libro Mayor de <span className="text-ember-bright">Albion</span>
          </h1>
          <p className="text-xs text-parchment-dim">
            Americas (West) · flips calculados en vivo
          </p>
        </div>

        {gold && (
          <div className="flex items-center gap-2 rounded-sm border border-ink-line px-3 py-1.5">
            <span className="text-xs text-parchment-dim">Oro</span>
            <span className="font-mono text-sm text-parchment">
              {formatSilver(gold.currentPrice)}
            </span>
            <span
              className={`font-mono text-xs ${gold.changePct24h >= 0 ? "text-verdigris" : "text-blood"}`}
            >
              {gold.changePct24h >= 0 ? "▲" : "▼"} {Math.abs(gold.changePct24h).toFixed(1)}%
            </span>
            <span className={`text-xs ${GOLD_RECOMMENDATION_COLOR[gold.recommendation]}`}>
              {GOLD_RECOMMENDATION_LABEL[gold.recommendation]}
            </span>
          </div>
        )}

        <div className="flex items-center gap-4">
          <label className="flex items-center gap-2 text-sm text-parchment">
            <input
              type="checkbox"
              checked={premium}
              onChange={(e) => onPremiumChange(e.target.checked)}
              className="accent-ember"
            />
            Tengo Premium (impuesto 4%)
          </label>

          <div className="flex items-center gap-2 text-xs text-parchment-dim">
            <span>
              {loading ? "Actualizando…" : `Datos ${formatAge(cacheAgeMs)}`}
            </span>
            <button
              type="button"
              onClick={onRefresh}
              disabled={loading}
              className="rounded-sm border border-ink-line px-2 py-1 text-parchment hover:border-ember-bright hover:text-ember-bright disabled:opacity-50"
            >
              Actualizar
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
