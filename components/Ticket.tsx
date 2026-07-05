"use client";

import { useState } from "react";
import type { FlipOpportunity } from "@/lib/flipEngine";
import {
  FLIP_TYPE_LABELS,
  QUALITY_LABELS,
  RISK_LABELS,
  TRAVEL_LABELS,
  categoryLabel,
  enchantLabel,
  formatAge,
  formatPercent,
  formatSilver,
} from "@/lib/labels";
import { ItemIcon } from "./ItemIcon";

function riskColor(risk: FlipOpportunity["risk"]) {
  if (risk === "low") return "text-verdigris";
  if (risk === "medium") return "text-ember-bright";
  return "text-blood";
}

function Line({
  label,
  value,
  muted,
}: {
  label: string;
  value: string;
  muted?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-0.5">
      <span className={`text-sm ${muted ? "text-parchment-dim" : "text-parchment"}`}>
        {label}
      </span>
      <span className="font-mono text-sm text-parchment">{value}</span>
    </div>
  );
}

export function Ticket({ flip }: { flip: FlipOpportunity }) {
  const [qty, setQty] = useState(1);
  const revenue = (flip.investment + flip.profit) * qty;
  const meta = flip.meta as
    | {
        material: string;
        materialUnitPrice: number;
        materialCount: number;
        materialTotalCost: number;
        basePrice: number;
      }
    | undefined;

  return (
    <div className="relative rounded-sm border border-ink-line bg-ink-raised shadow-[0_8px_30px_rgba(0,0,0,0.35)]">
      <div
        className="h-3 w-full bg-ink"
        style={{
          maskImage:
            "repeating-linear-gradient(90deg, black 0 6px, transparent 6px 12px)",
          WebkitMaskImage:
            "repeating-linear-gradient(90deg, black 0 6px, transparent 6px 12px)",
        }}
        aria-hidden
      />
      <div className="px-5 pt-4 pb-5">
        <div className="mb-3 flex items-start gap-3">
          <ItemIcon
            itemId={flip.itemId}
            itemName={flip.itemName}
            quality={flip.quality}
            size={48}
          />
          <div className="min-w-0 flex-1">
            <p className="font-display text-lg leading-tight font-semibold text-parchment">
              {flip.itemName}
            </p>
            <p className="text-xs uppercase tracking-wide text-parchment-dim">
              {FLIP_TYPE_LABELS[flip.type]}
            </p>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap gap-1.5 text-[11px] uppercase tracking-wide">
          <span className="rounded-sm border border-ink-line px-1.5 py-0.5 text-parchment-dim">
            Tier {flip.tier}
          </span>
          <span className="rounded-sm border border-ink-line px-1.5 py-0.5 text-parchment-dim">
            {QUALITY_LABELS[flip.quality]}
          </span>
          <span className="rounded-sm border border-ink-line px-1.5 py-0.5 text-parchment-dim">
            {enchantLabel(flip.enchantLevel)}
          </span>
          <span className="rounded-sm border border-ink-line px-1.5 py-0.5 text-parchment-dim">
            {categoryLabel(flip.category)}
          </span>
        </div>

        <div className="mb-3 flex items-center gap-2 font-mono text-sm text-ember-bright">
          <span>{flip.buyCity}</span>
          <span aria-hidden>&rarr;</span>
          <span>{flip.sellCity}</span>
        </div>

        <div className="border-t border-dashed border-ink-line pt-2">
          {meta ? (
            <>
              <Line
                label="Ítem base"
                value={formatSilver(meta.basePrice * qty)}
                muted
              />
              <Line
                label={`Material x${meta.materialCount * qty}`}
                value={formatSilver(meta.materialTotalCost * qty)}
                muted
              />
            </>
          ) : (
            <Line
              label={flip.mode === "instant" ? "Compra instantánea" : "Orden de compra"}
              value={formatSilver(flip.investment * qty)}
              muted
            />
          )}
          <Line
            label={
              flip.sellCity === "Black Market"
                ? "Venta (sin impuesto)"
                : flip.mode === "instant"
                  ? "Venta instantánea"
                  : "Orden de venta"
            }
            value={formatSilver(revenue)}
            muted
          />
        </div>

        <div className="mt-2 flex items-center justify-between border-t border-dashed border-ink-line pt-2">
          <span className="text-xs text-parchment-dim">Unidades a simular</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="h-6 w-6 rounded-sm border border-ink-line text-parchment hover:border-ember-bright"
            >
              −
            </button>
            <span className="w-8 text-center font-mono text-sm text-parchment">{qty}</span>
            <button
              type="button"
              onClick={() => setQty((q) => q + 1)}
              className="h-6 w-6 rounded-sm border border-ink-line text-parchment hover:border-ember-bright"
            >
              +
            </button>
          </div>
        </div>

        <div className="mt-2 border-t border-dashed border-ink-line pt-2">
          <div className="flex items-baseline justify-between">
            <span className="font-display text-sm font-semibold uppercase tracking-wide text-parchment-dim">
              Ganancia
            </span>
            <span className="font-mono text-2xl font-semibold text-ember-bright">
              {formatSilver(flip.profit * qty)}
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xs text-parchment-dim">ROI</span>
            <span className="font-mono text-sm text-parchment">
              {formatPercent(flip.roi)}
            </span>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-ink-line pt-2 text-xs">
          <span className={riskColor(flip.risk)}>
            Riesgo {RISK_LABELS[flip.risk]}
            <span className="text-parchment-dim"> · {TRAVEL_LABELS[flip.travel]}</span>
          </span>
          <span className="text-parchment-dim">
            Vol. {flip.liquidity.toFixed(1)}/día · {formatAge(flip.dataAgeMs)}
          </span>
        </div>
      </div>
    </div>
  );
}
