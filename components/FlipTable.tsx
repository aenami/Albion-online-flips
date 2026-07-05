"use client";

import type { FlipOpportunity } from "@/lib/flipEngine";
import type { SortBy, SortDir } from "@/lib/filters";
import {
  QUALITY_LABELS,
  RISK_LABELS,
  enchantLabel,
  formatAge,
  formatPercent,
  formatSilver,
} from "@/lib/labels";
import { ItemIcon } from "./ItemIcon";

const COLUMNS: { key: SortBy; label: string; align?: "right" }[] = [
  { key: "investment", label: "Inversión", align: "right" },
  { key: "profit", label: "Ganancia", align: "right" },
  { key: "roi", label: "ROI", align: "right" },
  { key: "liquidity", label: "Liquidez", align: "right" },
  { key: "recent", label: "Actualizado", align: "right" },
];

function riskDot(risk: FlipOpportunity["risk"]) {
  if (risk === "low") return "bg-verdigris";
  if (risk === "medium") return "bg-ember-bright";
  return "bg-blood";
}

export function FlipTable({
  flips,
  sortBy,
  sortDir,
  onSortChange,
  onSelect,
  selectedId,
}: {
  flips: FlipOpportunity[];
  sortBy: SortBy;
  sortDir: SortDir;
  onSortChange: (sortBy: SortBy) => void;
  onSelect: (flip: FlipOpportunity) => void;
  selectedId?: string;
}) {
  return (
    <div className="overflow-x-auto rounded-sm border border-ink-line">
      <table className="w-full min-w-[860px] border-collapse text-sm">
        <thead>
          <tr className="border-b border-ink-line bg-ink-raised text-left text-xs uppercase tracking-wide text-parchment-dim">
            <th className="px-3 py-2 font-medium">Ítem</th>
            <th className="px-3 py-2 font-medium">Ruta</th>
            {COLUMNS.map((col) => (
              <th key={col.key} className="px-3 py-2 font-medium">
                <button
                  type="button"
                  onClick={() => onSortChange(col.key)}
                  className="flex items-center gap-1 hover:text-ember-bright"
                >
                  {col.label}
                  {sortBy === col.key && (
                    <span aria-hidden>{sortDir === "desc" ? "▾" : "▴"}</span>
                  )}
                </button>
              </th>
            ))}
            <th className="px-3 py-2 font-medium">Riesgo</th>
          </tr>
        </thead>
        <tbody>
          {flips.map((flip) => (
            <tr
              key={flip.id}
              onClick={() => onSelect(flip)}
              className={`cursor-pointer border-b border-ink-line/60 transition-colors hover:bg-ink-raised ${
                selectedId === flip.id ? "bg-ink-raised" : ""
              }`}
            >
              <td className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <ItemIcon itemId={flip.itemId} quality={flip.quality} size={28} />
                  <div className="min-w-0">
                    <p className="truncate text-parchment">{flip.itemName}</p>
                    <p className="text-[11px] text-parchment-dim">
                      T{flip.tier} · {QUALITY_LABELS[flip.quality]} ·{" "}
                      {enchantLabel(flip.enchantLevel)}
                    </p>
                  </div>
                </div>
              </td>
              <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-parchment-dim">
                {flip.buyCity} <span aria-hidden>&rarr;</span> {flip.sellCity}
              </td>
              <td className="px-3 py-2 text-right font-mono text-parchment">
                {formatSilver(flip.investment)}
              </td>
              <td className="px-3 py-2 text-right font-mono font-medium text-ember-bright">
                {formatSilver(flip.profit)}
              </td>
              <td className="px-3 py-2 text-right font-mono text-parchment">
                {formatPercent(flip.roi)}
              </td>
              <td className="px-3 py-2 text-right font-mono text-parchment-dim">
                {flip.liquidity.toFixed(1)}
              </td>
              <td className="px-3 py-2 text-right font-mono text-xs text-parchment-dim">
                {formatAge(flip.dataAgeMs)}
              </td>
              <td className="px-3 py-2">
                <span
                  className={`inline-block h-2 w-2 rounded-full ${riskDot(flip.risk)}`}
                  title={RISK_LABELS[flip.risk]}
                />
              </td>
            </tr>
          ))}
          {flips.length === 0 && (
            <tr>
              <td colSpan={8} className="px-3 py-10 text-center text-parchment-dim">
                Ningún flip cumple estos filtros todavía. Prueba a bajar el mínimo de
                ganancia o de liquidez.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
