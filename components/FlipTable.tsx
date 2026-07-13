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
  if (risk === "medium") return "bg-terracotta/15 text-terracotta-deep";
  return "bg-berry/15 text-berry";
}

const SKELETON_ROWS = 8;

function SkeletonRows() {
  return (
    <>
      {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
        <tr key={i} className="border-b border-parchment-line/70 last:border-b-0">
          <td className="px-3 py-2.5">
            <div className="flex items-center gap-2.5">
              <div className="skeleton h-[30px] w-[30px] rounded-full" />
              <div className="min-w-0 flex-1 space-y-1.5">
                <div className="skeleton h-3.5 w-32" />
                <div className="skeleton h-2.5 w-20" />
              </div>
            </div>
          </td>
          <td className="px-3 py-2.5"><div className="skeleton h-3 w-24" /></td>
          <td className="px-3 py-2.5"><div className="skeleton ml-auto h-3 w-16" /></td>
          <td className="px-3 py-2.5"><div className="skeleton ml-auto h-3 w-16" /></td>
          <td className="px-3 py-2.5"><div className="skeleton ml-auto h-3 w-10" /></td>
          <td className="px-3 py-2.5"><div className="skeleton ml-auto h-3 w-10" /></td>
          <td className="px-3 py-2.5"><div className="skeleton ml-auto h-3 w-12" /></td>
          <td className="px-3 py-2.5"><div className="skeleton h-5 w-14 rounded-full" /></td>
        </tr>
      ))}
    </>
  );
}

export function FlipTable({
  flips,
  sortBy,
  sortDir,
  onSortChange,
  onSelect,
  selectedId,
  loading,
}: {
  flips: FlipOpportunity[];
  sortBy: SortBy;
  sortDir: SortDir;
  onSortChange: (sortBy: SortBy) => void;
  onSelect: (flip: FlipOpportunity) => void;
  selectedId?: string;
  loading?: boolean;
}) {
  // First load has no rows yet -> skeletons. A refetch over existing rows keeps
  // the data crisp and readable, marked only by a thin progress bar up top.
  const initialLoading = loading && flips.length === 0;
  const refetching = loading && flips.length > 0;

  return (
    <div className="relative overflow-hidden rounded-3xl bg-parchment shadow-md shadow-black/10">
      {refetching && (
        <div
          aria-hidden
          className="absolute inset-x-0 top-0 z-10 h-0.5 animate-pulse bg-terracotta"
        />
      )}
      <div className="overflow-x-auto">
        <table
          className="w-full min-w-[860px] border-collapse text-sm"
          aria-busy={loading || undefined}
        >
          <thead>
            <tr className="border-b border-parchment-line text-left text-sm text-ink-soft">
              <th className="px-3 py-3 font-medium" scope="col">Ítem</th>
              <th className="px-3 py-3 font-medium" scope="col">Ruta</th>
              {COLUMNS.map((col) => (
                <th
                  key={col.key}
                  className="px-3 py-3 font-medium"
                  scope="col"
                  aria-sort={
                    sortBy === col.key
                      ? sortDir === "desc"
                        ? "descending"
                        : "ascending"
                      : "none"
                  }
                >
                  <button
                    type="button"
                    onClick={() => onSortChange(col.key)}
                    className="flex items-center gap-1 rounded hover:text-terracotta"
                  >
                    {col.label}
                    {sortBy === col.key && (
                      <span aria-hidden>{sortDir === "desc" ? "▾" : "▴"}</span>
                    )}
                  </button>
                </th>
              ))}
              <th className="px-3 py-3 font-medium" scope="col">Riesgo</th>
            </tr>
          </thead>
          <tbody>
            {initialLoading && <SkeletonRows />}
            {!initialLoading &&
              flips.map((flip) => (
                <tr
                  key={flip.id}
                  role="button"
                  tabIndex={0}
                  aria-label={`${flip.itemName}: ${formatSilver(flip.profit)} de ganancia, ROI ${formatPercent(flip.roi)}, riesgo ${RISK_LABELS[flip.risk]}. Ver detalle.`}
                  aria-pressed={selectedId === flip.id}
                  onClick={() => onSelect(flip)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect(flip);
                    }
                  }}
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
            {!initialLoading && flips.length === 0 && (
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
