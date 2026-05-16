import { useMemo } from "react";
import { Button } from "primereact/button";
import { hasPermissionCode } from "~/lib/permission-codes";
import type { DashboardSnapshotResponse } from "./dashboard.types";
import type { OverrideEntry } from "./dashboard-config.types";
import DashboardKpiCard from "./DashboardKpiCard";
import DashboardChart from "./DashboardChart";
import DashboardPeriodSelector from "./DashboardPeriodSelector";

interface DashboardRendererProps {
  snapshot: DashboardSnapshotResponse | null;
  effectivePermissions: string[];
  overrides?: OverrideEntry[] | null;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  onPeriodChange?: (period: string) => void;
  period?: string;
  onRecompose?: () => void;
  recomposing?: boolean;
}

// ---------------------------------------------------------------------------
// Filtering utilities (client-side)
// ---------------------------------------------------------------------------

/**
 * Filters items by target: keeps items with target "web" or "both".
 */
function filterByTarget<T extends { target: "admin" | "web" | "both" }>(items: T[]): T[] {
  return items.filter((item) => item.target === "web" || item.target === "both");
}

/**
 * Filters items by permission: keeps items where the user has the required
 * permission or the item has no permissionModule (visible to all).
 * Users with wildcard "*" permission see everything.
 */
function filterByPermission<T extends { permissionModule: string | null }>(
  items: T[],
  effectivePermissions: string[]
): T[] {
  return items.filter((item) => {
    if (!item.permissionModule) return true;
    return hasPermissionCode(effectivePermissions, "view", item.permissionModule);
  });
}

/**
 * Merges items with company-level overrides.
 * Override values for `visible` and `order` take precedence.
 * Items hidden by override (visible=false) are excluded.
 * Items without an override keep their original order.
 */
function mergeWithOverrides<T extends { id: string }>(
  items: T[],
  overrides: OverrideEntry[] | null | undefined,
  definitionType: "card" | "chart"
): (T & { _order: number })[] {
  if (!overrides || overrides.length === 0) {
    return items.map((item, idx) => ({ ...item, _order: idx }));
  }

  const overrideMap = new Map<string, OverrideEntry>();
  for (const ov of overrides) {
    if (ov.definitionType === definitionType) {
      overrideMap.set(ov.definitionId, ov);
    }
  }

  return items
    .map((item, idx) => {
      const override = overrideMap.get(item.id);
      if (override) {
        if (!override.visible) return null; // hidden by override
        return { ...item, _order: override.order };
      }
      return { ...item, _order: idx + 1000 }; // no override → keep at end
    })
    .filter((item): item is T & { _order: number } => item !== null);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Main dashboard renderer for the web app.
 * Applies filterByTarget → filterByPermission → mergeWithOverrides pipeline
 * to cards and charts, then renders them in a responsive grid.
 *
 * States: loading (skeleton), error (banner + retry), empty (informational message).
 */
export default function DashboardRenderer({
  snapshot,
  effectivePermissions,
  overrides,
  loading = false,
  error = null,
  onRetry,
  onPeriodChange,
  period,
  onRecompose,
  recomposing = false,
}: DashboardRendererProps) {
  // Process cards through the pipeline
  const filteredCards = useMemo(() => {
    if (!snapshot?.cards) return [];
    const byTarget = filterByTarget(snapshot.cards);
    const byPermission = filterByPermission(byTarget, effectivePermissions);
    const merged = mergeWithOverrides(byPermission, overrides, "card");
    return merged.sort((a, b) => a._order - b._order);
  }, [snapshot?.cards, effectivePermissions, overrides]);

  // Process charts through the pipeline
  const filteredCharts = useMemo(() => {
    if (!snapshot?.charts) return [];
    const byTarget = filterByTarget(snapshot.charts);
    const byPermission = filterByPermission(byTarget, effectivePermissions);
    const merged = mergeWithOverrides(byPermission, overrides, "chart");
    return merged.sort((a, b) => a._order - b._order);
  }, [snapshot?.charts, effectivePermissions, overrides]);

  const isEmpty = !loading && !error && filteredCards.length === 0 && filteredCharts.length === 0;

  return (
    <div className="space-y-6">
      {/* Period selector + recompose button */}
      {onPeriodChange && period != null && (
        <div className="flex items-center gap-3">
          <DashboardPeriodSelector value={period} onChange={onPeriodChange} />
          {onRecompose && (
            <Button
              type="button"
              icon="pi pi-refresh"
              size="small"
              outlined
              onClick={onRecompose}
              loading={recomposing}
              disabled={recomposing}
              tooltip="Recomponer dashboard"
              tooltipOptions={{ position: "top" }}
              aria-label="Recomponer dashboard"
            />
          )}
        </div>
      )}

      {/* Loading state: skeleton cards */}
      {loading && (
        <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <div
              key={`skeleton-${i}`}
              className="relative h-36 animate-pulse overflow-hidden rounded-2xl border border-white/10 bg-[var(--dp-surface-low)]/80"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent" />
              <div className="p-5">
                <div className="h-3 w-20 rounded bg-white/10" />
                <div className="mt-4 h-8 w-16 rounded bg-white/10" />
                <div className="mt-4 h-2 w-full rounded bg-white/10" />
              </div>
            </div>
          ))}
        </section>
      )}

      {/* Error state: banner with retry */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3">
          <i className="pi pi-exclamation-triangle text-red-400" aria-hidden />
          <span className="flex-1 text-sm text-red-200">{error}</span>
          {onRetry && (
            <Button
              type="button"
              icon="pi pi-refresh"
              label="Reintentar"
              size="small"
              severity="danger"
              outlined
              onClick={onRetry}
            />
          )}
        </div>
      )}

      {/* Empty state: informational message */}
      {isEmpty && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-500/40 bg-amber-500/10 px-4 py-3">
          <i className="pi pi-info-circle text-amber-400" aria-hidden />
          <span className="text-sm text-amber-200">
            No hay datos disponibles para el periodo seleccionado.
          </span>
        </div>
      )}

      {/* Cards grid */}
      {!loading && !error && filteredCards.length > 0 && (
        <section className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredCards.map((card, i) => (
            <DashboardKpiCard
              key={`${card.id || card.cardKey || "card"}-${card.metricKey || "metric"}-${i}`}
              card={card}
              index={i}
            />
          ))}
        </section>
      )}

      {/* Charts section */}
      {!loading && !error && filteredCharts.length > 0 && (
        <section className="grid grid-cols-1 gap-5 lg:grid-cols-2">
          {filteredCharts.map((chart, i) => (
            <DashboardChart
              key={`${chart.id || chart.chartKey || "chart"}-${chart.chartType || "type"}-${i}`}
              chart={chart}
            />
          ))}
        </section>
      )}
    </div>
  );
}
