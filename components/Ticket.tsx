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

function riskPillClass(risk: FlipOpportunity["risk"]) {
  if (risk === "low") return "bg-moss/15 text-moss";
  if (risk === "medium") return "bg-terracotta/15 text-terracotta";
  return "bg-berry/15 text-berry";
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
    <div className="flex items-baseline justify-between gap-3 py-1">
      <span className={`text-sm ${muted ? "text-ink-soft" : "text-ink"}`}>{label}</span>
      <span className="font-mono text-sm text-ink">{value}</span>
    </div>
  );
}

export function Ticket({ flip }: { flip: FlipOpportunity }) {
  const [qty, setQty] = useState(1);
  const revenue = (flip.investment + flip.profit) * qty;
  const meta = flip.meta as
    | {
        material: string;
        materialName: string;
        materialUnitPrice: number;
        materialCount: number;
        materialTotalCost: number;
        basePrice: number;
      }
    | undefined;

  return (
    <div className="overflow-hidden rounded-3xl bg-parchment shadow-lg shadow-black/15">
      <div
        className="h-3 w-full bg-wood/25"
        style={{
          maskImage: "repeating-linear-gradient(90deg, black 0 7px, transparent 7px 14px)",
          WebkitMaskImage:
            "repeating-linear-gradient(90deg, black 0 7px, transparent 7px 14px)",
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
            <p className="font-display text-lg leading-tight font-semibold text-ink">
              {flip.itemName}
            </p>
            <p className="text-sm text-ink-soft">{FLIP_TYPE_LABELS[flip.type]}</p>
          </div>
        </div>

        <div className="mb-3 flex flex-wrap gap-1.5 text-xs">
          <span className="rounded-full bg-parchment-soft px-2.5 py-1 text-ink-soft">
            Tier {flip.tier}
          </span>
          <span className="rounded-full bg-parchment-soft px-2.5 py-1 text-ink-soft">
            {QUALITY_LABELS[flip.quality]}
          </span>
          <span className="rounded-full bg-parchment-soft px-2.5 py-1 text-ink-soft">
            {enchantLabel(flip.enchantLevel)}
          </span>
          <span className="rounded-full bg-parchment-soft px-2.5 py-1 text-ink-soft">
            {categoryLabel(flip.category)}
          </span>
        </div>

        <div className="mb-3 flex items-center gap-2 font-mono text-sm font-medium text-terracotta">
          <span>{flip.buyCity}</span>
          <span aria-hidden>&rarr;</span>
          <span>{flip.sellCity}</span>
        </div>

        <div className="border-t border-dashed border-parchment-line pt-1">
          {meta ? (
            <>
              <Line
                label="Ítem base"
                value={formatSilver(meta.basePrice * qty)}
                muted
              />
              <div className="py-1">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="text-sm text-ink-soft">
                    {meta.materialName} x{meta.materialCount * qty}
                  </span>
                  <span className="font-mono text-sm text-ink">
                    {formatSilver(meta.materialTotalCost * qty)}
                  </span>
                </div>
                <p className="text-xs text-ink-soft/70">
                  {formatSilver(meta.materialUnitPrice)} c/u · precio intermedio entre
                  ciudades, no el más barato
                </p>
              </div>
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

        <div className="mt-1 flex items-center justify-between border-t border-dashed border-parchment-line pt-2.5">
          <span className="text-sm text-ink-soft">Unidades a simular</span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setQty((q) => Math.max(1, q - 1))}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-parchment-soft text-ink transition-colors hover:bg-terracotta hover:text-parchment"
            >
              −
            </button>
            <span className="w-8 text-center font-mono text-sm text-ink">{qty}</span>
            <button
              type="button"
              onClick={() => setQty((q) => q + 1)}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-parchment-soft text-ink transition-colors hover:bg-terracotta hover:text-parchment"
            >
              +
            </button>
          </div>
        </div>

        <div className="mt-2 border-t border-dashed border-parchment-line pt-2.5">
          <div className="flex items-baseline justify-between">
            <span className="font-display text-base font-semibold text-ink">Ganancia</span>
            <span className="font-mono text-2xl font-semibold text-terracotta">
              {formatSilver(flip.profit * qty)}
            </span>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-ink-soft">ROI</span>
            <span className="font-mono text-sm text-ink">{formatPercent(flip.roi)}</span>
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-parchment-line pt-3 text-xs">
          <span className={`rounded-full px-2.5 py-1 font-medium ${riskPillClass(flip.risk)}`}>
            {RISK_LABELS[flip.risk]} · {TRAVEL_LABELS[flip.travel]}
          </span>
          <span className="text-ink-soft">
            Vol. {flip.liquidity.toFixed(1)}/día · {formatAge(flip.dataAgeMs)}
          </span>
        </div>
      </div>
    </div>
  );
}
