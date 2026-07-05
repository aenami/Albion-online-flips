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

function riskPillClass(risk: FlipOpportunity["risk"]) {
  if (risk === "low") return "bg-moss/15 text-moss";
  if (risk === "medium") return "bg-terracotta/15 text-terracotta";
  return "bg-berry/15 text-berry";
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
    <div className="overflow-hidden rounded-3xl bg-parchment shadow-md shadow-black/10">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-parchment-line text-left text-sm text-ink-soft">
              <th className="px-3 py-3 font-medium">Ítem</th>
              <th className="px-3 py-3 font-medium">Ruta</th>
              {COLUMNS.map((col) => (
                <th key={col.key} className="px-3 py-3 font-medium">
                  <button
                    type="button"
                    onClick={() => onSortChange(col.key)}
                    className="flex items-center gap-1 hover:text-terracotta"
                  >
                    {col.label}
                    {sortBy === col.key && (
                      <span aria-hidden>{sortDir === "desc" ? "▾" : "▴"}</span>
                    )}
                  </button>
                </th>
              ))}
              <th className="px-3 py-3 font-medium">Riesgo</th>
            </tr>
          </thead>
          <tbody>
            {flips.map((flip) => (
              <tr
                key={flip.id}
                onClick={() => onSelect(flip)}
                className={`cursor-pointer border-b border-parchment-line/70 transition-colors last:border-b-0 hover:bg-parchment-soft ${
                  selectedId === flip.id ? "bg-parchment-soft" : ""
                }`}
              >
                <td className="px-3 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <ItemIcon
                      itemId={flip.itemId}
                      itemName={flip.itemName}
                      quality={flip.quality}
                      size={30}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-ink">{flip.itemName}</p>
                      <p className="text-xs text-ink-soft">
                        T{flip.tier} · {QUALITY_LABELS[flip.quality]} ·{" "}
                        {enchantLabel(flip.enchantLevel)}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="max-w-[140px] px-3 py-2.5 font-mono text-xs text-ink-soft">
                  {flip.buyCity} <span aria-hidden>&rarr;</span> {flip.sellCity}
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-ink">
                  {formatSilver(flip.investment)}
                </td>
                <td className="px-3 py-2.5 text-right font-mono font-medium text-terracotta">
                  {formatSilver(flip.profit)}
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-ink">
                  {formatPercent(flip.roi)}
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-ink-soft">
                  {flip.liquidity.toFixed(1)}
                </td>
                <td className="px-3 py-2.5 text-right font-mono text-xs text-ink-soft">
                  {formatAge(flip.dataAgeMs)}
                </td>
                <td className="px-3 py-2.5">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${riskPillClass(flip.risk)}`}
                  >
                    {RISK_LABELS[flip.risk]}
                  </span>
                </td>
              </tr>
            ))}
            {flips.length === 0 && (
              <tr>
                <td colSpan={8} className="px-3 py-14 text-center text-ink-soft">
                  Ningún flip cumple estos filtros todavía. Prueba a bajar el mínimo de
                  ganancia o de liquidez.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
